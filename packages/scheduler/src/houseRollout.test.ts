import { describe, expect, it, vi } from "vitest";
import type { Pool, PoolClient } from "pg";
import {
  HOUSE_ROSTER,
  HouseRolloutRejected,
  contentHash,
  runHouseRollout,
  stableStringify,
  validatePlan,
  type LoadedBundle,
  type RolloutPlan,
} from "./houseRollout.js";

// Vector computed with backend-v2's own revisionWrite.contentHash (2026-09-24):
// the scheduler port must agree byte for byte or revisions written here would
// look like foreign edits to the backend.
const BACKEND_VECTOR = {
  state: {
    prose: "Line one.\nLine two with ünicode.",
    spec: { b: 1, a: { d: 2, c: [1, { z: true, y: null }] }, u: undefined },
    cadenceSeconds: 180,
    modelProvider: "nvidia",
    modelName: "nvidia/nemotron-3-super-120b-a12b",
  },
  stable: '{"a":{"c":[1,{"y":null,"z":true}],"d":2},"b":1}',
  hash: "9828a488d300152f1b3fdd7eaf68563baa9922f41d2fb1d1921c1156861552ae",
};

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
  run_locked: boolean;
};

const liveSpec = {
  killSwitch: { maxDrawdownMusd: 6000, maxConsecutiveRejects: 5 },
  capabilities: ["indicators"],
};
const liveRow = (over: Partial<Row> = {}): Row => ({
  id: "3",
  handle: "mia-trend-rider",
  owner_user_id: "57",
  is_house: true,
  status: "active",
  disabled_reason: null,
  model_provider: "nvidia",
  model_name: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning",
  cadence_seconds: 180,
  spec: liveSpec,
  prose: "Old persona prose.",
  created_at: new Date("2026-08-01T00:00:00.000Z"),
  run_locked: false,
  ...over,
});
const liveHash = (row: Row) =>
  contentHash({
    prose: row.prose,
    spec: row.spec,
    cadenceSeconds: row.cadence_seconds,
    modelProvider: row.model_provider,
    modelName: row.model_name,
  });

const nextBundle: LoadedBundle = {
  spec: {
    killSwitch: { maxDrawdownMusd: 0, maxConsecutiveRejects: 5 },
    capabilities: ["indicators"],
  },
  prose: "New persona prose, reviewed.",
};

/** Fake database: rows by handle, optional open revision, recorded queries. */
function fakeDb(opts: {
  rows: Row[];
  openRevision?: {
    prose: string;
    spec: Record<string, unknown>;
    cadence_seconds: number;
    model_provider: string;
    model_name: string;
  } | null;
  maxRevision?: number | null;
}) {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  let revisionCounter = opts.maxRevision ?? 0;
  const query = vi.fn(async (sql: string, params: unknown[] = []) => {
    queries.push({ sql, params });
    if (
      sql.includes("FROM agent_runtime.agents") &&
      sql.includes("WHERE handle = $1")
    ) {
      const row = opts.rows.find((r) => r.handle === params[0]);
      return { rows: row ? [row] : [], rowCount: row ? 1 : 0 };
    }
    if (
      sql.includes("FROM agent_runtime.agent_revisions") &&
      sql.includes("ended_at IS NULL")
    ) {
      return {
        rows: opts.openRevision
          ? [{ revision: revisionCounter, ...opts.openRevision }]
          : [],
      };
    }
    if (sql.includes("SELECT max(revision)")) {
      return { rows: [{ max: opts.maxRevision ?? null }] };
    }
    if (sql.includes("INSERT INTO agent_runtime.agent_revisions")) {
      revisionCounter += 1;
      return { rows: [{ revision: revisionCounter }] };
    }
    return { rows: [], rowCount: 1 };
  });
  const client = { query, release: vi.fn() } as unknown as PoolClient;
  const pool = {
    connect: vi.fn(async () => client),
    query,
  } as unknown as Pool;
  const transaction = async <T>(
    _pool: Pool,
    op: (c: PoolClient) => Promise<T>,
  ): Promise<T> => op(client);
  const writes = () =>
    queries.filter((q) => /^\s*(INSERT|UPDATE|DELETE)/i.test(q.sql));
  return { pool, client, queries, writes, transaction };
}

