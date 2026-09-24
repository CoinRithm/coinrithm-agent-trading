import { describe, expect, it, vi } from "vitest";
import type { Pool, PoolClient } from "pg";
import {
  DRAWDOWN_STOP_RE,
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
  last_run_age_seconds: number | null;
  claim_lock_visible: boolean;
};

const liveModel = {
  provider: "nvidia",
  name: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning",
  baseUrl: null,
};
const liveSpec = {
  killSwitch: { maxDrawdownMusd: 6000, maxConsecutiveRejects: 5 },
  capabilities: ["indicators"],
  model: liveModel,
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
  last_run_age_seconds: 4000,
  claim_lock_visible: false,
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

// The bundle carries the public default model block; the house never runs it.
const nextBundle: LoadedBundle = {
  spec: {
    killSwitch: { maxDrawdownMusd: 0, maxConsecutiveRejects: 5 },
    capabilities: ["indicators"],
    model: { provider: "anthropic", name: "claude-sonnet-4-6" },
  },
  prose: "New persona prose, reviewed.",
};

/** Fake database: rows by handle, optional open revision, fleet activity,
 * recorded queries. Quiet fleet unless told otherwise. */
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
  lastCycleAgeSeconds?: number | null;
  activeLeases?: number;
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
    if (sql.includes("FROM agent_runtime.agent_cycles"))
      return { rows: [{ age: opts.lastCycleAgeSeconds ?? null }] };
    if (sql.includes("FROM agent_runtime.provider_capacity_leases"))
      return { rows: [{ n: String(opts.activeLeases ?? 0) }] };
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
const APPLY = { apply: true, schedulerStopped: true } as const;

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

  it("recognises only the runtime's two drawdown stop strings", () => {
    expect(DRAWDOWN_STOP_RE.test("drawdown 6064.25 >= 6000")).toBe(true);
    expect(DRAWDOWN_STOP_RE.test("equity drawdown >= 6000")).toBe(true);
    expect(DRAWDOWN_STOP_RE.test("drawdown 12 >= 10.5")).toBe(true);
    for (const s of [
      "provider error discussing drawdown",
      "model_unavailable: drawdown 1 >= 2",
      "drawdown 6064.25 >= 6000 (manual)",
      "setup: bad config",
      "kill-switch",
      "",
    ])
      expect(DRAWDOWN_STOP_RE.test(s)).toBe(false);
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
  it("reports the decision, hashes, changed keys and quiescence and writes nothing", async () => {
    const db = fakeDb({ rows: [liveRow()], lastCycleAgeSeconds: 12 });
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
    expect(entry!.liveModelPreserved).toBe(true);
    expect(entry!.proseChars).toBe(nextBundle.prose.length);
    expect(entry!.lastRunAgeSeconds).toBe(4000);
    expect(entry!.claimLockVisible).toBe(false);
    // A running scheduler shows up in the dry run so the operator stops it.
    expect(result.quiescence).toMatchObject({
      windowSeconds: 360,
      lastCycleAgeSeconds: 12,
      activeLeases: 0,
      quiet: false,
    });
    expect(result.quiescence.reasons.join(" ")).toMatch(/recorded 12 s ago/);
    expect(db.writes()).toEqual([]);
    // Row reads in dry run never lock.
    expect(db.queries.some((q) => q.sql.includes("FOR UPDATE"))).toBe(false);
  });

  it("carries the live spec.model pin into the new spec and only uses the bundle's when none is live", async () => {
    const withPin = liveRow();
    let db = fakeDb({ rows: [withPin] });
    let result = await runHouseRollout(
      db.pool,
      plan({ expectedContentHash: liveHash(withPin) }),
      APPLY,
      { loadBundle, transaction: db.transaction },
    );
    const update = db
      .writes()
      .find(
        (q) =>
          q.sql.includes("UPDATE agent_runtime.agents") &&
          q.sql.includes("SET spec"),
      )!;
    expect(JSON.parse(update.params[1] as string).model).toEqual(liveModel);
    expect(result.entries[0]!.liveModelPreserved).toBe(true);
    expect(result.entries[0]!.changedSpecKeys).not.toContain("model");

    const { model: _dropped, ...specWithoutModel } = liveSpec;
    void _dropped;
    const noPin = liveRow({ spec: specWithoutModel });
    db = fakeDb({ rows: [noPin] });
    result = await runHouseRollout(
      db.pool,
      plan({ expectedContentHash: liveHash(noPin) }),
      APPLY,
      { loadBundle, transaction: db.transaction },
    );
    const update2 = db
      .writes()
      .find(
        (q) =>
          q.sql.includes("UPDATE agent_runtime.agents") &&
          q.sql.includes("SET spec"),
      )!;
    expect(JSON.parse(update2.params[1] as string).model).toEqual(
      nextBundle.spec.model,
    );
    expect(result.entries[0]!.liveModelPreserved).toBe(false);
    expect(result.entries[0]!.changedSpecKeys).toContain("model");
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

  it("rejects the wrong owner, a non-house row, a mechanical provider and a visible claim lock", async () => {
    for (const [over, reason] of [
      [{ owner_user_id: "99" }, /not the house owner/],
      [{ is_house: false }, /not a house agent/],
      [{ model_provider: "mechanical" }, /mechanical/],
      [{ claim_lock_visible: true }, /claim lock visible/],
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

  it("judges resume eligibility from the exact stop format and the reviewed drawdown policy", async () => {
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

    const equityStop = liveRow({
      status: "disabled",
      disabled_reason: "equity drawdown >= 6000",
    });
    const eligible2 = await runHouseRollout(
      fakeDb({ rows: [equityStop] }).pool,
      plan({ expectedContentHash: liveHash(equityStop), resume: true }),
      { apply: false },
      { loadBundle },
    );
    expect(eligible2.entries[0]!.resume.eligible).toBe(true);

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

    for (const reason of [
      "setup: bad config",
      "provider error discussing drawdown",
    ]) {
      const other = liveRow({ status: "disabled", disabled_reason: reason });
      const wrongReason = await runHouseRollout(
        fakeDb({ rows: [other] }).pool,
        plan({ expectedContentHash: liveHash(other), resume: true }),
        { apply: false },
        { loadBundle },
      );
      expect(wrongReason.entries[0]!.decision).toBe("reject");
      expect(wrongReason.entries[0]!.reasons.join(" ")).toMatch(
        /non-drawdown stop/,
      );
    }

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
  it("refuses to apply without the operator's scheduler-stopped assertion, before touching the database", async () => {
    const db = fakeDb({ rows: [liveRow()] });
    await expect(
      runHouseRollout(
        db.pool,
        plan(),
        { apply: true },
        { loadBundle, transaction: db.transaction },
      ),
    ).rejects.toThrow(/requires the scheduler to be stopped/);
    expect(db.queries).toEqual([]);
  });

  it.each([
    [{ lastCycleAgeSeconds: 45 }, /recorded 45 s ago/],
    [{ activeLeases: 2 }, /2 capacity lease/],
  ])(
    "rolls back when the fleet is still active: %j",
    async (activity, reason) => {
      const db = fakeDb({ rows: [liveRow()], ...activity });
      await expect(
        runHouseRollout(db.pool, plan(), APPLY, {
          loadBundle,
          transaction: db.transaction,
        }),
      ).rejects.toSatisfy(
        (e: unknown) =>
          e instanceof HouseRolloutRejected &&
          e.quiescence !== null &&
          !e.quiescence.quiet &&
          reason.test(e.quiescence.reasons.join(" ")),
      );
      expect(db.writes()).toEqual([]);
    },
  );

  it("rolls back when a house row was claimed inside the window", async () => {
    const recent = liveRow({ last_run_age_seconds: 200 });
    const db = fakeDb({ rows: [recent] });
    await expect(
      runHouseRollout(
        db.pool,
        plan({ expectedContentHash: liveHash(recent) }),
        APPLY,
        { loadBundle, transaction: db.transaction },
      ),
    ).rejects.toThrow(/house claim inside the window: mia-trend-rider/);
    expect(db.writes()).toEqual([]);
    // The same row is fine once the window has passed.
    const old = liveRow({ last_run_age_seconds: 361 });
    const db2 = fakeDb({ rows: [old], lastCycleAgeSeconds: 361 });
    const result = await runHouseRollout(
      db2.pool,
      plan({ expectedContentHash: liveHash(old) }),
      APPLY,
      { loadBundle, transaction: db2.transaction },
    );
    expect(result.applied).toBe(true);
    expect(result.quiescence.quiet).toBe(true);
  });

  it("honours a custom quiescence window", async () => {
    const db = fakeDb({ rows: [liveRow()], lastCycleAgeSeconds: 100 });
    const result = await runHouseRollout(
      db.pool,
      plan(),
      { ...APPLY, quiescenceSeconds: 90 },
      { loadBundle, transaction: db.transaction },
    );
    expect(result.quiescence).toMatchObject({ windowSeconds: 90, quiet: true });
    await expect(
      runHouseRollout(
        db.pool,
        plan(),
        { ...APPLY, quiescenceSeconds: 0 },
        { loadBundle, transaction: db.transaction },
      ),
    ).rejects.toThrow(/positive number/);
  });

  it("records the outgoing baseline, the new revision and the spec/prose update in order, touching nothing else", async () => {
    const row = liveRow();
    const db = fakeDb({ rows: [row] });
    const result = await runHouseRollout(db.pool, plan(), APPLY, {
      loadBundle,
      transaction: db.transaction,
    });
    expect(result.applied).toBe(true);
    expect(result.entries[0]!.decision).toBe("apply");
    // The row was locked for the write.
    expect(db.queries.some((q) => q.sql.includes("FOR UPDATE NOWAIT"))).toBe(
      true,
    );
    const writes = db.writes();
    // 1) no history -> baseline of the LIVE state, dated like the backend's
    //    own backfill, with a note that says when it was really captured
    const baseline = writes.find(
      (q) =>
        q.sql.includes("INSERT INTO agent_runtime.agent_revisions") &&
        q.params[8] === "system_backfill",
    )!;
    expect(baseline).toBeTruthy();
    expect(baseline.params[1]).toBe(row.prose);
    expect(baseline.params[6]).toBe(liveHash(row));
    expect(baseline.params[7]).toBe(
      "baseline captured by house rollout personas-v2 at apply time; the earlier configuration chronology is not recorded",
    );
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
      JSON.stringify({ ...nextBundle.spec, model: liveModel }),
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
    await runHouseRollout(db.pool, plan(), APPLY, {
      loadBundle,
      transaction: db.transaction,
    });
    const inserts = db
      .writes()
      .filter((q) =>
        q.sql.includes("INSERT INTO agent_runtime.agent_revisions"),
      );
    expect(inserts.map((q) => q.params[8])).toEqual([
      "system_recovered",
      "owner",
    ]);
    expect(inserts[0]!.params[7]).toMatch(
      /captured by house rollout personas-v2 before it was replaced \(open revision 4 did not match the row\)/,
    );
    expect(inserts[0]!.params[10]).toBe(false);
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
      APPLY,
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
      runHouseRollout(db.pool, twoEntries, APPLY, {
        loadBundle,
        transaction: db.transaction,
      }),
    ).rejects.toBeInstanceOf(HouseRolloutRejected);
    expect(db.writes()).toEqual([]);
  });
});
