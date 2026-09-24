// House persona rollout (owner 2026-09-23, Codex 53215). Applies REVIEWED
// persona bundles to the five house agents and nothing else, dry-run by
// default, root applies:
//   - exact identities: handle + owner + is_house, never a mechanical provider;
//   - validated hosted spec/prose input (loadAgent "hosted" throws on drift);
//   - compare-and-swap: the live row must still hash to the reviewed
//     baseline, or the entry is rejected and nothing is written;
//   - the outgoing configuration is recorded as a revision (backend
//     agent_revisions contract and hash, backfilled baseline when the agent
//     has no history) in the SAME transaction as the new revision and the
//     agents update; no pruning, no deletion;
//   - models, keys, cadence, books, counters, PnL and history are never
//     touched; an intended drawdown stop is resumed only when the reviewed
//     config switches that policy off (maxDrawdownMusd = 0), by clearing the
//     disabled flag and reason alone;
//   - a cycle in flight (claim-time run lock) rejects the entry: drain the
//     scheduler, then apply;
//   - never calls seed-house-agents; no user agent is ever selected.
import { createHash } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { loadAgent } from "@coinrithm/mcp-trading/engine";
import { maintenanceTransaction } from "./maintenance.js";

/** The five house identities (scripts/seed-house-agents.mjs HOUSE roster). */
export const HOUSE_ROSTER = [
  { handle: "mia-trend-rider", owner: 57, display: "Mia" },
  { handle: "contrarian-carl", owner: 58, display: "Carl" },
  { handle: "leo-breakout-hunter", owner: 59, display: "Leo" },
  { handle: "olivia-calibrated-quant", owner: 60, display: "Olivia" },
  { handle: "sam-risk-managed-swinger", owner: 61, display: "Sam" },
] as const;
export type HouseHandle = (typeof HOUSE_ROSTER)[number]["handle"];

/** Capability the house seed adds on top of every bundle (observe() TA). */
export const HOUSE_CAPABILITY = "indicators";

// ---------------------------------------------------------------------------
// Backend revision contract, ported verbatim from
// backend-v2/src/controllers/agent/revisionWrite.ts. A test pins a vector
// computed with the backend function so the two can never drift apart.
// ---------------------------------------------------------------------------

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries
    .map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`)
    .join(",")}}`;
}

export interface AgentConfigState {
  prose: string;
  spec: Record<string, unknown>;
  cadenceSeconds: number;
  modelProvider: string;
  modelName: string;
}

