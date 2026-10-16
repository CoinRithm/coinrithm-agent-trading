import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CoinRithmClient } from "./client.js";
import {
  compactInstrumentMarkets,
  compactPublicPmExpiring,
  compactPublicPmOrderBook,
  compactPublicPmPriceHistory,
  compactPublicPmSettled,
  compactTradfiCatalog,
  compactTradfiReference,
  registerTools,
  samplePoints,
} from "./tools.js";

// Keyless data tools added for audit P1-5 (2026-10-16). Every fixture below is
// a trimmed copy of a live, unauthenticated response from api.coinrithm.com
// probed the same day: field names, nulls and scales are as observed, with
// arrays shortened and some long values cut.

const fetchMock = vi.fn<typeof fetch>();
vi.stubGlobal("fetch", fetchMock);

afterEach(() => {
  fetchMock.mockReset();
});

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

type ToolResult = {
  isError: boolean;
  structuredContent: { httpStatus: number; ok: boolean; body: any };
};
type Tool = {
  config: { inputSchema: Record<string, z.ZodTypeAny>; description?: string };
  handler: (
    args: Record<string, unknown>,
    extra: unknown,
  ) => Promise<ToolResult>;
};

const registered = (): Map<string, Tool> => {
  const tools = new Map<string, Tool>();
  const server = {
    registerTool: (name: string, config: unknown, handler: unknown) => {
      tools.set(name, {
        config: config as Tool["config"],
        handler: handler as Tool["handler"],
      });
    },
  } as unknown as McpServer;
  // A keyed client proves the caller's key never reaches a public endpoint.
  registerTools(
    server,
    new CoinRithmClient({
      apiKey: "crk_live_secret",
      baseUrl: "https://api.example.test",
    }),
  );
  return tools;
};

const schemaFor = (name: string) =>
  z.object(registered().get(name)!.config.inputSchema);

// Parses the arguments with the tool's own schema (as the MCP SDK does), runs
// the handler against one stubbed response, and returns the request it made.
async function call(
  name: string,
  args: Record<string, unknown>,
  body: unknown,
  status = 200,
) {
  fetchMock.mockResolvedValueOnce(jsonResponse(body, status));
  const tool = registered().get(name)!;
  const result = await tool.handler(
    z.object(tool.config.inputSchema).parse(args),
    {},
  );
  const [url, init] = fetchMock.mock.calls.at(-1)!;
  const headers = new Headers(init?.headers);
  expect(headers.has("authorization")).toBe(false);
  expect(JSON.stringify(init?.headers ?? {})).not.toContain("crk_live_secret");
  return { result, url: new URL(String(url)) };
}

const GROUP_NOTE =
  "Settles on the 60-second average of CF Benchmarks Bitcoin Real-Time Index (BRTI) at the stated time";
const REFERENCE_NOTE =
  "Same asset, different feed: the settlement source can differ from the reference price shown";

const kalshiLadder = (series: string, slug: string, contracts: unknown[]) => ({
  venue: "kalshi",
  venueName: "Kalshi",
  series,
  expiresAt: "2026-10-16T10:00:00.000Z",
  windowStartAt: null,
  observation: "at_time",
  metric: "spot_price",
  settlementSource: "CF_RTI_60S_AVG:BTCUSD",
  settlementNote: GROUP_NOTE,
  referenceRelation: "same_asset_different_feed",
  referenceNote: REFERENCE_NOTE,
  asOf: "2026-10-16T09:13:09.212Z",
  asOfBasis: "venue_sweep_finished",
  events: [
    {
      source: "kalshi",
      slug,
      title: "BTC price range on Oct 16, 2026 at 6am EDT?",
      path: `/prediction-markets/kalshi/${slug}`,
      sourceUrl: `https://kalshi.com/markets/kxbtc/${slug}`,
      volume24hUsd: 12.33,
      liquidityUsd: 4345.62,
      openInterestUsd: 4345.62,
    },
  ],
  monotonic: true,
  contracts,
});

