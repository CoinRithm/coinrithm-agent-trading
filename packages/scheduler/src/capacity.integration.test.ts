import { Pool } from "pg";
import { maintenanceTransaction, MAINTENANCE_LOCK } from "./maintenance.js";
import { rotateCredentials } from "./rotateCredentials.js";
import { encrypt, decrypt } from "./crypto.js";
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
  migrateHouseAgentsOffGroq,
  migrateAgentsOffEolModels,
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
    // Simultaneous cold starts exercise the actual numbered migration files.
    await Promise.all([migrate(pool), migrate(pool), migrate(pool)]);
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
