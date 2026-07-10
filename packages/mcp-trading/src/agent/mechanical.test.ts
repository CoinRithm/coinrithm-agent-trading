import { describe, it, expect } from "vitest";
import {
  BENCHMARK_AGENTS,
  BENCHMARK_STRATEGIES,
  BASE_RATE_UNINFORMATIVE,
  BENCHMARK_STAKE_MUSD,
  RANDOM_FORECAST_MIN,
  RANDOM_FORECAST_MAX,
  benchmarkForecast,
  decideMechanical,
  isBenchmarkStrategy,
  marketKey,
  pickBenchmarkMarket,
  seededRandomForecast,
} from "./mechanical.js";
import type { Observation, PmMarket } from "./types.js";

function mkMarket(over: Partial<PmMarket> = {}): PmMarket {
  return {
    ref: "pm1",
    source: "kalshi",
    slug: "btc-up",
    outcomeExternalMarketId: "yes-1",
    outcomeName: "Yes",
    probability: 0.42,
    title: "BTC up?",
    freshness: { status: "fresh" },
    ...over,
  };
}

function mkObs(over: Partial<Observation> = {}): Observation {
  return {
    asOf: "2026-07-10T00:00:00Z",
    scopes: ["read", "trade:pm"],
    cashAvailableMusd: 100000,
    equityMusd: 100000,
    openPositions: [],
    openOrders: [],
    pmPositions: [],
    pmResolutions: [],
    pmMarkets: [],
    watch: [],
    setups: [],
    syncCursor: null,
    newClosedTrades: [],
    polledBeforeWrite: true,
    ...over,
  };
}

describe("benchmark strategy vocabulary", () => {
  it("recognises exactly the three benchmark strategies", () => {
    expect([...BENCHMARK_STRATEGIES]).toEqual([
      "market-implied",
      "base-rate",
      "random",
    ]);
    expect(isBenchmarkStrategy("market-implied")).toBe(true);
    expect(isBenchmarkStrategy("base-rate")).toBe(true);
    expect(isBenchmarkStrategy("random")).toBe(true);
    expect(isBenchmarkStrategy("gpt-4")).toBe(false);
    expect(isBenchmarkStrategy("")).toBe(false);
  });
});

describe("benchmarkForecast — per-strategy forecast rules", () => {
  it("market-implied ECHOES the market probability exactly (percentage)", () => {
    expect(benchmarkForecast("market-implied", mkMarket({ probability: 0.42 }), "2026-07-10")).toBe(42);
    expect(benchmarkForecast("market-implied", mkMarket({ probability: 0.5 }), "2026-07-10")).toBe(50);
    expect(benchmarkForecast("market-implied", mkMarket({ probability: 0.777 }), "2026-07-10")).toBe(78);
  });

  it("market-implied clamps to the exclusive (0,100) rail [1,99]", () => {
    expect(benchmarkForecast("market-implied", mkMarket({ probability: 0.0 }), "d")).toBe(1);
    expect(benchmarkForecast("market-implied", mkMarket({ probability: 1.0 }), "d")).toBe(99);
    expect(benchmarkForecast("market-implied", mkMarket({ probability: 0.005 }), "d")).toBe(1);
  });

  it("base-rate submits the documented uninformative 50 (never invented)", () => {
    expect(benchmarkForecast("base-rate", mkMarket({ probability: 0.9 }), "d")).toBe(
      BASE_RATE_UNINFORMATIVE,
    );
    expect(BASE_RATE_UNINFORMATIVE).toBe(50);
  });

  it("random is a seeded value within [20,80]", () => {
    const f = benchmarkForecast("random", mkMarket(), "2026-07-10");
    expect(f).toBeGreaterThanOrEqual(RANDOM_FORECAST_MIN);
    expect(f).toBeLessThanOrEqual(RANDOM_FORECAST_MAX);
  });
});