export function contentHash(state: AgentConfigState): string {
  const canonical = [
    state.prose,
    stableStringify(state.spec ?? {}),
    String(state.cadenceSeconds),
    state.modelProvider,
    state.modelName,
  ].join("\n");
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

// ---------------------------------------------------------------------------
// Plan + report shapes
// ---------------------------------------------------------------------------

export interface RolloutPlanEntry {
  handle: string;
  /** Reviewed bundle folder (examples/agents/<handle> or a copy of it). */
  bundlePath: string;
  /** contentHash of the live row the review was made against. */
  expectedContentHash: string;
  /** Resume an intended drawdown stop; only honored under an off config. */
  resume?: boolean;
  changeNote?: string;
}

export interface RolloutPlan {
  version: string;
  entries: RolloutPlanEntry[];
}

export type EntryDecision = "apply" | "resume_only" | "noop" | "reject";

export interface EntryReport {
  handle: string;
  agentId: number | null;
  decision: EntryDecision;
  reasons: string[];
  currentHash: string | null;
  nextHash: string | null;
  proseChars: number | null;
  changedSpecKeys: string[];
  status: string | null;
  disabledReason: string | null;
  resume: { requested: boolean; eligible: boolean; reason: string };
}

export interface RolloutResult {
  plan: string;
  applied: boolean;
  entries: EntryReport[];
}

export class HouseRolloutRejected extends Error {
  constructor(public readonly entries: EntryReport[]) {
    super(
      `house rollout rejected: ${entries
        .filter((e) => e.decision === "reject")
        .map((e) => `${e.handle} (${e.reasons.join("; ")})`)
        .join(", ")}`,
    );
    this.name = "HouseRolloutRejected";
  }
}

export interface LoadedBundle {
  spec: Record<string, unknown>;
  prose: string;
}

export interface RolloutDeps {
  /** Bundle reader; defaults to the engine's hosted loader + house capability. */
  loadBundle?: (bundlePath: string) => LoadedBundle;
  /** Apply-mode transaction runner; defaults to maintenanceTransaction. */
  transaction?: <T>(
    pool: Pool,
    op: (client: PoolClient) => Promise<T>,
  ) => Promise<T>;
}

export interface RolloutOptions {
  apply: boolean;
}

/** The engine's hosted loader (validation, drift, prose limit) plus the same
 * capability union scripts/seed-house-agents.mjs applies to house agents, so a
 * rollout never silently removes computed indicators from a house agent. */
export function defaultLoadBundle(bundlePath: string): LoadedBundle {
  const { spec, body } = loadAgent(bundlePath, "hosted");
  const declared: unknown = (spec as { capabilities?: unknown }).capabilities;
  const existing = Array.isArray(declared) ? (declared as string[]) : [];
  const capabilities = Array.from(new Set([...existing, HOUSE_CAPABILITY]));
  return {
    spec: { ...(spec as unknown as Record<string, unknown>), capabilities },
    prose: body,
  };
}

// ---------------------------------------------------------------------------
// Live rows
// ---------------------------------------------------------------------------

interface AgentDbRow {
  id: string;
  handle: string;
  owner_user_id: string | null;
  is_house: boolean;
  status: string;
  disabled_reason: string | null;
  model_provider: string;
  model_name: string;
  cadence_seconds: string | number;
  spec: Record<string, unknown> | null;
  prose: string;
  created_at: Date;
  run_locked: boolean;
}

// run_locked: claimDueAgents pushes next_run_at to now()+GREATEST(cadence,
// RUN_LOCK_SECONDS) while a cycle runs and the completion reschedule lands at
// most one cadence away, so "further than one cadence out" means in flight.
const AGENT_ROW_SQL = `SELECT id, handle, owner_user_id, is_house, status, disabled_reason,
          model_provider, model_name, cadence_seconds, spec, prose, created_at,
          (next_run_at > now() + make_interval(secs => cadence_seconds)) AS run_locked
     FROM agent_runtime.agents
    WHERE handle = $1`;

function rowState(row: AgentDbRow): AgentConfigState {
  return {
    prose: row.prose,
    spec: row.spec ?? {},
    cadenceSeconds: Number(row.cadence_seconds),
    modelProvider: row.model_provider,
    modelName: row.model_name,
  };
}

function changedTopLevelKeys(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): string[] {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...keys]
    .filter((k) => stableStringify(before[k]) !== stableStringify(after[k]))
    .sort();
}

function maxDrawdownOff(spec: Record<string, unknown>): boolean {
  const ks = spec.killSwitch as { maxDrawdownMusd?: unknown } | undefined;
  return ks?.maxDrawdownMusd === 0;
}

const HEX64 = /^[0-9a-f]{64}$/;

export function validatePlan(plan: RolloutPlan): void {
  if (!plan || typeof plan.version !== "string" || !plan.version.trim())
    throw new Error("plan.version is required");
  if (!Array.isArray(plan.entries) || plan.entries.length === 0)
    throw new Error("plan.entries must be a non-empty array");
  const seen = new Set<string>();
  for (const entry of plan.entries) {
    if (!HOUSE_ROSTER.some((h) => h.handle === entry.handle))
      throw new Error(`${entry.handle}: not a house agent handle`);
    if (seen.has(entry.handle))
      throw new Error(`${entry.handle}: listed twice`);
    seen.add(entry.handle);
    if (typeof entry.bundlePath !== "string" || !entry.bundlePath.trim())
      throw new Error(`${entry.handle}: bundlePath is required`);
    if (!HEX64.test(String(entry.expectedContentHash ?? "").toLowerCase()))
      throw new Error(
        `${entry.handle}: expectedContentHash must be sha256 hex`,
      );
  }
}

// ---------------------------------------------------------------------------
// Evaluation (shared by dry-run and apply)
// ---------------------------------------------------------------------------

type Staged = {
  entry: RolloutPlanEntry;
  bundle: LoadedBundle | null;
  loadError: string | null;
};

