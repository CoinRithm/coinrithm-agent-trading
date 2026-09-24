import { describe, expect, it, vi } from "vitest";
import type { Pool, PoolClient } from "pg";
import {
  contentHash,
  runHouseRollout,
  validatePlan,
  type LoadedBundle,
  type RolloutPlan,
} from "./houseRollout.js";

// Remaining decision branches of the rollout: missing rows, null owners,
// mechanical pins inside the spec, resume on a live agent, resume-only
// plans, and the three shapes ensureCurrentRecorded can meet.

type Row = Record<string, unknown> & { handle: string };
const base = (over: Partial<Row> = {}): Row => ({
  id: "3",
  handle: "mia-trend-rider",
  owner_user_id: "57",
  is_house: true,
  status: "active",
  disabled_reason: null,
  model_provider: "nvidia",
  model_name: "m",
  cadence_seconds: 180,
  spec: { killSwitch: { maxDrawdownMusd: 0 }, model: { provider: "nvidia" } },
  prose: "old",
  created_at: new Date(0),
  last_run_age_seconds: null,
  claim_lock_visible: false,
  ...over,
});
const hashOf = (row: Row) =>
  contentHash({
    prose: row.prose as string,
    spec: (row.spec as Record<string, unknown>) ?? {},
    cadenceSeconds: Number(row.cadence_seconds),
    modelProvider: row.model_provider as string,
    modelName: row.model_name as string,
  });

function db(opts: {
  rows: Row[];
  openRevision?: Record<string, unknown> | null;
  maxRevision?: number | null;
  insertReturnsNothing?: boolean;
}) {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const query = vi.fn(async (sql: string, params: unknown[] = []) => {
    queries.push({ sql, params });
    if (sql.includes("WHERE handle = $1")) {
      const row = opts.rows.find((r) => r.handle === params[0]);
      return { rows: row ? [row] : [] };
    }
    if (sql.includes("agent_cycles")) return { rows: [{ age: null }] };
    if (sql.includes("provider_capacity_leases")) return { rows: [{ n: 0 }] };
    if (sql.startsWith("SELECT") && sql.includes("ended_at IS NULL"))
      return { rows: opts.openRevision ? [opts.openRevision] : [] };
    if (sql.includes("SELECT max(revision)"))
      return { rows: [{ max: opts.maxRevision ?? null }] };
    if (sql.includes("INSERT INTO agent_runtime.agent_revisions"))
      return { rows: opts.insertReturnsNothing ? [] : [{ revision: 7 }] };
    return { rows: [] };
  });
  const client = { query, release: vi.fn() } as unknown as PoolClient;
  const pool = { connect: async () => client, query } as unknown as Pool;
  const transaction = async <T>(_p: Pool, op: (c: PoolClient) => Promise<T>) =>
    op(client);
  const inserts = () =>
    queries.filter((q) =>
      q.sql.includes("INSERT INTO agent_runtime.agent_revisions"),
    );
  return { pool, transaction, queries, inserts };
}

const plan = (
  entries: Array<Partial<RolloutPlan["entries"][number]> & { handle: string }>,
): RolloutPlan => ({
  version: "v",
  entries: entries.map((e) => ({
    bundlePath: "b",
    expectedContentHash: "a".repeat(64),
    ...e,
  })),
});
const bundle: LoadedBundle = {
  spec: { killSwitch: { maxDrawdownMusd: 0 } },
  prose: "new",
};
const APPLY = { apply: true, schedulerStopped: true } as const;

