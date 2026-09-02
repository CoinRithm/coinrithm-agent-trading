// Slice 2 (2026-09-02) fundamentals leg of the observation. Every fixture here
// follows the PROBED shape of the real endpoint (see the comments), including
// the one that bit: candle `v` is a rolling 24h volume, not a per-bar volume.

import { describe, it, expect, vi } from "vitest";
import { observe } from "./observe.js";
import { parseSkill } from "./skill.js";
import { renderFolderOfOne } from "./templates.js";
import { newState } from "./state.js";
import { CoinRithmClient } from "./client.js";
import type { Venue } from "./types.js";

const okData = (data: unknown) => ({ ok: true, status: 200, data });

const baseSpec = () => {
  const spec = parseSkill(renderFolderOfOne("a", "conservative")).spec;
  spec.risk.watchlist = ["BTC", "ETH"];
  spec.capabilities = [];
  spec.venues = ["futures"] as Venue[];
  return spec;
};

// GET /api/agent/resolve (insights.ts toMatch): coinId + slug + categories.
const COINS: Record<string, { coinId: string; slug: string; name: string }> = {
  BTC: { coinId: "1", slug: "bitcoin", name: "Bitcoin" },
  ETH: { coinId: "1027", slug: "ethereum", name: "Ethereum" },
};

// GET /api/agent/market/{coinId} (insights.ts getMarketContext payload).
const marketCtx = (coinId: string) => {
  const sym = coinId === "1" ? "BTC" : "ETH";
  return okData({
    coin: {
      coinId,
      symbol: sym,
      name: COINS[sym].name,
      marketCapRank: coinId === "1" ? 1 : 2,
      categories: [
        "Layer 1 (L1)",
        "Proof of Work (PoW)",
        "Smart Contract Platform",
        "FTX Holdings",
      ],
    },
    price: {
      usd: 77368.43,
      change1h: 0.1,
      change24h: -1.2,
      change7d: 3.4,
      marketCapUsd: 1_530_000_000_000,
    },
    sentiment: {
      bullishVotes: 10,
      bearishVotes: 5,
      totalVotes: 15,
      bullishPct: 67,
    },
    fearGreed: { value: 52, label: "Neutral" },
    relatedMarkets: [],
    similarCoins: [],
    asOf: "2026-09-02T12:00:00.000Z",
    observation: {
      freshness: { status: "fresh" },
      dataset: { coinId, coinSlug: COINS[sym].slug },
    },
  });
};

// GET /api/agent/market/{coinId}/candles?range=1D. Live probe 2026-09-02: 288
// five-minute bars, every `v` a ROLLING 24h quote volume (2.2B..5.1B), so the
// sum (~1T) is meaningless and the LAST bar is the 24h volume.
const candles = () => {
  const bars = Array.from({ length: 40 }, (_, i) => ({
    t: 1_788_293_700 + i * 300,
    o: 77_300 + i,
    h: 77_320 + i,
    l: 77_290 + i,
    c: 77_310 + i,
    v: 4_751_791_073.375642 - i * 50_000_000,
  }));
  bars[bars.length - 1].v = 2_586_526_753.027005;
  return okData({
    coin: { ucid: "1", slug: "bitcoin", symbol: "BTC" },
    range: "1D",
    fiat: "USD",
    rateToUsd: 1,
    candles: bars,
  });
};

// GET /api/agent/news (news.ts): importance-then-recency, coins are SLUGS.
const newsItem = (
  title: string,
  coins: string[],
  importance: number,
  publishedAt: string,
) => ({
  title,
  source: "coindesk",
  url: "https://example.invalid/x",
  publishedAt,
  ageMinutes: 90,
  category: "markets",
  sentiment: "bullish",
  sentimentConfidence: 0.8,
  importance,
  coins,
});
const NEWS = okData({
  coins: ["bitcoin", "ethereum"],
  asOf: "2026-09-02T12:00:00.000Z",
  items: [
    newsItem(
      "Bitcoin ETF inflows hit a record",
      ["bitcoin"],
      9,
      "2026-09-02T09:12:00.000Z",
    ),
    newsItem(
      "Bitcoin beats Ethereum on volume",
      ["bitcoin"],
      8,
      "2026-09-02T08:00:00.000Z",
    ),
    newsItem(
      "Miners add capacity as Bitcoin fees rise",
      ["bitcoin"],
      6,
      "2026-09-02T07:30:00.000Z",
    ),
    newsItem(
      "A fourth Bitcoin story",
      ["bitcoin"],
      5,
      "2026-09-02T06:00:00.000Z",
    ),
    newsItem(
      "Ethereum upgrade ships on schedule",
      ["ethereum"],
      7,
      "2026-09-02T05:00:00.000Z",
    ),
    newsItem("Story six", ["ethereum"], 3, "2026-09-02T04:00:00.000Z"),
    newsItem("Story seven", ["ethereum"], 2, "2026-09-02T03:00:00.000Z"),
  ],
});

