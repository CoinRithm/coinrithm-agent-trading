import { describe, expect, it } from "vitest";
import {
  buildDecisionInputRecord,
  DECISION_INPUT_MAX_BYTES,
  sanitizeDecisionInputRecord,
  unavailableDecisionInputRecord,
} from "./decisionReceipt.js";
import type { DecisionInputCapture } from "./decisionReceipt.js";
import type { Observation } from "./types.js";
import { parseSkill } from "./skill.js";
import { renderFolderOfOne } from "./templates.js";
import { newState } from "./state.js";
import { buildObservationReceipt } from "./observationReceipt.js";
import { computeIndicators } from "./indicators.js";

function input(): DecisionInputCapture {
  const observation: Observation = {
    asOf: "2026-09-07T00:00:00.000Z",
    scopes: ["read"],
    cashAvailableMusd: 1234,
    equityMusd: 50000,
    openPositions: [],
    openOrders: [],
    pmPositions: [],
    pmMarkets: [],
    pmResolutions: [],
    watch: [
      {
        symbol: "BTC",
        coinId: "1",
        priceUsd: 67000,
        freshness: { status: "fresh", ageSeconds: 3 },
      },
    ],
    setups: [],
    syncCursor: null,
    newClosedTrades: [],
    polledBeforeWrite: true,
  };
  const spec = parseSkill(renderFolderOfOne("a", "conservative")).spec;
  const state = newState("run-1");
  state.dayKey = "2026-09-07";
  return {
    phase: "decision_input",
    runId: "run-1",
    decisionId: "cycle-1-abcd",
    spec,
    state,
    mergedProse: "private strategy",
    observation,
    observationFingerprint:
      buildObservationReceipt(observation).observationHash,
  };
}

