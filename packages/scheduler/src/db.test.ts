import { describe, it, expect, vi } from "vitest";
import type { Pool, PoolClient } from "pg";
import {
  recordCycle,
  persistCycleResult,
  claimDueAgents,
  recordProviderStrike,
  clearProviderCircuit,
  CIRCUIT_TRIP_STRIKES,
  migrateAgentsOffEolModels,
  migrateHouseAgentsOffGroq,
  EOL_MODEL_SUCCESSORS,
  type CycleRecord,
} from "./db.js";

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

describe("recordCycle — no-CoT DB write boundary", () => {
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

describe("migrateAgentsOffEolModels — NVIDIA 2026-08-26 EOL event", () => {
  it("remaps every EOL'd model to a live-probe-verified successor, then revives only model_unavailable disables", async () => {
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
        "nvidia/nemotron-3-nano-30b-a3b",
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
  });

  it("de-Groq targets are living models (the old targets were EOL'd)", async () => {
    const query = vi.fn().mockResolvedValue({ rowCount: 0, rows: [] });
    const pool = { query } as unknown as Pool;
    await migrateHouseAgentsOffGroq(pool);
    const [sql] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("nvidia/nemotron-3-super-120b-a12b");
    expect(sql).toContain("nvidia/nemotron-3-nano-30b-a3b");
    expect(sql).not.toContain("meta/llama-3.1-70b-instruct");
    expect(sql).not.toContain("llama-3.3-nemotron-super-49b-v1");
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
        model: "nvidia/nemotron-3-nano-30b-a3b",
        error: "410 end of life",
      },
      model: { provider: "nvidia", name: "nvidia/nemotron-3-nano-30b-a3b" },
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
      sqls.some((s) => s.includes("next_run_at = now() + make_interval")),
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
