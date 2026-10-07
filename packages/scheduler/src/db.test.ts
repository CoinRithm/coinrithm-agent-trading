import { afterEach, describe, it, expect, vi } from "vitest";
import type { Pool, PoolClient } from "pg";
import type { DecisionInputRecord } from "@coinrithm/mcp-trading/engine";
import {
  recordCycle,
  persistCycleResult,
  claimDueAgents,
  recordProviderStrike,
  clearProviderCircuit,
  CIRCUIT_TRIP_STRIKES,
  migrateAgentsOffEolModels,
  migrateHouseAgentsOffGroq,
  rescheduleToCadence,
  configureScheduling,
  nextRunAtSql,
  phaseOffsetSeconds,
  reviveDisabledAgents,
  pauseAgent,
  reservePaidCall,
  markPaidCallDispatched,
  recordPaidCallResult,
  finalizePaidCall,
  listPaidRecoveryCandidates,
  OWNER_CREDIT_LOCK,
  sharedCadenceFloorSeconds,
  SHARED_CADENCE_TARGET_RPM,
  EOL_MODEL_SUCCESSORS,
  type CycleRecord,
  agentStillSharedEligible,
  type AgentRow,
} from "./db.js";
import { paidBrainModel, priceRowAt } from "./paidBrain.js";

describe.each(["recordCycle", "persistCycleResult"] as const)(
  "%s model diagnostic persistence boundary",
  (writer) => {
    it.each([
      [
        "failed",
        "malformed",
        "json_array_nonempty_valid_decision",
        "tool_call",
        true,
        true,
      ],
      ["failed", "malformed", "PRIVATE_OUTPUT", "PRIVATE_OUTPUT", false, false],
      [
        "success",
        undefined,
        "json_array_nonempty_valid_decision",
        "tool_call",
        false,
        true,
      ],
      ["success", undefined, undefined, "content", false, true],
      ["success", undefined, undefined, "content_fallback", false, true],
      ["success", undefined, undefined, undefined, false, false],
      ["success", undefined, "PRIVATE_OUTPUT", "PRIVATE_OUTPUT", false, false],
      ["deferred", "capacity", undefined, "content", false, false],
      [
        "failed",
        "transient",
        "json_array_nonempty_valid_decision",
        "tool_call",
        false,
        false,
      ],
    ] as const)(
      "retains only applicable fixed categories: %s/%s/%s/%s",
      async (
        outcome,
        failureClass,
        diagnostic,
        responseSource,
        retainDiagnostic,
        retainSource,
      ) => {
        const query = vi.fn().mockResolvedValue({ rows: [] });
        const pool = {
          query,
          connect: vi.fn().mockResolvedValue({ query, release: vi.fn() }),
        } as unknown as Pool;
        const cycle = {
          decision: "skip",
          routeAttempts: [
            {
              provider: "nvidia",
              model: "fixture",
              outcome,
              failureClass,
              latencyMs: 1,
              actionsStringDiagnostic: diagnostic,
              responseSource,
              rawModelOutput: "PRIVATE_OUTPUT",
            },
          ],
        };
        if (writer === "recordCycle") await recordCycle(pool, 1, cycle);
        else await persistCycleResult(pool, 1, { state: {}, cycle });
        const call = query.mock.calls.find((c) =>
          String(c[0]).includes("INSERT INTO agent_runtime.agent_cycles"),
        )!;
        const audit = JSON.parse(String(call[1][24]))[0];
        if (retainDiagnostic)
          expect(audit.actionsStringDiagnostic).toBe(diagnostic);
        else expect(audit).not.toHaveProperty("actionsStringDiagnostic");
        if (retainSource) expect(audit.responseSource).toBe(responseSource);
        else expect(audit).not.toHaveProperty("responseSource");
        expect(JSON.stringify(audit)).not.toContain("PRIVATE_OUTPUT");
        expect(call[1][5]).toBeNull();
      },
    );
  },
);

// No-CoT privacy policy (see f778338 + the DB write boundary hardening in
// db.ts): agent_runtime.agent_cycles.raw_model_output must NEVER receive raw
// model text, no matter what a caller passes. CycleRecord no longer even
// declares a `rawModelOutput` field (compile-time block), but a careless
// caller could still smuggle one in via an `any`/unknown cast or a stale
// build — these tests exercise exactly that hostile path at the runtime
// boundary and assert the persisted value is hard-forced to NULL.

// raw_model_output is bound positionally as the 6th SQL parameter ($6) in
// both INSERT statements below — see the column list in db.ts.
const RAW_MODEL_OUTPUT_PARAM_INDEX = 5;

function privateRecord(): DecisionInputRecord {
  return {
    version: "coinrithm.decision-input.v1",
    visibility: "private",
    completeness: "partial",
    phase: "decision_input",
    outcome: "returned",
    runId: "private-run",
    decisionId: "private-cycle",
    configFingerprint: `sha256:${"a".repeat(64)}`,
    observationFingerprint: `sha256:${"b".repeat(64)}`,
    preThesisObservationFingerprint: `sha256:${"b".repeat(64)}`,
    dailyRiskBudget: {
      version: "coinrithm.daily-risk-budget.v1",
      utcDay: "2026-09-07",
      limit: 3,
      used: 2,
      remaining: 1,
    },
    guardState: { riskIncreasesToday: 2, disabled: false },
    account: { cashAvailableMusd: 8765 },
    lists: { watch: [{ symbol: "BTC", priceUsd: 67000 }] },
    counts: { watch: { source: 1, retained: 1, omitted: 0 } },
    omissions: ["partial_projection_not_full_model_input"],
  };
}