describe("seededRandomForecast — deterministic + reproducible", () => {
  it("same seed always yields the same value", () => {
    const a = seededRandomForecast("kalshi|btc-up|yes-1|2026-07-10");
    const b = seededRandomForecast("kalshi|btc-up|yes-1|2026-07-10");
    expect(a).toBe(b);
  });

  it("different seeds (date or market) generally diverge", () => {
    const day1 = seededRandomForecast("kalshi|btc-up|yes-1|2026-07-10");
    const day2 = seededRandomForecast("kalshi|btc-up|yes-1|2026-07-11");
    const other = seededRandomForecast("polymarket|eth-up|no-9|2026-07-10");
    expect(day1).not.toBe(day2);
    expect(day1).not.toBe(other);
  });

  it("random benchmark forecast is reproducible from (market, date)", () => {
    const m = mkMarket();
    const f1 = benchmarkForecast("random", m, "2026-07-10");
    const f2 = benchmarkForecast("random", m, "2026-07-10");
    expect(f1).toBe(f2);
    // matches the direct seed computation
    expect(f1).toBe(seededRandomForecast(`${marketKey(m)}|2026-07-10`));
  });

  it("stays inside the band across many seeds", () => {
    for (let i = 0; i < 500; i++) {
      const v = seededRandomForecast(`seed-${i}`);
      expect(v).toBeGreaterThanOrEqual(RANDOM_FORECAST_MIN);
      expect(v).toBeLessThanOrEqual(RANDOM_FORECAST_MAX);
    }
  });
});

describe("pickBenchmarkMarket — deterministic pick rule", () => {
  it("picks the highest-volume eligible market", () => {
    const markets = [
      mkMarket({ slug: "a", outcomeExternalMarketId: "a1", volumeUsd: 100 }),
      mkMarket({ slug: "b", outcomeExternalMarketId: "b1", volumeUsd: 900 }),
      mkMarket({ slug: "c", outcomeExternalMarketId: "c1", volumeUsd: 300 }),
    ];
    expect(pickBenchmarkMarket(markets)?.slug).toBe("b");
  });

  it("breaks volume ties by market key ascending (reproducible)", () => {
    const markets = [
      mkMarket({ slug: "z", outcomeExternalMarketId: "z1", volumeUsd: 500 }),
      mkMarket({ slug: "a", outcomeExternalMarketId: "a1", volumeUsd: 500 }),
    ];
    const first = pickBenchmarkMarket(markets);
    // deterministic regardless of input order
    expect(pickBenchmarkMarket([...markets].reverse())?.slug).toBe(first?.slug);
    expect(first?.slug).toBe("a");
  });

  it("ignores markets without a usable probability", () => {
    const markets = [
      mkMarket({ slug: "noprob", outcomeExternalMarketId: "n1", probability: undefined, volumeUsd: 999 }),
      mkMarket({ slug: "ok", outcomeExternalMarketId: "o1", probability: 0.3, volumeUsd: 10 }),
    ];
    expect(pickBenchmarkMarket(markets)?.slug).toBe("ok");
  });

  it("excludes already-held markets", () => {
    const held = mkMarket({ slug: "held", outcomeExternalMarketId: "h1", volumeUsd: 999 });
    const free = mkMarket({ slug: "free", outcomeExternalMarketId: "f1", volumeUsd: 10 });
    const heldKeys = new Set([marketKey(held)]);
    expect(pickBenchmarkMarket([held, free], heldKeys)?.slug).toBe("free");
  });

  it("falls back to key order when no volume is present (older backend)", () => {
    const markets = [
      mkMarket({ slug: "b", outcomeExternalMarketId: "b1" }),
      mkMarket({ slug: "a", outcomeExternalMarketId: "a1" }),
    ];
    expect(pickBenchmarkMarket(markets)?.slug).toBe("a");
  });

  it("returns undefined when nothing is eligible", () => {
    expect(pickBenchmarkMarket([])).toBeUndefined();
    expect(
      pickBenchmarkMarket([mkMarket({ probability: undefined })]),
    ).toBeUndefined();
  });
});

