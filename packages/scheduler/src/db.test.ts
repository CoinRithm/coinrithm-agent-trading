import { describe, it, expect, vi } from "vitest";
import type { Pool, PoolClient } from "pg";
import { recordCycle, persistCycleResult, type CycleRecord } from "./db.js";

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
