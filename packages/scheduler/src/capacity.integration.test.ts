import { Pool } from "pg";
import { readFileSync } from "node:fs";
import { maintenanceTransaction, MAINTENANCE_LOCK } from "./maintenance.js";
import { rotateCredentials } from "./rotateCredentials.js";
import { encrypt, decrypt } from "./crypto.js";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  reserveProviderCapacity,
  releaseProviderCapacity,
  releaseOwnerClaim,
  coolDownProviderCapacity,
  clearProviderCapacityBackoff,
  isProviderRouteCoolingDown,
} from "./capacity.js";
import {
  migrate,
  assertSchemaReady,
  claimDueAgents,
  saveStateJson,
  loadStateJson,
  agentCountByOwner,
  costByOwnerSince,
  recordCycle,
  reviveDisabledAgents,
  disableAgent,
  persistCycleResult,
  readCreditPosition,
  reservePaidCall,
  markPaidCallDispatched,
  recordPaidCallResult,
  finalizePaidCall,
  migrateHouseAgentsOffGroq,
  migrateAgentsOffEolModels,
  agentStillSharedEligible,
  type AgentRow,
} from "./db.js";
import { paidBrainModel, priceRowAt, reserveKeyFor } from "./paidBrain.js";

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
    // Concurrent operator runs exercise the actual numbered migration files.
    await Promise.all([migrate(pool), migrate(pool), migrate(pool)]);
  });
  afterAll(async () => {
    await pool?.end();
  });
  beforeEach(async () => {
    await pool.query("DELETE FROM agent_runtime.agents");
    await pool.query("DELETE FROM agent_runtime.provider_capacity_leases");
    await pool.query("DELETE FROM agent_runtime.provider_capacity_buckets");
    await pool.query("DELETE FROM agent_runtime.provider_route_cooldowns");
    // Future refill time freezes the budget for exact boundary assertions.
    await pool.query(
      `INSERT INTO agent_runtime.provider_capacity_buckets
      (route_key, provider, request_tokens, model_tokens, request_rate_per_min,
       model_rate_per_min, max_concurrent, last_refill_at)
      VALUES ($1, $2, 24, 100000, 24, 100000, 4, now() + interval '1 hour')`,
      [limit.routeKey, limit.provider],
    );
  });

  it("accumulates one large owner request without increasing its refill rate", async () => {
    const owner = {
      ...limit,
      routeKey: "shared-owner:test",
      tokensPerMinute: 20000,
      tokenBurst: 30000,
      reserveTokens: 30000,
      maxConcurrent: 1,
    };
    expect((await reserveProviderCapacity(pool, owner)).ok).toBe(false);
    await pool.query(
      "UPDATE agent_runtime.provider_capacity_buckets SET request_tokens=24,model_tokens=0,last_refill_at=now()-interval '2 minutes' WHERE route_key=$1",
      [owner.routeKey],
    );
    const r = await reserveProviderCapacity(pool, owner);
    expect(r.ok).toBe(true);
    if (!r.ok) throw Error("Expected admission");
    await releaseProviderCapacity(pool, r.lease, 6000);
    const row = (
      await pool.query(
        "SELECT model_rate_per_min,model_tokens FROM agent_runtime.provider_capacity_buckets WHERE route_key=$1",
        [owner.routeKey],
      )
    ).rows[0];
    expect(Number(row.model_rate_per_min)).toBe(20000);
    expect(row.model_tokens).toBe(24000);
    expect((await reserveProviderCapacity(pool, owner)).ok).toBe(false);
  });

  it("shares one owner concurrency slot across replicas independently of provider keys", async () => {
    const owner = {
      ...limit,
      routeKey: "shared-owner:test",
      tokensPerMinute: 25000,
      tokenBurst: 25000,
      reserveTokens: 5000,
      maxConcurrent: 1,
    };
    await reserveProviderCapacity(pool, owner);
    await pool.query(
      "UPDATE agent_runtime.provider_capacity_buckets SET request_tokens=24,model_tokens=25000,last_refill_at=now() WHERE route_key=$1",
      [owner.routeKey],
    );
    const results = await Promise.all([
      reserveProviderCapacity(pool, owner),
      reserveProviderCapacity(pool, owner),
    ]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.find((r) => !r.ok)).toMatchObject({
      ok: false,
      reasons: ["concurrency"],
    });
    expect((await reserveProviderCapacity(pool, limit)).ok).toBe(true);
  });

  it("refunds unused admission once, including the request credit", async () => {
    const r = await reserveProviderCapacity(pool, limit);
    if (!r.ok) throw Error("Expected admission");
    await releaseProviderCapacity(pool, r.lease, 0, true);
    await releaseProviderCapacity(pool, r.lease, 0, true);
    const row = (
      await pool.query(
        "SELECT request_tokens,model_tokens FROM agent_runtime.provider_capacity_buckets WHERE route_key=$1",
        [limit.routeKey],
      )
    ).rows[0];
    expect(row).toMatchObject({ request_tokens: 24, model_tokens: 100000 });
    expect(
      (
        await pool.query(
          "SELECT count(*)::int n FROM agent_runtime.provider_capacity_leases",
        )
      ).rows[0].n,
    ).toBe(0);
  });

  it.each([
    {
      tokens: 0,
      requests: 24,
      reserve: 20000,
      tpm: 25000,
      rpm: 24,
      expected: 48000,
    },
    {
      tokens: 5000,
      requests: 24,
      reserve: 25000,
      tpm: 25000,
      rpm: 24,
      expected: 48000,
    },
    {
      tokens: 100000,
      requests: 0,
      reserve: 12000,
      tpm: 100000,
      rpm: 1,
      expected: 60000,
    },
    {
      tokens: 0,
      requests: 0,
      reserve: 25000,
      tpm: 25000,
      rpm: 2,
      expected: 60000,
    },
  ])(
    "returns an authoritative budget-refill hint without reserving: %j",
    async (test) => {
      await pool.query(
        `UPDATE agent_runtime.provider_capacity_buckets
       SET request_tokens=$2,model_tokens=$3,last_refill_at=clock_timestamp()
       WHERE route_key=$1`,
        [limit.routeKey, test.requests, test.tokens],
      );
      const result = await reserveProviderCapacity(pool, {
        ...limit,
        reserveTokens: test.reserve,
        tokensPerMinute: test.tpm,
        requestsPerMinute: test.rpm,
      });
      expect(result.ok).toBe(false);
      if (result.ok) throw Error("Expected budget denial");
      // The locked snapshot can refill by a few ms between statements. It must
      // never round down the remaining fractional ms or assume a full minute.
      expect(result.retryAfterMs).toBeGreaterThan(test.expected - 2000);
      expect(result.retryAfterMs).toBeLessThanOrEqual(test.expected + 1);
      expect(Number.isInteger(result.retryAfterMs)).toBe(true);
      expect(
        (
          await pool.query(
            "SELECT count(*)::int n FROM agent_runtime.provider_capacity_leases",
          )
        ).rows[0].n,
      ).toBe(0);
    },
  );

  it("does not estimate refill while concurrency or cooldown also blocks admission", async () => {
    const admitted = await reserveProviderCapacity(pool, {
      ...limit,
      maxConcurrent: 1,
    });
    if (!admitted.ok) throw Error("Expected initial admission");
    await pool.query(
      "UPDATE agent_runtime.provider_capacity_buckets SET model_tokens=0 WHERE route_key=$1",
      [limit.routeKey],
    );
    const concurrent = await reserveProviderCapacity(pool, {
      ...limit,
      maxConcurrent: 1,
    });
    expect(concurrent).toMatchObject({
      ok: false,
      reasons: expect.arrayContaining(["token_budget", "concurrency"]),
    });
    expect(concurrent).not.toHaveProperty("retryAfterMs");
    await releaseProviderCapacity(pool, admitted.lease, 100000);
    await pool.query(
      "UPDATE agent_runtime.provider_capacity_buckets SET blocked_until=now()+interval '1 minute' WHERE route_key=$1",
      [limit.routeKey],
    );
    const cooling = await reserveProviderCapacity(pool, limit);
    expect(cooling).toMatchObject({
      ok: false,
      reasons: expect.arrayContaining(["shared_key_cooldown"]),
    });
    expect(cooling).not.toHaveProperty("retryAfterMs");
  });

  it("includes any future refill-clock boundary in the hint", async () => {
    // beforeEach intentionally freezes refill for one hour.
    await pool.query(
      "UPDATE agent_runtime.provider_capacity_buckets SET model_tokens=0 WHERE route_key=$1",
      [limit.routeKey],
    );
    const result = await reserveProviderCapacity(pool, limit);
    expect(result.ok).toBe(false);
    if (result.ok) throw Error("Expected budget denial");
    expect(result.retryAfterMs).toBeGreaterThan(3_590_000);
  });

  it("backs off briefly, grows atomically, and isolates other keys/models", async () => {
    const args = [
      pool,
      "backoff:0",
      "nvidia",
      "fixture-model",
      undefined,
    ] as const;
    const duration = async () =>
      Number(
        (
          await pool.query(
            "SELECT extract(epoch FROM (blocked_until-last_failure_at))*1000 ms FROM agent_runtime.provider_route_cooldowns WHERE route_key='backoff:0'",
          )
        ).rows[0].ms,
      );
    await coolDownProviderCapacity(...args);
    expect(await duration()).toBeGreaterThanOrEqual(9900);
    expect(await duration()).toBeLessThanOrEqual(15100);
    await Promise.all(
      Array.from({ length: 5 }, () => coolDownProviderCapacity(...args)),
    );
    expect(await duration()).toBeGreaterThanOrEqual(119900);
    expect(await duration()).toBeLessThanOrEqual(125100);
    expect(
      await isProviderRouteCoolingDown(pool, "backoff:1", "fixture-model"),
    ).toBe(false);
    expect(
      await isProviderRouteCoolingDown(pool, "backoff:0", "other-model"),
    ).toBe(false);
  });

  it("honors Retry-After without shortening it and does not let an older success clear a new hold", async () => {
    await coolDownProviderCapacity(
      pool,
      "backoff:0",
      "nvidia",
      "fixture-model",
      180000,
    );
    const before = (
      await pool.query(
        "SELECT blocked_until FROM agent_runtime.provider_route_cooldowns WHERE route_key='backoff:0'",
      )
    ).rows[0].blocked_until;
    await coolDownProviderCapacity(
      pool,
      "backoff:0",
      "nvidia",
      "fixture-model",
      undefined,
    );
    const after = (
      await pool.query(
        "SELECT blocked_until FROM agent_runtime.provider_route_cooldowns WHERE route_key='backoff:0'",
      )
    ).rows[0].blocked_until;
    expect(after.getTime()).toBeGreaterThanOrEqual(before.getTime());
    await clearProviderCapacityBackoff(
      pool,
      "backoff:0",
      "fixture-model",
      Date.now() - 10000,
    );
    expect(
      await isProviderRouteCoolingDown(pool, "backoff:0", "fixture-model"),
    ).toBe(true);
    await pool.query(
      "UPDATE agent_runtime.provider_route_cooldowns SET last_failure_at=now()-interval '1 hour' WHERE route_key='backoff:0'",
    );
    await clearProviderCapacityBackoff(
      pool,
      "backoff:0",
      "fixture-model",
      Date.now(),
    );
    expect(
      await isProviderRouteCoolingDown(pool, "backoff:0", "fixture-model"),
    ).toBe(false);
    await coolDownProviderCapacity(
      pool,
      "backoff:0",
      "nvidia",
      "fixture-model",
      undefined,
    );
    const restarted = Number(
      (
        await pool.query(
          "SELECT extract(epoch FROM (blocked_until-last_failure_at))*1000 ms FROM agent_runtime.provider_route_cooldowns WHERE route_key='backoff:0'",
        )
      ).rows[0].ms,
    );
    expect(restarted).toBeLessThanOrEqual(15100);
  });

  it("forgets a stale failure sequence without needing a successful call", async () => {
    await coolDownProviderCapacity(
      pool,
      "backoff:0",
      "nvidia",
      "fixture-model",
      120000,
    );
    await pool.query(
      "UPDATE agent_runtime.provider_route_cooldowns SET last_failure_at=now()-interval '10 minutes', blocked_until=now()-interval '8 minutes' WHERE route_key='backoff:0'",
    );
    await coolDownProviderCapacity(
      pool,
      "backoff:0",
      "nvidia",
      "fixture-model",
      undefined,
    );
    const duration = Number(
      (
        await pool.query(
          "SELECT extract(epoch FROM (blocked_until-last_failure_at))*1000 ms FROM agent_runtime.provider_route_cooldowns WHERE route_key='backoff:0'",
        )
      ).rows[0].ms,
    );
    expect(duration).toBeGreaterThanOrEqual(9900);
    expect(duration).toBeLessThanOrEqual(15100);
  });

  it("rolls back interrupted DDL and releases the migration lock", async () => {
    await expect(
      maintenanceTransaction(pool, async (client) => {
        await client.query(
          "CREATE TABLE agent_runtime.interrupted_fixture (id int)",
        );
        throw new Error("simulated interruption before commit");
      }),
    ).rejects.toThrow("simulated interruption");
    expect(
      (
        await pool.query(
          "SELECT to_regclass('agent_runtime.interrupted_fixture') AS name",
        )
      ).rows[0].name,
    ).toBeNull();
    await migrate(pool);
    await maintenanceTransaction(pool, async (client) => {
      expect(
        (
          await client.query(
            "SELECT pg_try_advisory_xact_lock($1, $2) AS acquired",
            [...MAINTENANCE_LOCK],
          )
        ).rows[0].acquired,
      ).toBe(true);
    });
  });

  it("runs with the restricted role and refuses DDL, ledger writes and unrelated data access", async () => {
    await pool.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'coinrithm_app') THEN
        CREATE ROLE coinrithm_app NOLOGIN;
      END IF;
    END $$;
    GRANT SELECT, INSERT, UPDATE, DELETE ON agent_runtime.schema_migrations TO coinrithm_app`);
    await pool.query(`CREATE TABLE IF NOT EXISTS public."ApiKey" (
      id integer PRIMARY KEY, "userId" integer, "revokedAt" timestamptz
    )`);
    await pool.query(
      readFileSync(
        new URL("../sql/maintenance/runtime-role.sql", import.meta.url),
        "utf8",
      ),
    );
    expect(
      (
        await pool.query(
          "SELECT has_table_privilege('coinrithm_app', 'agent_runtime.schema_migrations', 'INSERT,UPDATE,DELETE') AS writable",
        )
      ).rows[0].writable,
    ).toBe(false);
    await pool.query(
      "ALTER ROLE coinrithm_scheduler LOGIN PASSWORD 'disposable-fixture-only'",
    );
    const runtimeUrl = new URL(databaseUrl!);
    runtimeUrl.username = "coinrithm_scheduler";
    runtimeUrl.password = "disposable-fixture-only";
    const runtime = new Pool({
      connectionString: runtimeUrl.toString(),
      max: 1,
    });
    try {
      await assertSchemaReady(runtime);
      await runtime.query(
        'SELECT id, "userId", "revokedAt" FROM public."ApiKey" LIMIT 0',
      );
      await expect(
        runtime.query('DELETE FROM public."ApiKey"'),
      ).rejects.toMatchObject({ code: "42501" });
      await expect(
        runtime.query("CREATE TABLE agent_runtime.forbidden (id int)"),
      ).rejects.toMatchObject({ code: "42501" });
      await expect(
        runtime.query(
          "UPDATE agent_runtime.schema_migrations SET checksum = repeat('0',64)",
        ),
      ).rejects.toMatchObject({ code: "42501" });
      await expect(
        runtime.query("TRUNCATE agent_runtime.agents"),
      ).rejects.toMatchObject({ code: "42501" });
      await expect(runtime.query("SET ROLE postgres")).rejects.toMatchObject({
        code: "42501",
      });
      await runtime.query(`INSERT INTO agent_runtime.agents
        (handle, display_name, cadence_seconds, model_provider, model_name, spec, prose, coinrithm_key_enc)
        VALUES ('restricted-fixture', 'Fixture', 60, 'fixture', 'fixture', '{}', '', 'encrypted-fixture')`);
      const agent = (
        await runtime.query(
          "SELECT id FROM agent_runtime.agents WHERE handle = 'restricted-fixture'",
        )
      ).rows[0];
      await saveStateJson(runtime, Number(agent.id), { sequence: 1 });
      expect(await loadStateJson(runtime, Number(agent.id))).toEqual({
        sequence: 1,
      });
      await recordCycle(runtime, Number(agent.id), {
        decision: "skip",
        skipReason: "fixture",
      });
      expect(await reserveProviderCapacity(runtime, limit)).toMatchObject({
        ok: true,
      });
      // Readiness asserts every grant on its own: one missing privilege (the
      // rest still held, so a comma-list ANY check would pass) fails startup
      // by name instead of on the first live write.
      await pool.query(
        "REVOKE DELETE ON agent_runtime.agent_cycles FROM coinrithm_scheduler",
      );
      try {
        await expect(assertSchemaReady(runtime)).rejects.toThrow(
          "missing required grants: DELETE on agent_runtime.agent_cycles",
        );
      } finally {
        await pool.query(
          "GRANT DELETE ON agent_runtime.agent_cycles TO coinrithm_scheduler",
        );
      }
      await pool.query(
        'REVOKE SELECT ("revokedAt") ON public."ApiKey" FROM coinrithm_scheduler',
      );
      try {
        await expect(assertSchemaReady(runtime)).rejects.toThrow(
          'SELECT on public."ApiKey"(revokedAt)',
        );
      } finally {
        await pool.query(
          'GRANT SELECT ("revokedAt") ON public."ApiKey" TO coinrithm_scheduler',
        );
      }
      await assertSchemaReady(runtime);
      // Paid brains (contract v2): the runtime role reserves, dispatches and
      // finalises paid calls under the owner lock, and can never rewrite or
      // remove a money row or delete a call.
      await pool.query(
        "DELETE FROM agent_runtime.credit_ledger WHERE user_id = 9101",
      );
      await pool.query(
        "DELETE FROM agent_runtime.paid_calls WHERE user_id = 9101",
      );
      await pool.query(
        `INSERT INTO agent_runtime.credit_ledger (user_id, kind, amount_micro_usd, idempotency_key)
         VALUES (9101, 'grant', 1000000, 'grant:restricted-fixture')`,
      );
      const agentId = Number(agent.id);
      const price = priceRowAt(
        paidBrainModel("claude-sonnet-5-5")!,
        Date.UTC(2026, 9, 7),
      )!;
      const reserve = (cycleKey: string, monthStart = "2026-10-01") => ({
        userId: 9101,
        agentId,
        reserveKey: reserveKeyFor(agentId, cycleKey),
        modelId: "claude-sonnet-5-5",
        price,
        marginPct: 20,
        worstCaseMicro: 202_752,
        capMicro: 25_000_000,
        monthStart,
      });
      const balance = async () =>
        Number(
          (
            await runtime.query(
              "SELECT SUM(amount_micro_usd)::text AS b FROM agent_runtime.credit_ledger WHERE user_id = 9101",
            )
          ).rows[0].b,
        );
      // Answered with usage: reserve, dispatch, record, finalise => debit.
      const first = reserve("fixture-answered");
      expect(await reservePaidCall(runtime, first)).toEqual({
        kind: "reserved",
      });
      expect(await balance()).toBe(1_000_000 - 202_752);
      expect(await markPaidCallDispatched(runtime, first.reserveKey)).toBe(
        true,
      );
      expect(await markPaidCallDispatched(runtime, first.reserveKey)).toBe(
        false,
      );
      expect(
        await recordPaidCallResult(runtime, first.reserveKey, {
          status: "answered",
          usage: { promptTokens: 20_000, completionTokens: 400 },
        }),
      ).toBe(true);
      expect(
        await finalizePaidCall(runtime, first.reserveKey, {
          mode: "cycle_end",
        }),
      ).toBe("debited");
      // Idempotent: a second finalisation (or recovery) moves nothing.
      expect(
        await finalizePaidCall(runtime, first.reserveKey, {
          mode: "recovery",
        }),
      ).toBe("closed");
      expect(await balance()).toBe(1_000_000 - 52_800);
      // A reserve made in October still counts in October after it closes.
      expect(
        await readCreditPosition(runtime, 9101, agentId, "2026-10-01"),
      ).toEqual({
        balanceMicro: 947_200,
        monthSpendMicro: 52_800,
        uncertain: false,
      });
      // Never dispatched: released in full.
      const second = reserve("fixture-unsent");
      await reservePaidCall(runtime, second);
      expect(
        await finalizePaidCall(runtime, second.reserveKey, {
          mode: "cycle_end",
        }),
      ).toBe("released");
      expect(await balance()).toBe(947_200);
      // Answered without usage: uncertain, still reserved, and it blocks the
      // owner's next paid admission immediately.
      const third = reserve("fixture-uncertain");
      await reservePaidCall(runtime, third);
      await markPaidCallDispatched(runtime, third.reserveKey);
      await recordPaidCallResult(runtime, third.reserveKey, {
        status: "uncertain",
        reason: "answered without usage",
      });
      expect(
        await finalizePaidCall(runtime, third.reserveKey, {
          mode: "cycle_end",
        }),
      ).toBe("closed");
      expect(await balance()).toBe(947_200 - 202_752);
      expect(
        await reservePaidCall(runtime, reserve("fixture-blocked")),
      ).toEqual({ kind: "refused", reason: "metering_uncertain" });
      await expect(
        runtime.query(
          "UPDATE agent_runtime.credit_ledger SET amount_micro_usd = 0 WHERE user_id = 9101",
        ),
      ).rejects.toMatchObject({ code: "42501" });
      await expect(
        runtime.query(
          "DELETE FROM agent_runtime.credit_ledger WHERE user_id = 9101",
        ),
      ).rejects.toMatchObject({ code: "42501" });
      await expect(
        runtime.query(
          "DELETE FROM agent_runtime.paid_calls WHERE user_id = 9101",
        ),
      ).rejects.toMatchObject({ code: "42501" });
      await expect(
        runtime.query("SELECT 1 FROM agent_runtime.credit_checkouts LIMIT 0"),
      ).rejects.toMatchObject({ code: "42501" });
      await expect(
        runtime.query("SELECT 1 FROM agent_runtime.credit_adjustments LIMIT 0"),
      ).rejects.toMatchObject({ code: "42501" });
      // Signs are enforced by kind: reserve/debit/reversal < 0, others > 0.
      for (const [kind, amount] of [
        ["debit", 5],
        ["reserve", 5],
        ["reversal", 5],
        ["release", -5],
        ["topup", -5],
        ["restore", -5],
      ] as const) {
        await expect(
          pool.query(
            `INSERT INTO agent_runtime.credit_ledger (user_id, kind, amount_micro_usd, idempotency_key)
             VALUES (9101, $1, $2, $3)`,
            [kind, amount, `sign-fixture:${kind}`],
          ),
        ).rejects.toMatchObject({ code: "23514" });
      }
    } finally {
      await runtime.end();
    }
    await expect(assertSchemaReady(pool)).rejects.toThrow("DML-only");
  });

  it("refuses missing and changed migration receipts without replaying SQL", async () => {
    const before = (
      await pool.query(
        "SELECT filename, checksum FROM agent_runtime.schema_migrations ORDER BY filename",
      )
    ).rows;
    const first = before[0];
    await pool.query(
      "UPDATE agent_runtime.schema_migrations SET checksum = repeat('0',64) WHERE filename = $1",
      [first.filename],
    );
    try {
      await expect(migrate(pool)).rejects.toThrow("checksum changed");
      await expect(assertSchemaReady(pool)).rejects.toThrow(
        "schema is not ready",
      );
    } finally {
      await pool.query(
        "UPDATE agent_runtime.schema_migrations SET checksum = $2 WHERE filename = $1",
        [first.filename, first.checksum],
      );
    }
    expect(
      (
        await pool.query(
          "SELECT filename, checksum FROM agent_runtime.schema_migrations ORDER BY filename",
        )
      ).rows,
    ).toEqual(before);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        "DELETE FROM agent_runtime.schema_migrations WHERE filename = $1",
        [first.filename],
      );
      await expect(
        assertSchemaReady(client as unknown as Pool),
      ).rejects.toThrow("schema is not ready");
    } finally {
      await client.query("ROLLBACK");
      client.release();
    }
  });

  it("rehearses credential rotation, interrupted rollback, rerun and reverse recovery", async () => {
    const oldKey = Buffer.alloc(32, 11);
    const newKey = Buffer.alloc(32, 12);
    for (let i = 0; i < 2; i++) {
      await pool.query(
        `INSERT INTO agent_runtime.agents
        (handle, display_name, cadence_seconds, model_provider, model_name, spec, prose, coinrithm_key_enc, brain_key_enc)
        VALUES ($1, 'Rotation fixture', 60, 'fixture', 'fixture', '{}', '', $2, $3)`,
        [
          `rotation-${i}`,
          encrypt(`coin-${i}`, oldKey),
          i === 0 ? encrypt("brain-0", oldKey) : null,
        ],
      );
    }
    const read = async () =>
      (
        await pool.query(
          "SELECT coinrithm_key_enc, brain_key_enc FROM agent_runtime.agents ORDER BY handle",
        )
      ).rows;
    const before = await read();
    expect(await rotateCredentials(pool, oldKey, newKey)).toMatchObject({
      applied: false,
      values: 3,
    });
    expect(await read()).toEqual(before);
    // Real first UPDATE, then a lost process/connection result before COMMIT.
    const client = await pool.connect();
    const interrupted = {
      connect: async () => ({
        query: async (sql: string, values?: unknown[]) => {
          const result = await client.query(sql, values);
          if (sql.startsWith("UPDATE"))
            throw new Error("interrupted after first write");
          return result;
        },
        release: (discard: boolean) => client.release(discard),
      }),
    } as unknown as Pool;
    await expect(
      rotateCredentials(interrupted, oldKey, newKey, true),
    ).rejects.toThrow("interrupted");
    expect(await read()).toEqual(before);
    await rotateCredentials(pool, oldKey, newKey, true);
    const after = await read();
    expect(after.map((row) => decrypt(row.coinrithm_key_enc, newKey))).toEqual([
      "coin-0",
      "coin-1",
    ]);
    expect(decrypt(after[0].brain_key_enc, newKey)).toBe("brain-0");
    expect(() => decrypt(after[0].coinrithm_key_enc, oldKey)).toThrow();
    expect(await rotateCredentials(pool, oldKey, newKey, true)).toMatchObject({
      alreadyRotated: 3,
    });
    expect(await read()).toEqual(after);
    await rotateCredentials(pool, newKey, oldKey, true);
    expect(
      (await read()).map((row) => decrypt(row.coinrithm_key_enc, oldKey)),
    ).toEqual(["coin-0", "coin-1"]);
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
        ...(reason === "shared_key_cooldown"
          ? {}
          : { retryAfterMs: expect.any(Number) }),
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
    ).toEqual({
      ok: false,
      reasons: ["request_budget", "token_budget"],
      retryAfterMs: expect.any(Number),
    });
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

  it.each(["claimed", "disabled"])(
    "rechecks eligibility after an agent is %s between the due snapshot and the row lock",
    async (interleave) => {
      const id = await addAgent("claim-snapshot-fixture");
      const barrierOwner = await pool.connect();
      const delayedClient = await pool.connect();
      const barrierKey = 1975326401;
      const { rows: pids } = await delayedClient.query<{ pid: number }>(
        "SELECT pg_backend_pid() AS pid",
      );
      const pid = pids[0]!.pid;
      await barrierOwner.query("SELECT pg_advisory_lock($1, $2)", [
        barrierKey,
        id,
      ]);
      const gatedPool = {
        connect: async () => ({
          query: (sql: string, params?: unknown[]) =>
            delayedClient.query(
              sql.startsWith("WITH due AS MATERIALIZED")
                ? sql.replace(
                    "SELECT a.id,",
                    `SELECT pg_advisory_xact_lock(${barrierKey}, ${id}) AS snapshot_barrier, a.id,`,
                  )
                : sql,
              params,
            ),
          release: () => delayedClient.release(),
        }),
      } as unknown as Pool;
      // The volatile target expression runs after the due snapshot is taken,
      // but before picked acquires the row lock. No production SQL changes are
      // needed to deterministically exercise this READ COMMITTED interleaving.
      const delayedClaim = claimDueAgents(gatedPool, 2);
      try {
        let waiting = false;
        for (let attempt = 0; attempt < 100 && !waiting; attempt++) {
          const { rows } = await pool.query<{ waiting: boolean }>(
            "SELECT EXISTS (SELECT 1 FROM pg_locks WHERE pid = $1 AND locktype = 'advisory' AND NOT granted) AS waiting",
            [pid],
          );
          waiting = rows[0]!.waiting;
          if (!waiting) await new Promise((resolve) => setTimeout(resolve, 10));
        }
        expect(waiting).toBe(true);
        if (interleave === "claimed") {
          const winner = await claimDueAgents(pool, 2);
          expect(winner.map((agent) => agent.id)).toEqual([id]);
        } else {
          await pool.query(
            "UPDATE agent_runtime.agents SET status = 'disabled' WHERE id = $1",
            [id],
          );
        }
        await barrierOwner.query("SELECT pg_advisory_unlock($1, $2)", [
          barrierKey,
          id,
        ]);
        // The stale CTE still contains id, but the committed current row is no
        // longer eligible. Recheck both scheduling and active status under lock.
        expect(await delayedClaim).toEqual([]);
      } finally {
        await barrierOwner.query("SELECT pg_advisory_unlock($1, $2)", [
          barrierKey,
          id,
        ]);
        barrierOwner.release();
        await delayedClaim.catch(() => {});
      }
    },
  );

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

  // 2026-09-24: a45-casa, a SHARED unpinned user agent stranded on the obsolete
  // hosted Groq route (recorded provider HTTP 404), was stopped as
  // model_unavailable and reachable by neither boot migration (de-Groq was
  // house-only, the EOL remap is nvidia-only). The de-Groq migration also checks
  // the owner-matched CoinRithm ApiKey of a shared row (a backend-owned public
  // table; the scheduler runs as postgres in production). The test database
  // only carries what the scheduler migrates, so a minimal ApiKey table with
  // the three columns the predicate reads is created here.
  const APIKEY_DDL = `CREATE TABLE IF NOT EXISTS "ApiKey" (
    id integer PRIMARY KEY,
    "userId" integer NOT NULL,
    "revokedAt" timestamptz
  )`;
  async function addGroqAgent(
    handle: string,
    over: {
      model?: string;
      status?: string;
      reason?: string | null;
      byo?: boolean;
      pinned?: boolean;
      house?: boolean;
      /** ApiKey row for the a<id>- prefix: valid, revoked, none, or another owner's. */
      key?: "valid" | "revoked" | "missing" | "other-owner";
    } = {},
  ) {
    await pool.query(APIKEY_DDL);
    const keyId = Number((handle.match(/^a(\d+)-/) ?? [])[1] ?? NaN);
    if (Number.isFinite(keyId)) {
      await pool.query('DELETE FROM "ApiKey" WHERE id = $1', [keyId]);
      const key = over.key ?? "valid";
      if (key !== "missing")
        await pool.query(
          'INSERT INTO "ApiKey" (id, "userId", "revokedAt") VALUES ($1, $2, $3)',
          [
            keyId,
            key === "other-owner" ? 202 : 101,
            key === "revoked" ? new Date() : null,
          ],
        );
    }
    const { rows } = await pool.query(
      `INSERT INTO agent_runtime.agents
        (handle, display_name, owner_user_id, status, disabled_reason, is_house, live, cadence_seconds,
         model_provider, model_name, spec, prose, coinrithm_key_enc, brain_key_enc)
       VALUES ($1, $1, 101, $2, $3, $4, false, 600, 'groq', $5, $6::jsonb, '', 'fixture-unused', $7)
       RETURNING id`,
      [
        handle,
        over.status ?? "disabled",
        over.reason === undefined
          ? "model_unavailable: provider HTTP 404"
          : over.reason,
        over.house ?? false,
        over.model ?? "llama-3.1-8b-instant",
        JSON.stringify(over.pinned ? { pinnedModel: true } : {}),
        over.byo ? "fixture-byo-key" : null,
      ],
    );
    return Number(rows[0].id);
  }
  const agentRow = async (id: number) =>
    (
      await pool.query(
        `SELECT status, disabled_reason, model_provider, model_name,
                (next_run_at <= now()) AS due
           FROM agent_runtime.agents WHERE id = $1`,
        [id],
      )
    ).rows[0];

  it("boot migrations move a shared unpinned Groq agent with a valid key to a living NVIDIA model and revive its model_unavailable stop, protecting every other class", async () => {
    const casa = await addGroqAgent("a9001-casa");
    const bigCasa = await addGroqAgent("a9002-casa-70b", {
      model: "llama-3.1-70b-versatile",
    });
    const activeShared = await addGroqAgent("a9003-active-shared", {
      status: "active",
      reason: null,
    });
    const houseRow = await addGroqAgent("house-groq", {
      house: true,
      status: "active",
      reason: null,
    });
    const byo = await addGroqAgent("a9004-byo", { byo: true });
    const pinned = await addGroqAgent("a9005-pinned", { pinned: true });
    const paused = await addGroqAgent("a9006-paused", {
      status: "paused",
      reason: null,
    });
    const drawdown = await addGroqAgent("a9007-risk-stopped", {
      reason: "equity drawdown >= 2500",
    });
    // Reason class only: a key_invalid stop with a still-valid key is simply
    // not in the active / model_unavailable classes, so it is untouched.
    const keyInvalidReason = await addGroqAgent("a9008-key-invalid-reason", {
      reason: "key_invalid: CoinRithm key rejected (HTTP 401)",
    });
    // Actual key state: model_unavailable stops whose CoinRithm key IS revoked,
    // whose key row is missing, or whose key belongs to another user.
    const revokedKey = await addGroqAgent("a9009-revoked-key", {
      key: "revoked",
    });
    const missingKey = await addGroqAgent("a9010-missing-key", {
      key: "missing",
    });
    const otherOwnerKey = await addGroqAgent("a9011-other-owner", {
      key: "other-owner",
    });

    // Boot order: de-Groq first, then the NVIDIA EOL remap + revive.
    expect(await migrateHouseAgentsOffGroq(pool)).toBe(4);
    const [remapped, revived] = await migrateAgentsOffEolModels(pool);
    expect(remapped).toBe(0);
    expect(revived).toBe(2);

    expect(await agentRow(casa)).toMatchObject({
      status: "active",
      disabled_reason: null,
      model_provider: "nvidia",
      model_name: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning",
      due: true,
    });
    expect(await agentRow(bigCasa)).toMatchObject({
      status: "active",
      disabled_reason: null,
      model_provider: "nvidia",
      model_name: "nvidia/nemotron-3-super-120b-a12b",
    });
    expect(await agentRow(activeShared)).toMatchObject({
      status: "active",
      model_provider: "nvidia",
      model_name: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning",
    });
    expect(await agentRow(houseRow)).toMatchObject({
      status: "active",
      model_provider: "nvidia",
    });
    // Protected: owner-provided key, explicit pin, user pause, risk stop, a
    // key_invalid reason, and model_unavailable stops whose CoinRithm key is
    // revoked, missing or another user's keep BOTH their Groq selection and
    // their state, and therefore never reach the nvidia-only revive step.
    for (const [id, status, reason] of [
      [byo, "disabled", "model_unavailable: provider HTTP 404"],
      [pinned, "disabled", "model_unavailable: provider HTTP 404"],
      [paused, "paused", null],
      [drawdown, "disabled", "equity drawdown >= 2500"],
      [
        keyInvalidReason,
        "disabled",
        "key_invalid: CoinRithm key rejected (HTTP 401)",
      ],
      [revokedKey, "disabled", "model_unavailable: provider HTTP 404"],
      [missingKey, "disabled", "model_unavailable: provider HTTP 404"],
      [otherOwnerKey, "disabled", "model_unavailable: provider HTTP 404"],
    ] as const) {
      expect(await agentRow(id)).toMatchObject({
        status,
        disabled_reason: reason,
        model_provider: "groq",
        model_name: "llama-3.1-8b-instant",
      });
    }
    // Idempotent: a second boot changes nothing.
    expect(await migrateHouseAgentsOffGroq(pool)).toBe(0);
    expect(await migrateAgentsOffEolModels(pool)).toEqual([0, 0]);
  });

  it("revives only recoverable failures and retains owner/risk stops and daily counters", async () => {
    const recoverable = await addAgent(
      "recoverable",
      101,
      "temporary failures",
    );
    const protectedReasons = [
      "drawdown stop",
      "model_unavailable",
      "key_invalid",
      "setup error",
      "stopped by owner (API key revoked)",
      "disconnected by owner",
      "Stopped By Owner",
    ];
    for (const reason of protectedReasons)
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
    ).toEqual(
      Array.from({ length: protectedReasons.length }, () => ({
        status: "disabled",
      })),
    );
    expect(await reviveDisabledAgents(pool)).toEqual([]);
  });

  it("still recovers a null reason while leaving paused agents alone", async () => {
    const recoverable = await addAgent("null-reason");
    const paused = await addAgent("owner-paused");
    await pool.query(
      "UPDATE agent_runtime.agents SET status = 'disabled' WHERE id = $1",
      [recoverable],
    );
    await pool.query(
      "UPDATE agent_runtime.agents SET status = 'paused' WHERE id = $1",
      [paused],
    );
    expect(await reviveDisabledAgents(pool)).toEqual(["null-reason"]);
    expect(await agentRow(paused)).toMatchObject({
      status: "paused",
      disabled_reason: null,
    });
  });

  it.each(["cycle", "setup"] as const)(
    "a late %s failure cannot replace an owner stop or pause",
    async (writer) => {
      const active = await addAgent("still-active");
      const stopped = await addAgent(
        "owner-revoked",
        101,
        "stopped by owner (API key revoked)",
      );
      const disconnected = await addAgent(
        "owner-disconnected",
        101,
        "disconnected by owner",
      );
      const paused = await addAgent("owner-paused");
      await pool.query(
        "UPDATE agent_runtime.agents SET status = 'paused' WHERE id = $1",
        [paused],
      );
      const before = await pool.query(
        "SELECT id, status, disabled_reason, next_run_at, updated_at FROM agent_runtime.agents WHERE id <> $1 ORDER BY id",
        [active],
      );
      for (const id of [active, stopped, disconnected, paused]) {
        if (writer === "cycle") {
          await persistCycleResult(pool, id, {
            state: { disabled: true, disabledReason: "temporary failures" },
            cycle: { decision: "skip", disabled: true, actions: [] },
            disableReason: "temporary failures",
          });
        } else {
          await disableAgent(pool, id, "temporary failures");
        }
      }
      expect(await agentRow(active)).toMatchObject({
        status: "disabled",
        disabled_reason: "temporary failures",
      });
      expect(await reviveDisabledAgents(pool)).toEqual(["still-active"]);
      const after = await pool.query(
        "SELECT id, status, disabled_reason, next_run_at, updated_at FROM agent_runtime.agents WHERE id <> $1 ORDER BY id",
        [active],
      );
      expect(after.rows).toEqual(before.rows);
      if (writer === "cycle") {
        const { rows } = await pool.query(
          "SELECT count(*)::int AS count FROM agent_runtime.agent_cycles WHERE agent_id = ANY($1::bigint[])",
          [[active, stopped, disconnected, paused]],
        );
        expect(rows).toEqual([{ count: 4 }]);
      }
    },
  );
  // ── Owner-bucket fairness (009_capacity_waiters.sql) ──────────────────────
  // Prod 2026-10-07: five house agents share one 25k TPM owner bucket (burst =
  // one request, one concurrent call). On the phase grid Olivia (~31k) drains
  // it and Mia (~24k) arrives ~45 s later every cadence, finds ~18.75k, and is
  // deferred; Leo (~26k) arrives ~2 min later and always succeeds. Times below
  // are simulated by moving last_refill_at; claims use the real clock.
  describe("owner bucket fairness", () => {
    const routeKey = "shared-owner:fairness";
    const RATE = 25_000;
    const MIA = 24_000;
    const LEO = 26_000;
    const OLIVIA = 31_000;
    const agentId = async (handle: string) =>
      String(
        (
          await pool.query(
            `INSERT INTO agent_runtime.agents
               (handle, display_name, status, cadence_seconds, model_provider,
                model_name, spec, prose, coinrithm_key_enc)
             VALUES ($1, $1, 'active', 180, 'nvidia', 'fixture', '{}', '', 'fixture')
             RETURNING id`,
            [handle],
          )
        ).rows[0].id,
      );
    const owner = (key: string | null, reserveTokens: number) => ({
      ...limit,
      routeKey,
      tokensPerMinute: RATE,
      tokenBurst: reserveTokens,
      reserveTokens,
      maxConcurrent: 1,
      // OWNER_WAITER_TTL_SECONDS: the 60 s in-cycle wait + 15 s slack.
      ...(key ? { waiter: { key, ttlSeconds: 75 } } : {}),
    });
    // The bucket `seconds` after a large prompt left it empty.
    const drainedAgo = async (seconds: number) => {
      await pool.query(
        `INSERT INTO agent_runtime.provider_capacity_buckets
           (route_key, provider, request_tokens, model_tokens,
            request_rate_per_min, model_rate_per_min, max_concurrent)
         VALUES ($1, 'fixture', 24, 0, 24, $2, 1)
         ON CONFLICT (route_key) DO NOTHING`,
        [routeKey, RATE],
      );
      await pool.query(
        `UPDATE agent_runtime.provider_capacity_buckets
            SET request_tokens = 24, model_tokens = 0,
                last_refill_at = clock_timestamp() - make_interval(secs => $2)
          WHERE route_key = $1`,
        [routeKey, seconds],
      );
    };
    // One model call that consumes its reserve (the turn is used).
    const attempt = async (
      key: string | null,
      reserve: number,
      on: Pool = pool,
    ): Promise<boolean> => {
      const r = await reserveProviderCapacity(on, owner(key, reserve));
      if (r.ok) await releaseProviderCapacity(on, r.lease, reserve);
      return r.ok;
    };
    const claim = async () =>
      (
        await pool.query(
          `SELECT waiter_key, waiter_tokens, waiter_since, waiter_expires_at,
                  model_tokens
             FROM agent_runtime.provider_capacity_buckets WHERE route_key = $1`,
          [routeKey],
        )
      ).rows[0];

    it("reproduces the 2-agent starvation without the rule: Mia loses every cycle", async () => {
      let mia = 0;
      let leo = 0;
      for (let cycle = 0; cycle < 3; cycle += 1) {
        await drainedAgo(45);
        if (await attempt(null, MIA)) mia += 1;
        await drainedAgo(120);
        if (await attempt(null, LEO)) leo += 1;
      }
      expect(mia).toBe(0);
      expect(leo).toBe(3);
    });

    it("gives the starved agent its rescheduled retry, then lets the others back", async () => {
      const mia = `agent:${await agentId("mia")}`;
      const leo = `agent:${await agentId("leo")}`;
      await drainedAgo(45);
      expect(await attempt(mia, MIA)).toBe(false);
      const first = await claim();
      expect(first).toMatchObject({ waiter_key: mia, waiter_tokens: MIA });
      // The claim covers Mia's own refill wait (~12.6 s) plus 15 s slack for
      // her in-cycle re-admission, not a whole grid interval.
      const heldSeconds =
        (new Date(first.waiter_expires_at).getTime() -
          new Date(first.waiter_since).getTime()) /
        1000;
      expect(heldSeconds).toBeGreaterThan(12);
      expect(heldSeconds).toBeLessThan(12.6 + 15 + 2);

      // Before her retry, Leo may only spend tokens beyond Mia's need.
      await drainedAgo(50);
      expect(await attempt(leo, LEO)).toBe(false);
      expect((await claim()).waiter_key).toBe(mia);

      // Mia's in-cycle re-admission (~13 s later) finds her reserve.
      await drainedAgo(58);
      expect(await attempt(mia, MIA)).toBe(true);
      const after = await claim();
      expect(after.waiter_key).toBeNull();
      expect(Number(after.model_tokens)).toBeGreaterThanOrEqual(0);

      await drainedAgo(120);
      expect(await attempt(leo, LEO)).toBe(true);
    });

    // Equal-horizon event schedule (Codex 56935): ONE bucket state carried
    // forward in time (consumed balance kept, claim times aged with it), the
    // same arrivals for both modes. "rule" = the route's behaviour: a first
    // owner-budget denial with a refill hint <= 60 s re-admits at that hint,
    // otherwise the claim is released. "without" = no waiter keys, no wait.
    it("reports per-agent and total calls/tokens on one chronological schedule", async () => {
      const cadence = 330;
      const cycles = 12;
      const roster = [
        { name: "olivia", reserve: 31_000, phase: 0 },
        { name: "mia", reserve: 24_000, phase: 45 },
        { name: "leo", reserve: 26_000, phase: 120 },
        { name: "sam", reserve: 22_000, phase: 200 },
        { name: "carl", reserve: 27_000, phase: 260 },
      ];
      const ids = new Map<string, string>();
      for (const a of roster) ids.set(a.name, await agentId(`sim-${a.name}`));

      const run = async (withRule: boolean) => {
        await drainedAgo(0);
        await pool.query(
          `UPDATE agent_runtime.provider_capacity_buckets
              SET waiter_key = NULL, waiter_tokens = NULL, waiter_since = NULL,
                  waiter_expires_at = NULL, last_refill_at = clock_timestamp()
            WHERE route_key = $1`,
          [routeKey],
        );
        let t = 0;
        // Advance simulated time: refill accrues from last_refill_at, and a
        // live claim ages by the same amount.
        const advance = async (to: number) => {
          const d = to - t;
          if (d <= 0) return;
          await pool.query(
            `UPDATE agent_runtime.provider_capacity_buckets
                SET last_refill_at = last_refill_at - make_interval(secs => $2),
                    waiter_since = waiter_since - make_interval(secs => $2),
                    waiter_expires_at = waiter_expires_at - make_interval(secs => $2)
              WHERE route_key = $1`,
            [routeKey, d],
          );
          t = to;
        };
        const stats = new Map(
          roster.map((a) => [a.name, { calls: 0, tokens: 0 }]),
        );
        type Ev = {
          at: number;
          agent: (typeof roster)[number];
          readmit: boolean;
        };
        const queue: Ev[] = [];
        for (let c = 0; c < cycles; c += 1)
          for (const agent of roster)
            queue.push({
              at: c * cadence + agent.phase,
              agent,
              readmit: false,
            });
        while (queue.length > 0) {
          queue.sort((x, y) => x.at - y.at);
          const ev = queue.shift()!;
          await advance(ev.at);
          const key = withRule ? `agent:${ids.get(ev.agent.name)}` : null;
          const r = await reserveProviderCapacity(
            pool,
            owner(key, ev.agent.reserve),
          );
          if (r.ok) {
            await releaseProviderCapacity(pool, r.lease, ev.agent.reserve);
            const st = stats.get(ev.agent.name)!;
            st.calls += 1;
            st.tokens += ev.agent.reserve;
            continue;
          }
          if (!withRule) continue;
          const hint = r.retryAfterMs;
          const canWait =
            !ev.readmit &&
            r.reasons.every(
              (x) => x === "token_budget" || x === "request_budget",
            ) &&
            typeof hint === "number" &&
            hint > 0 &&
            hint <= 60_000;
          if (canWait)
            queue.push({
              at: ev.at + hint / 1000,
              agent: ev.agent,
              readmit: true,
            });
          else await releaseOwnerClaim(pool, routeKey, key!);
        }
        const per = Object.fromEntries(stats);
        const total = Array.from(stats.values()).reduce(
          (sum, s) => ({
            calls: sum.calls + s.calls,
            tokens: sum.tokens + s.tokens,
          }),
          { calls: 0, tokens: 0 },
        );
        return { per, total, horizon: t };
      };

      const without = await run(false);
      const withRule = await run(true);
      // Evidence for review: per-agent and total, both modes, same horizon.
      console.info(
        "owner fairness schedule",
        JSON.stringify({ without, withRule }),
      );
      const budget = (h: number) => (RATE * h) / 60 + 31_000;
      // Neither mode admits more than the bucket can refill (+ one burst).
      expect(without.total.tokens).toBeLessThanOrEqual(budget(without.horizon));
      expect(withRule.total.tokens).toBeLessThanOrEqual(
        budget(withRule.horizon),
      );
      // With the rule, every agent whose reserve one minute of refill can
      // cover is served; no throughput gain is claimed or asserted.
      for (const a of roster.filter((x) => x.reserve <= RATE))
        expect(withRule.per[a.name]!.calls).toBeGreaterThan(0);
    });

    it("refuses dispatch after a wait when the route changed under the same model name", async () => {
      const id = Number(await agentId("route-snapshot"));
      const loaded = {
        id,
        modelProvider: "nvidia",
        modelName: "fixture",
        modelBaseUrl: null,
        spec: {},
      } as unknown as AgentRow;
      expect(await agentStillSharedEligible(pool, loaded)).toBe(true);
      for (const [change, undo] of [
        [
          "UPDATE agent_runtime.agents SET model_provider = 'openai-compatible' WHERE id = $1",
          "UPDATE agent_runtime.agents SET model_provider = 'nvidia' WHERE id = $1",
        ],
        [
          "UPDATE agent_runtime.agents SET model_base_url = 'https://example.invalid/v1' WHERE id = $1",
          "UPDATE agent_runtime.agents SET model_base_url = NULL WHERE id = $1",
        ],
        [
          `UPDATE agent_runtime.agents SET spec = '{"pinnedModel": true}'::jsonb WHERE id = $1`,
          "UPDATE agent_runtime.agents SET spec = '{}'::jsonb WHERE id = $1",
        ],
        [
          `UPDATE agent_runtime.agents SET spec = '{"paidBrain": {"id": "x"}}'::jsonb WHERE id = $1`,
          "UPDATE agent_runtime.agents SET spec = '{}'::jsonb WHERE id = $1",
        ],
        [
          "UPDATE agent_runtime.agents SET status = 'disabled' WHERE id = $1",
          "UPDATE agent_runtime.agents SET status = 'active' WHERE id = $1",
        ],
      ]) {
        await pool.query(change!, [id]);
        expect(await agentStillSharedEligible(pool, loaded)).toBe(false);
        await pool.query(undo!, [id]);
        expect(await agentStillSharedEligible(pool, loaded)).toBe(true);
      }
    });

    it("releases a paused, deleted or BYO-switched claimant at once, before expiry", async () => {
      const leo = `agent:${await agentId("leo-e")}`;
      const changes = [
        "UPDATE agent_runtime.agents SET status = 'disabled' WHERE id = $1",
        "UPDATE agent_runtime.agents SET brain_key_enc = 'byo' WHERE id = $1",
        "DELETE FROM agent_runtime.agents WHERE id = $1",
      ];
      for (const [index, change] of changes.entries()) {
        const id = await agentId(`gone-${index}`);
        await drainedAgo(45);
        expect(await attempt(`agent:${id}`, MIA)).toBe(false);
        await pool.query(change, [id]);
        await drainedAgo(120);
        expect(await attempt(leo, LEO)).toBe(true);
        expect((await claim()).waiter_key).toBeNull();
      }
    });

    it("lets an expired claim lapse and a later starved agent take the slot", async () => {
      const gone = `agent:${await agentId("expired")}`;
      const olivia = `agent:${await agentId("olivia")}`;
      const leo = `agent:${await agentId("leo-x")}`;
      await drainedAgo(45);
      expect(await attempt(gone, MIA)).toBe(false);
      await pool.query(
        `UPDATE agent_runtime.provider_capacity_buckets
            SET waiter_expires_at = clock_timestamp() - interval '1 second'
          WHERE route_key = $1`,
        [routeKey],
      );
      await drainedAgo(120);
      expect(await attempt(leo, LEO)).toBe(true);
      expect((await claim()).waiter_key).toBeNull();
      await drainedAgo(10);
      expect(await attempt(olivia, OLIVIA)).toBe(false);
      expect((await claim()).waiter_key).toBe(olivia);
    });

    it("fixes the claim at the first wait: retries never extend it", async () => {
      const mia = `agent:${await agentId("mia-f")}`;
      await drainedAgo(10);
      expect(await attempt(mia, MIA)).toBe(false);
      const first = await claim();
      await drainedAgo(5);
      expect(await attempt(mia, 20_000)).toBe(false);
      const again = await claim();
      expect(again.waiter_since).toEqual(first.waiter_since);
      expect(again.waiter_expires_at).toEqual(first.waiter_expires_at);
      expect(again.waiter_tokens).toBe(20_000); // need follows the prompt
      const held =
        (new Date(again.waiter_expires_at).getTime() -
          new Date(again.waiter_since).getTime()) /
        1000;
      expect(held).toBeLessThanOrEqual(75);
    });

    it("covers the worst in-cycle wait: Mia's 24k from an empty bucket", async () => {
      const mia = `agent:${await agentId("mia-w")}`;
      const leo = `agent:${await agentId("leo-w")}`;
      await drainedAgo(0);
      const denied = await reserveProviderCapacity(pool, owner(mia, MIA));
      expect(denied.ok).toBe(false);
      // ~57.6 s: inside the 60 s in-cycle ceiling; the claim outlasts it.
      const hint = (denied as { retryAfterMs?: number }).retryAfterMs!;
      expect(hint).toBeGreaterThan(57_000);
      expect(hint).toBeLessThanOrEqual(60_000);
      const c = await claim();
      const held =
        (new Date(c.waiter_expires_at).getTime() -
          new Date(c.waiter_since).getTime()) /
        1000;
      expect(held).toBeGreaterThan(hint / 1000);
      await drainedAgo(30);
      expect(await attempt(leo, LEO)).toBe(false);
      await drainedAgo(58);
      expect(await attempt(mia, MIA)).toBe(true);
    });

    it("cannot meet a reserve above the per-minute rate in-cycle; admits it once the bucket has refilled", async () => {
      const olivia = `agent:${await agentId("olivia-big")}`;
      await drainedAgo(0);
      const denied = await reserveProviderCapacity(pool, owner(olivia, OLIVIA));
      // 31k at 25k/min needs ~74.4 s: over the 60 s ceiling, so the route does
      // not wait and releases the claim (route/runtime tests).
      expect(
        (denied as { retryAfterMs?: number }).retryAfterMs!,
      ).toBeGreaterThan(60_000);
      await releaseOwnerClaim(pool, routeKey, olivia);
      expect((await claim()).waiter_key).toBeNull();
      // Its later cycle is admitted once the bucket holds its reserve.
      await drainedAgo(75);
      expect(await attempt(olivia, OLIVIA)).toBe(true);
    });

    it("ends a claim at once when its cycle cannot wait", async () => {
      const mia = `agent:${await agentId("mia-a")}`;
      const leo = `agent:${await agentId("leo-a")}`;
      await drainedAgo(45);
      expect(await attempt(mia, MIA)).toBe(false);
      // Another agent's key never ends Mia's claim.
      await releaseOwnerClaim(pool, routeKey, leo);
      expect((await claim()).waiter_key).toBe(mia);
      await releaseOwnerClaim(pool, routeKey, mia);
      expect((await claim()).waiter_key).toBeNull();
      await drainedAgo(120);
      expect(await attempt(leo, LEO)).toBe(true);
    });

    it("keeps the claim when the claimant's admission is released unused", async () => {
      const mia = `agent:${await agentId("mia-u")}`;
      const leo = `agent:${await agentId("leo-u")}`;
      await drainedAgo(45);
      expect(await attempt(mia, MIA)).toBe(false);
      await drainedAgo(58);
      const r = await reserveProviderCapacity(pool, owner(mia, MIA));
      if (!r.ok) throw Error("expected admission");
      // e.g. the provider key was busy: owner credit refunded, turn kept.
      await releaseProviderCapacity(pool, r.lease, 0, true);
      expect((await claim()).waiter_key).toBe(mia);
      await drainedAgo(120);
      expect(await attempt(leo, LEO)).toBe(false);
    });

    it("keeps the claim across a scheduler restart (a fresh pool)", async () => {
      const mia = `agent:${await agentId("mia-r")}`;
      const leo = `agent:${await agentId("leo-r")}`;
      await drainedAgo(45);
      expect(await attempt(mia, MIA)).toBe(false);
      const restarted = new Pool({ connectionString: databaseUrl });
      try {
        await drainedAgo(50);
        expect(await attempt(leo, LEO, restarted)).toBe(false);
        await drainedAgo(58);
        expect(await attempt(mia, MIA, restarted)).toBe(true);
      } finally {
        await restarted.end();
      }
    });

    it("admits only the claimant when two replicas race for one refill", async () => {
      const mia = `agent:${await agentId("mia-c")}`;
      const leo = `agent:${await agentId("leo-c")}`;
      await drainedAgo(45);
      expect(await attempt(mia, MIA)).toBe(false);
      await drainedAgo(58);
      const other = new Pool({ connectionString: databaseUrl });
      try {
        const [l, m] = await Promise.all([
          reserveProviderCapacity(other, owner(leo, LEO)),
          reserveProviderCapacity(pool, owner(mia, MIA)),
        ]);
        expect(m.ok).toBe(true);
        expect(l.ok).toBe(false);
        expect(Number((await claim()).model_tokens)).toBeGreaterThanOrEqual(0);
      } finally {
        await other.end();
      }
    });

    it("leaves requests without a waiter key on the historical rule", async () => {
      const mia = `agent:${await agentId("mia-k")}`;
      await drainedAgo(45);
      expect(await attempt(mia, MIA)).toBe(false);
      await drainedAgo(120);
      expect(await attempt(null, LEO)).toBe(true);
    });
  });
});