describe("decideMechanical — produces a benchmark pm_open", () => {
  const obs = mkObs({
    pmMarkets: [
      mkMarket({ slug: "low", outcomeExternalMarketId: "l1", probability: 0.2, volumeUsd: 10 }),
      mkMarket({ slug: "high", outcomeExternalMarketId: "h1", probability: 0.6, volumeUsd: 900 }),
    ],
  });

  it("market-implied bets the top-volume market echoing its probability", () => {
    const { decision } = decideMechanical({ strategy: "market-implied", observation: obs, dateKey: "2026-07-10" });
    expect(decision.decision).toBe("act");
    expect(decision.actions).toHaveLength(1);
    const a = decision.actions[0];
    expect(a.type).toBe("pm_open");
    if (a.type === "pm_open") {
      expect(a.slug).toBe("high");
      expect(a.forecastProbability).toBe(60); // == round(0.6 * 100)
      expect(a.stakeMusd).toBe(BENCHMARK_STAKE_MUSD);
      expect(a.confidence).toBe(1);
    }
  });

  it("base-rate bets the same market but forecasts 50", () => {
    const { decision } = decideMechanical({ strategy: "base-rate", observation: obs, dateKey: "2026-07-10" });
    const a = decision.actions[0];
    expect(a.type === "pm_open" && a.slug).toBe("high"); // SAME pick as market-implied
    expect(a.type === "pm_open" && a.forecastProbability).toBe(50);
  });

  it("random bets the same market with a seeded [20,80] forecast", () => {
    const { decision } = decideMechanical({ strategy: "random", observation: obs, dateKey: "2026-07-10" });
    const a = decision.actions[0];
    expect(a.type === "pm_open" && a.slug).toBe("high"); // SAME pick
    if (a.type === "pm_open") {
      expect(a.forecastProbability).toBeGreaterThanOrEqual(20);
      expect(a.forecastProbability).toBeLessThanOrEqual(80);
      // reproducible
      const again = decideMechanical({ strategy: "random", observation: obs, dateKey: "2026-07-10" });
      const b = again.decision.actions[0];
      expect(b.type === "pm_open" && b.forecastProbability).toBe(a.forecastProbability);
    }
  });

  it("skips when no eligible market is available", () => {
    const { decision } = decideMechanical({ strategy: "market-implied", observation: mkObs() });
    expect(decision.decision).toBe("skip");
    expect(decision.actions).toHaveLength(0);
    expect(decision.reason).toBe("no_eligible_market");
  });

  it("skips (never throws) on an unknown strategy", () => {
    const { decision } = decideMechanical({ strategy: "totally-not-a-strategy", observation: obs });
    expect(decision.decision).toBe("skip");
    expect(decision.reason).toBe("unknown_strategy");
  });

  it("does not re-bet a market it already holds", () => {
    const held = mkObs({
      pmMarkets: [mkMarket({ slug: "high", outcomeExternalMarketId: "h1", probability: 0.6, volumeUsd: 900 })],
      pmPositions: [
        { id: 1, source: "kalshi", slug: "high", outcomeExternalMarketId: "h1", status: "open" },
      ],
    });
    const { decision } = decideMechanical({ strategy: "market-implied", observation: held });
    expect(decision.decision).toBe("skip");
  });
});

describe("BENCHMARK_AGENTS — seedable definitions", () => {
  it("defines exactly three clearly-labeled benchmark agents", () => {
    expect(BENCHMARK_AGENTS).toHaveLength(3);
    expect(BENCHMARK_AGENTS.map((a) => a.handle)).toEqual([
      "bench-market-implied",
      "bench-base-rate",
      "bench-random",
    ]);
  });

  it("every agent is mechanical, PM-only, tiny-stake, and cannot self-disable", () => {
    for (const a of BENCHMARK_AGENTS) {
      expect(a.spec.model?.provider).toBe("mechanical");
      // strategy travels in model.name
      expect(a.spec.model?.name).toBe(a.strategy);
      expect(a.spec.venues).toEqual(["pm"]);
      expect(a.spec.risk.perTradeMarginMusd).toBe(BENCHMARK_STAKE_MUSD);
      expect(a.spec.abstention.minConfidence).toBe(0);
      // all kill-switches off — a reference line never risk-stops
      expect(a.spec.killSwitch.maxDrawdownMusd).toBe(0);
      expect(a.spec.killSwitch.maxConsecutiveRejects).toBe(0);
      expect(a.spec.killSwitch.maxConsecutiveModelFailures).toBe(0);
      expect(a.spec.killSwitch.onRateLimitPressure).toBe(false);
      // labeled BENCHMARK so it is never marketed as a skill agent
      expect(a.spec.description).toMatch(/BENCHMARK/);
      expect(a.displayName).toMatch(/Benchmark/i);
      expect(a.cadenceSeconds).toBeGreaterThanOrEqual(60);
    }
  });
});