const plan = (
  over: Partial<RolloutPlan["entries"][number]> = {},
  version = "personas-v2",
): RolloutPlan => ({
  version,
  entries: [
    {
      handle: "mia-trend-rider",
      bundlePath: "examples/agents/mia-trend-rider",
      expectedContentHash: liveHash(liveRow()),
      ...over,
    },
  ],
});
const loadBundle = () => nextBundle;

describe("house rollout: contract pins", () => {
  it("hashes exactly like backend-v2 revisionWrite (pinned vector)", () => {
    expect(stableStringify(BACKEND_VECTOR.state.spec)).toBe(
      BACKEND_VECTOR.stable,
    );
    expect(contentHash(BACKEND_VECTOR.state as never)).toBe(
      BACKEND_VECTOR.hash,
    );
  });

  it("targets exactly the five house identities", () => {
    expect(HOUSE_ROSTER.map((h) => [h.handle, h.owner])).toEqual([
      ["mia-trend-rider", 57],
      ["contrarian-carl", 58],
      ["leo-breakout-hunter", 59],
      ["olivia-calibrated-quant", 60],
      ["sam-risk-managed-swinger", 61],
    ]);
  });

  it("rejects plans that name a non-house handle, a duplicate, or a bad hash", () => {
    expect(() => validatePlan(plan({ handle: "a94-1fgent" }))).toThrow(
      /not a house/,
    );
    expect(() =>
      validatePlan({
        version: "v",
        entries: [plan().entries[0]!, plan().entries[0]!],
      }),
    ).toThrow(/listed twice/);
    expect(() => validatePlan(plan({ expectedContentHash: "nope" }))).toThrow(
      /sha256/,
    );
  });
});

