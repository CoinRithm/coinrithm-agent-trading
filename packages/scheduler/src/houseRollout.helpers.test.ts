import { describe, expect, it, vi } from "vitest";
import type { Pool, PoolClient } from "pg";

// The engine's hosted loader is mocked here so defaultLoadBundle's capability
// union can be exercised without a bundle on disk; the real loader runs in
// the CLI smoke path (see the PR receipt) and in the mcp-trading suite.
vi.mock("@coinrithm/mcp-trading/engine", () => ({
  loadAgent: vi.fn((path: string) => {
    if (path === "with-caps")
      return {
        spec: { capabilities: ["news", "indicators"] },
        body: "p",
        raw: {},
      };
    if (path === "bad-caps")
      return { spec: { capabilities: "x" }, body: "p", raw: {} };
    return { spec: {}, body: "prose only", raw: {} };
  }),
}));

import {
  HouseRolloutRejected,
  contentHash,
  defaultLoadBundle,
  readFleetActivity,
  readHouseState,
  runHouseRollout,
  validatePlan,
  type EntryReport,
  type RolloutPlan,
} from "./houseRollout.js";

const entry = (over: Partial<EntryReport> = {}): EntryReport => ({
  handle: "mia-trend-rider",
  agentId: 3,
  decision: "reject",
  reasons: ["x"],
  currentHash: null,
  nextHash: null,
  proseChars: null,
  changedSpecKeys: [],
  liveModelPreserved: false,
  status: null,
  disabledReason: null,
  lastRunAgeSeconds: null,
  claimLockVisible: false,
  resume: { requested: false, eligible: false, reason: "" },
  ...over,
});