async function evaluateEntry(
  client: PoolClient,
  staged: Staged,
  forUpdate: boolean,
): Promise<{
  report: EntryReport;
  row: AgentDbRow | null;
  next: AgentConfigState | null;
}> {
  const { entry, bundle, loadError } = staged;
  const roster = HOUSE_ROSTER.find((h) => h.handle === entry.handle)!;
  const report: EntryReport = {
    handle: entry.handle,
    agentId: null,
    decision: "reject",
    reasons: [],
    currentHash: null,
    nextHash: null,
    proseChars: bundle ? bundle.prose.length : null,
    changedSpecKeys: [],
    status: null,
    disabledReason: null,
    resume: { requested: entry.resume === true, eligible: false, reason: "" },
  };
  if (loadError)
    report.reasons.push(`bundle failed hosted validation: ${loadError}`);

  const { rows } = await client.query<AgentDbRow>(
    forUpdate ? `${AGENT_ROW_SQL} FOR UPDATE NOWAIT` : AGENT_ROW_SQL,
    [entry.handle],
  );
  const row = rows[0] ?? null;
  if (!row) {
    report.reasons.push("no agent row for this handle");
    return { report, row: null, next: null };
  }
  report.agentId = Number(row.id);
  report.status = row.status;
  report.disabledReason = row.disabled_reason;
  if (row.is_house !== true) report.reasons.push("row is not a house agent");
  if (Number(row.owner_user_id) !== roster.owner)
    report.reasons.push(
      `owner ${row.owner_user_id ?? "null"} is not the house owner ${roster.owner}`,
    );
  if (row.model_provider === "mechanical")
    report.reasons.push("mechanical provider is not a persona agent");
  if (row.run_locked)
    report.reasons.push(
      "cycle in flight (run lock active); drain the scheduler and retry",
    );

  const current = rowState(row);
  report.currentHash = contentHash(current);
  if (report.currentHash !== entry.expectedContentHash.toLowerCase())
    report.reasons.push(
      `live configuration differs from the reviewed baseline (live ${report.currentHash.slice(0, 12)}, expected ${entry.expectedContentHash.slice(0, 12)})`,
    );

  let next: AgentConfigState | null = null;
  if (bundle) {
    const nextSpec = bundle.spec;
    if (
      (nextSpec.model as { provider?: unknown } | undefined)?.provider ===
      "mechanical"
    )
      report.reasons.push("bundle declares a mechanical provider");
    next = {
      prose: bundle.prose,
      spec: nextSpec,
      cadenceSeconds: current.cadenceSeconds,
      modelProvider: current.modelProvider,
      modelName: current.modelName,
    };
    report.nextHash = contentHash(next);
    report.changedSpecKeys = changedTopLevelKeys(current.spec, nextSpec);
  }

  // Resume eligibility: an intended drawdown stop, resumed only when the
  // reviewed config turns that policy off. Anything else stays as it is.
  if (entry.resume === true) {
    if (row.status !== "disabled") {
      report.resume.reason = `agent is ${row.status}, nothing to resume`;
      report.reasons.push("resume requested but the agent is not disabled");
    } else if (!/drawdown/i.test(row.disabled_reason ?? "")) {
      report.resume.reason = `stop reason is not a drawdown policy: ${row.disabled_reason ?? "none"}`;
      report.reasons.push("resume requested for a non-drawdown stop");
    } else if (!next || !maxDrawdownOff(next.spec)) {
      report.resume.reason =
        "reviewed config keeps maxDrawdownMusd on; the stop would re-trip";
      report.reasons.push("resume requested without an off drawdown policy");
    } else {
      report.resume.eligible = true;
      report.resume.reason = `drawdown stop (${row.disabled_reason}) under maxDrawdownMusd = 0`;
    }
  } else if (row.status === "disabled") {
    report.resume.reason = `stays stopped: ${row.disabled_reason ?? "no reason recorded"}`;
  }

  if (report.reasons.length > 0) return { report, row, next };
  if (next && report.nextHash !== report.currentHash) report.decision = "apply";
  else report.decision = report.resume.eligible ? "resume_only" : "noop";
  return { report, row, next };
}