const LADDERS = {
  version: 1,
  instrument: { type: "coin", id: "bitcoin", symbol: "BTC", name: "Bitcoin" },
  reference: {
    kind: "coin_live_price",
    key: "bitcoin",
    label:
      "CoinRithm spot price (aggregated exchange feed); each ladder names its own settlement source",
  },
  generatedAt: "2026-10-16T09:18:36.965Z",
  horizon: "day",
  groups: [
    {
      expiresAt: "2026-10-16T10:00:00.000Z",
      settlementSource: "CF_RTI_60S_AVG:BTCUSD",
      settlementNote: GROUP_NOTE,
      ladders: [
        kalshiLadder("KXBTC", "kxbtc-26oct1606", [
          {
            outcomeId: 1538925420,
            externalMarketId: "KXBTC-26OCT1606-B82050",
            label: "$82,000 to 82,099.99",
            comparator: "between",
            strikeLow: 82000,
            strikeHigh: 82099.99,
            unit: "USD",
            probability: 21,
            bid: 19,
            ask: 21,
            contractVolume24h: 3.95,
            contractOpenInterest: 389.27,
            tradedRecently: true,
            equivalenceKey: "fd6ced81d437a4b4f7fe0b4d",
            eventSlug: "kxbtc-26oct1606",
            parse: {
              method: "kalshi_strike",
              parserVersion: "underlying-v1",
              confidence: 1,
            },
          },
        ]),
        {
          ...kalshiLadder("KXBTCD", "kxbtcd-26oct1606", [
            {
              outcomeId: 1538925530,
              externalMarketId: "KXBTCD-26OCT1606-T71599.99",
              label: "$71,600 or above",
              comparator: "gt",
              strikeLow: 71599.99,
              strikeHigh: null,
              unit: "USD",
              probability: 99,
              bid: 99,
              ask: 100,
              contractVolume24h: null,
              contractOpenInterest: null,
              tradedRecently: true,
              equivalenceKey: "4c9d954a1930ddece6aedafa",
              eventSlug: "kxbtcd-26oct1606",
              parse: {
                method: "kalshi_strike",
                parserVersion: "underlying-v1",
                confidence: 1,
              },
            },
          ]),
          settlementNote: "A different venue note",
        },
      ],
    },
  ],
  crossVenue: [],
  shortTerm: {
    upDownOpen: 454,
    nextExpiresAt: "2026-10-16T09:20:00.000Z",
    venues: { polymarket: 438, gemini: 16 },
  },
  coverage: {
    venues: ["kalshi"],
    ladders: 2,
    contracts: 2,
    truncated: true,
    excluded: [
      "manifold (play money)",
      "myriad (race contracts)",
      "series not in the reviewed registry",
    ],
  },
  disclaimer:
    "Venue probabilities and settlement sources as published by each venue. CoinRithm does not determine or predict settlement.",
  meta: { freshUntil: "2026-10-16T09:19:07.076Z" },
};