describe("house rollout helpers", () => {
  it("defaultLoadBundle unions the house capability without duplicating it", () => {
    expect(defaultLoadBundle("with-caps").spec.capabilities).toEqual([
      "news",
      "indicators",
    ]);
    expect(defaultLoadBundle("none")).toEqual({
      spec: { capabilities: ["indicators"] },
      prose: "prose only",
    });
    // A malformed capabilities value is replaced, never spread.
    expect(defaultLoadBundle("bad-caps").spec.capabilities).toEqual([
      "indicators",
    ]);
  });

  it("validatePlan rejects a missing version, empty entries and a missing bundle path", () => {
    expect(() => validatePlan({ version: " ", entries: [] })).toThrow(
      /version is required/,
    );
    expect(() => validatePlan({ version: "v", entries: [] })).toThrow(
      /non-empty array/,
    );
    expect(() =>
      validatePlan({
        version: "v",
        entries: [
          {
            handle: "mia-trend-rider",
            bundlePath: "",
            expectedContentHash: "a".repeat(64),
          },
        ],
      }),
    ).toThrow(/bundlePath is required/);
  });

  it("readFleetActivity maps an empty cycle table and stringly counts", async () => {
    const client = {
      query: vi.fn(async (sql: string) =>
        sql.includes("agent_cycles")
          ? { rows: [{ age: null }] }
          : { rows: [{ n: "3" }] },
      ),
    } as unknown as PoolClient;
    expect(await readFleetActivity(client)).toEqual({
      lastCycleAgeSeconds: null,
      activeLeases: 3,
    });
    const numeric = {
      query: vi.fn(async (sql: string) =>
        sql.includes("agent_cycles")
          ? { rows: [{ age: "12.5" }] }
          : { rows: [] },
      ),
    } as unknown as PoolClient;
    expect(await readFleetActivity(numeric)).toEqual({
      lastCycleAgeSeconds: 12.5,
      activeLeases: 0,
    });
    const nonFinite = {
      query: vi.fn(async (sql: string) =>
        sql.includes("agent_cycles")
          ? { rows: [{ age: "not-a-number" }] }
          : { rows: [{ n: 0 }] },
      ),
    } as unknown as PoolClient;
    expect((await readFleetActivity(nonFinite)).lastCycleAgeSeconds).toBeNull();
  });

  it("readHouseState reports every house handle, present or not", async () => {
    const present = {
      id: "9",
      handle: "contrarian-carl",
      owner_user_id: "58",
      is_house: true,
      status: "disabled",
      disabled_reason: "equity drawdown >= 6000",
      model_provider: "nvidia",
      model_name: "m",
      cadence_seconds: "240",
      spec: null,
      prose: "p",
      created_at: new Date(),
      last_run_age_seconds: "700.2",
      claim_lock_visible: false,
    };
    const pool = {
      query: vi.fn(async (_sql: string, params: unknown[]) => ({
        rows: params[0] === "contrarian-carl" ? [present] : [],
      })),
    } as unknown as Pool;
    const state = await readHouseState(pool);
    expect(state.map((s) => s.handle)).toEqual([
      "mia-trend-rider",
      "contrarian-carl",
      "leo-breakout-hunter",
      "olivia-calibrated-quant",
      "sam-risk-managed-swinger",
    ]);
    expect(state[1]).toEqual({
      handle: "contrarian-carl",
      agentId: 9,
      status: "disabled",
      disabledReason: "equity drawdown >= 6000",
      contentHash: contentHash({
        prose: "p",
        spec: {},
        cadenceSeconds: 240,
        modelProvider: "nvidia",
        modelName: "m",
      }),
      lastRunAgeSeconds: 700.2,
      claimLockVisible: false,
    });
    expect(state[0]).toEqual({
      handle: "mia-trend-rider",
      agentId: null,
      status: null,
      disabledReason: null,
      contentHash: null,
      lastRunAgeSeconds: null,
      claimLockVisible: null,
    });
  });

  it("HouseRolloutRejected names rejected entries and a non-quiescent scheduler", () => {
    const withBoth = new HouseRolloutRejected([entry()], {
      windowSeconds: 360,
      lastCycleAgeSeconds: 5,
      activeLeases: 0,
      houseActivity: [],
      quiet: false,
      reasons: ["a cycle was recorded 5 s ago (window 360 s)"],
    });
    expect(withBoth.message).toBe(
      "house rollout rejected: mia-trend-rider (x), database activity markers present (a cycle was recorded 5 s ago (window 360 s))",
    );
    const entriesOnly = new HouseRolloutRejected([
      entry({ decision: "apply", reasons: [] }),
      entry({ handle: "leo-breakout-hunter", reasons: ["y", "z"] }),
    ]);
    expect(entriesOnly.message).toBe(
      "house rollout rejected: leo-breakout-hunter (y; z)",
    );
    expect(entriesOnly.quiescence).toBeNull();
    expect(entriesOnly.name).toBe("HouseRolloutRejected");
  });

  it("collapses control characters and whitespace in a change note and caps it at 200 chars", async () => {
    const row = {
      id: "3",
      handle: "mia-trend-rider",
      owner_user_id: "57",
      is_house: true,
      status: "active",
      disabled_reason: null,
      model_provider: "nvidia",
      model_name: "m",
      cadence_seconds: 180,
      spec: {},
      prose: "old",
      created_at: new Date(0),
      last_run_age_seconds: null,
      claim_lock_visible: false,
    };
    const queries: Array<{ sql: string; params: unknown[] }> = [];
    const query = vi.fn(async (sql: string, params: unknown[] = []) => {
      queries.push({ sql, params });
      if (sql.includes("WHERE handle = $1")) return { rows: [row] };
      if (sql.includes("agent_cycles")) return { rows: [{ age: null }] };
      if (sql.includes("provider_capacity_leases")) return { rows: [{ n: 0 }] };
      if (sql.includes("ended_at IS NULL") && sql.startsWith("SELECT"))
        return { rows: [] };
      if (sql.includes("SELECT max(revision)"))
        return { rows: [{ max: null }] };
      if (sql.includes("INSERT INTO agent_runtime.agent_revisions"))
        return { rows: [{ revision: 1 }] };
      return { rows: [] };
    });
    const client = { query, release: vi.fn() } as unknown as PoolClient;
    const pool = { connect: async () => client, query } as unknown as Pool;
    const plan: RolloutPlan = {
      version: "v",
      entries: [
        {
          handle: "mia-trend-rider",
          bundlePath: "none",
          expectedContentHash: contentHash({
            prose: "old",
            spec: {},
            cadenceSeconds: 180,
            modelProvider: "nvidia",
            modelName: "m",
          }),
          changeNote: `  tab\there\u0000 and\nnewline ${"x".repeat(300)}`,
        },
      ],
    };
    await runHouseRollout(
      pool,
      plan,
      { apply: true, schedulerStopped: true },
      {
        loadBundle: () => ({ spec: { a: 1 }, prose: "new" }),
        transaction: async (_p, op) => op(client),
      },
    );
    const owner = queries.find(
      (q) =>
        q.sql.includes("INSERT INTO agent_runtime.agent_revisions") &&
        q.params[8] === "owner",
    )!;
    const note = owner.params[7] as string;
    expect(note.startsWith("tab here and newline xxx")).toBe(true);
    expect(note).toHaveLength(200);
    expect([...note].some((ch) => (ch.codePointAt(0) ?? 0) < 0x20)).toBe(false);
  });
});