// ---------------------------------------------------------------------------
// Writes (apply mode only, inside the caller's transaction)
// ---------------------------------------------------------------------------

interface OpenRevisionRow {
  revision: number;
  prose: string;
  spec: Record<string, unknown> | null;
  cadence_seconds: string | number;
  model_provider: string;
  model_name: string;
}

async function insertRevision(
  client: PoolClient,
  agentId: number,
  state: AgentConfigState,
  params: {
    author: "owner" | "system_backfill" | "system_recovered";
    changeNote: string | null;
    createdByUserId: number | null;
    isBaseline: boolean;
    createdAt: Date | null;
  },
): Promise<number> {
  await client.query(
    `UPDATE agent_runtime.agent_revisions SET ended_at = now()
      WHERE agent_id = $1 AND ended_at IS NULL`,
    [agentId],
  );
  const { rows } = await client.query<{ revision: number }>(
    `INSERT INTO agent_runtime.agent_revisions
       (agent_id, revision, prose, spec, cadence_seconds, model_provider, model_name,
        content_hash, change_note, author, created_by_user_id, reverted_from_revision,
        is_baseline, created_at)
     SELECT $1, COALESCE(max(revision), 0) + 1, $2, $3::jsonb, $4, $5, $6, $7, $8, $9, $10,
            NULL, $11, COALESCE($12::timestamptz, now())
       FROM agent_runtime.agent_revisions
      WHERE agent_id = $1
     RETURNING revision`,
    [
      agentId,
      state.prose,
      JSON.stringify(state.spec ?? {}),
      state.cadenceSeconds,
      state.modelProvider,
      state.modelName,
      contentHash(state),
      params.changeNote,
      params.author,
      params.createdByUserId,
      params.isBaseline,
      params.createdAt,
    ],
  );
  return rows[0]?.revision ?? 1;
}

/** Mirrors backend ensureCurrentRecorded: the live configuration is durably a
 * revision before anything overwrites it (baseline dated from the agent's
 * birth when it has no history; a recovered row when the open revision no
 * longer matches the live row). */
async function ensureCurrentRecorded(
  client: PoolClient,
  row: AgentDbRow,
): Promise<"baseline" | "recovered" | "unchanged"> {
  const agentId = Number(row.id);
  const live = rowState(row);
  const { rows: open } = await client.query<OpenRevisionRow>(
    `SELECT revision, prose, spec, cadence_seconds, model_provider, model_name
       FROM agent_runtime.agent_revisions
      WHERE agent_id = $1 AND ended_at IS NULL
      LIMIT 1`,
    [agentId],
  );
  if (!open[0]) {
    const { rows: max } = await client.query<{ max: number | null }>(
      `SELECT max(revision) AS max FROM agent_runtime.agent_revisions WHERE agent_id = $1`,
      [agentId],
    );
    const hasHistory = (max[0]?.max ?? null) != null;
    await insertRevision(client, agentId, live, {
      author: hasHistory ? "system_recovered" : "system_backfill",
      changeNote: null,
      createdByUserId: null,
      isBaseline: !hasHistory,
      createdAt: hasHistory ? null : row.created_at,
    });
    return hasHistory ? "recovered" : "baseline";
  }
  const openHash = contentHash({
    prose: open[0].prose,
    spec: open[0].spec ?? {},
    cadenceSeconds: Number(open[0].cadence_seconds),
    modelProvider: open[0].model_provider,
    modelName: open[0].model_name,
  });
  if (openHash === contentHash(live)) return "unchanged";
  await insertRevision(client, agentId, live, {
    author: "system_recovered",
    changeNote: null,
    createdByUserId: null,
    isBaseline: false,
    createdAt: null,
  });
  return "recovered";
}

/** One line, printable, at most 200 chars (the backend's change_note shape). */
function normalizeChangeNote(note: string): string {
  let out = "";
  for (const ch of note) {
    const code = ch.codePointAt(0) ?? 0;
    out += code < 0x20 || code === 0x7f ? " " : ch;
  }
  return out.replace(/\s+/g, " ").trim().slice(0, 200);
}