describe("instrument_markets", () => {
  it("asks for 10 ladders by default and encodes the instrument path", async () => {
    const { url } = await call(
      "instrument_markets",
      { type: "coin", id: "bitcoin" },
      LADDERS,
    );
    expect(url.pathname).toBe("/api/instruments/coin/bitcoin/markets");
    expect([...url.searchParams]).toEqual([["limit", "10"]]);

    const explicit = await call(
      "instrument_markets",
      {
        type: "index",
        id: "SPX",
        horizon: "week",
        includeShortTerm: true,
        limit: 60,
      },
      LADDERS,
    );
    expect(explicit.url.pathname).toBe("/api/instruments/index/SPX/markets");
    expect(explicit.url.searchParams.get("horizon")).toBe("week");
    expect(explicit.url.searchParams.get("includeShortTerm")).toBe("true");
    expect(explicit.url.searchParams.get("limit")).toBe("60");
  });

  it("drops venue ids, parser details and URLs but keeps every price and caveat", async () => {
    const { result } = await call(
      "instrument_markets",
      { type: "coin", id: "bitcoin", horizon: "day" },
      LADDERS,
    );
    const body = result.structuredContent.body;
    expect(body).toEqual(compactInstrumentMarkets(LADDERS));
    expect(body.referenceNotes).toEqual({
      same_asset_different_feed: REFERENCE_NOTE,
    });
    const [first, second] = body.groups[0].ladders;
    // Equal to the group's, so stated once on the group.
    expect(first.settlementNote).toBeUndefined();
    expect(first.settlementSource).toBeUndefined();
    expect(first.expiresAt).toBeUndefined();
    expect(first.referenceNote).toBeUndefined();
    expect(second.settlementNote).toBe("A different venue note");
    expect(first.events[0]).toEqual({
      source: "kalshi",
      slug: "kxbtc-26oct1606",
      title: "BTC price range on Oct 16, 2026 at 6am EDT?",
      volume24hUsd: 12.33,
      liquidityUsd: 4345.62,
      openInterestUsd: 4345.62,
    });
    expect(first.contracts[0]).toEqual({
      label: "$82,000 to 82,099.99",
      comparator: "between",
      strikeLow: 82000,
      strikeHigh: 82099.99,
      unit: "USD",
      probability: 21,
      bid: 19,
      ask: 21,
      tradedRecently: true,
      contractVolume24h: 3.95,
      contractOpenInterest: 389.27,
    });
    // Unreported Kalshi-only fields are omitted; strikeHigh null is kept.
    expect(second.contracts[0]).toEqual({
      label: "$71,600 or above",
      comparator: "gt",
      strikeLow: 71599.99,
      strikeHigh: null,
      unit: "USD",
      probability: 99,
      bid: 99,
      ask: 100,
      tradedRecently: true,
    });
    expect(body).toMatchObject({
      instrument: LADDERS.instrument,
      reference: LADDERS.reference,
      coverage: LADDERS.coverage,
      shortTerm: LADDERS.shortTerm,
      disclaimer: LADDERS.disclaimer,
      crossVenueCount: 0,
    });
  });

  it("keeps the event slug on contracts of a multi-event ladder", () => {
    const ladder = kalshiLadder("KXBTC", "a", [
      { label: "x", comparator: "gt", eventSlug: "b", unit: "USD" },
    ]);
    ladder.events.push({ ...ladder.events[0]!, slug: "b" });
    const body = compactInstrumentMarkets({
      groups: [{ settlementNote: GROUP_NOTE, ladders: [ladder] }],
    }) as any;
    expect(body.groups[0].ladders[0].contracts[0].eventSlug).toBe("b");
  });

  it("returns the untouched record for detail=full and keeps API errors", async () => {
    const full = await call(
      "instrument_markets",
      { type: "coin", id: "bitcoin", detail: "full" },
      LADDERS,
    );
    expect(full.result.structuredContent.body).toEqual(LADDERS);

    const missing = await call(
      "instrument_markets",
      { type: "coin", id: "notacoin-zzz" },
      { message: "Unknown instrument" },
      404,
    );
    expect(missing.result.isError).toBe(true);
    expect(missing.result.structuredContent).toMatchObject({
      httpStatus: 404,
      body: { message: "Unknown instrument" },
    });
  });

  it("passes an empty instrument through as groups: []", async () => {
    const empty = {
      ...LADDERS,
      instrument: { type: "tradfi", id: "AAPL", symbol: "AAPL", name: "Apple" },
      groups: [],
      coverage: { venues: [], ladders: 0, contracts: 0, truncated: false },
    };
    const { result } = await call(
      "instrument_markets",
      { type: "tradfi", id: "AAPL" },
      empty,
    );
    expect(result.structuredContent.body.groups).toEqual([]);
    expect(result.structuredContent.body.coverage).toEqual(empty.coverage);
  });

  it("restricts type, id, horizon and limit to the contract", () => {
    const schema = schemaFor("instrument_markets");
    const ok = { type: "coin", id: "bitcoin" };
    expect(schema.safeParse(ok).success).toBe(true);
    expect(schema.safeParse({ ...ok, type: "stock" }).success).toBe(false);
    expect(schema.safeParse({ ...ok, id: "bit coin" }).success).toBe(false);
    expect(schema.safeParse({ ...ok, id: "../x" }).success).toBe(false);
    expect(schema.safeParse({ ...ok, horizon: "decade" }).success).toBe(false);
    expect(schema.safeParse({ ...ok, limit: 0 }).success).toBe(false);
    expect(schema.safeParse({ ...ok, limit: 201 }).success).toBe(false);
  });
});

const HISTORY = {
  source: "kalshi",
  slug: "controlh-2026",
  interval: "1w",
  outcome: { name: "Republican Party", externalMarketId: "CONTROLH-2026-R" },
  points: [
    { t: 1791540000000, p: 0.11 },
    { t: 1791543600000, p: 0.1 },
    { t: 1791547200000, p: 0.1 },
    { t: 1791550800000, p: 0.1 },
    { t: 1791554400000, p: 0.11 },
  ],
};