describe.each(["recordCycle", "persistCycleResult"] as const)(
  "%s private input storage boundary",
  (writer) => {
    async function write(decisionInputRecord: unknown) {
      const query = vi.fn().mockResolvedValue({ rows: [] });
      const release = vi.fn();
      const pool = {
        query,
        connect: vi.fn().mockResolvedValue({ query, release }),
      } as unknown as Pool;
      const cycle = {
        decision: "skip",
        actions: [],
        log: "ordinary safe log",
        decisionInputRecord,
      };
      if (writer === "recordCycle") await recordCycle(pool, 42, cycle);
      else
        await persistCycleResult(pool, 42, { state: { cyclesRun: 1 }, cycle });
      const call = query.mock.calls.find((c) =>
        String(c[0]).includes("INSERT INTO agent_runtime.agent_cycles"),
      )!;
      return {
        query,
        release,
        sql: String(call[0]),
        params: call[1] as unknown[],
      };
    }

    it("retains only the private payload with server expiry and no log/action copy", async () => {
      const record = privateRecord();
      const { query, release, sql, params } = await write(record);
      expect(JSON.parse(String(params[25]))).toEqual(record);
      expect(sql).toContain("decision_input_record_expires_at");
      expect(sql).toMatch(
        /CASE WHEN \$26::jsonb IS NOT NULL THEN now\(\) \+ interval '30 days' ELSE NULL END/,
      );
      expect(params).toHaveLength(26);
      expect(params[8]).toBe("[]");
      expect(params[9]).toBe("ordinary safe log");
      expect(JSON.stringify(params.slice(0, 25))).not.toContain("private-run");
      expect(JSON.stringify(params.slice(0, 25))).not.toContain("8765");
      if (writer === "persistCycleResult") {
        const sqls = query.mock.calls.map((c) => String(c[0]));
        expect(sqls[0]).toBe("BEGIN");
        expect(sqls[1]).toContain("agent_runtime.agent_state");
        expect(sqls[2]).toContain("agent_runtime.agent_cycles");
        expect(sqls.at(-1)).toBe("COMMIT");
        expect(release).toHaveBeenCalledOnce();
      }
    });

    it("retains bounded PM provenance through the rebuilt engine sanitizer without a public copy", async () => {
      const record = privateRecord();
      record.lists.pmMarkets = [
        {
          source: "kalshi",
          slug: "test-market",
          probability: 0.01,
          freshness: {
            status: "fresh",
            ageSeconds: 600,
            asOf: "2026-09-07T01:00:00.000Z",
            basis: "latest_snapshot",
          },
          quality: {
            decisionEligible: true,
            policyVersion: "pm-quality-3",
            assessedAt: "2026-09-07T01:00:00.000Z",
            warningReasons: ["source_time_unverified"],
            blockReasons: [],
            reasonsOmitted: false,
          },
          decisionSupport: {
            qualityScore: 0,
            qualityTier: "low",
            qualityCapReason: "raw_book",
            highAmbiguity: true,
            staleData: false,
          },
        },
      ];
      record.counts.pmMarkets = { source: 1, retained: 1, omitted: 0 };
      const { params } = await write(record);
      expect(JSON.parse(String(params[25]))).toEqual(record);
      expect(JSON.stringify(params.slice(0, 25))).not.toContain("test-market");
      expect(JSON.stringify(params.slice(0, 25))).not.toContain(
        "source_time_unverified",
      );

      record.lists.pmMarkets[0].quality = {
        warningReasons: ["PRIVATE_MUST_NOT_PERSIST"],
      };
      const rejected = await write(record);
      expect(rejected.params[25]).toBeNull();
      expect(JSON.stringify(rejected.params)).not.toContain(
        "PRIVATE_MUST_NOT_PERSIST",
      );
    });

    it("persists the newer numeric projection privately and keeps the original expiry policy", async () => {
      const record = privateRecord();
      record.projectionVersion = "coinrithm.decision-input-projection.v2";
      record.lists.watch[0].indicators = {
        bollinger: { upper: 0.97, mid: 0.75, lower: 0.53 },
        recent20: { high: 0.95, low: 0.55 },
      };
      record.lists.universeMovers = [
        { symbol: "LSK", change24hPct: 12.34, priceUsd: 0.75 },
      ];
      record.counts.universeMovers = { source: 1, retained: 1, omitted: 0 };
      const { sql, params } = await write(record);
      expect(JSON.parse(String(params[25]))).toEqual(record);
      expect(sql).toContain("interval '30 days'");
      expect(params[RAW_MODEL_OUTPUT_PARAM_INDEX]).toBeNull();
      expect(JSON.stringify(params.slice(0, 25))).not.toContain("bollinger");
      expect(JSON.stringify(params.slice(0, 25))).not.toContain(
        "universeMovers",
      );
    });

    it.each([
      "absent",
      "null",
      "foreign",
      "nested",
      "free_text",
      "oversized",
      "secret_identifier",
    ])(
      "rejects %s payloads and leaves expiry null through the same SQL condition",
      async (kind) => {
        const r = privateRecord();
        const candidates: Record<string, unknown> = {
          absent: undefined,
          null: null,
          foreign: { ...r, prompt: "PRIVATE_MUST_NOT_PERSIST" },
          nested: {
            ...r,
            lists: {
              watch: [{ symbol: "BTC", prompt: "PRIVATE_MUST_NOT_PERSIST" }],
            },
          },
          free_text: { ...r, omissions: ["PRIVATE_MUST_NOT_PERSIST"] },
          oversized: { ...r, runId: "PRIVATE_MUST_NOT_PERSIST".repeat(1000) },
          secret_identifier: {
            ...r,
            runId: "crk_live_PRIVATE_MUST_NOT_PERSIST",
          },
        };
        const { sql, params } = await write(candidates[kind]);
        expect(params[25]).toBeNull();
        expect(sql).toContain("CASE WHEN $26::jsonb IS NOT NULL");
        expect(sql).toContain("ELSE NULL END");
        expect(JSON.stringify(params)).not.toContain(
          "PRIVATE_MUST_NOT_PERSIST",
        );
      },
    );
  },
);

describe("private cycle transaction failure", () => {
  it("rolls back state and payload together when the cycle insert fails", async () => {
    const failure = new Error("cycle insert unavailable");
    const query = vi.fn(async (sql: string) => {
      if (sql.includes("INSERT INTO agent_runtime.agent_cycles")) throw failure;
      return { rows: [] };
    });
    const release = vi.fn();
    const pool = {
      connect: vi.fn().mockResolvedValue({ query, release }),
    } as unknown as Pool;
    await expect(
      persistCycleResult(pool, 42, {
        state: { cyclesRun: 1 },
        cycle: { decision: "skip", decisionInputRecord: privateRecord() },
      }),
    ).rejects.toBe(failure);
    expect(query.mock.calls.map((c) => c[0])).toContain("ROLLBACK");
    expect(query.mock.calls.map((c) => c[0])).not.toContain("COMMIT");
    expect(release).toHaveBeenCalledOnce();
  });
});

describe("recordCycle — no-CoT DB write boundary", () => {
  it.each([false, true])(
    "allowlists admission reasons for local deferrals (atomic=%s)",
    async (atomic) => {
      const query = vi.fn().mockResolvedValue({ rows: [] });
      const pool = {
        query,
        connect: vi.fn().mockResolvedValue({ query, release: vi.fn() }),
      } as unknown as Pool;
      const cycle: CycleRecord = {
        decision: "skip",
        routeAttempts: [
          {
            provider: "nvidia",
            model: "fixture",
            outcome: "deferred",
            latencyMs: 0,
            admissionReasons: [
              "token_budget",
              "PRIVATE_SECRET",
              { prompt: "PRIVATE_SECRET" },
              "token_budget",
              "model_cooldown",
              "concurrency",
            ],
          },
          {
            provider: "nvidia",
            model: "fixture",
            outcome: "failed",
            status: 429,
            admissionReasons: ["token_budget"],
          },
        ],
      };
      if (atomic) await persistCycleResult(pool, 42, { state: {}, cycle });
      else await recordCycle(pool, 42, cycle);
      const insert = query.mock.calls.find(([sql]) =>
        String(sql).includes("INSERT INTO agent_runtime.agent_cycles"),
      )!;
      const audit = JSON.parse(String(insert[1][24]));
      expect(audit[0].admissionReasons).toEqual([
        "token_budget",
        "concurrency",
        "model_cooldown",
      ]);
      expect(audit[1]).not.toHaveProperty("admissionReasons");
      expect(JSON.stringify(audit)).not.toContain("PRIVATE_SECRET");
    },
  );

  it("persists at most two allowlisted route attempts with secrets removed", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const pool = { query } as unknown as Pool;
    await recordCycle(pool, 42, {
      decision: "skip",
      routeAttempts: [
        {
          provider: "nvidia",
          model: "nano",
          outcome: "failed",
          failureClass: "transient",
          status: 503,
          latencyMs: 50,
          error: `Bearer secret-token-123 ${"x".repeat(500)}`,
          keyRef: "must-not-persist",
          prompt: "must-not-persist",
        },
        { provider: "openai", model: "gpt", outcome: "success", latencyMs: 30 },
        {
          provider: "third",
          model: "ignored",
          outcome: "success",
          latencyMs: 1,
        },
      ],
    });
    const [, params] = query.mock.calls[0] as [string, unknown[]];
    const audit = JSON.parse(String(params[24])) as Array<
      Record<string, unknown>
    >;
    expect(audit).toHaveLength(2);
    expect(JSON.stringify(audit)).not.toContain("secret-token-123");
    expect(JSON.stringify(audit)).not.toContain("keyRef");
    expect(JSON.stringify(audit)).not.toContain("prompt");
    expect(String(audit[0]?.error).length).toBeLessThanOrEqual(200);
  });

  it("persists NULL for raw_model_output even when a caller smuggles a value in", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const pool = { query } as unknown as Pool;

    // Simulate a caller that bypasses the type system (any/unknown cast) and
    // attaches a raw model transcript anyway.
    const hostileRecord = {
      decision: "act",
      rationale: "sanitized summary",
      confidence: 0.8,
      rawModelOutput: "full chain-of-thought the model produced this cycle",
    } as unknown as CycleRecord;

    await recordCycle(pool, 42, hostileRecord);

    expect(query).toHaveBeenCalledTimes(1);
    const [sql, params] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("raw_model_output");
    expect(params[RAW_MODEL_OUTPUT_PARAM_INDEX]).toBeNull();
  });

  it("persists NULL for raw_model_output on an ordinary, compliant call", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const pool = { query } as unknown as Pool;

    await recordCycle(pool, 1, {
      decision: "skip",
      skipReason: "gate: no trigger",
    });

    const [, params] = query.mock.calls[0] as [string, unknown[]];
    expect(params[RAW_MODEL_OUTPUT_PARAM_INDEX]).toBeNull();
  });
});