function fakeClient(over: Record<string, unknown> = {}): CoinRithmClient {
  return {
    me: async () => okData({ scopes: ["read", "trade:futures", "trade:pm"] }),
    portfolio: async () =>
      okData({ equity: { totalUsd: 50000, availableUsd: 1000 } }),
    wallet: async () => okData({ usdt: { available: 1000 } }),
    futuresPositions: async () => okData({ positions: [] }),
    trades: async () => okData({ asOf: "T1", trades: [] }),
    resolve: async (q: string) =>
      okData({
        query: q,
        match: {
          coinId: COINS[q].coinId,
          slug: COINS[q].slug,
          symbol: q,
          name: COINS[q].name,
          marketCapRank: 1,
          categories: ["Layer 1 (L1)"],
        },
        alternatives: [],
      }),
    market: async (coinId: string) => marketCtx(coinId),
    candles: vi.fn(async () => candles()),
    agentNews: vi.fn(async () => NEWS),
    pmPositions: async () => okData({ positions: [] }),
    discoverPmMarkets: async () => okData({ data: [] }),
    ...over,
  } as unknown as CoinRithmClient;
}

describe("observe: coin fundamentals", () => {
  it("carries categories (max 3), rank, market cap and the slug from the market context alone", async () => {
    const { observation } = await observe(
      fakeClient(),
      baseSpec(),
      newState("r"),
    );
    const btc = observation.watch[0];
    expect(btc.slug).toBe("bitcoin");
    expect(btc.fundamentals).toEqual({
      categories: [
        "Layer 1 (L1)",
        "Proof of Work (PoW)",
        "Smart Contract Platform",
      ],
      marketCapRank: 1,
      marketCapUsd: 1_530_000_000_000,
    });
    expect(btc.change24h).toBe(-1.2);
    expect(btc.change7d).toBe(3.4);
    // Without `indicators` / `news`: no candles call, no volume, no headlines.
    expect(btc.fundamentals?.volume24hUsd).toBeUndefined();
    expect(btc.fundamentals?.headlines).toBeUndefined();
  });

  it("volume24hUsd is the LATEST bar's rolling 24h `v`, never the sum of the bars", async () => {
    const spec = baseSpec();
    spec.capabilities = ["indicators"];
    const client = fakeClient();
    const { observation } = await observe(client, spec, newState("r"));
    const btc = observation.watch[0];
    expect(btc.fundamentals?.volume24hUsd).toBe(2_586_526_753.027005);
    expect(btc.fundamentals?.volume24hUsd).toBeLessThan(10_000_000_000);
    expect(btc.indicators).toBeDefined(); // the same fetch still feeds the TA
  });

  it("attaches up to 3 headlines per coin by the curated slug link, with timestamps", async () => {
    const spec = baseSpec();
    spec.capabilities = ["news"];
    const client = fakeClient();
    const { observation } = await observe(client, spec, newState("r"));
    const [btc, eth] = observation.watch;
    expect(btc.fundamentals?.headlines).toHaveLength(3);
    expect(btc.fundamentals?.headlines?.[0]).toEqual({
      title: "Bitcoin ETF inflows hit a record",
      at: "2026-09-02T09:12:00.000Z",
      importance: 9,
      sentiment: "bullish",
    });
    // Attribution is the coin<->news graph: a title that MENTIONS Ethereum but
    // is linked to bitcoin only never lands on ETH.
    expect(eth.fundamentals?.headlines?.map((h) => h.title)).toEqual([
      "Ethereum upgrade ships on schedule",
      "Story six",
      "Story seven",
    ]);
    // One call, limit raised so a busy BTC tape cannot crowd out the second coin.
    const newsFn = (
      client as unknown as { agentNews: ReturnType<typeof vi.fn> }
    ).agentNews;
    expect(newsFn).toHaveBeenCalledTimes(1);
    expect(newsFn.mock.calls[0][0]).toMatchObject({ limit: 12, hours: 48 });
    // The prompt's news block stays capped at 6 and now carries publishedAt.
    expect(observation.news).toHaveLength(6);
    expect(observation.news?.[0].publishedAt).toBe("2026-09-02T09:12:00.000Z");
  });

  it("universe_scan: parses the movers' decimal-string change/price and carries the slug", async () => {
    const spec = baseSpec();
    spec.capabilities = ["universe_scan"];
    // REAL /api/coins/top-gainers rows (probed 2026-09-02): strings, bare array.
    const client = fakeClient({
      cryptoMovers: async () =>
        okData([
          {
            ucid: "eclipse-3",
            symbol: "ES",
            name: "Eclipse",
            slug: "eclipse-3",
            change24h: "72.34",
            currentPrice: "0.0017195128818829",
          },
          ...Array.from({ length: 7 }, (_, i) => ({
            ucid: `m${i}`,
            symbol: `M${i}`,
            name: `Mover ${i}`,
            slug: `mover-${i}`,
            change24h: `${60 - i}.5`,
            currentPrice: "1.25",
          })),
        ]),
      market: async (coinId: string) =>
        coinId === "1" || coinId === "1027"
          ? marketCtx(coinId)
          : okData({
              coin: {
                coinId,
                symbol: "ES",
                name: "Eclipse",
                marketCapRank: 412,
                categories: ["Layer 2 (L2)"],
              },
              price: { usd: 0.0017, marketCapUsd: 90_000_000 }, // no change24h here
              observation: {
                freshness: { status: "fresh" },
                dataset: { coinId, coinSlug: "eclipse-3" },
              },
            }),
    });
    const { observation } = await observe(client, spec, newState("r"));
    const es = observation.watch.find((w) => w.symbol === "ES");
    expect(es?.discovered).toBe(true);
    expect(es?.slug).toBe("eclipse-3");
    expect(es?.change24h).toBe(72.34); // was undefined: strict asNum on "72.34"
    expect(es?.fundamentals).toEqual({
      categories: ["Layer 2 (L2)"],
      marketCapRank: 412,
      marketCapUsd: 90_000_000,
    });
    // 8 movers, the top 6 resolved into watch entries; the remainder (M5, M6)
    // is context and now carries a numeric 24h change, and nothing else.
    expect(observation.universeMovers?.[0]).toEqual({
      symbol: "M5",
      name: "Mover 5",
      change24hPct: 55.5,
      priceUsd: 1.25,
    });
  });
});

