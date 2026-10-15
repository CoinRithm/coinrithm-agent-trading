import { readFileSync } from "node:fs";
import { describe, expect, expectTypeOf, it, vi } from "vitest";
import { createClient } from "../src/index.js";
import type { components } from "../src/schema.js";

type Schemas = components["schemas"];

// Shared with the Python SDK tests: production bodies served 2026-10-13
// (22:32-22:50 UTC), trimmed by dropping array rows only.
const fixture = (name: string) =>
  JSON.parse(
    readFileSync(
      new URL(`../../sdk-python/tests/fixtures/${name}`, import.meta.url),
      "utf8",
    ),
  );

const keyless = (body: unknown, status = 200) => {
  const transport = vi.fn<typeof fetch>().mockImplementation(
    async () =>
      new Response(JSON.stringify(body), {
        status,
        headers: { "content-type": "application/json" },
      }),
  );
  return { transport, client: createClient({ fetch: transport }) };
};

const requestOf = (transport: ReturnType<typeof keyless>["transport"]) =>
  transport.mock.calls[0][0] as Request;

describe("public market-data reads", () => {
  it("large trades: typed filters, query serialization and venue links", async () => {
    const body = fixture("large_trades.json");
    const { transport, client } = keyless(body);
    const { data } = await client.GET("/api/market/large-trades", {
      params: {
        query: { symbol: "BTC", venue: "binance", assetClass: "crypto", limit: 2 },
      },
    });
    const url = new URL(requestOf(transport).url);
    expect(url.pathname).toBe("/api/market/large-trades");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      symbol: "BTC",
      venue: "binance",
      assetClass: "crypto",
      limit: "2",
    });
    expect(requestOf(transport).headers.get("authorization")).toBeNull();
    expectTypeOf(data).toEqualTypeOf<Schemas["PublicLargeTradesResponse"] | undefined>();
    expectTypeOf(data?.items[0]?.buyer).toEqualTypeOf<string | null | undefined>();
    expect(data).toEqual(body);
    expect(data?.items.map((row) => row.venue)).toEqual(["binance", "hyperliquid"]);
    expect(data?.items[0]?.links.tx).toBeNull();
  });

  it("liquidations: base is required and capture coverage may be null", async () => {
    const body = fixture("liquidations.json");
    const { transport, client } = keyless(body);
    const { data } = await client.GET("/api/market/liquidations", {
      params: { query: { base: "XAU", venue: "okx", limit: 2 } },
    });
    expect(new URL(requestOf(transport).url).searchParams.get("base")).toBe("XAU");
    expectTypeOf(data?.venues[0]?.capturedPct).toEqualTypeOf<number | null | undefined>();
    expect(data).toEqual(body);
    expect(data?.window.hours).toBe(24);

    // @ts-expect-error `base` is a required query parameter.
    void client.GET("/api/market/liquidations", { params: { query: {} } });
  });

  it("treasuries and TradFi treasury carry attribution and nullable identity", async () => {
    const coin = fixture("crypto_treasury.json");
    const coinCall = keyless(coin);
    const { data: coinData } = await coinCall.client.GET("/api/market/treasuries/{coin}", {
      params: { path: { coin: "bitcoin" } },
    });
    expect(new URL(requestOf(coinCall.transport).url).pathname).toBe(
      "/api/market/treasuries/bitcoin",
    );
    expectTypeOf(coinData?.status).toEqualTypeOf<Schemas["PublicDataStatus"] | undefined>();
    expect(coinData).toEqual(coin);
    expect(coinData?.companies.some((row) => row.symbol === null)).toBe(true);

    const none = fixture("ticker_treasury_none.json");
    const tickerCall = keyless(none);
    const { data: tickerData } = await tickerCall.client.GET(
      "/api/market/references/{ticker}/treasury",
      { params: { path: { ticker: "AAPL" } } },
    );
    expectTypeOf(tickerData?.treasury).toEqualTypeOf<
      Schemas["PublicTickerTreasury"] | null | undefined
    >();
    expect(tickerData?.treasury).toBeNull();
  });

  it("SEC filings and CFTC positioning", async () => {
    const filings = fixture("sec_filings.json");
    const filingsCall = keyless(filings);
    const { data: sec } = await filingsCall.client.GET(
      "/api/market/references/{ticker}/filings",
      { params: { path: { ticker: "HOOD" } } },
    );
    expectTypeOf(sec?.coverage).toEqualTypeOf<
      "available" | "none_recorded" | "not_applicable" | undefined
    >();
    expect(sec).toEqual(filings);
    expect(sec?.insiderTransactions[0]?.pricePerShare).toBeNull();

    const positioning = fixture("cftc_positioning.json");
    const positioningCall = keyless(positioning);
    const { data: cftc } = await positioningCall.client.GET(
      "/api/market/references/{ticker}/positioning",
      { params: { path: { ticker: "XAU" } } },
    );
    expectTypeOf(cftc?.reports[0]?.nonReportable).toEqualTypeOf<
      Schemas["PublicCftcSide"] | null | undefined
    >();
    expect(cftc).toEqual(positioning);
    expect(cftc?.reports[0]?.reportDate).toBe("2026-10-06");
  });

  it("TradFi references: catalog and detail with the live overlay", async () => {
    const catalog = fixture("tradfi_reference_catalog.json");
    const catalogCall = keyless(catalog);
    const { data: list } = await catalogCall.client.GET("/api/market/references");
    expectTypeOf(list?.items[0]?.live).toEqualTypeOf<
      Schemas["PublicTradfiReferenceLive"] | null | undefined
    >();
    expect(list).toEqual(catalog);

    const detail = fixture("tradfi_reference_detail.json");
    const detailCall = keyless(detail);
    const { data } = await detailCall.client.GET("/api/market/references/{ticker}", {
      params: { path: { ticker: "XAU" }, query: { window: "7d" } },
    });
    expect(new URL(requestOf(detailCall.transport).url).search).toBe("?window=7d");
    expect(data).toEqual(detail);
    expect(data?.live?.venueCount).toBe(data?.live?.venues.length);
    expect(data?.change7d).toBeNull();
  });

  it("TradFi detail: SEC company data, 52-week range and corporate events", async () => {
    // AAPL served 2026-10-15 03:10 UTC (contract 1.9.0), history and
    // dividends trimmed to two rows.
    const detail = fixture("tradfi_reference_detail_fundamentals.json");
    const { transport, client } = keyless(detail);
    const { data } = await client.GET("/api/market/references/{ticker}", {
      params: { path: { ticker: "AAPL" } },
    });
    expect(new URL(requestOf(transport).url).pathname).toBe("/api/market/references/AAPL");
    expectTypeOf(data?.fundamentals).toEqualTypeOf<
      Schemas["PublicTradfiReferenceFundamentals"] | null | undefined
    >();
    expectTypeOf(data?.week52).toEqualTypeOf<
      Schemas["PublicTradfiReferenceWeek52"] | null | undefined
    >();
    expectTypeOf(data?.corporateEvents).toEqualTypeOf<
      Schemas["PublicTradfiReferenceCorporateEvents"] | null | undefined
    >();
    expect(data).toEqual(detail);
    expect(data?.fundamentals?.marketCapBasis).toBe("shares x reference price");
    expect(data?.fundamentals?.source.name).toBe("SEC EDGAR");
    expect(data?.week52?.days).toBe(8);
    expect(data?.corporateEvents?.lastEarnings?.timing).toBe("after_close");
    expect(data?.corporateEvents?.nextEarningsEstimate?.basis).toBe("quarterly_cadence");
    expect(data?.corporateEvents?.upcomingDividend).toBeNull();
  });

  it("event holders: Polymarket rows and the available:false shape", async () => {
    const body = fixture("event_holders.json");
    const slug = "fed-decision-in-october-20260617190323537";
    const { transport, client } = keyless(body);
    const { data } = await client.GET("/api/prediction-markets/events/{source}/{slug}/holders", {
      params: { path: { source: "polymarket", slug } },
    });
    const url = new URL(requestOf(transport).url);
    expect(url.pathname).toBe(`/api/prediction-markets/events/polymarket/${slug}/holders`);
    expect(url.search).toBe("");
    expect(requestOf(transport).headers.get("authorization")).toBeNull();
    expectTypeOf(data).toEqualTypeOf<Schemas["PublicPmEventHoldersResponse"] | undefined>();
    expectTypeOf(data?.outcomes?.[0]?.holders?.[0]?.walletPagePath).toEqualTypeOf<
      string | null | undefined
    >();
    expect(data).toEqual(body);
    expect(data?.provider).toBe("polymarket_data_api_v2");
    const rows = data?.outcomes?.flatMap((outcome) => outcome.holders ?? []) ?? [];
    expect(rows.some((row) => row.walletPagePath === null)).toBe(true);

    const none = fixture("event_holders_unavailable.json");
    const noneCall = keyless(none);
    const { data: kalshi } = await noneCall.client.GET(
      "/api/prediction-markets/events/{source}/{slug}/holders",
      { params: { path: { source: "kalshi", slug: "kxmenworldcup-26" } } },
    );
    expect(kalshi).toEqual(none);
    expect(kalshi?.available).toBe(false);
    expect(kalshi?.reason).toBe("venue_has_no_public_holders");
  });

  it("large trades: the Hyperliquid taker block is typed and nullable", async () => {
    // venue=hyperliquid served 2026-10-15 04:07 UTC: an open, a close to
    // flat, a flip and an unenriched print (taker null).
    const body = fixture("large_trades_taker.json");
    const { transport, client } = keyless(body);
    const { data } = await client.GET("/api/market/large-trades", {
      params: { query: { venue: "hyperliquid", limit: 200 } },
    });
    expect(new URL(requestOf(transport).url).search).toBe("?venue=hyperliquid&limit=200");
    expectTypeOf(data?.items[0]?.taker).toEqualTypeOf<
      Schemas["PublicLargeTradeTaker"] | null | undefined
    >();
    expect(data).toEqual(body);
    const actions = data?.items.map((row) => row.taker?.action ?? null);
    expect(actions).toEqual(expect.arrayContaining(["open", "close", "flip", null]));
    const close = data?.items.find((row) => row.taker?.action === "close")?.taker;
    expect(close?.positionNow?.size).toBe(0);
    expect(close?.positionNow?.avgEntryPrice).toBeNull();
    expect(data?.items.find((row) => row.taker?.action === "open")?.taker?.realizedPnlUsd).toBeNull();
  });

  it("notable large trades: bursts, significance and taker", async () => {
    const body = fixture("notable_large_trades.json");
    const { transport, client } = keyless(body);
    const { data } = await client.GET("/api/market/large-trades/notable", {
      params: { query: { limit: 2 } },
    });
    expect(new URL(requestOf(transport).url).pathname).toBe("/api/market/large-trades/notable");
    expectTypeOf(data).toEqualTypeOf<Schemas["PublicNotableLargeTradesResponse"] | undefined>();
    expectTypeOf(data?.items[0]?.significance.rankInWindow).toEqualTypeOf<
      number | null | undefined
    >();
    expect(data).toEqual(body);
    const binance = data?.items.find((item) => item.venue === "binance");
    const hyperliquid = data?.items.find((item) => item.venue === "hyperliquid");
    expect(binance?.taker).toBeNull();
    expect(hyperliquid?.taker?.address).toBe(hyperliquid?.buyer ?? hyperliquid?.seller);
    for (const item of data?.items ?? []) {
      expect(item.largestTrade.notionalUsd).toBeGreaterThanOrEqual(item.significance.thresholdUsd);
    }
  });

  it("comparison rows type pairing, bothSidesTraded and the evidence count", async () => {
    const match: NonNullable<Schemas["PublicPmEventDetailResponse"]["crossSourceMatches"]>[number] =
      fixture("pm_cross_source_match.json");
    const rows = match.comparison?.outcomes ?? [];
    expectTypeOf(rows[0]?.pairing).toEqualTypeOf<Schemas["PublicPmOutcomePairing"] | undefined>();
    expectTypeOf(rows[0]?.bothSidesTraded).toEqualTypeOf<boolean | undefined>();
    expect(rows.every((row) => row.pairing?.eventAName === row.label)).toBe(true);
    expect(new Set(rows.map((row) => row.pairing?.method))).toEqual(
      new Set(["token_containment", "team_abbreviation"]),
    );

    const body = fixture("pm_disagreements_compact.json");
    const { client } = keyless(body);
    const { data } = await client.GET("/api/prediction-markets/matches/public", {
      params: { query: { view: "compact", limit: 10 } },
    });
    expect(data).toEqual(body);
    const comparisons = data?.data[0]?.comparisons ?? [];
    for (const entry of comparisons) {
      const comparison = entry.pair?.comparison;
      const evidenced = (comparison?.outcomes ?? []).filter(
        (row) => row.isShared && row.bothSidesTraded === true,
      );
      expect(comparison?.summary?.evidencedSharedOutcomeCount).toBe(evidenced.length);
    }
    const all = comparisons.flatMap((entry) => entry.pair?.comparison?.outcomes ?? []);
    expect(all.some((row) => row.bothSidesTraded === false)).toBe(true);
  });

  it("errors on these routes are { message } bodies", async () => {
    const { client } = keyless({ message: "Reference instrument not found" }, 404);
    const { data, error } = await client.GET("/api/market/references/{ticker}/filings", {
      params: { path: { ticker: "ZZZZ" } },
    });
    expect(data).toBeUndefined();
    const expected: Schemas["PublicMessageError"] = {
      message: "Reference instrument not found",
    };
    expect(error).toEqual(expected);
  });
});