describe("pm_data_price_history", () => {
  it("reads the outcome history keylessly and samples to maxPoints", async () => {
    const { url, result } = await call(
      "pm_data_price_history",
      { source: "kalshi", slug: "controlh-2026", interval: "1d", maxPoints: 3 },
      HISTORY,
    );
    expect(url.pathname).toBe(
      "/api/prediction-markets/event/kalshi/controlh-2026/price-history",
    );
    expect(url.searchParams.get("interval")).toBe("1d");
    expect(result.structuredContent.body).toEqual({
      source: "kalshi",
      slug: "controlh-2026",
      interval: "1w",
      outcome: HISTORY.outcome,
      pointCount: 5,
      sampled: true,
      points: [HISTORY.points[0], HISTORY.points[2], HISTORY.points[4]],
    });
  });

  it("leaves a short series and the not-served empty shape intact", async () => {
    expect(compactPublicPmPriceHistory(HISTORY, 200)).toMatchObject({
      pointCount: 5,
      sampled: false,
      points: HISTORY.points,
    });
    const manifold = {
      source: "manifold",
      slug: "nfl-week-6-will-the-total-combined-Ezlun28Eqs",
      interval: "1w",
      outcome: { name: "Yes", externalMarketId: "yes" },
      points: [],
    };
    const { result } = await call(
      "pm_data_price_history",
      { source: "manifold", slug: manifold.slug },
      manifold,
    );
    expect(result.structuredContent.body).toMatchObject({
      pointCount: 0,
      sampled: false,
      points: [],
    });
    expect(compactPublicPmPriceHistory({ points: null }, 5)).toEqual({
      pointCount: 0,
      sampled: false,
      points: null,
    });
  });

  it("rejects venues and intervals outside the contract", () => {
    const schema = schemaFor("pm_data_price_history");
    const ok = { source: "polymarket", slug: "brazil-presidential-election" };
    expect(schema.safeParse(ok).success).toBe(true);
    expect(schema.safeParse({ ...ok, source: "betfair" }).success).toBe(false);
    expect(schema.safeParse({ ...ok, slug: " " }).success).toBe(false);
    expect(schema.safeParse({ ...ok, interval: "2d" }).success).toBe(false);
    expect(schema.safeParse({ ...ok, maxPoints: 1 }).success).toBe(false);
  });
});

const levels = (start: number, step: number) =>
  Array.from({ length: 12 }, (_, i) => ({
    price: Number((start + step * i).toFixed(3)),
    size: 100 + i,
  }));

const BOOK = {
  source: "polymarket",
  slug: "brazil-presidential-election",
  outcome: { name: "Flavio Bolsonaro", externalMarketId: "1098768684" },
  orderBook: {
    bid: 0.776,
    ask: 0.777,
    spread: 0.0010000000000000009,
    midpoint: 0.7765,
    bids: levels(0.776, -0.001),
    asks: levels(0.777, 0.001),
    receivedAt: "2026-10-16T09:19:56.472Z",
    sideEvidence: { bid: true, ask: true },
    askEvidence: { validated: true, receivedAt: "2026-10-16T09:19:56.472Z" },
  },
  asOf: "2026-10-16T09:19:56.472Z",
  stale: false,
  meta: { freshUntil: "2026-10-16T09:20:26.472Z" },
};

describe("pm_data_orderbook", () => {
  it("keeps the best 10 levels per side by default with full level counts", async () => {
    const { url, result } = await call(
      "pm_data_orderbook",
      { source: "polymarket", slug: "brazil-presidential-election" },
      BOOK,
    );
    expect(url.pathname).toBe(
      "/api/prediction-markets/event/polymarket/brazil-presidential-election/orderbook",
    );
    expect([...url.searchParams]).toEqual([]);
    const book = result.structuredContent.body.orderBook;
    expect(book.bids).toEqual(BOOK.orderBook.bids.slice(0, 10));
    expect(book.asks).toEqual(BOOK.orderBook.asks.slice(0, 10));
    expect(book).toMatchObject({
      bidLevels: 12,
      askLevels: 12,
      bid: 0.776,
      ask: 0.777,
      midpoint: 0.7765,
      sideEvidence: { bid: true, ask: true },
      askEvidence: BOOK.orderBook.askEvidence,
    });
  });

  it("forwards a selected outcome and honours depth", async () => {
    const { url, result } = await call(
      "pm_data_orderbook",
      {
        source: "kalshi",
        slug: "controlh-2026",
        outcomeExternalMarketId: "CONTROLH-2026-D",
        depth: 2,
      },
      BOOK,
    );
    expect(url.searchParams.get("outcomeExternalMarketId")).toBe(
      "CONTROLH-2026-D",
    );
    expect(result.structuredContent.body.orderBook.bids).toHaveLength(2);
  });

  it("passes orderBook: null through as a valid empty shape", async () => {
    const empty = {
      source: "manifold",
      slug: "x",
      outcome: { name: "Yes", externalMarketId: "yes" },
      orderBook: null,
      asOf: null,
      stale: false,
    };
    expect(compactPublicPmOrderBook(empty, 10)).toEqual(empty);
    const { result } = await call(
      "pm_data_orderbook",
      { source: "kalshi", slug: "controlh-2026", outcomeExternalMarketId: "z" },
      { error: "Prediction market event or outcome not found" },
      404,
    );
    expect(result.isError).toBe(true);
    expect(result.structuredContent.httpStatus).toBe(404);
  });

  it("restricts depth and the outcome id length", () => {
    const schema = schemaFor("pm_data_orderbook");
    const ok = { source: "kalshi", slug: "controlh-2026" };
    expect(schema.safeParse({ ...ok, depth: 0 }).success).toBe(false);
    expect(schema.safeParse({ ...ok, depth: 51 }).success).toBe(false);
    expect(
      schema.safeParse({ ...ok, outcomeExternalMarketId: "x".repeat(201) })
        .success,
    ).toBe(false);
  });
});

