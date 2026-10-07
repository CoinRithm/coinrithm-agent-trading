import { describe, expect, it, vi } from "vitest";
import type { Pool, PoolClient } from "pg";
import {
  contentHash,
  HouseRolloutRejected,
  runHouseRollout,
  validatePlan,
  type LoadedBundle,
  type RolloutPlan,
} from "./houseRollout.js";

// Template update for USER agents that still run an untouched house template
// (owner 2026-10-07, Telegram 56635). Every guard of the house rollout applies;
// the deploy choices survive; the revision is never presented as the user's.

type Row = {
  id: string;
  handle: string;
  owner_user_id: string | null;
  is_house: boolean;
  status: string;
  disabled_reason: string | null;
  model_provider: string;
  model_name: string;
  cadence_seconds: number;
  spec: Record<string, unknown>;
  prose: string;
  created_at: Date;
  last_run_age_seconds: number | null;
  claim_lock_visible: boolean;
};

const userModel = {
  provider: "nvidia",
  name: "nvidia/nemotron-3-super-120b-a12b",
};
// Shape of a deployed fork: the template spec plus name/venues/forkedFrom/model.
const userSpec = {
  name: "MrMoney",
  venues: ["futures", "pm"],
  forkedFrom: "Mia",
  model: userModel,
  risk: { maxLeverage: 4, watchlist: ["BTC", "ETH"] },
  capabilities: ["indicators", "universe_scan"],
};
const userRow = (over: Partial<Row> = {}): Row => ({
  id: "8",
  handle: "a12-mrmoney",
  owner_user_id: "11",
  is_house: false,
  status: "active",
  disabled_reason: null,
  model_provider: "nvidia",
  model_name: "nvidia/nemotron-3-super-120b-a12b",
  cadence_seconds: 180,
  spec: userSpec,
  prose: "Older Mia template prose.",
  created_at: new Date("2026-06-18T00:00:00.000Z"),
  last_run_age_seconds: 4000,
  claim_lock_visible: false,
  ...over,
});
const hashOf = (row: Row) =>
  contentHash({
    prose: row.prose,
    spec: row.spec,
    cadenceSeconds: row.cadence_seconds,
    modelProvider: row.model_provider,
    modelName: row.model_name,
  });

const template: LoadedBundle = {
  spec: {
    name: "Mia",
    venues: ["futures", "spot", "pm"],
    model: { provider: "anthropic", name: "claude-sonnet-4-6" },
    risk: {
      maxLeverage: 4,
      watchlist: ["BTC", "ETH"],
      pmMinEdgeGapPct: 16,
    },
    capabilities: ["indicators", "universe_scan"],
    universe: { rank: { min: 1, max: 100 }, excludeStablecoins: true },
  },
  prose: "Current Mia template prose.",
};

function fakeDb(rows: Row[]) {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  let revision = 1;
  const query = vi.fn(async (sql: string, params: unknown[] = []) => {
    queries.push({ sql, params });
    if (
      sql.includes("FROM agent_runtime.agents") &&
      sql.includes("WHERE handle = $1")
    ) {
      const row = rows.find((r) => r.handle === params[0]);
      return { rows: row ? [row] : [], rowCount: row ? 1 : 0 };
    }
    if (sql.includes("FROM agent_runtime.agent_cycles"))
      return { rows: [{ age: null }] };
    if (sql.includes("FROM agent_runtime.provider_capacity_leases"))
      return { rows: [{ n: "0" }] };
    if (
      sql.includes("FROM agent_runtime.agent_revisions") &&
      sql.includes("ended_at IS NULL")
    ) {
      // The open revision matches the live row (deploy revision).
      const row = rows[0]!;
      return {
        rows: [
          {
            revision: 1,
            prose: row.prose,
            spec: row.spec,
            cadence_seconds: row.cadence_seconds,
            model_provider: row.model_provider,
            model_name: row.model_name,
          },
        ],
      };
    }
    if (sql.includes("INSERT INTO agent_runtime.agent_revisions")) {
      revision += 1;
      return { rows: [{ revision }] };
    }
    return { rows: [], rowCount: 1 };
  });
  const client = { query, release: vi.fn() } as unknown as PoolClient;
  const pool = { connect: vi.fn(async () => client), query } as unknown as Pool;
  const transaction = async <T>(
    _pool: Pool,
    op: (c: PoolClient) => Promise<T>,
  ): Promise<T> => op(client);
  const writes = () =>
    queries.filter((q) => /^\s*(INSERT|UPDATE|DELETE)/i.test(q.sql));
  return { pool, writes, transaction };
}

const plan = (row: Row, over = {}): RolloutPlan => ({
  version: "granular-2026-10-07",
  entries: [
    {
      kind: "user_default",
      ownerUserId: 11,
      handle: row.handle,
      bundlePath: "examples/agents/mia-trend-rider",
      expectedContentHash: hashOf(row),
      ...over,
    },
  ],
});
const deps = (db: ReturnType<typeof fakeDb>) => ({
  loadBundle: () => template,
  transaction: db.transaction,
});
const APPLY = { apply: true, schedulerStopped: true } as const;

