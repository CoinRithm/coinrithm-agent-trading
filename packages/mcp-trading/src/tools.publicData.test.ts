import { describe, expect, it } from "vitest";
import {
  compactPublicPmDisagreements,
  compactPublicPmEvent,
  compactPublicPmEvents,
  compactPublicPmOverview,
  compactPublicPmWhales,
  compactPublicCryptoMovers,
} from "./tools.js";

const event = {
  id: "KXPGATOUR-THOC26",
  slug: "kxpgatour-thoc26",
  title: "The Open Championship Winner",
  description: "A long provider description that discovery does not need.",
  image: "https://example.test/image.png",
  status: "open",
  freshness: { asOf: "2026-07-19T02:07:56.380Z", ageMinutes: 1 },
  volume24h: 22_500_000,
  liquidity: 49_800_000,
  outcomes: [
    { externalMarketId: "a", name: "France", probability: 0.4, icon: "x" },
    { externalMarketId: "b", name: "Argentina", probability: 0.18 },
    { externalMarketId: "c", name: "England", probability: 0.22 },
    { externalMarketId: "d", name: "Spain", probability: 0.21 },
    { externalMarketId: "e", name: "Brazil", probability: null },
    { externalMarketId: "f", name: "Germany", probability: 0.01 },
  ],
  source: {
    id: "kalshi",
    name: "Kalshi",
    kind: "cash_exchange",
    supportsTrading: true,
    methodology: "large internal object",
  },
  sparkline: { series: Array.from({ length: 200 }, (_, i) => i) },
  decisionSupport: { qualityScore: 91 },
  quality: { decisionEligible: true, warningReasons: [] },
};

