// House persona rollout (owner 2026-09-23, Codex 53215/53228). Applies
// REVIEWED persona bundles to the five house agents and nothing else,
// dry-run by default, root applies:
//   - exact identities: handle + owner + is_house, never a mechanical provider;
//   - validated hosted spec/prose input (loadAgent "hosted" throws on drift);
//   - compare-and-swap: the live row must still hash to the reviewed
//     baseline, or the entry is rejected and nothing is written;
//   - the live configuration is recorded as a revision (backend
//     agent_revisions contract and hash; a baseline captured NOW when the
//     agent has no history) in the SAME transaction as the new revision and
//     the agents update; no pruning, no deletion;
//   - models, keys, cadence, books, counters, PnL and history are never
//     touched; the live spec.model pin is carried into the new spec; an
//     intended drawdown stop is resumed only when the reviewed config
//     switches that policy off (maxDrawdownMusd = 0), by clearing the
//     disabled flag and reason alone;
//   - apply requires the scheduler to be STOPPED: the operator asserts it
//     (--scheduler-stopped) and the script verifies quiescence from the
//     database (no cycle recorded, no live capacity lease, no house claim
//     inside the window). The claim lock visible on next_run_at is only a
//     tripwire: with a 360 s lock and a 240 s cadence it shows for 120 s,
//     with a cadence of 360 s or more it never shows, so its absence proves
//     nothing;
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

/** Quiescence window: RUN_LOCK_SECONDS and the capacity lease TTL, the
 * longest a claimed cycle can be in flight before the runtime abandons it. */
export const DEFAULT_QUIESCENCE_SECONDS = 360;

/** The two strings the runtime writes for an intended drawdown stop:
 * state.ts `drawdown <dd> >= <max>` and runner.ts `equity drawdown >= <max>`.
 * Anything else (a provider error that mentions drawdown, a setup failure)
 * is not a drawdown policy stop and is never resumed here. */
export const DRAWDOWN_STOP_RE =
  /^(equity )?drawdown( \d+(\.\d+)?)? >= \d+(\.\d+)?$/;

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
  /** The live spec.model pin was carried into the new spec (the bundle's
   * model block is not what the house runs on). */
  liveModelPreserved: boolean;
  status: string | null;
  disabledReason: string | null;
  /** Seconds since the last claim of this row, null when never claimed. */
  lastRunAgeSeconds: number | null;
  /** next_run_at further out than one cadence: a claim happened recently.
   * A tripwire only; false proves nothing (see the header). */
  claimLockVisible: boolean;
  resume: { requested: boolean; eligible: boolean; reason: string };
}

export interface QuiescenceEvidence {
  windowSeconds: number;
  /** Seconds since the newest agent_cycles row fleet-wide, null when none. */
  lastCycleAgeSeconds: number | null;
  /** provider_capacity_leases rows still unexpired (a model call in flight). */
  activeLeases: number;
  /** House handles claimed inside the window or with a visible claim lock. */
  houseActivity: string[];
  quiet: boolean;
  reasons: string[];
}

export interface RolloutResult {
  plan: string;
  applied: boolean;
  entries: EntryReport[];
  quiescence: QuiescenceEvidence;
}

export class HouseRolloutRejected extends Error {
  constructor(
    public readonly entries: EntryReport[],
    public readonly quiescence: QuiescenceEvidence | null = null,
  ) {
    super(
      `house rollout rejected: ${[
        ...entries
          .filter((e) => e.decision === "reject")
          .map((e) => `${e.handle} (${e.reasons.join("; ")})`),
        ...(quiescence && !quiescence.quiet
          ? [`scheduler not quiescent (${quiescence.reasons.join("; ")})`]
          : []),
      ].join(", ")}`,
    );
    this.name = "HouseRolloutRejected";
  }
}

export interface LoadedBundle {
  spec: Record<string, unknown>;
  prose: string;
}

export interface FleetActivity {
  lastCycleAgeSeconds: number | null;
  activeLeases: number;
}

export interface RolloutDeps {
  /** Bundle reader; defaults to the engine's hosted loader + house capability. */
  loadBundle?: (bundlePath: string) => LoadedBundle;
  /** Apply-mode transaction runner; defaults to maintenanceTransaction. */
  transaction?: <T>(
    pool: Pool,
    op: (client: PoolClient) => Promise<T>,
  ) => Promise<T>;
  /** Fleet-wide activity reader; defaults to the real cycle + lease queries. */
  fleetActivity?: (client: PoolClient) => Promise<FleetActivity>;
}

