import { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  reserveProviderCapacity,
  releaseProviderCapacity,
} from "./capacity.js";
import {
  migrate,
  claimDueAgents,
  saveStateJson,
  loadStateJson,
  agentCountByOwner,
  costByOwnerSince,
  recordCycle,
  reviveDisabledAgents,
} from "./db.js";

// Opt-in real SQL regression tests against a disposable LOCAL database only.
// CAPACITY_TEST_DATABASE_URL=postgresql://postgres@127.0.0.1:15439/capacity_admission_test
const databaseUrl = process.env.CAPACITY_TEST_DATABASE_URL;
if (process.env.CI && !databaseUrl) {
  throw new Error(
    "CI requires CAPACITY_TEST_DATABASE_URL; PostgreSQL integration cannot be skipped",
  );
}
describe.skipIf(!databaseUrl)("provider admission on PostgreSQL", () => {
  let pool: Pool;
  const limit = {
    routeKey: "fixture:shared:0",
    provider: "fixture",
    model: "fixture-model",
    requestsPerMinute: 24,
    tokensPerMinute: 100_000,
    maxConcurrent: 4,
    reserveTokens: 12_000,
    leaseTtlSeconds: 360,
  };

  beforeAll(async () => {
    const target = new URL(databaseUrl!);
    if (
      target.hostname !== "127.0.0.1" ||
      target.pathname !== "/capacity_admission_test"
    ) {
      throw new Error(
        "Capacity integration requires the disposable loopback test database",
      );
    }
    pool = new Pool({ connectionString: databaseUrl });
    await migrate(pool);
  });
  afterAll(async () => {
    await pool?.end();
  });
  beforeEach(async () => {
    await pool.query("DELETE FROM agent_runtime.agents");
    await pool.query("DELETE FROM agent_runtime.provider_capacity_leases");
    await pool.query("DELETE FROM agent_runtime.provider_capacity_buckets");
    // Future refill time freezes the budget for exact boundary assertions.
    await pool.query(
      `INSERT INTO agent_runtime.provider_capacity_buckets
      (route_key, provider, request_tokens, model_tokens, request_rate_per_min,
       model_rate_per_min, max_concurrent, last_refill_at)
      VALUES ($1, $2, 24, 100000, 24, 100000, 4, now() + interval '1 hour')`,
      [limit.routeKey, limit.provider],
    );
  });

  it.each([
    ["request_budget", "request_tokens = 0"],
    ["token_budget", "model_tokens = 11999"],
    ["shared_key_cooldown", "blocked_until = now() + interval '1 minute'"],
  ])(
    "identifies %s and leaves balances and leases untouched",
    async (reason, assignment) => {
      await pool.query(
        `UPDATE agent_runtime.provider_capacity_buckets SET ${assignment}`,
      );
      const before = await pool.query(
        "SELECT request_tokens, model_tokens, last_refill_at FROM agent_runtime.provider_capacity_buckets",
      );
      expect(await reserveProviderCapacity(pool, limit)).toEqual({
        ok: false,
        reasons: [reason],
      });
      const after = await pool.query(
        "SELECT request_tokens, model_tokens, last_refill_at FROM agent_runtime.provider_capacity_buckets",
      );
      expect(after.rows).toEqual(before.rows);
      expect(
        (
          await pool.query(
            "SELECT * FROM agent_runtime.provider_capacity_leases",
          )
        ).rows,
      ).toHaveLength(0);
    },
  );

  async function fillSlots(expired = false) {
    await pool.query(
      `INSERT INTO agent_runtime.provider_capacity_leases
      (lease_id, route_key, reserved_tokens, expires_at)
      SELECT gen_random_uuid(), $1, 12000, now() + ($2::int * interval '1 hour')
      FROM generate_series(1, 4)`,
      [limit.routeKey, expired ? -1 : 1],
    );
  }

  it("identifies concurrent leases, including every simultaneous budget/cooldown blocker", async () => {
    await fillSlots();
    expect(await reserveProviderCapacity(pool, limit)).toEqual({
      ok: false,
      reasons: ["concurrency"],
    });
    await pool.query(`UPDATE agent_runtime.provider_capacity_buckets
      SET request_tokens = 0, model_tokens = 0, blocked_until = now() + interval '1 hour'`);
    expect(await reserveProviderCapacity(pool, limit)).toEqual({
      ok: false,
      reasons: [
        "request_budget",
        "token_budget",
        "concurrency",
        "shared_key_cooldown",
      ],
    });
    expect(
      (await pool.query("SELECT * FROM agent_runtime.provider_capacity_leases"))
        .rows,
    ).toHaveLength(4);
  });

  it("admits exact budget boundaries after expired cooldown/leases and reconciles once", async () => {
    await fillSlots(true);
    await pool.query(`UPDATE agent_runtime.provider_capacity_buckets
      SET request_tokens = 1, model_tokens = 12000, blocked_until = now() - interval '1 second'`);
    const result = await reserveProviderCapacity(pool, limit);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected admission");
    expect(
      (
        await pool.query(
          "SELECT request_tokens, model_tokens FROM agent_runtime.provider_capacity_buckets",
        )
      ).rows,
    ).toEqual([{ request_tokens: 0, model_tokens: 0 }]);
    expect(
      (await pool.query("SELECT * FROM agent_runtime.provider_capacity_leases"))
        .rows,
    ).toHaveLength(1);
    await releaseProviderCapacity(pool, result.lease, 9000);
    await releaseProviderCapacity(pool, result.lease, 9000);
    expect(
      (
        await pool.query(
          "SELECT model_tokens FROM agent_runtime.provider_capacity_buckets",
        )
      ).rows,
    ).toEqual([{ model_tokens: 3000 }]);
  });

  it("continuously refills and clamps old surplus to the declared limits", async () => {
    await pool.query(`UPDATE agent_runtime.provider_capacity_buckets
      SET request_tokens = 0, model_tokens = 0, last_refill_at = now() - interval '2 minutes'`);
    expect((await reserveProviderCapacity(pool, limit)).ok).toBe(true);
    expect(
      (
        await pool.query(
          "SELECT request_tokens, model_tokens FROM agent_runtime.provider_capacity_buckets",
        )
      ).rows,
    ).toEqual([{ request_tokens: 23, model_tokens: 88000 }]);
  });

  it("serializes competing schedulers without overspending the final slot", async () => {
    const results = await Promise.all(
      Array.from({ length: 8 }, () =>
        reserveProviderCapacity(pool, { ...limit, maxConcurrent: 1 }),
      ),
    );
    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(results.filter((result) => !result.ok)).toEqual(
      Array.from({ length: 7 }, () => ({
        ok: false,
        reasons: ["concurrency"],
      })),
    );
    expect(
      (await pool.query("SELECT * FROM agent_runtime.provider_capacity_leases"))
        .rows,
    ).toHaveLength(1);
  });

  it("starts new buckets empty and retains the existing one-request TPM floor", async () => {
    await pool.query("DELETE FROM agent_runtime.provider_capacity_buckets");
    expect(
      await reserveProviderCapacity(pool, { ...limit, tokensPerMinute: 1000 }),
    ).toEqual({ ok: false, reasons: ["request_budget", "token_budget"] });
    expect(
      (
        await pool.query(
          "SELECT model_rate_per_min FROM agent_runtime.provider_capacity_buckets",
        )
      ).rows,
    ).toEqual([{ model_rate_per_min: "12000" }]);
  });

  async function addAgent(handle: string, owner = 101, reason?: string) {
    const { rows } = await pool.query(
      `INSERT INTO agent_runtime.agents
      (handle, display_name, owner_user_id, status, disabled_reason, live, cadence_seconds, model_provider, model_name, spec, prose, coinrithm_key_enc)
      VALUES ($1, $1, $2, $3, $4, false, 600, 'fixture', 'fixture-model', '{}', '', 'fixture-unused') RETURNING id`,
      [handle, owner, reason ? "disabled" : "active", reason ?? null],
    );
    return Number(rows[0].id);
  }

  it("claims each due agent once across concurrent workers and preserves mapped fields", async () => {
    const id = await addAgent("claim-fixture");
    const batches = await Promise.all([
      claimDueAgents(pool, 2),
      claimDueAgents(pool, 2),
    ]);
    expect(batches.flat()).toEqual([
      expect.objectContaining({
        id,
        handle: "claim-fixture",
        live: false,
        cadenceSeconds: 600,
        modelProvider: "fixture",
        modelName: "fixture-model",
        modelBaseUrl: null,
        brainKeyEnc: null,
        spec: {},
      }),
    ]);
    expect(await claimDueAgents(pool, 2)).toEqual([]);
  });

  it("keeps owner counts, costs and persisted state isolated", async () => {
    const id = await addAgent("owner-one");
    const otherId = await addAgent("owner-two", 202);
    await addAgent("owner-disabled", 101, "drawdown");
    const state = {
      disabled: true,
      riskIncreasesToday: 3,
      nested: { cursor: "fixture" },
    };
    expect(await loadStateJson(pool, id)).toBeNull();
    await saveStateJson(pool, id, state);
    await saveStateJson(pool, id, { ...state, riskIncreasesToday: 4 });
    expect(await loadStateJson(pool, id)).toEqual({
      ...state,
      riskIncreasesToday: 4,
    });
    await recordCycle(pool, id, { decision: "skip", estimatedCostUsd: 0.25 });
    await recordCycle(pool, otherId, { decision: "skip", estimatedCostUsd: 9 });
    expect(await agentCountByOwner(pool, 101)).toBe(1);
    expect(await agentCountByOwner(pool, 999)).toBe(0);
    expect(await costByOwnerSince(pool, 101, new Date(0))).toBe(0.25);
    expect(await costByOwnerSince(pool, 999, new Date(0))).toBe(0);
  });

  it("revives only recoverable failures and retains risk stops and daily counters", async () => {
    const recoverable = await addAgent(
      "recoverable",
      101,
      "temporary failures",
    );
    for (const reason of [
      "drawdown stop",
      "model_unavailable",
      "key_invalid",
      "setup error",
    ])
      await addAgent(reason.replaceAll(" ", "-"), 101, reason);
    await saveStateJson(pool, recoverable, {
      disabled: true,
      disabledReason: "temporary failures",
      consecutiveModelFailures: 4,
      riskIncreasesToday: 3,
    });
    expect(await reviveDisabledAgents(pool)).toEqual(["recoverable"]);
    expect(await loadStateJson(pool, recoverable)).toMatchObject({
      disabled: false,
      consecutiveModelFailures: 0,
      riskIncreasesToday: 3,
    });
    expect(
      (
        await pool.query(
          "SELECT status FROM agent_runtime.agents WHERE id <> $1",
          [recoverable],
        )
      ).rows,
    ).toEqual(Array.from({ length: 4 }, () => ({ status: "disabled" })));
    expect(await reviveDisabledAgents(pool)).toEqual([]);
  });
});
