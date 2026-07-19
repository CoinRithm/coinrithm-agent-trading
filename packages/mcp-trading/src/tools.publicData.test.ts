import { describe, expect, it } from "vitest";
import {
  compactPublicPmEvents,
  compactPublicPmOverview,
  compactPublicPmWhales,
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

  it("passes through unexpected non-object error shapes", () => {
    expect(compactPublicPmOverview("upstream error")).toBe("upstream error");
    expect(compactPublicPmEvents(null)).toBeNull();
    expect(compactPublicPmWhales(["bad shape"], 10)).toEqual(["bad shape"]);
  });
});