const KALSHI_SOURCE = {
  id: "kalshi",
  name: "Kalshi",
  icon: "/predictionmarkets/kalshi.svg",
  kind: "market",
  methodology: "Exchange order book",
  supportsTrading: true,
  supportsMarketMetrics: true,
  quoteScale: "ratio",
};

const settledEvent = {
  id: "KXITFWMATCH-26OCT14MAZBUL",
  slug: "kxitfwmatch-26oct14mazbul",
  title: "Mazzoni vs Bulgaru",
  description: "If Miriam Bianca Bulgaru wins the Mazzoni vs Bulgaru match",
  image: "https://kalshi-public-docs.s3.amazonaws.com/KXITFWMATCH.webp",
  status: "closed",
  resolvedAt: "2026-10-15T20:37:51.775Z",
  resolvedAtBasis: "provider",
  resolvedOutcomeExternalMarketId: "KXITFWMATCH-26OCT14MAZBUL-MAZ",
  resolutionOutcomeBasis: "provider",
  volume: 482992.91,
  outcomes: [
    {
      externalMarketId: "KXITFWMATCH-26OCT14MAZBUL-BUL",
      name: "Miriam Bianca Bulgaru",
      probability: 2,
      icon: "https://kalshi-public-docs.s3.amazonaws.com/KXITFWMATCH.webp",
      tokenId: "KXITFWMATCH-26OCT14MAZBUL-BUL",
    },
    {
      externalMarketId: "KXITFWMATCH-26OCT14MAZBUL-MAZ",
      name: "Juliette Mazzoni",
      probability: 98,
      icon: "https://kalshi-public-docs.s3.amazonaws.com/KXITFWMATCH.webp",
      tokenId: "KXITFWMATCH-26OCT14MAZBUL-MAZ",
    },
  ],
  source: KALSHI_SOURCE,
  chartContext: { seriesTicker: "KXITFWMATCH" },
};

const SURPRISES = {
  window: "all",
  data: [
    {
      event: settledEvent,
      resolvedAt: "2026-10-15T20:37:51.775Z",
      resolvedAtVerified: true,
      closedAt: "2026-10-15T20:39:37.089Z",
      resolutionOutcome: {
        externalMarketId: "KXITFWMATCH-26OCT14MAZBUL-MAZ",
        name: "Juliette Mazzoni",
        probability: 98,
        basis: "source",
      },
      surprise: { t24hProbability: 2, t7dProbability: null },
    },
  ],
  pagination: { limit: 3, offset: 0, hasMore: true },
};

