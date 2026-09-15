import { describe, it, expect, vi } from "vitest";
import type { Pool } from "pg";
import { decrypt } from "./crypto.js";
import {
  planBenchmarkSeed,
  formatIntent,
  keyEnvNameFor,
  ownerEnvNameFor,
  seedBenchmarkAgents,
} from "./benchmarkSeed.js";

const ALL = new Set([
  "bench-market-implied",
  "bench-base-rate",
  "bench-random",
]);

describe("benchmark seed execution against an isolated database stub", () => {
  it("dry-runs keyed and config-only agents without querying the database", async () => {
    const query = vi.fn();
    const result = await seedBenchmarkAgents({ query } as unknown as Pool, {
      commit: false,
      keysByHandle: { "bench-market-implied": "fixture-paper-key" },
    });
    expect(query).not.toHaveBeenCalled();
    expect(result.map((r) => r.action)).toEqual([
      "dry-run",
      "skipped-no-key-dry-run",
      "skipped-no-key-dry-run",
    ]);
  });

  it("updates only existing definitions when keys are absent", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rowCount: 1 })
      .mockResolvedValue({ rowCount: 0 });
    const log = vi.fn();
    const result = await seedBenchmarkAgents({ query } as unknown as Pool, {
      commit: true,
      log,
    });
    expect(result.map((r) => r.action)).toEqual([
      "config-updated",
      "config-skipped-no-row",
      "config-skipped-no-row",
    ]);
    for (const [sql, params] of query.mock.calls) {
      expect(sql).toMatch(/^UPDATE agent_runtime.agents SET/);
      expect(sql).not.toMatch(
        /coinrithm_key_enc|agent_state|next_run_at|status\s*=/,
      );
      expect(params).toHaveLength(6);
    }
    expect(log).toHaveBeenCalledWith(expect.stringContaining("not seeded yet"));
  });

  it("encrypts fixture keys, preserves existing state and never prints keys", async () => {
    const masterKey = Buffer.alloc(32, 7);
    const query = vi
      .fn()
      .mockResolvedValue({ rows: [{ id: "123" }], rowCount: 1 });
    const log = vi.fn();
    const result = await seedBenchmarkAgents({ query } as unknown as Pool, {
      commit: true,
      masterKey,
      log,
      owners: { "bench-market-implied": 42 },
      keysByHandle: { "bench-market-implied": " fixture-paper-key " },
    });
    expect(result[0]).toMatchObject({ action: "inserted", detail: "id 123" });
    const insert = query.mock.calls[0];
    expect(insert[1][0]).toBe(42);
    expect(decrypt(insert[1][7], masterKey)).toBe("fixture-paper-key");
    expect(query.mock.calls[1][0]).toContain(
      "ON CONFLICT (agent_id) DO NOTHING",
    );
    expect(JSON.parse(query.mock.calls[1][1][1])).toMatchObject({
      cyclesRun: 0,
    });
    expect(JSON.stringify(log.mock.calls)).not.toContain("fixture-paper-key");
  });

  it("requires encryption before the first keyed write", async () => {
    const query = vi.fn();
    await expect(
      seedBenchmarkAgents({ query } as unknown as Pool, {
        commit: true,
        keysByHandle: { "bench-market-implied": "fixture-paper-key" },
      }),
    ).rejects.toThrow("ENCRYPTION_KEY");
    expect(query).not.toHaveBeenCalled();
  });

  it.each([false, true])(
    "describes config-only intent with commit=%s",
    (commit) => {
      const [intent] = planBenchmarkSeed({
        commit,
        availableKeyHandles: new Set(),
        owners: { "bench-market-implied": 42 },
      });
      expect(formatIntent(intent)).toContain(
        `${commit ? "" : "would "}CONFIG-UPDATE bench-market-implied`,
      );
      expect(formatIntent(intent)).toContain("owner=42");
    },
  );
});

describe("keyEnvNameFor / ownerEnvNameFor", () => {
  it("derives the env var names from the handle", () => {
    expect(keyEnvNameFor("bench-market-implied")).toBe(
      "COINRITHM_KEY_BENCH_MARKET_IMPLIED",
    );
    expect(keyEnvNameFor("bench-random")).toBe("COINRITHM_KEY_BENCH_RANDOM");
    expect(ownerEnvNameFor("bench-base-rate")).toBe(
      "BENCH_OWNER_BENCH_BASE_RATE",
    );
  });
});

describe("planBenchmarkSeed — dry-run vs commit shape", () => {
  it("plans exactly the three benchmark agents, all mechanical", () => {
    const plan = planBenchmarkSeed({ commit: false, availableKeyHandles: ALL });
    expect(plan.map((i) => i.handle)).toEqual([
      "bench-market-implied",
      "bench-base-rate",
      "bench-random",
    ]);
    for (const i of plan) {
      expect(i.modelProvider).toBe("mechanical");
      // strategy travels in model.name
      expect(i.modelName).toBe(i.strategy);
      expect(i.cadenceSeconds).toBeGreaterThanOrEqual(60);
    }
  });

  it("dry-run writes nothing (willWrite=false) but still describes the intent", () => {
    const plan = planBenchmarkSeed({ commit: false, availableKeyHandles: ALL });
    expect(plan.every((i) => i.willWrite === false)).toBe(true);
    // with keys present, each would be an insert/upsert
    expect(plan.every((i) => i.mode === "insert")).toBe(true);
  });

  it("commit flags every intent to write", () => {
    const plan = planBenchmarkSeed({ commit: true, availableKeyHandles: ALL });
    expect(plan.every((i) => i.willWrite === true)).toBe(true);
  });

  it("an agent without a key becomes a config-only refresh (never a create)", () => {
    const someKeys = new Set(["bench-market-implied"]);
    const plan = planBenchmarkSeed({
      commit: true,
      availableKeyHandles: someKeys,
    });
    const byHandle = Object.fromEntries(plan.map((i) => [i.handle, i]));
    expect(byHandle["bench-market-implied"].mode).toBe("insert");
    expect(byHandle["bench-base-rate"].mode).toBe("config-only");
    expect(byHandle["bench-random"].mode).toBe("config-only");
  });

  it("applies owner ids when provided, else null", () => {
    const plan = planBenchmarkSeed({
      commit: true,
      availableKeyHandles: ALL,
      owners: { "bench-random": 123 },
    });
    const byHandle = Object.fromEntries(plan.map((i) => [i.handle, i]));
    expect(byHandle["bench-random"].ownerUserId).toBe(123);
    expect(byHandle["bench-market-implied"].ownerUserId).toBeNull();
  });

  it("formatIntent reads clearly for dry-run and commit", () => {
    const [dry] = planBenchmarkSeed({
      commit: false,
      availableKeyHandles: ALL,
    });
    const [wet] = planBenchmarkSeed({ commit: true, availableKeyHandles: ALL });
    expect(formatIntent(dry)).toMatch(/would UPSERT bench-market-implied/);
    expect(formatIntent(wet)).toMatch(/^UPSERT bench-market-implied/);
  });
});