describe("validatePlan: user_default entries", () => {
  const base = plan(userRow()).entries[0]!;
  it("requires a positive integer owner", () => {
    expect(() =>
      validatePlan({
        version: "v",
        entries: [{ ...base, ownerUserId: undefined }],
      }),
    ).toThrow(/needs ownerUserId/);
    expect(() =>
      validatePlan({ version: "v", entries: [{ ...base, ownerUserId: 0 }] }),
    ).toThrow(/needs ownerUserId/);
  });
  it("never accepts a house handle, a resume, or an unknown kind", () => {
    expect(() =>
      validatePlan({
        version: "v",
        entries: [{ ...base, handle: "mia-trend-rider" }],
      }),
    ).toThrow(/house handle/);
    expect(() =>
      validatePlan({ version: "v", entries: [{ ...base, resume: true }] }),
    ).toThrow(/house-only/);
    expect(() =>
      validatePlan({
        version: "v",
        entries: [{ ...base, kind: "everyone" as never }],
      }),
    ).toThrow(/unknown kind/);
  });
  it("keeps house entries free of ownerUserId", () => {
    expect(() =>
      validatePlan({
        version: "v",
        entries: [
          {
            handle: "mia-trend-rider",
            bundlePath: "examples/agents/mia-trend-rider",
            expectedContentHash: "a".repeat(64),
            ownerUserId: 57,
          },
        ],
      }),
    ).toThrow(/ownerUserId is for user_default/);
  });
});

describe("user_default review (dry run)", () => {
  it("applies the current template but keeps the user's deploy choices", async () => {
    const row = userRow();
    const db = fakeDb([row]);
    const result = await runHouseRollout(
      db.pool,
      plan(row),
      { apply: false },
      deps(db),
    );
    const entry = result.entries[0]!;
    expect(entry.decision).toBe("apply");
    expect(entry.reasons).toEqual([]);
    expect(entry.liveModelPreserved).toBe(true);
    expect(entry.changedSpecKeys).toEqual(["risk", "universe"]);
    expect(db.writes()).toEqual([]);
  });

  it.each([
    ["a house row", { is_house: true }, /house agent, not a user agent/],
    ["another owner", { owner_user_id: "12" }, /not the reviewed owner 11/],
  ])("rejects %s", async (_label, over, reason) => {
    const row = userRow(over as Partial<Row>);
    const db = fakeDb([row]);
    const result = await runHouseRollout(
      db.pool,
      plan(row),
      { apply: false },
      deps(db),
    );
    expect(result.entries[0]!.decision).toBe("reject");
    expect(result.entries[0]!.reasons.join("; ")).toMatch(reason);
  });

  it("rejects an agent the user edited after review", async () => {
    const reviewed = userRow();
    const edited = userRow({ prose: "The user rewrote this." });
    const db = fakeDb([edited]);
    const result = await runHouseRollout(
      db.pool,
      plan(reviewed),
      { apply: false },
      deps(db),
    );
    expect(result.entries[0]!.decision).toBe("reject");
    expect(result.entries[0]!.reasons.join("; ")).toMatch(
      /differs from the reviewed baseline/,
    );
  });
});

describe("user_default apply", () => {
  it("writes a system template revision, never the user's, and keeps is_house false", async () => {
    const row = userRow();
    const db = fakeDb([row]);
    await runHouseRollout(db.pool, plan(row), APPLY, deps(db));
    const writes = db.writes();
    const revision = writes.find((w) =>
      w.sql.includes("INSERT INTO agent_runtime.agent_revisions"),
    )!;
    // [agentId, prose, spec, cadence, provider, model, hash, note, author, createdBy, ...]
    expect(revision.params[8]).toBe("system_template_update");
    expect(revision.params[9]).toBeNull();
    expect(String(revision.params[7])).toMatch(/previous version stays/);
    const spec = JSON.parse(String(revision.params[2]));
    expect(spec).toMatchObject({
      name: "MrMoney",
      venues: ["futures", "pm"],
      forkedFrom: "Mia",
      model: userModel,
      universe: { rank: { min: 1, max: 100 } },
    });
    const update = writes.find((w) =>
      w.sql.includes("UPDATE agent_runtime.agents"),
    )!;
    expect(update.sql).toContain("is_house = $4");
    expect(update.params[3]).toBe(false);
    expect(update.params[2]).toBe("Current Mia template prose.");
  });

  it("writes nothing when any entry is rejected", async () => {
    const row = userRow({ owner_user_id: "99" });
    const db = fakeDb([row]);
    await expect(
      runHouseRollout(db.pool, plan(row), APPLY, deps(db)),
    ).rejects.toBeInstanceOf(HouseRolloutRejected);
    expect(db.writes()).toEqual([]);
  });
});