describe("pm_data_resolved and pm_data_surprises", () => {
  it("summarizes each settled row and keeps its resolution evidence", async () => {
    const { url, result } = await call("pm_data_surprises", {}, SURPRISES);
    expect(url.pathname).toBe("/api/prediction-markets/surprises");
    expect(url.searchParams.get("limit")).toBe("10");
    const row = result.structuredContent.body.data[0];
    expect(row).toMatchObject({
      resolvedAt: "2026-10-15T20:37:51.775Z",
      resolvedAtVerified: true,
      closedAt: "2026-10-15T20:39:37.089Z",
      resolutionOutcome: SURPRISES.data[0]!.resolutionOutcome,
      surprise: { t24hProbability: 2, t7dProbability: null },
      event: {
        slug: "kxitfwmatch-26oct14mazbul",
        outcomeCount: 2,
        source: { id: "kalshi", quoteScale: "ratio" },
      },
    });
    // The winner leads a closed event's outcomes.
    expect(row.event.outcomes[0].name).toBe("Juliette Mazzoni");
    expect(row.event.description).toBeUndefined();
    expect(row.event.image).toBeUndefined();
    expect(row.event.outcomes[0].icon).toBeUndefined();
    expect(result.structuredContent.body.window).toBe("all");
    expect(result.structuredContent.body.pagination).toEqual(
      SURPRISES.pagination,
    );
  });

  it("forwards surprise filters and rejects an unknown window", async () => {
    const { url } = await call(
      "pm_data_surprises",
      { limit: 3, offset: 6, source: "kalshi", window: "30d", fiat: "EUR" },
      SURPRISES,
    );
    expect(Object.fromEntries(url.searchParams)).toEqual({
      limit: "3",
      offset: "6",
      source: "kalshi",
      window: "30d",
      fiat: "EUR",
    });
    const schema = schemaFor("pm_data_surprises");
    expect(schema.safeParse({ window: "1y" }).success).toBe(false);
    expect(schema.safeParse({ limit: 101 }).success).toBe(false);
    expect(schema.safeParse({ fiat: "dollars" }).success).toBe(false);
  });

  it("caps resolved pages at 100 rows unless a year slice is requested", async () => {
    const resolved = {
      ...SURPRISES,
      data: [{ ...SURPRISES.data[0], surprise: undefined }],
      meta: { totalResolved: 1791023, minVolume: null, period: null },
    };
    const unbounded = await call("pm_data_resolved", { limit: 150 }, resolved);
    expect(unbounded.url.pathname).toBe("/api/prediction-markets/resolved");
    expect(unbounded.url.searchParams.get("limit")).toBe("100");
    expect(unbounded.result.structuredContent.body.meta).toEqual(resolved.meta);

    const slice = await call(
      "pm_data_resolved",
      { limit: 150, year: 2026, month: 9, minVolume: 100000, source: "kalshi" },
      resolved,
    );
    expect(Object.fromEntries(slice.url.searchParams)).toEqual({
      limit: "150",
      year: "2026",
      month: "9",
      minVolume: "100000",
      source: "kalshi",
    });
    const fallback = await call("pm_data_resolved", {}, resolved);
    expect(fallback.url.searchParams.get("limit")).toBe("10");
  });

  it("refuses month without year locally, without calling the API", async () => {
    const tool = registered().get("pm_data_resolved")!;
    const result = await tool.handler({ month: 9 }, {});
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.isError).toBe(true);
    expect(result.structuredContent).toMatchObject({
      httpStatus: 400,
      body: { error: "invalid_period" },
    });
  });

  it("does not invent rows for partial responses", () => {
    expect(compactPublicPmSettled({ data: null })).toEqual({ data: null });
    expect(compactPublicPmSettled({ data: [null, 7] })).toEqual({
      data: [null, 7],
    });
    expect(compactPublicPmSettled("text")).toBe("text");
  });
});

const EXPIRING = {
  data: [
    {
      ...settledEvent,
      id: "KXVALORANTGAME-26OCT160200VITLOUD",
      slug: "kxvalorantgame-26oct160200vitloud",
      title: "Team Vitality vs. LOUD",
      status: "open",
      endDate: "2026-10-18T06:00:00.000Z",
      expectedResolveAt: "2026-10-16T10:00:00.000Z",
      resolvedAt: null,
      expiresInMs: 2354701,
    },
  ],
  pagination: { limit: 3, offset: 0, hasMore: true },
  meta: {
    totalExpiring: 1730,
    window: {
      from: "2026-10-16T09:20:45.299Z",
      to: "2026-10-23T09:20:45.299Z",
    },
  },
};

describe("pm_data_expiring", () => {
  it("keeps the expiry fields on each compact event", async () => {
    const { url, result } = await call(
      "pm_data_expiring",
      { days: 3, source: "kalshi" },
      EXPIRING,
    );
    expect(url.pathname).toBe("/api/prediction-markets/expiring");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      limit: "10",
      days: "3",
      source: "kalshi",
    });
    const body = result.structuredContent.body;
    expect(body.meta).toEqual(EXPIRING.meta);
    expect(body.data[0]).toMatchObject({
      slug: "kxvalorantgame-26oct160200vitloud",
      endDate: "2026-10-18T06:00:00.000Z",
      expectedResolveAt: "2026-10-16T10:00:00.000Z",
      expiresInMs: 2354701,
      outcomeCount: 2,
    });
    expect(body.data[0].description).toBeUndefined();
    expect(compactPublicPmExpiring({ data: [null] })).toEqual({
      data: [null],
    });
  });

  it("restricts the lookahead to 1-30 days", () => {
    const schema = schemaFor("pm_data_expiring");
    expect(schema.safeParse({ days: 30 }).success).toBe(true);
    expect(schema.safeParse({ days: 31 }).success).toBe(false);
    expect(schema.safeParse({ days: 0 }).success).toBe(false);
  });
});