describe("private partial decision input record", () => {
  it("retains exact nested indicators, context-only mover order and position time without free text", () => {
    const i = input();
    // Production candles expose numeric OHLC; preserve the computed values the
    // model saw, not a later recalculation from a different candle series.
    const indicators = computeIndicators(
      Array.from({ length: 288 }, (_, n) => ({
        open: 0.69 + n / 10000,
        high: 0.71 + n / 10000,
        low: 0.68 + n / 10000,
        close: 0.7 + n / 10000,
      })),
    )!;
    i.observation!.watch[0].indicators = indicators;
    const indicatorContext = {
      range: "1D" as const,
      nominalIntervalSeconds: 300 as const,
      asOf: "2026-09-24T00:40:00.000Z",
      barCount: 288,
      timestampedBarCount: 288,
      checkedIntervalCount: 287,
      irregularIntervalCount: 1,
      intervalStatus: "irregular" as const,
      maxGapSeconds: 600,
      recent15: { barCount: 15, intervalStatus: "regular" as const },
    };
    i.observation!.watch[0].indicatorContext = indicatorContext;
    i.observation!.universeMovers = [
      {
        symbol: "LSK",
        name: "PRIVATE_NAME",
        change24hPct: 12.34,
        priceUsd: 0.75,
      },
      { symbol: "VTHO", change24hPct: 5.67, priceUsd: 0.001 },
    ];
    i.observation!.openPositions = [
      {
        venue: "futures",
        id: 14641,
        symbol: "LSK",
        side: "long",
        openedAt: "2026-09-14T00:41:35.908Z",
      },
    ];
    const r = buildDecisionInputRecord(i);
    expect(r.projectionVersion).toBe("coinrithm.decision-input-projection.v2");
    expect(r.lists.watch[0].indicators).toEqual(indicators);
    expect(r.lists.watch[0].indicatorContext).toEqual(indicatorContext);
    expect(r.lists.universeMovers).toEqual([
      { symbol: "LSK", change24hPct: 12.34, priceUsd: 0.75 },
      { symbol: "VTHO", change24hPct: 5.67, priceUsd: 0.001 },
    ]);
    expect(r.counts.universeMovers).toEqual({
      source: 2,
      retained: 2,
      omitted: 0,
    });
    expect(r.lists.futuresPositions[0].openedAt).toBe(
      "2026-09-14T00:41:35.908Z",
    );
    expect(r.omissions).not.toContain(
      "unlisted_fields_and_nested_indicators_excluded",
    );
    expect(JSON.stringify(r)).not.toContain("PRIVATE_NAME");
    expect(sanitizeDecisionInputRecord(r)).toEqual(r);
    const injected = structuredClone(r);
    (
      injected.lists.watch[0].indicatorContext as Record<string, unknown>
    ).prompt = "PRIVATE_MUST_NOT_PERSIST";
    expect(sanitizeDecisionInputRecord(injected)).toBeUndefined();
    const invalidRange = structuredClone(r);
    (
      invalidRange.lists.watch[0].indicatorContext as Record<string, unknown>
    ).range = "PRIVATE_MUST_NOT_PERSIST";
    expect(sanitizeDecisionInputRecord(invalidRange)).toBeUndefined();
    const invalidStatus = structuredClone(r);
    (
      invalidStatus.lists.watch[0].indicatorContext as Record<string, unknown>
    ).intervalStatus = "PRIVATE_MUST_NOT_PERSIST";
    expect(sanitizeDecisionInputRecord(invalidStatus)).toBeUndefined();
    indicators.bollinger!.upper = 999;
    expect(r.lists.watch[0].indicators).not.toEqual(indicators);
  });

  it("rejects nested indicator/mover injection and preserves legacy partial records", () => {
    const r = buildDecisionInputRecord(input());
    const legacy = structuredClone(r);
    delete legacy.projectionVersion;
    delete (legacy.lists.watch[0].indicators as Record<string, unknown>)
      .bollinger;
    delete (legacy.lists.watch[0].indicators as Record<string, unknown>)
      .recent20;
    delete legacy.lists.universeMovers;
    legacy.counts.universeMovers = { source: 9, retained: 0, omitted: 9 };
    legacy.omissions.push("unlisted_fields_and_nested_indicators_excluded");
    expect(sanitizeDecisionInputRecord(legacy)).toEqual(legacy);
    for (const field of ["bollinger", "recent20"]) {
      const modified = structuredClone(r);
      (modified.lists.watch[0].indicators as Record<string, unknown>)[field] = {
        prompt: "PRIVATE_REASONING",
      };
      expect(sanitizeDecisionInputRecord(modified)).toBeUndefined();
    }
    const mover = structuredClone(r);
    mover.lists.universeMovers = [{ symbol: "LSK", name: "PRIVATE_REASONING" }];
    mover.counts.universeMovers = { source: 1, retained: 1, omitted: 0 };
    expect(sanitizeDecisionInputRecord(mover)).toBeUndefined();
    expect(
      sanitizeDecisionInputRecord({ ...r, projectionVersion: "PRIVATE_TEXT" }),
    ).toBeUndefined();
  });

  it("keeps 16 enriched watch rows and nine movers within the existing production input budget", () => {
    const i = input();
    const indicators = computeIndicators(
      Array.from({ length: 288 }, (_, n) => ({
        open: 65000 + n,
        high: 67000 + n,
        low: 64000 + n,
        close: 66000 + n,
      })),
    )!;
    i.observation!.watch = Array.from({ length: 16 }, (_, n) => ({
      symbol: `COIN${n}`,
      coinId: String(n),
      discovered: n >= 10,
      priceUsd: 67000.123456,
      change1h: 1.23,
      change24h: 12.34,
      change7d: 23.45,
      indicators,
      fundamentals: {
        marketCapRank: 100,
        marketCapUsd: 1000000000,
        volume24hUsd: 123456789,
      },
    }));
    i.observation!.universeMovers = Array.from({ length: 9 }, (_, n) => ({
      symbol: `MOVER${n}`,
      change24hPct: 12.34,
      priceUsd: 0.751632,
    }));
    i.observation!.openPositions = Array.from({ length: 5 }, (_, n) => ({
      venue: "futures",
      id: n,
      symbol: `COIN${n}`,
      side: "long",
      leverage: 3,
      marginMusd: 750,
      entryPrice: 0.75,
      markPrice: 0.76,
      liquidationPrice: 0.5,
      stopLossPrice: 0.6,
      takeProfitPrice: 0.9,
      unrealizedPnlMusd: 10,
      openedAt: "2026-09-14T00:41:35.908Z",
    }));
    const r = buildDecisionInputRecord(i);
    expect(r.counts.watch).toEqual({ source: 16, retained: 16, omitted: 0 });
    expect(r.counts.universeMovers).toEqual({
      source: 9,
      retained: 9,
      omitted: 0,
    });
    expect(r.counts.futuresPositions.retained).toBe(5);
    expect(Buffer.byteLength(JSON.stringify(r))).toBeLessThanOrEqual(
      DECISION_INPUT_MAX_BYTES,
    );
    expect(sanitizeDecisionInputRecord(r)).toEqual(r);
  });

  it("retains PM quality facts and source time while rejecting nested free-text smuggling", () => {
    const i = input();
    i.observation!.pmMarkets = [
      {
        ref: "pm1",
        source: "polymarket",
        slug: "test",
        outcomeExternalMarketId: "yes",
        probability: 0.01,
        freshness: {
          status: "fresh",
          ageSeconds: 600,
          asOf: "2026-09-07T01:55:17.076Z",
          basis: "latest_snapshot",
        },
        quality: {
          decisionEligible: true,
          warningReasons: ["anomaly_flagged", "SECRET_REASON"],
          blockReasons: [],
          policyVersion: "pm-quality-3",
          assessedAt: "2026-09-07T01:55:17.076Z",
          reasonsOmitted: false,
        },
        decisionSupport: {
          qualityScore: 74,
          qualityTier: "medium",
          qualityCapReason: "raw_book",
          spreadTier: "tight",
          flags: { highAmbiguity: true, staleData: false },
        },
      },
    ];
    const receipt = buildDecisionInputRecord(i);
    expect(receipt.lists.pmMarkets[0]).toMatchObject({
      freshness: { ageSeconds: 600, asOf: "2026-09-07T01:55:17.076Z" },
      quality: {
        decisionEligible: true,
        warningReasons: ["anomaly_flagged"],
        policyVersion: "pm-quality-3",
      },
      decisionSupport: {
        highAmbiguity: true,
        staleData: false,
        qualityTier: "medium",
      },
    });
    expect(sanitizeDecisionInputRecord(receipt)).toEqual(receipt);
    expect(JSON.stringify(receipt)).not.toContain("SECRET_REASON");
    expect(receipt.lists.pmMarkets[0].quality).toMatchObject({
      reasonsOmitted: true,
    });
    expect(receipt.omissions).toContain(
      "pm_discovery_filtered_candidates_not_recorded",
    );
    for (const [field, extension] of [
      ["quality", { warningReasons: ["SECRET_REASON"] }],
      ["quality", { policyVersion: "PRIVATE_USER_PROSE" }],
      ["quality", { rationale: "PRIVATE_REASONING" }],
      ["decisionSupport", { highAmbiguity: "PRIVATE_REASONING" }],
      ["decisionSupport", { qualityScore: 101 }],
      ["freshness", { asOf: "PRIVATE_TIMESTAMP" }],
    ] as const) {
      const modified = structuredClone(receipt);
      Object.assign(modified.lists.pmMarkets[0][field] as object, extension);
      expect(sanitizeDecisionInputRecord(modified)).toBeUndefined();
    }
    const before = JSON.stringify(receipt.lists.pmMarkets);
    i.observation!.pmMarkets[0].decisionSupport!.flags!.highAmbiguity = false;
    expect(
      JSON.stringify(buildDecisionInputRecord(i).lists.pmMarkets),
    ).not.toBe(before);
    i.observation!.pmMarkets[0].decisionSupport!.qualityScore = 101;
    expect(
      buildDecisionInputRecord(i).lists.pmMarkets[0].decisionSupport,
    ).toMatchObject({ qualityScore: null });
  });

  it("keeps structured facts and fingerprints but never free text or secrets", () => {
    const i = input();
    i.mergedProse = "PRIVATE_USER_PROSE sk-this-is-a-provider-secret";
    i.state.journal = [{ at: "today", did: "PRIVATE_JOURNAL" }];
    i.observation!.news = [{ title: "PRIVATE_NEWS" }];
    i.observation!.newClosedTrades = [
      { arbitrary: "PRIVATE_LEDGER", authorization: "Bearer hidden" },
    ];
    i.observation!.openPositions = [
      {
        venue: "futures",
        id: 7,
        marginMusd: 20,
        thesis: {
          summary: "PRIVATE_THESIS",
          invalidation: { catalyst: "PRIVATE_CATALYST" },
          holdMinutes: 1,
          status: "intact",
        },
      },
    ];
    i.observation!.watch[0].name = "PRIVATE_NAME";
    i.observation!.watch.push({
      symbol: "sk-secret",
      coinId: "crk_live_secret",
    });
    const r = buildDecisionInputRecord(i);
    const json = JSON.stringify(r);
    for (const secret of [
      "PRIVATE_USER_PROSE",
      "sk-this-is-a-provider-secret",
      "PRIVATE_JOURNAL",
      "PRIVATE_NEWS",
      "PRIVATE_LEDGER",
      "PRIVATE_THESIS",
      "PRIVATE_CATALYST",
      "PRIVATE_NAME",
      "Bearer hidden",
      "sk-secret",
      "crk_live_secret",
    ])
      expect(json).not.toContain(secret);
    expect(r.account?.cashAvailableMusd).toBe(1234);
    expect(r.lists.watch[0].priceUsd).toBe(67000);
    expect(r.configFingerprint).toMatch(/^sha256:/);
    expect(r.counts.news).toEqual({ source: 1, retained: 0, omitted: 1 });
    expect(r.completeness).toBe("partial");
    expect(sanitizeDecisionInputRecord(r)).toEqual(r);
  });

  it("bounds huge input lists and metadata to 16 KiB with exact omissions", () => {
    const i = input();
    i.observation!.watch = Array.from({ length: 10000 }, (_, n) => ({
      symbol: `COIN${n}`,
      coinId: String(n),
      priceUsd: n,
      name: "x".repeat(1000),
    }));
    i.observation!.pmMarkets = Array.from({ length: 1000 }, () => ({
      source: "polymarket",
      slug: "x".repeat(128),
      outcomeExternalMarketId: "y".repeat(128),
      title: "z".repeat(10000),
      probability: 0.4,
    }));
    i.observation!.asOf = `2026-09-07T${"1".repeat(100000)}Z`;
    const r = buildDecisionInputRecord(i);
    expect(Buffer.byteLength(JSON.stringify(r))).toBeLessThanOrEqual(
      DECISION_INPUT_MAX_BYTES,
    );
    expect(r.omissions).toContain("byte_budget_exceeded");
    expect(r.counts.watch.source).toBe(10000);
    for (const [name, count] of Object.entries(r.counts)) {
      expect(count.source).toBe(count.retained + count.omitted);
      expect(count.retained).toBe(r.lists[name]?.length ?? 0);
    }
    expect(r.account?.asOf).toBeNull();
    expect(sanitizeDecisionInputRecord(r)).toEqual(r);
  });

  it("copies predecision risk state and marks unavailable input without pretending it was observed", () => {
    const i = input();
    i.spec.limits.maxTradesPerDay = 5;
    i.state.riskIncreasesToday = 4;
    const r = buildDecisionInputRecord(i);
    i.state.riskIncreasesToday = 5;
    i.observation!.cashAvailableMusd = 0;
    expect(r.dailyRiskBudget).toMatchObject({
      limit: 5,
      used: 4,
      remaining: 1,
    });
    expect(r.account?.cashAvailableMusd).toBe(1234);
    const noInput = buildDecisionInputRecord({
      ...i,
      observation: undefined,
      phase: "before_observation",
    });
    expect(noInput.account).toBeNull();
    expect(noInput.omissions).toContain("observation_not_available");
    expect(
      sanitizeDecisionInputRecord(unavailableDecisionInputRecord()),
    ).toBeDefined();
  });

  it("fails closed on foreign fields, free-text codes, oversized or malformed boundary records", () => {
    const r = buildDecisionInputRecord(input());
    for (const candidate of [
      null,
      {},
      { ...r, prompt: "secret" },
      { ...r, omissions: ["user text"] },
      { ...r, lists: { watch: [{ prompt: "secret" }] } },
      { ...r, runId: "Bearer sk-secret" },
      { ...r, lists: { watch: Array(500).fill(r.lists.watch[0]) } },
    ])
      expect(sanitizeDecisionInputRecord(candidate)).toBeUndefined();
    const detached = sanitizeDecisionInputRecord(r)!;
    detached.lists.watch[0].priceUsd = 1;
    expect(r.lists.watch[0].priceUsd).toBe(67000);
  });
});