describe("compact public prediction-market MCP responses", () => {
  it("keeps overview truth while replacing heavyweight highlights with summaries", () => {
    const source = {
      stats: { totalOpenMarkets: 29_048 },
      highlights: { gainers: [event], losers: [], expiring: [] },
      categories: ["sports"],
      bySource: [{ source: "kalshi", openMarkets: 7_957 }],
      byCategory: [{ slug: "sports", openMarkets: 10_000 }],
      updatedAt: "2026-07-19T02:08:00.000Z",
    };

    const compact = compactPublicPmOverview(source) as typeof source;

    expect(compact.stats).toEqual(source.stats);
    expect(compact.bySource).toEqual(source.bySource);
    expect(compact.highlights.gainers[0]).not.toHaveProperty("description");
    expect(compact.highlights.gainers[0]).not.toHaveProperty("sparkline");
    expect(JSON.stringify(compact).length).toBeLessThan(
      JSON.stringify(source).length,
    );
  });

  it("returns five probability-ranked outcomes with stable ties and a total", () => {
    const source = {
      data: [
        {
          ...event,
          outcomes: [
            ...event.outcomes,
            { externalMarketId: "g", name: "Equal first", probability: 0.4 },
          ],
        },
      ],
      pagination: { total: 1, limit: 3, offset: 0 },
      meta: { currency: "usd" },
    };

    const compact = compactPublicPmEvents(source) as {
      data: Array<Record<string, unknown>>;
      pagination: object;
    };
    const row = compact.data[0];
    const outcomes = row.outcomes as Array<{ name: string }>;

    expect(row.outcomeCount).toBe(7);
    expect(outcomes.map((outcome) => outcome.name)).toEqual([
      "France",
      "Equal first",
      "England",
      "Spain",
      "Argentina",
    ]);
    expect(row).not.toHaveProperty("description");
    expect(row).not.toHaveProperty("sparkline");
    expect(compact.pagination).toEqual(source.pagination);
  });

  it("bounds whale rows without dropping aggregate coverage or evidence", () => {
    const trade = {
      source: "polymarket",
      eventSlug: "will-it-rain",
      eventTitle: "Will it rain?",
      side: "buy",
      outcome: "Yes",
      usdValue: 50_000,
      evidenceType: "on_chain_trade",
      evidenceRef: "0xabc",
      event: { ...event, outcomes: Array(100).fill(event.outcomes[0]) },
    };
    const source = {
      trades: Array.from({ length: 50 }, (_, index) => ({ ...trade, index })),
      stats24h: { trades: 5_000, totalUsd: 12_000_000 },
      coverage: [{ source: "polymarket", status: "live" }],
    };

    const compact = compactPublicPmWhales(source, 10) as typeof source;

    expect(compact.trades).toHaveLength(10);
    expect(compact.trades[0]).not.toHaveProperty("event");
    expect(compact.trades[0]).toMatchObject({
      evidenceType: "on_chain_trade",
      evidenceRef: "0xabc",
    });
    expect(compact.stats24h).toEqual(source.stats24h);
    expect(compact.coverage).toEqual(source.coverage);
  });

  it("bounds event detail while preserving auditable cross-venue evidence", () => {
    const related = {
      ...event,
      slug: "related-event",
      description: "x".repeat(5_000),
      outcomes: Array.from({ length: 100 }, (_, index) => ({
        externalMarketId: `outcome-${index}`,
        name: `Outcome ${index}`,
        probability: index / 100,
      })),
    };
    const comparisonOutcomes = Array.from({ length: 20 }, (_, index) => ({
      key: `outcome-${index}`,
      label: `Outcome ${index}`,
      eventAProbability: index,
      eventBProbability: 20 - index,
      deltaPoints: index - 10,
      presentInA: true,
      presentInB: true,
      isShared: true,
    }));
    const source = {
      event: {
        ...event,
        description: "d".repeat(2_000),
        resolutionCriteria: "r".repeat(3_000),
      },
      snapshots: Array.from({ length: 30 }, (_, index) => ({
        capturedAt: `2026-07-${String(index + 1).padStart(2, "0")}`,
        probability: index,
        rawProviderPayload: "x".repeat(1_000),
      })),
      relatedEvents: Array.from({ length: 12 }, () => related),
      crossSourceMatches: Array.from({ length: 10 }, (_, index) => ({
        matchId: `match-${index}`,
        confidence: 1 - index / 100,
        matchMethod: "verified",
        divergence: { maxSharedOutcomeDeltaPoints: 20 },
        comparison: {
          summary: { matchedOutcomeCount: 20 },
          outcomes: comparisonOutcomes,
        },
        event: related,
      })),
      resolution: { outcome: "France", evidenceUrl: "https://example.test" },
      volumeHistory: Array.from({ length: 100 }, (_, day) => ({ day })),
      relatedNews: Array.from({ length: 12 }, (_, index) => ({ id: index })),
      topicRelatedCoins: Array.from({ length: 25 }, (_, index) => ({
        slug: `coin-${index}`,
      })),
      agentsTradingMarket: { activeAgents: 2 },
      recentWhaleTrades: [
        {
          source: "polymarket",
          usdValue: 50_000,
          evidenceType: "on_chain_trade",
          event: related,
        },
      ],
    };

    const compact = compactPublicPmEvent(source) as Record<string, any>;

    expect(compact.event.outcomeCount).toBe(6);
    expect(compact.event.description).toHaveLength(1_200);
    expect(compact.event.resolutionCriteria).toHaveLength(2_000);
    expect(compact.snapshotCount).toBe(30);
    expect(compact.snapshots).toHaveLength(20);
    expect(compact.snapshots[0]).not.toHaveProperty("rawProviderPayload");
    expect(compact.relatedEventCount).toBe(12);
    expect(compact.relatedEvents).toHaveLength(5);
    expect(compact.relatedEvents[0]).not.toHaveProperty("description");
    expect(compact.crossSourceMatchCount).toBe(10);
    expect(compact.crossSourceMatches).toHaveLength(5);
    expect(compact.crossSourceMatches[0].comparison.outcomeCount).toBe(20);
    expect(compact.crossSourceMatches[0].comparison.outcomes).toHaveLength(5);
    expect(
      compact.crossSourceMatches[0].comparison.outcomes[0].deltaPoints,
    ).toBe(-10);
    expect(compact.volumeHistory).toHaveLength(90);
    expect(compact.relatedNews).toHaveLength(5);
    expect(compact.topicRelatedCoins).toHaveLength(20);
    expect(compact.recentWhaleTrades[0]).not.toHaveProperty("event");
    expect(compact.resolution).toEqual(source.resolution);
    expect(compact.agentsTradingMarket).toEqual(source.agentsTradingMarket);
    expect(JSON.stringify(compact).length).toBeLessThan(
      JSON.stringify(source).length / 4,
    );
  });

  it("passes through unexpected non-object error shapes", () => {
    expect(compactPublicPmOverview("upstream error")).toBe("upstream error");
    expect(compactPublicPmEvent(false)).toBe(false);
    expect(compactPublicPmEvents(null)).toBeNull();
    expect(compactPublicPmWhales(["bad shape"], 10)).toEqual(["bad shape"]);
  });

  it("bounds disagreement clusters while preserving pagination and headline metrics", () => {
    const related = {
      ...event,
      slug: "related-event",
      description: "x".repeat(5_000),
      outcomes: Array.from({ length: 30 }, (_, index) => ({
        externalMarketId: `outcome-${index}`,
        name: `Outcome ${index}`,
        probability: index / 30,
      })),
    };
    const comparisonOutcomes = Array.from({ length: 20 }, (_, index) => ({
      key: `outcome-${index}`,
      label: `Outcome ${index}`,
      eventAProbability: index,
      eventBProbability: 20 - index,
      deltaPoints: index - 10,
      presentInA: true,
      presentInB: true,
      isShared: true,
    }));
    const cluster = {
      clusterId: "kalshi:x|polymarket:y",
      primaryEventId: "polymarket:y",
      title: "Will it happen?",
      referenceProbability: { probability: 42, venueCount: 2, spreadPoints: 3 },
      maxOverallGap: 87.2,
      maxOutcomeGap: 19.7,
      maxConfidence: 0.91,
      events: [event, related],
      comparisons: [
        {
          eventId: "kalshi:x",
          pair: {
            matchId: 19466,
            confidence: 0.91,
            matchMethod: "verified",
            recommendedSourceId: "polymarket",
            divergence: { maxSharedOutcomeDeltaPoints: 19.7 },
            comparison: {
              summary: { matchedOutcomeCount: 20 },
              outcomes: comparisonOutcomes,
            },
            eventA: related,
            eventB: event,
          },
        },
      ],
    };
    const source = {
      data: [cluster],
      total: 1,
      hasMore: false,
      pagination: { limit: 10, offset: 0, nextOffset: null },
      meta: { sort: "confidence_desc" },
    };

    const compact = compactPublicPmDisagreements(source) as Record<string, any>;
    const row = compact.data[0];

    expect(compact.total).toBe(1);
    expect(compact.hasMore).toBe(false);
    expect(compact.pagination).toEqual(source.pagination);
    expect(compact.meta).toEqual(source.meta);
    expect(row.clusterId).toBe(cluster.clusterId);
    expect(row.referenceProbability).toEqual(cluster.referenceProbability);
    expect(row.maxOverallGap).toBe(87.2);
    expect(row.eventCount).toBe(2);
    expect(row.events[1]).not.toHaveProperty("description");
    expect(row.events[1].outcomes.length).toBeLessThanOrEqual(5);
    const pair = row.comparisons[0].pair;
    expect(pair).not.toHaveProperty("eventA");
    expect(pair).not.toHaveProperty("eventB");
    expect(pair.matchId).toBe(19466);
    expect(pair.comparison.outcomeCount).toBe(20);
    expect(pair.comparison.outcomes).toHaveLength(5);
    expect(JSON.stringify(compact).length).toBeLessThan(
      JSON.stringify(source).length / 2,
    );
  });

  it("passes through a non-object disagreements payload", () => {
    expect(compactPublicPmDisagreements("upstream error")).toBe(
      "upstream error",
    );
  });
});

describe("compactPublicCryptoMovers", () => {
  it("coerces string numerics, drops ucid, keeps identity fields", () => {
    const rows = [
      {
        ucid: "1",
        symbol: "PRCL",
        name: "Parcl",
        slug: "parcl",
        change24h: "61.04",
        currentPrice: "0.1234",
      },
    ];
    expect(compactPublicCryptoMovers(rows)).toEqual([
      {
        symbol: "PRCL",
        name: "Parcl",
        slug: "parcl",
        change24hPct: 61.04,
        priceUsd: 0.1234,
      },
    ]);
  });

  it("passes through non-coercible values and non-array payloads honestly", () => {
    const rows = [
      {
        symbol: "X",
        name: "X",
        slug: "x",
        change24h: "n/a",
        currentPrice: null,
      },
    ];
    const compact = compactPublicCryptoMovers(rows) as Array<
      Record<string, unknown>
    >;
    expect(compact[0].change24hPct).toBe("n/a");
    expect(compactPublicCryptoMovers({ error: "down" })).toEqual({
      error: "down",
    });
  });
});