describe("observe: prediction-market fundamentals and position fields", () => {
  it("carries endDate + liquidity from the discover row and the bet's identity/odds from /positions/pm", async () => {
    const spec = baseSpec();
    spec.venues = ["futures", "pm"];
    const client = fakeClient({
      discoverPmMarkets: async () =>
        okData({
          data: [
            {
              source: "polymarket",
              slug: "btc-above-80k",
              title: "BTC above 80k by Dec?",
              endDate: "2026-12-31T00:00:00.000Z",
              freshness: { status: "fresh", ageMinutes: 3 },
              pinned: false,
              eligible: true,
              eligibleBlockReasons: [],
              outcomes: [
                {
                  externalMarketId: "12345",
                  name: "Yes",
                  probability: 42,
                  tokenId: null,
                  eligible: true,
                },
              ],
              volume24h: 999,
              liquidity: 12345.6,
              spread: 1.2,
              decisionSupport: null,
            },
          ],
          pagination: { limit: 12, offset: 0, hasMore: false },
          meta: {},
        }),
      pmPositions: async () =>
        okData({
          positions: [
            {
              id: 7,
              status: "open",
              source: "polymarket",
              eventSlug: "btc-above-80k",
              eventTitle: "BTC above 80k by Dec?",
              outcome: {
                externalMarketId: "99999",
                label: "No",
                tokenId: null,
              },
              side: "no",
              entryProbability: 58,
              stakeMusd: 500,
              openedAt: "2026-09-01T10:00:00.000Z",
              currentProbability: 61,
              unrealizedMark: 480,
              unrealizedPnl: -20,
            },
          ],
        }),
    });
    const { observation } = await observe(client, spec, newState("r"));
    expect(observation.pmMarkets[0]).toMatchObject({
      ref: "pm1",
      endDate: "2026-12-31T00:00:00.000Z",
      liquidityUsd: 12345.6,
      volumeUsd: 999,
      probability: 0.42,
    });
    expect(observation.pmPositions[0]).toMatchObject({
      id: 7,
      title: "BTC above 80k by Dec?",
      side: "no",
      entryProbability: 58,
      currentProbability: 61,
      openedAt: "2026-09-01T10:00:00.000Z",
      unrealizedPnlMusd: -20,
    });
  });

  it("carries openedAt on open futures positions (the time-stop clock)", async () => {
    const client = fakeClient({
      futuresPositions: async () =>
        okData({
          positions: [
            {
              id: 52,
              status: "open",
              coin: { ucid: "1", symbol: "BTC", name: "Bitcoin" },
              side: "long",
              leverage: 2,
              entryPrice: 67000,
              marginMusd: 2000,
              markPrice: 67500,
              openedAt: "2026-09-02T11:30:00.000Z",
            },
          ],
        }),
    });
    const { observation } = await observe(client, baseSpec(), newState("r"));
    expect(observation.openPositions[0].openedAt).toBe(
      "2026-09-02T11:30:00.000Z",
    );
  });
});