const METHODOLOGY = {
  basis: "derivatives_venue_index",
  aggregation: "median",
  minimumVenueCount: 2,
  maxVenueSpreadPct: 5,
  collectionIntervalSeconds: 900,
  freshnessThresholdSeconds: 1800,
  retentionDays: 14,
  liveMaxAgeSeconds: 90,
  venues: ["binance", "bybit", "gate"],
};

const catalogItem = (
  ticker: string,
  assetClass: string,
  price: number,
  fundamentals: unknown,
) => ({
  instrument: {
    ticker,
    name: ticker,
    assetClass,
    unit: { status: "unverified", currency: null, per: null },
    venueQuoteAsset: "USDT",
    issuer: null,
    leverage: null,
    homeListing: null,
    indexReference: null,
  },
  availability: "available",
  freshness: {
    status: "fresh",
    basis: "collection",
    asOf: "2026-10-16T09:17:20.794Z",
    ageSeconds: 227,
    staleAt: "2026-10-16T09:47:20.794Z",
  },
  latest: {
    bucketStart: "2026-10-16T09:15:00.000Z",
    fetchedAt: "2026-10-16T09:17:20.794Z",
    consensusPrice: price,
    minPrice: price - 0.02,
    maxPrice: price + 0.01,
    venueSpreadPct: 0.006438588813528767,
    venueCount: 3,
  },
  change24h: {
    pct: -0.9065550075643913,
    referencePrice: price + 3,
    referenceBucketStart: "2026-10-15T09:15:00.000Z",
  },
  change7d: null,
  range24h: { low: price - 1.6, high: price + 4.4, observations: 94 },
  spark7d: [333.32, 334.1, 335.9],
  latestVenues: ["binance", "bybit", "gate"],
  live: {
    price: price + 0.05,
    minPrice: price + 0.03,
    maxPrice: price + 0.07,
    venueSpreadPct: 0.010999585073157014,
    venueCount: 3,
    venues: [{ venue: "binance", indexPrice: price + 0.03 }],
    sourceAt: "2026-10-16T09:20:09.010Z",
    ageSeconds: 59,
    change24hPct: -0.890654494167209,
  },
  fundamentals,
});

const CATALOG = {
  version: 1,
  generatedAt: "2026-10-16T09:21:08.023Z",
  methodology: METHODOLOGY,
  count: 3,
  items: [
    catalogItem("AAPL", "equity", 342.765, {
      marketCapUsd: 5003176787600,
      peRatio: 39.36,
      dividendYieldPct: 0.306,
      sector: "Electronic Computers",
      revenueTtmUsd: 466823000000,
      source: { name: "SEC EDGAR" },
    }),
    catalogItem("SPY", "etf", 664.12, null),
    catalogItem("XAU", "metal", 4195.74141281, null),
  ],
};

const DETAIL = {
  version: 1,
  generatedAt: "2026-10-16T09:21:08.682Z",
  methodology: METHODOLOGY,
  instrument: CATALOG.items[0]!.instrument,
  availability: "available",
  latest: {
    ...CATALOG.items[0]!.latest,
    venues: [
      {
        venue: "binance",
        symbol: "AAPLUSDT",
        label: "EQUITY",
        assetClass: "equity",
        indexPrice: 342.74793187,
        sourceObservedAt: null,
      },
    ],
  },
  week52: { high: 347.26424695, low: 331.4135369, days: 9 },
  history: Array.from({ length: 5 }, (_, i) => ({
    bucketStart: `2026-10-15T09:${30 + i}:00.000Z`,
    fetchedAt: `2026-10-15T09:${32 + i}:18.380Z`,
    consensusPrice: 345.83 + i,
    minPrice: 345.654 + i,
    maxPrice: 345.85968624 + i,
    venueSpreadPct: 0.05950639656997492,
    venueCount: 3,
    venues: [{ venue: "binance", indexPrice: 345.85968624 + i }],
  })),
  historyWindow: {
    window: "24h",
    from: "2026-10-15T09:21:08.682Z",
    to: "2026-10-16T09:21:08.682Z",
    intervalSeconds: 900,
  },
};