describe("persistCycleResult — no-CoT DB write boundary", () => {
  it("persists NULL for raw_model_output even when a caller smuggles a value in", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const release = vi.fn();
    const client = { query, release } as unknown as PoolClient;
    const pool = {
      connect: vi.fn().mockResolvedValue(client),
    } as unknown as Pool;

    const hostileCycle = {
      decision: "act",
      rationale: "sanitized summary",
      confidence: 0.7,
      rawModelOutput: "full chain-of-thought the model produced this cycle",
    } as unknown as CycleRecord;

    await persistCycleResult(pool, 7, {
      state: { runId: "r1" },
      cycle: hostileCycle,
    });

    const cycleInsertCall = query.mock.calls.find(
      (call) =>
        typeof call[0] === "string" &&
        call[0].includes("agent_runtime.agent_cycles"),
    );
    expect(cycleInsertCall).toBeDefined();
    const params = cycleInsertCall![1] as unknown[];
    expect(params[RAW_MODEL_OUTPUT_PARAM_INDEX]).toBeNull();
    expect(release).toHaveBeenCalledTimes(1);
  });
});

describe("sharedCadenceFloorSeconds — free pool stretches with the fleet", () => {
  it("scales the interval with the number of shared agents", () => {
    // The free NVIDIA lane is a FIXED budget (~11.7 calls/min at 8.4k tokens a
    // cycle), so each new shared agent must slow everyone slightly rather than
    // starve the pool. ceil(N * 60 / TARGET_RPM).
    expect(sharedCadenceFloorSeconds(25)).toBe(
      Math.ceil((25 * 60) / SHARED_CADENCE_TARGET_RPM),
    );
    const small = sharedCadenceFloorSeconds(25);
    const big = sharedCadenceFloorSeconds(200);
    expect(big).toBeGreaterThan(small);
    // Fleet demand stays at/below the target no matter the size.
    for (const n of [1, 25, 100, 200, 1000]) {
      const rpm = (n * 60) / sharedCadenceFloorSeconds(n);
      expect(rpm).toBeLessThanOrEqual(SHARED_CADENCE_TARGET_RPM + 0.001);
    }
  });

  it("is a no-op for an empty pool", () => {
    expect(sharedCadenceFloorSeconds(0)).toBe(0);
    expect(sharedCadenceFloorSeconds(-3)).toBe(0);
  });
});

describe("cadence floor SQL — BYO is never throttled", () => {
  it("applies the floor only when brain_key_enc IS NULL", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const pool = { query } as unknown as Pool;
    await rescheduleToCadence(pool, 42);
    const [sql] = query.mock.calls[0] as [string];
    expect(sql).toContain("GREATEST");
    // The floor subquery is gated on the shared-pool predicate, and BYO takes
    // the ELSE 0 branch, i.e. its configured cadence verbatim.
    expect(sql).toContain("CASE WHEN brain_key_enc IS NULL");
    expect(sql).toContain("ELSE 0 END");
    expect(sql).toContain("s.brain_key_enc IS NULL");
  });
});

describe("reviveDisabledAgents — authoritative stops must stick", () => {
  const runRevive = async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const release = vi.fn();
    const client = { query, release } as unknown as PoolClient;
    const pool = {
      connect: vi.fn().mockResolvedValue(client),
    } as unknown as Pool;
    await reviveDisabledAgents(pool);
    // calls: BEGIN, UPDATE agents, (state patch skipped: no rows), COMMIT
    const update = query.mock.calls
      .map((c) => String(c[0]))
      .find((sql) => sql.includes("UPDATE agent_runtime.agents"));
    return String(update);
  };

  it("never resurrects a DRAWDOWN or SETUP stop, house agents included", async () => {
    const sql = await runRevive();
    expect(sql).toContain("%drawdown%");
    expect(sql).toContain("%setup%");
    // The house carve-out is GONE (2026-08-27). It let leo-breakout-hunter
    // re-trip its equity drawdown every tick (103 cycles/30min) and made a
    // published maxDrawdownMusd unenforceable on the public demo fleet.
    expect(sql).not.toContain("is_house");
  });

  it("still refuses the permanent-failure classes for everyone", async () => {
    const sql = await runRevive();
    expect(sql).toContain("model_unavailable%");
    expect(sql).toContain("key_invalid%");
  });

  it("still self-heals the transient classes it was written for", async () => {
    const sql = await runRevive();
    // Nothing narrows the revive to a reason allowlist, so an unknown or null
    // reason (flaky-model streak, reject run, rate-limit pressure) still heals.
    expect(sql).toContain("status = 'disabled'");
    expect(sql).toContain("status = 'active'");
    expect(sql).toContain("next_run_at = now()");
  });
});