async function applyEntry(
  client: PoolClient,
  plan: RolloutPlan,
  entry: RolloutPlanEntry,
  row: AgentDbRow,
  next: AgentConfigState,
): Promise<void> {
  const agentId = Number(row.id);
  const roster = HOUSE_ROSTER.find((h) => h.handle === entry.handle)!;
  await ensureCurrentRecorded(client, row);
  await insertRevision(client, agentId, next, {
    author: "owner",
    changeNote: normalizeChangeNote(
      entry.changeNote ?? `house persona rollout ${plan.version}`,
    ),
    createdByUserId: roster.owner,
    isBaseline: false,
    createdAt: null,
  });
  // Only spec and prose move; model, cadence, keys, state and history do not.
  await client.query(
    `UPDATE agent_runtime.agents
        SET spec = $2::jsonb, prose = $3, updated_at = now()
      WHERE id = $1 AND is_house = true`,
    [agentId, JSON.stringify(next.spec), next.prose],
  );
}

async function resumeEntry(client: PoolClient, row: AgentDbRow): Promise<void> {
  const agentId = Number(row.id);
  await client.query(
    `UPDATE agent_runtime.agents
        SET status = 'active', disabled_reason = NULL, next_run_at = now(), updated_at = now()
      WHERE id = $1 AND status = 'disabled'`,
    [agentId],
  );
  // Flag and reason only: peak, PnL and every counter stay as they are.
  await client.query(
    `UPDATE agent_runtime.agent_state
        SET state = (state - 'disabledReason') || '{"disabled":false}'::jsonb,
            updated_at = now()
      WHERE agent_id = $1`,
    [agentId],
  );
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export async function runHouseRollout(
  pool: Pool,
  plan: RolloutPlan,
  opts: RolloutOptions,
  deps: RolloutDeps = {},
): Promise<RolloutResult> {
  validatePlan(plan);
  const loadBundle = deps.loadBundle ?? defaultLoadBundle;
  const staged: Staged[] = plan.entries.map((entry) => {
    try {
      return { entry, bundle: loadBundle(entry.bundlePath), loadError: null };
    } catch (e) {
      return {
        entry,
        bundle: null,
        loadError: e instanceof Error ? e.message : String(e),
      };
    }
  });

  if (!opts.apply) {
    // Read-only review: evaluate every entry, write nothing.
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const entries: EntryReport[] = [];
      for (const s of staged)
        entries.push((await evaluateEntry(client, s, false)).report);
      await client.query("ROLLBACK");
      return { plan: plan.version, applied: false, entries };
    } finally {
      client.release();
    }
  }

  const transaction = deps.transaction ?? maintenanceTransaction;
  const entries = await transaction(pool, async (client) => {
    const evaluated = [];
    for (const s of staged)
      evaluated.push(await evaluateEntry(client, s, true));
    const reports = evaluated.map((e) => e.report);
    // All or nothing: one rejected entry rolls the whole plan back.
    if (reports.some((r) => r.decision === "reject"))
      throw new HouseRolloutRejected(reports);
    for (const { report, row, next } of evaluated) {
      if (!row) continue;
      const entry = plan.entries.find((e) => e.handle === report.handle)!;
      if (report.decision === "apply" && next)
        await applyEntry(client, plan, entry, row, next);
      if (report.resume.eligible) await resumeEntry(client, row);
    }
    return reports;
  });
  return { plan: plan.version, applied: true, entries };
}

/** Current live state of every house agent, for writing a plan's expected
 * hashes after review. Read-only. */
export async function readHouseState(pool: Pool): Promise<
  Array<{
    handle: string;
    agentId: number | null;
    status: string | null;
    disabledReason: string | null;
    contentHash: string | null;
    runLocked: boolean | null;
  }>
> {
  const out = [];
  for (const h of HOUSE_ROSTER) {
    const { rows } = await pool.query<AgentDbRow>(AGENT_ROW_SQL, [h.handle]);
    const row = rows[0];
    out.push({
      handle: h.handle,
      agentId: row ? Number(row.id) : null,
      status: row?.status ?? null,
      disabledReason: row?.disabled_reason ?? null,
      contentHash: row ? contentHash(rowState(row)) : null,
      runLocked: row?.run_locked ?? null,
    });
  }
  return out;
}