describe("house rollout: remaining branches", () => {
  it("rejects a handle with no row and a row with no owner", async () => {
    const orphan = base({
      handle: "contrarian-carl",
      id: "4",
      owner_user_id: null,
    });
    const d = db({ rows: [orphan] });
    const result = await runHouseRollout(
      d.pool,
      plan([
        { handle: "mia-trend-rider" },
        { handle: "contrarian-carl", expectedContentHash: hashOf(orphan) },
      ]),
      { apply: false },
      { loadBundle: () => bundle },
    );
    expect(result.entries[0]!.reasons).toEqual([
      "no agent row for this handle",
    ]);
    expect(result.entries[1]!.reasons.join(" ")).toMatch(
      /owner null is not the house owner 58/,
    );
  });

  it("rejects a live spec whose model pin is mechanical even when the column is not", async () => {
    const row = base({ spec: { model: { provider: "mechanical" } } });
    const d = db({ rows: [row] });
    const result = await runHouseRollout(
      d.pool,
      plan([{ handle: "mia-trend-rider", expectedContentHash: hashOf(row) }]),
      { apply: false },
      { loadBundle: () => bundle },
    );
    expect(result.entries[0]!.reasons).toEqual([
      "spec declares a mechanical provider",
    ]);
  });

  it("rejects a resume on an agent that is not disabled and explains a stop with no reason", async () => {
    const active = base();
    let d = db({ rows: [active] });
    let result = await runHouseRollout(
      d.pool,
      plan([
        {
          handle: "mia-trend-rider",
          expectedContentHash: hashOf(active),
          resume: true,
        },
      ]),
      { apply: false },
      { loadBundle: () => bundle },
    );
    expect(result.entries[0]!.resume.reason).toBe(
      "agent is active, nothing to resume",
    );
    expect(result.entries[0]!.decision).toBe("reject");

    const silent = base({ status: "disabled", disabled_reason: null });
    d = db({ rows: [silent] });
    result = await runHouseRollout(
      d.pool,
      plan([
        { handle: "mia-trend-rider", expectedContentHash: hashOf(silent) },
      ]),
      { apply: false },
      { loadBundle: () => bundle },
    );
    expect(result.entries[0]!.resume.reason).toBe(
      "stays stopped: no reason recorded",
    );
  });

  it("applies a resume-only plan: no revision, no spec write, just the resume", async () => {
    const stopped = base({
      status: "disabled",
      disabled_reason: "drawdown 12.00 >= 10",
    });
    const d = db({ rows: [stopped] });
    const result = await runHouseRollout(
      d.pool,
      plan([
        {
          handle: "mia-trend-rider",
          expectedContentHash: hashOf(stopped),
          resume: true,
        },
      ]),
      APPLY,
      {
        loadBundle: () => ({
          spec: stopped.spec as Record<string, unknown>,
          prose: "old",
        }),
        transaction: d.transaction,
      },
    );
    expect(result.entries[0]!.decision).toBe("resume_only");
    expect(d.inserts()).toEqual([]);
    expect(d.queries.some((q) => q.sql.includes("SET spec"))).toBe(false);
    expect(d.queries.some((q) => q.sql.includes("status = 'active'"))).toBe(
      true,
    );
  });

  it("leaves a matching open revision alone and recovers when history exists without an open row", async () => {
    const row = base();
    const matching = db({
      rows: [row],
      openRevision: {
        revision: 2,
        prose: row.prose,
        spec: row.spec,
        cadence_seconds: row.cadence_seconds,
        model_provider: row.model_provider,
        model_name: row.model_name,
      },
    });
    await runHouseRollout(
      matching.pool,
      plan([{ handle: "mia-trend-rider", expectedContentHash: hashOf(row) }]),
      APPLY,
      { loadBundle: () => bundle, transaction: matching.transaction },
    );
    expect(matching.inserts().map((q) => q.params[8])).toEqual(["owner"]);

    const closedHistory = db({
      rows: [row],
      maxRevision: 3,
      insertReturnsNothing: true,
    });
    await runHouseRollout(
      closedHistory.pool,
      plan([{ handle: "mia-trend-rider", expectedContentHash: hashOf(row) }]),
      APPLY,
      { loadBundle: () => bundle, transaction: closedHistory.transaction },
    );
    const recovered = closedHistory.inserts()[0]!;
    expect(recovered.params[8]).toBe("system_recovered");
    expect(recovered.params[7]).toBe(
      "live configuration captured by house rollout v before it was replaced",
    );
    expect(recovered.params[10]).toBe(false);
    expect(recovered.params[11]).toBeNull();
  });

  it("reports a non-Error thrown by the bundle loader as text", async () => {
    const row = base();
    const d = db({ rows: [row] });
    const result = await runHouseRollout(
      d.pool,
      plan([{ handle: "mia-trend-rider", expectedContentHash: hashOf(row) }]),
      { apply: false },
      {
        loadBundle: () => {
          throw "drift";
        },
      },
    );
    expect(result.entries[0]!.reasons).toEqual([
      "bundle failed hosted validation: drift",
    ]);
  });

  it("hashes a missing spec as an empty object and rejects a missing expected hash", () => {
    const state = {
      prose: "p",
      cadenceSeconds: 1,
      modelProvider: "a",
      modelName: "b",
    };
    expect(contentHash({ ...state, spec: undefined as never })).toBe(
      contentHash({ ...state, spec: {} }),
    );
    expect(() =>
      validatePlan({
        version: "v",
        entries: [{ handle: "mia-trend-rider", bundlePath: "b" } as never],
      }),
    ).toThrow(/sha256/);
  });
});