export interface RolloutOptions {
  apply: boolean;
  /** Operator assertion that the scheduler is stopped; required for apply. */
  schedulerStopped?: boolean;
  quiescenceSeconds?: number;
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
  last_run_age_seconds: string | number | null;
  claim_lock_visible: boolean;
}

// claim_lock_visible: claimDueAgents pushes next_run_at to now()+GREATEST(
// cadence, RUN_LOCK_SECONDS) at claim time and the completion reschedule lands
// at most one cadence away, so "further than one cadence out" means a claim
// happened within (lock - cadence) seconds. It is evidence when true and
// nothing when false.
const AGENT_ROW_SQL = `SELECT id, handle, owner_user_id, is_house, status, disabled_reason,
          model_provider, model_name, cadence_seconds, spec, prose, created_at,
          EXTRACT(EPOCH FROM (now() - last_run_at)) AS last_run_age_seconds,
          (next_run_at > now() + make_interval(secs => cadence_seconds)) AS claim_lock_visible
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

function ageSeconds(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
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
// Quiescence (the real guarantee for apply)
// ---------------------------------------------------------------------------

/** Fleet-wide evidence a scheduler is running: the newest recorded cycle
 * (a live fleet records one every few seconds) and unexpired capacity
 * leases (a shared-key model call in flight). */
export async function readFleetActivity(
  client: PoolClient,
): Promise<FleetActivity> {
  const { rows: cycles } = await client.query<{ age: string | number | null }>(
    `SELECT EXTRACT(EPOCH FROM (now() - max(ts))) AS age FROM agent_runtime.agent_cycles`,
  );
  const { rows: leases } = await client.query<{ n: string | number }>(
    `SELECT count(*) AS n FROM agent_runtime.provider_capacity_leases
      WHERE expires_at > clock_timestamp()`,
  );
  return {
    lastCycleAgeSeconds: ageSeconds(cycles[0]?.age),
    activeLeases: Number(leases[0]?.n ?? 0),
  };
}

function judgeQuiescence(
  fleet: FleetActivity,
  entries: EntryReport[],
  windowSeconds: number,
): QuiescenceEvidence {
  const reasons: string[] = [];
  if (
    fleet.lastCycleAgeSeconds !== null &&
    fleet.lastCycleAgeSeconds < windowSeconds
  )
    reasons.push(
      `a cycle was recorded ${Math.round(fleet.lastCycleAgeSeconds)} s ago (window ${windowSeconds} s)`,
    );
  if (fleet.activeLeases > 0)
    reasons.push(`${fleet.activeLeases} capacity lease(s) still unexpired`);
  const houseActivity = entries
    .filter(
      (e) =>
        e.claimLockVisible ||
        (e.lastRunAgeSeconds !== null && e.lastRunAgeSeconds < windowSeconds),
    )
    .map((e) => e.handle);
  if (houseActivity.length > 0)
    reasons.push(`house claim inside the window: ${houseActivity.join(", ")}`);
  return {
    windowSeconds,
    lastCycleAgeSeconds: fleet.lastCycleAgeSeconds,
    activeLeases: fleet.activeLeases,
    houseActivity,
    quiet: reasons.length === 0,
    reasons,
  };
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
    liveModelPreserved: false,
    status: null,
    disabledReason: null,
    lastRunAgeSeconds: null,
    claimLockVisible: false,
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
  report.lastRunAgeSeconds = ageSeconds(row.last_run_age_seconds);
  report.claimLockVisible = row.claim_lock_visible === true;
  if (row.is_house !== true) report.reasons.push("row is not a house agent");
  if (Number(row.owner_user_id) !== roster.owner)
    report.reasons.push(
      `owner ${row.owner_user_id ?? "null"} is not the house owner ${roster.owner}`,
    );
  if (row.model_provider === "mechanical")
    report.reasons.push("mechanical provider is not a persona agent");
  if (report.claimLockVisible)
    report.reasons.push(
      "claim lock visible on next_run_at: a cycle was claimed recently; stop the scheduler and wait out the window",
    );

  const current = rowState(row);
  report.currentHash = contentHash(current);
  if (report.currentHash !== entry.expectedContentHash.toLowerCase())
    report.reasons.push(
      `live configuration differs from the reviewed baseline (live ${report.currentHash.slice(0, 12)}, expected ${entry.expectedContentHash.slice(0, 12)})`,
    );

  let next: AgentConfigState | null = null;
  if (bundle) {
    // The house runs on the live spec.model pin (update-house-models.mjs),
    // not on the bundle's public default; carry the live pin over.
    const liveModel = current.spec.model;
    const nextSpec: Record<string, unknown> =
      liveModel !== undefined
        ? { ...bundle.spec, model: liveModel }
        : { ...bundle.spec };
    report.liveModelPreserved = liveModel !== undefined;
    if (
      (nextSpec.model as { provider?: unknown } | undefined)?.provider ===
      "mechanical"
    )
      report.reasons.push("spec declares a mechanical provider");
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
    } else if (!DRAWDOWN_STOP_RE.test(row.disabled_reason ?? "")) {
      report.resume.reason = `stop reason is not the drawdown kill switch format: ${row.disabled_reason ?? "none"}`;
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
 * revision before anything overwrites it. With no history the row is a
 * system_backfill baseline dated from the agent's birth (the backend's own
 * convention); its note states that it was captured now and that the earlier
 * chronology is not recorded. With an open revision that no longer matches
 * the live row, a system_recovered row records what was actually running. */
async function ensureCurrentRecorded(
  client: PoolClient,
  row: AgentDbRow,
  planVersion: string,
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
      changeNote: hasHistory
        ? `live configuration captured by house rollout ${planVersion} before it was replaced`
        : `baseline captured by house rollout ${planVersion} at apply time; the earlier configuration chronology is not recorded`,
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
    changeNote: `live configuration captured by house rollout ${planVersion} before it was replaced (open revision ${open[0].revision} did not match the row)`,
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
  await ensureCurrentRecorded(client, row, plan.version);
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
  const windowSeconds = opts.quiescenceSeconds ?? DEFAULT_QUIESCENCE_SECONDS;
  if (!(Number.isFinite(windowSeconds) && windowSeconds > 0))
    throw new Error("quiescenceSeconds must be a positive number");
  if (opts.apply && opts.schedulerStopped !== true)
    throw new Error(
      "apply requires the scheduler to be stopped: stop it, wait out the quiescence window, then pass --scheduler-stopped",
    );
  const loadBundle = deps.loadBundle ?? defaultLoadBundle;
  const fleetActivity = deps.fleetActivity ?? readFleetActivity;
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
      const quiescence = judgeQuiescence(
        await fleetActivity(client),
        entries,
        windowSeconds,
      );
      await client.query("ROLLBACK");
      return { plan: plan.version, applied: false, entries, quiescence };
    } finally {
      client.release();
    }
  }

  const transaction = deps.transaction ?? maintenanceTransaction;
  const { entries, quiescence } = await transaction(pool, async (client) => {
    const evaluated = [];
    for (const s of staged)
      evaluated.push(await evaluateEntry(client, s, true));
    const reports = evaluated.map((e) => e.report);
    const evidence = judgeQuiescence(
      await fleetActivity(client),
      reports,
      windowSeconds,
    );
    // All or nothing: one rejected entry, or a scheduler that is not
    // verifiably stopped, rolls the whole plan back.
    if (reports.some((r) => r.decision === "reject") || !evidence.quiet)
      throw new HouseRolloutRejected(reports, evidence);
    for (const { report, row, next } of evaluated) {
      if (!row) continue;
      const entry = plan.entries.find((e) => e.handle === report.handle)!;
      if (report.decision === "apply" && next)
        await applyEntry(client, plan, entry, row, next);
      if (report.resume.eligible) await resumeEntry(client, row);
    }
    return { entries: reports, quiescence: evidence };
  });
  return { plan: plan.version, applied: true, entries, quiescence };
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
    lastRunAgeSeconds: number | null;
    claimLockVisible: boolean | null;
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
      lastRunAgeSeconds: row ? ageSeconds(row.last_run_age_seconds) : null,
      claimLockVisible: row?.claim_lock_visible ?? null,
    });
  }
  return out;
}
