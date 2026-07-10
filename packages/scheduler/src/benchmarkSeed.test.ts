import { describe, it, expect } from "vitest";
import {
  planBenchmarkSeed,
  formatIntent,
  keyEnvNameFor,
  ownerEnvNameFor,
} from "./benchmarkSeed.js";

const ALL = new Set([
  "bench-market-implied",
  "bench-base-rate",
  "bench-random",
]);

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