describe("tradfi_references", () => {
  it("lists the catalog with no query parameters and pages it on the MCP side", async () => {
    const { url, result } = await call(
      "tradfi_references",
      { assetClass: "metal" },
      CATALOG,
    );
    expect(url.pathname).toBe("/api/market/references");
    expect(url.search).toBe("");
    const body = result.structuredContent.body;
    expect(body).toMatchObject({
      version: 1,
      methodology: METHODOLOGY,
      count: 3,
      assetClass: "metal",
      matched: 1,
      offset: 0,
      hasMore: false,
    });
    expect(body.items).toHaveLength(1);
    expect(body.items[0].instrument.ticker).toBe("XAU");
  });

  it("keeps price, change, range, live and key fundamentals per row", () => {
    const body = compactTradfiCatalog(CATALOG, { limit: 1, offset: 0 }) as any;
    expect(body).toMatchObject({ matched: 3, hasMore: true });
    expect(body.items[0]).toEqual({
      instrument: {
        ticker: "AAPL",
        name: "AAPL",
        assetClass: "equity",
        unit: { status: "unverified", currency: null, per: null },
        venueQuoteAsset: "USDT",
        issuer: null,
        leverage: null,
      },
      availability: "available",
      freshness: {
        status: "fresh",
        asOf: "2026-10-16T09:17:20.794Z",
        ageSeconds: 227,
      },
      latest: {
        bucketStart: "2026-10-16T09:15:00.000Z",
        consensusPrice: 342.765,
        venueSpreadPct: 0.006438588813528767,
        venueCount: 3,
      },
      change24h: { pct: -0.9065550075643913 },
      change7d: null,
      range24h: { low: 342.765 - 1.6, high: 342.765 + 4.4 },
      live: {
        price: 342.765 + 0.05,
        venueCount: 3,
        sourceAt: "2026-10-16T09:20:09.010Z",
        ageSeconds: 59,
        change24hPct: -0.890654494167209,
      },
      fundamentals: {
        marketCapUsd: 5003176787600,
        peRatio: 39.36,
        dividendYieldPct: 0.306,
        sector: "Electronic Computers",
      },
    });
    const second = compactTradfiCatalog(CATALOG, {
      limit: 5,
      offset: 1,
    }) as any;
    expect(second.items.map((item: any) => item.instrument.ticker)).toEqual([
      "SPY",
      "XAU",
    ]);
    expect(second.items[0].fundamentals).toBeNull();
    expect(
      compactTradfiCatalog({ items: null }, { limit: 5, offset: 0 }),
    ).toEqual({ items: null });
  });

  it("reads one ticker with its window and samples the history", async () => {
    const { url, result } = await call(
      "tradfi_references",
      { ticker: "AAPL", window: "7d", maxPoints: 2 },
      DETAIL,
    );
    expect(url.pathname).toBe("/api/market/references/AAPL");
    expect([...url.searchParams]).toEqual([["window", "7d"]]);
    const body = result.structuredContent.body;
    expect(body.latest).toEqual(DETAIL.latest);
    expect(body.week52).toEqual(DETAIL.week52);
    expect(body).toMatchObject({ historyCount: 5, historySampled: true });
    const kept = (i: number) => {
      const { bucketStart, consensusPrice, minPrice, maxPrice, venueCount } =
        DETAIL.history[i]!;
      return { bucketStart, consensusPrice, minPrice, maxPrice, venueCount };
    };
    expect(body.history).toEqual([kept(0), kept(4)]);
    expect(compactTradfiReference(DETAIL, 100)).toMatchObject({
      historyCount: 5,
      historySampled: false,
    });
  });

  it("keeps an unknown ticker's 404", async () => {
    const { result } = await call(
      "tradfi_references",
      { ticker: "ZZZZ" },
      { message: "Reference instrument not found" },
      404,
    );
    expect(result.isError).toBe(true);
    expect(result.structuredContent.body).toEqual({
      message: "Reference instrument not found",
    });
  });

  it("restricts ticker, window and asset class to the contract", () => {
    const schema = schemaFor("tradfi_references");
    expect(schema.safeParse({ ticker: "A-B" }).success).toBe(false);
    expect(schema.safeParse({ ticker: "x".repeat(21) }).success).toBe(false);
    expect(schema.safeParse({ ticker: "xau", window: "1m" }).success).toBe(
      false,
    );
    expect(schema.safeParse({ assetClass: "crypto" }).success).toBe(false);
    expect(schema.safeParse({ limit: 251 }).success).toBe(false);
  });
});

describe("samplePoints", () => {
  it("keeps first and last and never rewrites values", () => {
    const points = Array.from({ length: 10 }, (_, i) => i);
    expect(samplePoints(points, 4)).toEqual([0, 3, 6, 9]);
    expect(samplePoints(points, 2)).toEqual([0, 9]);
    expect(samplePoints(points, 10)).toBe(points);
    expect(samplePoints(points, 1)).toEqual([9]);
  });
});