describe("migrateAgentsOffEolModels — NVIDIA 2026-08-26 EOL event", () => {
  it("remaps shared unpinned EOL models, then revives only their model_unavailable disables", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rowCount: 35, rows: [] })
      .mockResolvedValueOnce({ rowCount: 23, rows: [] });
    const pool = { query } as unknown as Pool;

    const [remapped, revived] = await migrateAgentsOffEolModels(pool);
    expect(remapped).toBe(35);
    expect(revived).toBe(23);
    expect(query).toHaveBeenCalledTimes(2);

    const [remapSql, remapParams] = query.mock.calls[0] as [string, string[]];
    // Every dead id and every successor rides as a bind param — and the
    // successors are only the two probe-verified models.
    for (const [dead, next] of Object.entries(EOL_MODEL_SUCCESSORS)) {
      expect(remapParams).toContain(dead);
      expect(remapParams).toContain(next);
    }
    expect(new Set(Object.values(EOL_MODEL_SUCCESSORS))).toEqual(
      new Set([
        "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning",
        "nvidia/nemotron-3-super-120b-a12b",
      ]),
    );
    expect(remapSql).toContain("model_provider = 'nvidia'");

    const [reviveSql] = query.mock.calls[1] as [string, unknown[]];
    // Revival is scoped to the model_unavailable class ONLY — drawdown and
    // key_invalid disables must never be resurrected by a model remap.
    expect(reviveSql).toContain("model_unavailable%");
    expect(reviveSql).toContain("status = 'disabled'");
    expect(reviveSql).toContain("next_run_at = now()");
    // BOTH boot paths must preserve the owner's BYO/pinned selection and stop.
    // Checking only the remap leaves a previously migrated pinned/BYO agent
    // eligible for automatic revival when its name already is a successor.
    for (const sql of [remapSql, reviveSql]) {
      expect(sql).toContain("brain_key_enc IS NULL");
      expect(sql).toContain(
        "(spec->'pinnedModel') IS DISTINCT FROM 'true'::jsonb",
      );
      // JSONB equality pins only boolean true, not string "true", and includes
      // absent/null/malformed values without an unsafe boolean cast. Legacy
      // shared agents with no pin continue through the existing migration.
      expect(sql).not.toMatch(/pinnedModel[^\n]*::boolean/);
      expect(sql).not.toContain("is_house");
    }
  });

  it("de-Groq targets are living models (the old targets were EOL'd)", async () => {
    const query = vi.fn().mockResolvedValue({ rowCount: 0, rows: [] });
    const pool = { query } as unknown as Pool;
    await migrateHouseAgentsOffGroq(pool);
    const [sql] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("nvidia/nemotron-3-super-120b-a12b");
    expect(sql).toContain("nvidia/nemotron-3-nano-omni-30b-a3b-reasoning");
    expect(sql).not.toContain("meta/llama-3.1-70b-instruct");
    expect(sql).not.toContain("llama-3.3-nemotron-super-49b-v1");
    expect(sql).toContain("is_house = true");
  });

  it("de-Groq also reaches shared unpinned user rows that are active or stopped as model_unavailable, nothing else (2026-09-24)", async () => {
    const query = vi.fn().mockResolvedValue({ rowCount: 1, rows: [] });
    const pool = { query } as unknown as Pool;
    await migrateHouseAgentsOffGroq(pool);
    const [sql] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("model_provider = 'groq'");
    // Same scope as every automatic model migration: no BYO key, not pinned.
    expect(sql).toContain("brain_key_enc IS NULL");
    expect(sql).toContain(
      "(spec->'pinnedModel') IS DISTINCT FROM 'true'::jsonb",
    );
    // House rows as before, plus shared rows that can actually be repaired:
    // active ones and the ones already stopped because the model is gone.
    expect(sql).toContain("is_house = true");
    expect(sql).toContain("OR ((a.status = 'active'");
    expect(sql).toContain(
      "OR (a.status = 'disabled' AND a.disabled_reason ILIKE 'model_unavailable%')",
    );
    // Paused, drawdown-stopped and key_invalid shared rows are not named, so
    // they are untouched: they cannot run until their owner acts anyway.
    expect(sql).not.toContain("'paused'");
    expect(sql).not.toContain("drawdown");
    expect(sql).not.toContain("key_invalid");
    // Shared rows must have an owner-matched, unrevoked CoinRithm key; house
    // rows have no ApiKey and keep the old path.
    expect(sql).toContain('FROM "ApiKey" k');
    expect(sql).toContain('k."userId" = a.owner_user_id');
    expect(sql).toContain('k."revokedAt" IS NULL');
    expect(sql).toContain("brain_key_enc IS NULL");
    expect(sql).toContain(
      "(spec->'pinnedModel') IS DISTINCT FROM 'true'::jsonb",
    );
  });
});