describe("house rollout: dry run", () => {
  it("reports the decision, hashes and changed keys and writes nothing", async () => {
    const db = fakeDb({ rows: [liveRow()] });
    const result = await runHouseRollout(
      db.pool,
      plan(),
      { apply: false },
      { loadBundle },
    );
    expect(result.applied).toBe(false);
    const [entry] = result.entries;
    expect(entry!.decision).toBe("apply");
    expect(entry!.agentId).toBe(3);
    expect(entry!.currentHash).toBe(liveHash(liveRow()));
    expect(entry!.nextHash).not.toBe(entry!.currentHash);
    expect(entry!.changedSpecKeys).toEqual(["killSwitch"]);
    expect(entry!.proseChars).toBe(nextBundle.prose.length);
    expect(db.writes()).toEqual([]);
    // Row reads in dry run never lock.
    expect(db.queries.some((q) => q.sql.includes("FOR UPDATE"))).toBe(false);
  });

  it("rejects when the live configuration drifted from the reviewed baseline", async () => {
    const db = fakeDb({
      rows: [liveRow({ prose: "Someone edited this since review." })],
    });
    const result = await runHouseRollout(
      db.pool,
      plan(),
      { apply: false },
      { loadBundle },
    );
    expect(result.entries[0]!.decision).toBe("reject");
    expect(result.entries[0]!.reasons.join(" ")).toMatch(
      /differs from the reviewed baseline/,
    );
  });

  it("rejects the wrong owner, a non-house row, a mechanical provider and a running claim", async () => {
    for (const [over, reason] of [
      [{ owner_user_id: "99" }, /not the house owner/],
      [{ is_house: false }, /not a house agent/],
      [{ model_provider: "mechanical" }, /mechanical/],
      [{ run_locked: true }, /cycle in flight/],
    ] as const) {
      const row = liveRow(over);
      const db = fakeDb({ rows: [row] });
      const result = await runHouseRollout(
        db.pool,
        plan({ expectedContentHash: liveHash(row) }),
        { apply: false },
        { loadBundle },
      );
      expect(result.entries[0]!.decision).toBe("reject");
      expect(result.entries[0]!.reasons.join(" ")).toMatch(reason);
    }
  });

  it("rejects a bundle that fails hosted validation", async () => {
    const db = fakeDb({ rows: [liveRow()] });
    const result = await runHouseRollout(
      db.pool,
      plan(),
      { apply: false },
      {
        loadBundle: () => {
          throw new Error("prose exceeds the hosted limit");
        },
      },
    );
    expect(result.entries[0]!.decision).toBe("reject");
    expect(result.entries[0]!.reasons.join(" ")).toMatch(
      /hosted validation: prose exceeds/,
    );
  });

  it("is a noop when the reviewed bundle equals the live configuration", async () => {
    const row = liveRow();
    const db = fakeDb({ rows: [row] });
    const result = await runHouseRollout(
      db.pool,
      plan(),
      { apply: false },
      {
        loadBundle: () => ({ spec: row.spec, prose: row.prose }),
      },
    );
    expect(result.entries[0]!.decision).toBe("noop");
  });

  it("judges resume eligibility from the stop reason and the reviewed drawdown policy", async () => {
    const stopped = liveRow({
      status: "disabled",
      disabled_reason: "drawdown 6064.25 >= 6000",
    });
    const eligible = await runHouseRollout(
      fakeDb({ rows: [stopped] }).pool,
      plan({ expectedContentHash: liveHash(stopped), resume: true }),
      { apply: false },
      { loadBundle },
    );
    expect(eligible.entries[0]!.decision).toBe("apply");
    expect(eligible.entries[0]!.resume).toMatchObject({
      requested: true,
      eligible: true,
    });

    const keepsPolicy = await runHouseRollout(
      fakeDb({ rows: [stopped] }).pool,
      plan({ expectedContentHash: liveHash(stopped), resume: true }),
      { apply: false },
      {
        loadBundle: () => ({
          ...nextBundle,
          spec: { ...nextBundle.spec, killSwitch: { maxDrawdownMusd: 6000 } },
        }),
      },
    );
    expect(keepsPolicy.entries[0]!.decision).toBe("reject");
    expect(keepsPolicy.entries[0]!.reasons.join(" ")).toMatch(
      /without an off drawdown policy/,
    );

    const setupStop = liveRow({
      status: "disabled",
      disabled_reason: "setup: bad config",
    });
    const wrongReason = await runHouseRollout(
      fakeDb({ rows: [setupStop] }).pool,
      plan({ expectedContentHash: liveHash(setupStop), resume: true }),
      { apply: false },
      { loadBundle },
    );
    expect(wrongReason.entries[0]!.reasons.join(" ")).toMatch(
      /non-drawdown stop/,
    );

    const notRequested = await runHouseRollout(
      fakeDb({ rows: [stopped] }).pool,
      plan({ expectedContentHash: liveHash(stopped) }),
      { apply: false },
      { loadBundle },
    );
    expect(notRequested.entries[0]!.decision).toBe("apply");
    expect(notRequested.entries[0]!.resume).toMatchObject({
      requested: false,
      eligible: false,
    });
    expect(notRequested.entries[0]!.resume.reason).toMatch(/stays stopped/);
  });
});