describe("provider circuits — reliability slice 1 (never disable on provider failure)", () => {
  it("persistCycleResult with providerHold strikes the FLEET circuit and never disables", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [], rowCount: 1 });
    const client = { query, release: vi.fn() };
    const pool = {
      connect: vi.fn().mockResolvedValue(client),
      query,
    } as unknown as Pool;

    await persistCycleResult(pool, 7, {
      state: {},
      cycle: {
        decision: "skip",
        skipReason: "provider hold: 410 gone",
        modelFailed: true,
        llmCallMade: true,
      } as CycleRecord,
      providerHold: {
        provider: "nvidia",
        model: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning",
        error: "410 end of life",
      },
      model: {
        provider: "nvidia",
        name: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning",
      },
    });

    const sqls = query.mock.calls.map((c) => String(c[0]));
    const strike = sqls.find(
      (s) => s.includes("provider_circuits") && s.includes("ON CONFLICT"),
    );
    expect(strike, "circuit strike upsert must run").toBeTruthy();
    expect(strike).toContain("strikes + 1");
    expect(strike).toContain("3600"); // backoff cap
    expect(sqls.some((s) => s.includes("status = 'disabled'"))).toBe(
      false,
      // A provider failure must NEVER write a disable.
    );
    // The reschedule branch still runs so the agent stays on cadence.
    expect(
      sqls.some(
        (s) =>
          s.includes("next_run_at = now() + make_interval") ||
          s.includes("next_run_at = (SELECT to_timestamp("),
      ),
    ).toBe(true);
  });

  it("a successful model call closes the route's circuit; disables still work for real reasons", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [], rowCount: 1 });
    const client = { query, release: vi.fn() };
    const pool = {
      connect: vi.fn().mockResolvedValue(client),
      query,
    } as unknown as Pool;

    await persistCycleResult(pool, 8, {
      state: {},
      cycle: {
        decision: "act",
        decisionType: "act",
        llmCallMade: true,
        modelFailed: false,
      } as CycleRecord,
      model: { provider: "nvidia", name: "nvidia/nemotron-3-super-120b-a12b" },
    });
    let sqls = query.mock.calls.map((c) => String(c[0]));
    expect(
      sqls.some((s) =>
        s.includes("DELETE FROM agent_runtime.provider_circuits"),
      ),
    ).toBe(true);

    query.mockClear();
    await persistCycleResult(pool, 9, {
      state: {},
      cycle: { decision: "skip", disabled: true } as CycleRecord,
      disableReason: "equity drawdown >= 2500",
    });
    sqls = query.mock.calls.map((c) => String(c[0]));
    expect(sqls.some((s) => s.includes("status = 'disabled'"))).toBe(true);
  });

  it.each([
    {
      label: "upstream 429",
      llmCallMade: true,
      decisionType: "gate_skip",
      modelFailed: false,
    },
    {
      label: "local defer",
      llmCallMade: false,
      decisionType: "gate_skip",
      modelFailed: false,
    },
    {
      label: "no-call skip",
      llmCallMade: false,
      decisionType: "skip",
      modelFailed: false,
    },
    {
      label: "historical unknown call",
      llmCallMade: undefined,
      decisionType: "skip",
      modelFailed: false,
    },
    {
      label: "historical unknown result",
      llmCallMade: true,
      decisionType: undefined,
      modelFailed: false,
    },
    {
      label: "model failure",
      llmCallMade: true,
      decisionType: "model_error",
      modelFailed: true,
    },
    {
      label: "malformed call flag",
      llmCallMade: "true",
      decisionType: "skip",
      modelFailed: false,
    },
  ])(
    "does not close a circuit for $label",
    async ({ llmCallMade, decisionType, modelFailed }) => {
      const query = vi.fn().mockResolvedValue({ rows: [] });
      const pool = {
        connect: vi.fn().mockResolvedValue({ query, release: vi.fn() }),
      } as unknown as Pool;
      await persistCycleResult(pool, 42, {
        state: {},
        cycle: {
          decision: "skip",
          llmCallMade,
          decisionType,
          modelFailed,
        } as CycleRecord,
        model: { provider: "nvidia", name: "configured-model" },
      });
      expect(
        query.mock.calls.some((c) =>
          String(c[0]).includes("DELETE FROM agent_runtime.provider_circuits"),
        ),
      ).toBe(false);
      const params = query.mock.calls.find((c) =>
        String(c[0]).includes("INSERT INTO agent_runtime.agent_cycles"),
      )![1] as unknown[];
      expect(params[21]).toBe(llmCallMade === true ? "nvidia" : null);
      expect(params[22]).toBe(llmCallMade === true ? "configured-model" : null);
    },
  );

  it("preserves actual routed attribution instead of overwriting it with the configured model", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const pool = {
      connect: vi.fn().mockResolvedValue({ query, release: vi.fn() }),
    } as unknown as Pool;
    await persistCycleResult(pool, 42, {
      state: {},
      cycle: {
        decision: "skip",
        decisionType: "skip",
        llmCallMade: true,
        effectiveProvider: "actual-provider",
        effectiveModel: "actual-model",
      },
      model: { provider: "nvidia", name: "configured-model" },
    });
    const params = query.mock.calls.find((c) =>
      String(c[0]).includes("INSERT INTO agent_runtime.agent_cycles"),
    )![1] as unknown[];
    expect(params.slice(21, 23)).toEqual(["actual-provider", "actual-model"]);
  });

  it("claimDueAgents excludes shared-key agents on OPEN circuits but never BYO-key agents", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [], rowCount: 0 });
    const client = { query, release: vi.fn() };
    const pool = {
      connect: vi.fn().mockResolvedValue(client),
      query,
    } as unknown as Pool;
    await claimDueAgents(pool, 10);
    const claim = query.mock.calls
      .map((c) => String(c[0]))
      .find((s) => s.includes("FOR UPDATE OF a SKIP LOCKED"));
    expect(claim).toBeTruthy();
    expect(claim).toContain("LEFT JOIN agent_runtime.provider_circuits");
    expect(claim).toContain("a.brain_key_enc IS NOT NULL"); // BYO agents exempt from fleet holds
    expect(claim).toContain("pc.probe_after <= now()"); // probes flow when backoff passes
    const claimCall = query.mock.calls.find((c) =>
      String(c[0]).includes("FOR UPDATE OF a SKIP LOCKED"),
    );
    expect(claimCall?.[1]).toEqual([10, false]);
  });

  it("claimDueAgents lets only router-supported hosted NVIDIA routes bypass their configured circuit", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [], rowCount: 0 });
    const client = { query, release: vi.fn() };
    const pool = {
      connect: vi.fn().mockResolvedValue(client),
      query,
    } as unknown as Pool;
    await claimDueAgents(pool, 10, true);
    const claimCall = query.mock.calls.find((c) =>
      String(c[0]).includes("FOR UPDATE OF a SKIP LOCKED"),
    );
    expect(String(claimCall?.[0])).toContain(
      "$2::boolean AND a.brain_key_enc IS NULL AND a.model_provider = 'nvidia'",
    );
    expect(claimCall?.[1]).toEqual([10, true]);
  });

  it("claimDueAgents interleaves tenants before LIMIT so a large fleet cannot starve a one-agent owner", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [], rowCount: 0 });
    const client = { query, release: vi.fn() };
    const pool = {
      connect: vi.fn().mockResolvedValue(client),
      query,
    } as unknown as Pool;
    await claimDueAgents(pool, 20);
    const claim = query.mock.calls
      .map((c) => String(c[0]))
      .find((s) => s.includes("FOR UPDATE OF a SKIP LOCKED"));
    expect(claim).toContain("row_number() OVER");
    expect(claim).toContain("WHEN a.is_house THEN 'house'");
    expect(claim).toContain("'user:' || a.owner_user_id::text");
    expect(claim).toMatch(
      /ORDER BY due\.tenant_position, a\.next_run_at, a\.id\s+LIMIT \$1/,
    );
    // LIMIT must be in the fair, locking selection — never in the raw due set.
    expect(claim?.indexOf("row_number() OVER")).toBeLessThan(
      claim?.indexOf("LIMIT $1") ?? -1,
    );
  });

  it("recordProviderStrike arms probe_after only at the trip threshold; clear deletes", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [], rowCount: 1 });
    const pool = { query } as unknown as Pool;
    await recordProviderStrike(pool, "nvidia", "m", "boom");
    const [sql, params] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain(`>= ${CIRCUIT_TRIP_STRIKES}`);
    expect(params).toEqual(["nvidia", "m", "boom", 1]);
    await clearProviderCircuit(pool, "nvidia", "m");
    expect(String(query.mock.calls[1][0])).toContain(
      "DELETE FROM agent_runtime.provider_circuits",
    );
  });
});

describe("agentStillSharedEligible (after an owner-refill wait)", () => {
  it("dispatches only an active shared agent on its unchanged model", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [{}], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })
      .mockRejectedValueOnce(new Error("db down"));
    const pool = { query } as unknown as Pool;
    const loaded = {
      id: 7,
      modelProvider: "nvidia",
      modelName: "m",
      modelBaseUrl: null,
      spec: { pinnedModel: true, paidBrain: { id: "x" } },
    } as unknown as AgentRow;
    expect(await agentStillSharedEligible(pool, loaded)).toBe(true);
    expect(await agentStillSharedEligible(pool, loaded)).toBe(false);
    // A failed read never lets a stale route dispatch.
    expect(await agentStillSharedEligible(pool, loaded)).toBe(false);
    const [sql, params] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("status = 'active'");
    expect(sql).toContain("brain_key_enc IS NULL");
    expect(sql).toContain("model_provider = $2");
    expect(sql).toContain("model_base_url IS NOT DISTINCT FROM $4");
    expect(sql).toContain("spec->'paidBrain' IS NOT DISTINCT FROM $5::jsonb");
    expect(sql).toContain("spec->'pinnedModel' IS NOT DISTINCT FROM $6::jsonb");
    expect(params).toEqual([
      7,
      "nvidia",
      "m",
      null,
      JSON.stringify({ id: "x" }),
      "true",
    ]);
  });

  it("reads rows when the driver reports no rowCount", async () => {
    const pool = {
      query: vi.fn().mockResolvedValue({ rows: [{}] }),
    } as unknown as Pool;
    expect(
      await agentStillSharedEligible(pool, {
        id: 1,
        modelProvider: "nvidia",
        modelName: "m",
        spec: {},
      } as unknown as AgentRow),
    ).toBe(true);
    const params = (pool.query as ReturnType<typeof vi.fn>).mock
      .calls[0]?.[1] as unknown[];
    // Absent spec choices compare as SQL NULL (key absent), not JSON null.
    expect(params.slice(3)).toEqual([null, null, null]);
  });
});

describe("phase grid scheduling", () => {
  afterEach(() => configureScheduling({ phaseGrid: true }));

  it("reschedules onto the agent's grid when the phase grid is on", async () => {
    configureScheduling({ phaseGrid: true });
    const query = vi.fn().mockResolvedValue({ rows: [] });
    await rescheduleToCadence({ query } as unknown as Pool, 42);
    const [sql] = query.mock.calls[0] as [string];
    expect(sql).toContain("next_run_at = (SELECT to_timestamp(");
    expect(sql).toContain("2654435769");
    expect(sql).toContain("% 4294967296");
    // The slot is still the shared-pool floored cadence.
    expect(sql).toContain("GREATEST((GREATEST(");
    expect(sql).toContain("CASE WHEN brain_key_enc IS NULL");
    expect(sql).not.toContain("make_interval");
  });

  it("falls back to now()+cadence when the phase grid is off", async () => {
    configureScheduling({ phaseGrid: false });
    const query = vi.fn().mockResolvedValue({ rows: [] });
    await rescheduleToCadence({ query } as unknown as Pool, 42);
    const [sql] = query.mock.calls[0] as [string];
    expect(sql).toContain("next_run_at = now() + make_interval");
    expect(sql).not.toContain("to_timestamp(");
  });

  it("nextRunAtSql exposes both forms", () => {
    expect(nextRunAtSql({ phaseGrid: true })).toMatch(
      /^\(SELECT to_timestamp\(/,
    );
    expect(nextRunAtSql({ phaseGrid: false })).toMatch(
      /^now\(\) \+ make_interval\(secs => GREATEST\(/,
    );
  });

  it("spreads sequential ids across the whole slot (Fibonacci hash, top bits)", () => {
    // Pinned values: the SQL and the mirror must agree on these forever.
    expect(
      [1, 2, 3, 4, 5, 6, 7].map((id) => phaseOffsetSeconds(id, 240)),
    ).toEqual([148, 56, 204, 113, 21, 169, 78]);
    expect([1, 2, 3, 4, 5].map((id) => phaseOffsetSeconds(id, 180))).toEqual([
      111, 42, 153, 84, 16,
    ]);
    // Sixty-five sequential ids (a fleet of the current size) cover every
    // 10-second bucket of a 240 s slot with at most four per bucket, instead
    // of the first 65 seconds that `id % cadence` would give.
    const buckets = new Map<number, number>();
    for (let id = 1; id <= 65; id += 1) {
      const phase = phaseOffsetSeconds(id, 240);
      expect(phase).toBeGreaterThanOrEqual(0);
      expect(phase).toBeLessThan(240);
      buckets.set(
        Math.floor(phase / 10),
        (buckets.get(Math.floor(phase / 10)) ?? 0) + 1,
      );
    }
    expect(buckets.size).toBe(24);
    expect(Math.max(...buckets.values())).toBeLessThanOrEqual(4);
    // Degenerate cadences never divide by zero or escape the slot.
    expect(phaseOffsetSeconds(9, 0)).toBe(0);
    expect(phaseOffsetSeconds(9, 1)).toBe(0);
  });
});

describe("claimDueAgents in-flight exclusion", () => {
  function claimingPool() {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const client = { query, release: vi.fn() };
    const pool = {
      connect: vi.fn().mockResolvedValue(client),
    } as unknown as Pool;
    return { pool, query };
  }
  const claimCall = (query: ReturnType<typeof vi.fn>) =>
    query.mock.calls.find((c) =>
      String(c[0]).includes("FOR UPDATE OF a SKIP LOCKED"),
    );

  it("excludes locally in-flight agents in SQL before tenant ranking and LIMIT", async () => {
    const { pool, query } = claimingPool();
    await claimDueAgents(pool, 10, true, [7, 9]);
    const call = claimCall(query);
    const sql = String(call?.[0]);
    expect(sql).toContain("AND NOT (a.id = ANY($3::bigint[]))");
    // Inside the `due` CTE (filtered before ranking and LIMIT), not bolted on
    // after the batch was picked.
    expect(sql.indexOf("AND NOT (a.id = ANY($3::bigint[]))")).toBeLessThan(
      sql.indexOf("picked AS MATERIALIZED"),
    );
    expect(call?.[1]).toEqual([10, true, [7, 9]]);
  });

  it("leaves the query and its parameters unchanged when nothing is in flight", async () => {
    const { pool, query } = claimingPool();
    await claimDueAgents(pool, 10, true, []);
    const call = claimCall(query);
    expect(String(call?.[0])).not.toContain("$3");
    expect(call?.[1]).toEqual([10, true]);
  });
});

describe("paid brain ledger and call state (contract v2)", () => {
  const KEY = "reserve:42:0f8c1b2e-aaaa-4bbb-8ccc-123456789abc";
  const sonnet = priceRowAt(
    paidBrainModel("claude-sonnet-5-5")!,
    Date.UTC(2026, 9, 7),
  )!;
  const request = {
    userId: 19,
    agentId: 42,
    reserveKey: KEY,
    modelId: "claude-sonnet-5-5",
    price: sonnet,
    marginPct: 20,
    worstCaseMicro: 202_752,
    capMicro: 25_000_000,
    monthStart: "2026-10-01",
  };

  // A pool whose transactional client answers by SQL shape. `position` is
  // the admission read; `call` the paid_calls row seen FOR UPDATE.
  function ledgerPool(options: {
    position?: { balance: string; month_spend: string; uncertain: boolean };
    call?: Record<string, unknown> | null;
    insertRowCount?: number;
  }) {
    const client = vi.fn(async (sql: string) => {
      if (sql.includes("AS month_spend"))
        return { rows: options.position ? [options.position] : [] };
      if (sql.includes("FOR UPDATE"))
        return { rows: options.call ? [options.call] : [] };
      if (sql.startsWith("INSERT"))
        return { rows: [], rowCount: options.insertRowCount ?? 1 };
      return { rows: [], rowCount: 1 };
    });
    const query = vi.fn(async (sql: string) =>
      sql.includes("SELECT user_id FROM agent_runtime.paid_calls")
        ? { rows: options.call === null ? [] : [{ user_id: "19" }] }
        : { rows: [], rowCount: 1 },
    );
    const release = vi.fn();
    const pool = {
      query,
      connect: vi.fn().mockResolvedValue({ query: client, release }),
    } as unknown as Pool;
    const sqls = () => client.mock.calls.map((c) => String(c[0]));
    const call = (fragment: string) =>
      client.mock.calls.find((c) => String(c[0]).includes(fragment));
    return { pool, client, query, release, sqls, call };
  }

  const answeredCall = (overrides: Record<string, unknown> = {}) => ({
    user_id: "19",
    agent_id: "42",
    model_id: "claude-sonnet-5-5",
    status: "answered",
    price: sonnet,
    margin_pct: 20,
    usage: { promptTokens: 20_000, completionTokens: 400 },
    worst_case_micro_usd: "434381",
    stale_reserved: false,
    stale_dispatched: false,
    stale_answered: false,
    ...overrides,
  });

  it("reserves under the owner credit lock: position, admission, reserve row and call row in one transaction", async () => {
    const ledger = ledgerPool({
      position: { balance: "1000000", month_spend: "0", uncertain: false },
    });
    expect(await reservePaidCall(ledger.pool, request)).toEqual({
      kind: "reserved",
    });
    const sqls = ledger.sqls();
    expect(sqls[0]).toBe("BEGIN");
    // The lock is the FIRST statement of the transaction.
    expect(sqls[1]).toBe(
      "SELECT pg_advisory_xact_lock($1::integer, $2::integer)",
    );
    expect(ledger.client.mock.calls[1]![1]).toEqual([OWNER_CREDIT_LOCK, 19]);
    expect(OWNER_CREDIT_LOCK).toBe(734202);
    const [positionSql, positionParams] = ledger.call("AS month_spend")!;
    expect(positionParams).toEqual([19, 42, "2026-10-01"]);
    expect(positionSql).toContain("month_start = $3::date");
    expect(positionSql).toContain("status = 'uncertain'");
    expect(positionSql).toContain(
      "status = 'dispatched' AND dispatched_at < now() - interval '15 minutes'",
    );
    expect(ledger.call("'reserve'")![1]).toEqual([
      19,
      -202_752,
      42,
      "claude-sonnet-5-5",
      "price claude-sonnet-5-5@2026-10-07, margin 20%",
      KEY,
    ]);
    const callInsert = ledger.call("INSERT INTO agent_runtime.paid_calls")!;
    expect(callInsert[1]).toEqual([
      KEY,
      19,
      42,
      "claude-sonnet-5-5",
      JSON.stringify(sonnet),
      20,
      202_752,
      "2026-10-01",
    ]);
    expect(sqls.at(-1)).toBe("COMMIT");
    expect(ledger.release).toHaveBeenCalledOnce();
  });

  it.each([
    [
      { balance: "1000000", month_spend: "0", uncertain: true },
      "metering_uncertain",
    ],
    [
      { balance: "202751", month_spend: "0", uncertain: false },
      "balance_short",
    ],
    [
      { balance: "1000000", month_spend: "24900000", uncertain: false },
      "cap_reached",
    ],
  ])("refuses %j as %s without writing anything", async (position, reason) => {
    const ledger = ledgerPool({ position });
    expect(await reservePaidCall(ledger.pool, request)).toEqual({
      kind: "refused",
      reason,
    });
    expect(ledger.sqls().some((sql) => sql.startsWith("INSERT"))).toBe(false);
  });

  it("aborts the whole reservation when its key was already used", async () => {
    const ledger = ledgerPool({
      position: { balance: "1000000", month_spend: "0", uncertain: false },
      insertRowCount: 0,
    });
    await expect(reservePaidCall(ledger.pool, request)).rejects.toThrow(
      "already used",
    );
    expect(ledger.sqls()).toContain("ROLLBACK");
    expect(ledger.sqls()).not.toContain("COMMIT");
  });

  it("dispatches only a call that is still 'reserved'", async () => {
    const query = vi.fn().mockResolvedValueOnce({ rows: [], rowCount: 1 });
    const pool = { query } as unknown as Pool;
    expect(await markPaidCallDispatched(pool, KEY)).toBe(true);
    expect(query.mock.calls[0]![0]).toContain(
      "SET status = 'dispatched', dispatched_at = now()",
    );
    expect(query.mock.calls[0]![0]).toContain("AND status = 'reserved'");
    query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    expect(await markPaidCallDispatched(pool, KEY)).toBe(false);
  });

  it.each([
    [
      { status: "answered", usage: { promptTokens: 1, completionTokens: 2 } },
      "status = 'answered', usage = $2::jsonb",
      [KEY, '{"promptTokens":1,"completionTokens":2}'],
    ],
    [
      { status: "rejected", providerStatus: 529 },
      "status = 'rejected', provider_status = $2",
      [KEY, 529],
    ],
    [
      { status: "uncertain", reason: "answered without usage" },
      "status = 'uncertain', note = $2",
      [KEY, "answered without usage"],
    ],
    [
      { status: "not_called" },
      "status = 'reserved', dispatched_at = NULL",
      [KEY],
    ],
  ] as const)(
    "records a %j result only on a dispatched call",
    async (result, set, params) => {
      const query = vi.fn().mockResolvedValue({ rows: [], rowCount: 1 });
      const pool = { query } as unknown as Pool;
      expect(await recordPaidCallResult(pool, KEY, result)).toBe(true);
      const [sql, sent] = query.mock.calls[0]!;
      expect(sql).toContain(set);
      expect(sql).toContain("AND status = 'dispatched'");
      expect(sent).toEqual(params);
    },
  );

  it("releases a never-dispatched call at cycle end, returning exactly the reserved amount", async () => {
    const ledger = ledgerPool({ call: answeredCall({ status: "reserved" }) });
    expect(
      await finalizePaidCall(ledger.pool, KEY, {
        mode: "cycle_end",
        cycleId: 7,
      }),
    ).toBe("released");
    expect(ledger.sqls()[1]).toContain("pg_advisory_xact_lock");
    const [releaseSql, releaseParams] = ledger.call("'release'")!;
    expect(releaseSql).toContain("-amount_micro_usd");
    expect(releaseSql).toContain(
      "WHERE idempotency_key = $1 AND kind = 'reserve'",
    );
    expect(releaseSql).toContain("ON CONFLICT (idempotency_key) DO NOTHING");
    expect(releaseParams).toEqual([KEY, `release:${KEY}`, 7]);
    expect(ledger.sqls().some((sql) => sql.includes("'debit'"))).toBe(false);
    expect(ledger.call("SET status = $2")![1]).toEqual([
      KEY,
      "released",
      0,
      7,
      "reserved",
    ]);
  });

  it("releases an explicit provider rejection", async () => {
    const ledger = ledgerPool({ call: answeredCall({ status: "rejected" }) });
    expect(
      await finalizePaidCall(ledger.pool, KEY, { mode: "cycle_end" }),
    ).toBe("released");
  });

  it("releases the reserve and debits provider-reported usage at the SNAPSHOTTED price and margin", async () => {
    const ledger = ledgerPool({ call: answeredCall() });
    expect(
      await finalizePaidCall(ledger.pool, KEY, {
        mode: "cycle_end",
        cycleId: 4242,
      }),
    ).toBe("debited");
    expect(ledger.call("'release'")).toBeDefined();
    const [debitSql, debitParams] = ledger.call("'debit'")!;
    expect(debitSql).toContain("ON CONFLICT (idempotency_key) DO NOTHING");
    expect(debitParams).toEqual([
      19,
      -52_800,
      42,
      4242,
      "claude-sonnet-5-5",
      20_000,
      400,
      44_000,
      8_800,
      "price claude-sonnet-5-5@2026-10-07",
      `debit:${KEY}`,
    ]);
    expect(ledger.call("SET status = $2")![1]).toEqual([
      KEY,
      "finalized",
      52_800,
      4242,
      "answered",
    ]);

    // The call's own snapshot wins over today's catalogue and config.
    const snapshot = { ...sonnet, version: "old@2026-01-01", inputK: 1_000 };
    const old = ledgerPool({
      call: answeredCall({ price: snapshot, margin_pct: 0 }),
    });
    await finalizePaidCall(old.pool, KEY, { mode: "cycle_end" });
    // 20k x 1000 + 400 x 10000 = 24,000,000 / 1000 = 24,000; margin 0.
    expect(old.call("'debit'")![1].slice(1, 2)).toEqual([-24_000]);
    expect(old.call("'debit'")![1][9]).toBe("price old@2026-01-01");
  });

  it("prices cache reads and writes into the debit and notes them", async () => {
    const ledger = ledgerPool({
      call: answeredCall({
        usage: {
          promptTokens: 1_000,
          completionTokens: 100,
          cacheReadTokens: 10_000,
          cacheWriteTokens: 2_000,
        },
      }),
    });
    await finalizePaidCall(ledger.pool, KEY, { mode: "cycle_end" });
    const params = ledger.call("'debit'")![1];
    // 1,000 x 2000 + 10,000 x 200 + 2,000 x 4000 (unsplit => 1h)
    // + 100 x 10000 = 13,000,000 / 1000 = 13,000; x 1.2 = 15,600.
    expect(params[1]).toBe(-15_600);
    expect(params[9]).toContain("cache write split not reported");
  });

  it("never charges above the reserve: usage over it debits the reserve and flags the call uncertain", async () => {
    // Priced at 52,800 against a 50,000 reserve.
    const ledger = ledgerPool({
      call: answeredCall({ worst_case_micro_usd: "50000" }),
    });
    expect(
      await finalizePaidCall(ledger.pool, KEY, {
        mode: "cycle_end",
        cycleId: 9,
      }),
    ).toBe("uncertain");
    expect(ledger.call("'release'")).toBeDefined();
    const debit = ledger.call("'debit'")![1];
    expect(debit[1]).toBe(-50_000);
    expect(debit[9]).toContain(
      "over reserve: priced 52800, charged the 50000 reserve, written off 2800",
    );
    // Provider cost stays what we pay (44,000); the charge earned 6,000 over
    // it instead of the priced 8,800 margin.
    expect(debit[7]).toBe(44_000);
    expect(debit[8]).toBe(6_000);
    const [flagSql, flagParams] = ledger.call(
      "SET status = 'uncertain', debit_micro_usd = $2",
    )!;
    expect(flagSql).toContain("AND status = 'answered'");
    expect(flagParams.slice(0, 2)).toEqual([KEY, 50_000]);
    expect(ledger.call("SET status = $2")).toBeUndefined();
  });

  it("marks an answered call uncertain when its reserve cannot be read", async () => {
    const ledger = ledgerPool({
      call: answeredCall({ worst_case_micro_usd: null }),
    });
    expect(
      await finalizePaidCall(ledger.pool, KEY, { mode: "cycle_end" }),
    ).toBe("uncertain");
    expect(ledger.call("'debit'")).toBeUndefined();
  });

  it("marks an unpriceable answered call uncertain instead of guessing", async () => {
    const ledger = ledgerPool({
      call: answeredCall({
        price: { ...sonnet, cacheWrite1hK: undefined },
        usage: { promptTokens: 1, completionTokens: 1, cacheWriteTokens: 5 },
      }),
    });
    expect(
      await finalizePaidCall(ledger.pool, KEY, { mode: "cycle_end" }),
    ).toBe("uncertain");
    expect(ledger.call("SET status = 'uncertain'")).toBeDefined();
    expect(
      ledger
        .sqls()
        .some((sql) => sql.includes("INSERT INTO agent_runtime.credit_ledger")),
    ).toBe(false);
  });

  it("never refunds a dispatched call without a recorded result: it becomes uncertain", async () => {
    const ledger = ledgerPool({ call: answeredCall({ status: "dispatched" }) });
    expect(
      await finalizePaidCall(ledger.pool, KEY, { mode: "cycle_end" }),
    ).toBe("uncertain");
    expect(ledger.call("'release'")).toBeUndefined();
    expect(ledger.call("SET status = 'uncertain'")![1]).toEqual([
      KEY,
      "dispatched call left without a recorded result",
      null,
      "dispatched",
    ]);
  });

  it.each([
    ["reserved", "stale_reserved", "released"],
    ["dispatched", "stale_dispatched", "uncertain"],
    ["answered", "stale_answered", "debited"],
    ["rejected", "stale_answered", "released"],
  ])(
    "recovery leaves a fresh %s call alone and resolves it once idle for 15 minutes",
    async (status, staleFlag, resolved) => {
      const fresh = ledgerPool({ call: answeredCall({ status }) });
      expect(
        await finalizePaidCall(fresh.pool, KEY, { mode: "recovery" }),
      ).toBe("open");
      expect(fresh.sqls().some((sql) => sql.startsWith("INSERT"))).toBe(false);
      const stale = ledgerPool({
        call: answeredCall({ status, [staleFlag]: true }),
      });
      expect(
        await finalizePaidCall(stale.pool, KEY, { mode: "recovery" }),
      ).toBe(resolved);
    },
  );

  it.each(["uncertain", "released", "finalized"])(
    "does nothing for a %s call",
    async (status) => {
      const ledger = ledgerPool({ call: answeredCall({ status }) });
      expect(
        await finalizePaidCall(ledger.pool, KEY, { mode: "recovery" }),
      ).toBe("closed");
      expect(
        ledger
          .sqls()
          .filter(
            (sql) => sql.startsWith("INSERT") || sql.startsWith("UPDATE"),
          ),
      ).toEqual([]);
    },
  );

  it("reports an unknown reservation without opening a transaction", async () => {
    const ledger = ledgerPool({ call: null });
    expect(await finalizePaidCall(ledger.pool, KEY, { mode: "recovery" })).toBe(
      "missing",
    );
    expect(ledger.pool.connect).not.toHaveBeenCalled();
  });

  it("lists only open calls idle for 15 minutes, and uncertain calls for alerts", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [{ reserve_key: KEY }] })
      .mockResolvedValueOnce({
        rows: [{ reserve_key: "reserve:7:x", user_id: "19", agent_id: "7" }],
      });
    const pool = { query } as unknown as Pool;
    expect(await listPaidRecoveryCandidates(pool, 50)).toEqual({
      stale: [KEY],
      uncertain: [{ reserveKey: "reserve:7:x", userId: 19, agentId: 7 }],
    });
    const staleSql = String(query.mock.calls[0]![0]);
    expect(staleSql).toContain("status NOT IN ('released', 'finalized')");
    expect(staleSql).toContain(
      "status = 'reserved' AND created_at < now() - interval '15 minutes'",
    );
    expect(staleSql).toContain(
      "status = 'dispatched' AND dispatched_at < now() - interval '15 minutes'",
    );
    expect(query.mock.calls[0]![1]).toEqual([50]);
  });
});

describe("paid brain pause and cycle id", () => {
  it("pauses only a still-active agent, with its reason", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [], rowCount: 1 });
    const pool = { query } as unknown as Pool;
    await pauseAgent(pool, 42, "paid brain credit exhausted");
    const [sql, params] = query.mock.calls[0]!;
    expect(sql).toContain("SET status = 'paused', disabled_reason = $2");
    expect(sql).toContain("WHERE id = $1 AND status = 'active'");
    expect(params).toEqual([42, "paid brain credit exhausted"]);
  });

  it("persistCycleResult returns the inserted cycle id for the debit key", async () => {
    const query = vi
      .fn()
      .mockImplementation(async (sql: string) =>
        sql.includes("INSERT INTO agent_runtime.agent_cycles")
          ? { rows: [{ id: "4242" }], rowCount: 1 }
          : { rows: [], rowCount: 1 },
      );
    const pool = {
      connect: vi.fn().mockResolvedValue({ query, release: vi.fn() }),
    } as unknown as Pool;
    expect(
      await persistCycleResult(pool, 42, {
        state: {},
        cycle: { decision: "skip" },
      }),
    ).toBe(4242);
    const insert = query.mock.calls.find((c) =>
      String(c[0]).includes("INSERT INTO agent_runtime.agent_cycles"),
    )!;
    expect(String(insert[0])).toContain("RETURNING id");
    query.mockImplementation(async () => ({ rows: [], rowCount: 0 }));
    expect(
      await persistCycleResult(pool, 42, {
        state: {},
        cycle: { decision: "skip" },
      }),
    ).toBeUndefined();
  });
});