describe("house rollout: apply", () => {
  it("records the outgoing baseline, the new revision and the spec/prose update in order, touching nothing else", async () => {
    const row = liveRow();
    const db = fakeDb({ rows: [row] });
    const result = await runHouseRollout(
      db.pool,
      plan(),
      { apply: true },
      {
        loadBundle,
        transaction: db.transaction,
      },
    );
    expect(result.applied).toBe(true);
    expect(result.entries[0]!.decision).toBe("apply");
    // The row was locked for the write.
    expect(db.queries.some((q) => q.sql.includes("FOR UPDATE NOWAIT"))).toBe(
      true,
    );
    const writes = db.writes();
    // 1) no history -> baseline of the LIVE state dated from the agent's birth
    const baseline = writes.find(
      (q) =>
        q.sql.includes("INSERT INTO agent_runtime.agent_revisions") &&
        q.params[8] === "system_backfill",
    )!;
    expect(baseline).toBeTruthy();
    expect(baseline.params[1]).toBe(row.prose);
    expect(baseline.params[6]).toBe(liveHash(row));
    expect(baseline.params[10]).toBe(true); // is_baseline
    expect(baseline.params[11]).toEqual(row.created_at);
    // 2) the new revision: owner-authored by the house owner, hashed like the backend
    const next = writes.find(
      (q) =>
        q.sql.includes("INSERT INTO agent_runtime.agent_revisions") &&
        q.params[8] === "owner",
    )!;
    expect(next.params[1]).toBe(nextBundle.prose);
    expect(next.params[6]).toBe(result.entries[0]!.nextHash);
    expect(next.params[7]).toBe("house persona rollout personas-v2");
    expect(next.params[9]).toBe(57);
    expect(next.params[10]).toBe(false);
    expect(writes.indexOf(baseline)).toBeLessThan(writes.indexOf(next));
    // 3) the agents update carries spec + prose only
    const update = writes.find(
      (q) =>
        q.sql.includes("UPDATE agent_runtime.agents") &&
        q.sql.includes("SET spec"),
    )!;
    expect(update.sql).not.toMatch(/model_|cadence|key_enc|status|next_run_at/);
    expect(update.params).toEqual([
      3,
      JSON.stringify(nextBundle.spec),
      nextBundle.prose,
    ]);
    expect(writes.indexOf(next)).toBeLessThan(writes.indexOf(update));
    // No resume, no state touch, no deletion, no pruning.
    expect(writes.some((q) => q.sql.includes("agent_state"))).toBe(false);
    expect(writes.some((q) => /DELETE/i.test(q.sql))).toBe(false);
    expect(writes.some((q) => q.sql.includes("status = 'active'"))).toBe(false);
  });

  it("records a recovered revision when the open revision no longer matches the live row", async () => {
    const row = liveRow();
    const db = fakeDb({
      rows: [row],
      openRevision: {
        prose: "Older prose the API last recorded.",
        spec: row.spec,
        cadence_seconds: row.cadence_seconds,
        model_provider: row.model_provider,
        model_name: row.model_name,
      },
      maxRevision: 4,
    });
    await runHouseRollout(
      db.pool,
      plan(),
      { apply: true },
      { loadBundle, transaction: db.transaction },
    );
    const authors = db
      .writes()
      .filter((q) =>
        q.sql.includes("INSERT INTO agent_runtime.agent_revisions"),
      )
      .map((q) => q.params[8]);
    expect(authors).toEqual(["system_recovered", "owner"]);
  });

  it("resumes an intended drawdown stop by clearing the flag and reason only", async () => {
    const stopped = liveRow({
      status: "disabled",
      disabled_reason: "drawdown 6064.25 >= 6000",
    });
    const db = fakeDb({ rows: [stopped] });
    await runHouseRollout(
      db.pool,
      plan({ expectedContentHash: liveHash(stopped), resume: true }),
      { apply: true },
      { loadBundle, transaction: db.transaction },
    );
    const writes = db.writes();
    const agents = writes.find((q) => q.sql.includes("status = 'active'"))!;
    expect(agents.sql).toMatch(/disabled_reason = NULL/);
    expect(agents.params).toEqual([3]);
    const state = writes.find((q) =>
      q.sql.includes("agent_runtime.agent_state"),
    )!;
    expect(state.sql).toContain(
      `(state - 'disabledReason') || '{"disabled":false}'::jsonb`,
    );
    expect(state.sql).not.toMatch(/peak|realized|consecutive|rateLimit/);
  });

  it("rolls the whole plan back when any entry is rejected", async () => {
    const good = liveRow();
    const drifted = liveRow({
      id: "4",
      handle: "contrarian-carl",
      owner_user_id: "58",
      prose: "edited",
    });
    const db = fakeDb({ rows: [good, drifted] });
    const twoEntries: RolloutPlan = {
      version: "v",
      entries: [
        plan().entries[0]!,
        {
          handle: "contrarian-carl",
          bundlePath: "examples/agents/contrarian-carl",
          expectedContentHash: liveHash(liveRow({ handle: "contrarian-carl" })),
        },
      ],
    };
    await expect(
      runHouseRollout(
        db.pool,
        twoEntries,
        { apply: true },
        { loadBundle, transaction: db.transaction },
      ),
    ).rejects.toBeInstanceOf(HouseRolloutRejected);
    expect(db.writes()).toEqual([]);
  });
});
