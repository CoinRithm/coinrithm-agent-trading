import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  bearerFromHeader,
  CoinRithmClient,
  DEFAULT_BASE_URL,
  loadConfig,
  loadHttpConfig,
} from "./client.js";
import { CoinRithmClient as RunnerClient } from "./agent/client.js";

const fetchMock = vi.fn<typeof fetch>();
const trace = {
  runId: "fixture-run",
  decisionId: "fixture-decision",
  strategyLabel: "fixture-strategy",
  confidence: 0,
};
const futures = {
  coinId: "1",
  side: "long",
  leverage: 2,
  marginMusd: 50,
  idempotencyKey: "fixture-intent",
  agentTrace: trace,
};
const spot = {
  coinId: "1",
  side: "buy",
  orderType: "market",
  quantity: 1,
  idempotencyKey: "fixture-intent",
  agentTrace: trace,
};
const pm = {
  source: "polymarket",
  slug: "fixture",
  outcomeExternalMarketId: "yes",
  stakeMusd: 50,
  idempotencyKey: "fixture-intent",
  agentTrace: trace,
};
const baseUrl = "https://fixture.example.test";

beforeEach(() => {
  fetchMock.mockReset().mockImplementation(
    async () =>
      new Response('{"fixture":true}', {
        headers: {
          "x-coinrithm-ledger-event-id": "fixture-ledger",
          "x-coinrithm-ledger-status": "executed",
        },
      }),
  );
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

type Contract = [
  method: string,
  args: unknown[],
  verb: string,
  path: string,
  query?: Record<string, string>,
  body?: unknown,
];
const mcpReads: Contract[] = [
  ["whoami", [], "GET", "/api/agent/me"],
  [
    "getPortfolio",
    [{ fiat: "usd", locale: "tr" }],
    "GET",
    "/api/agent/portfolio",
    { fiat: "usd", locale: "tr" },
  ],
  ["getWallet", [{ coinId: "1" }], "GET", "/api/agent/wallet", { coinId: "1" }],
  [
    "resolveSymbol",
    [{ q: "BTC/USD" }],
    "GET",
    "/api/agent/resolve",
    { q: "BTC/USD" },
  ],
  [
    "getEquityCurve",
    [{ days: 7, granularity: "daily" }],
    "GET",
    "/api/agent/equity-curve",
    { days: "7", granularity: "daily" },
  ],
  [
    "getMyTrades",
    [{ limit: 0, venue: "", updatedSince: undefined }],
    "GET",
    "/api/agent/trades",
    { limit: "0" },
  ],
  ["getMarketContext", ["id/1"], "GET", "/api/agent/market/id%2F1"],
  [
    "getCandles",
    ["id/1", { range: "1D" }],
    "GET",
    "/api/agent/market/id%2F1/candles",
    { range: "1D" },
  ],
  [
    "discoverPmMarkets",
    [{ q: "fixture" }],
    "GET",
    "/api/agent/pm/discover",
    { q: "fixture" },
  ],
  ["getPerformance", [], "GET", "/api/agent/performance"],
  [
    "getLedger",
    [{ decisionId: "fixture/id" }],
    "GET",
    "/api/agent/ledger",
    { decisionId: "fixture/id" },
  ],
  [
    "exportLedger",
    [{ runId: "fixture/run" }],
    "GET",
    "/api/agent/ledger/export",
    { runId: "fixture/run" },
  ],
  ["getArenaLeaderboard", [{ page: 1 }], "GET", "/api/arena", { page: "1" }],
  ["getArenaAgent", ["fixture/name"], "GET", "/api/arena/fixture%2Fname"],
  ["listOpenOrders", [], "GET", "/api/agent/orders/open"],
  ["getFuturesPositions", [], "GET", "/api/agent/positions/futures"],
  ["getPmPositions", [], "GET", "/api/agent/positions/pm"],
];
const mcpWrites: Contract[] = [
  [
    "futuresQuote",
    [futures],
    "POST",
    "/api/agent/futures/quote",
    undefined,
    futures,
  ],
  ["spotQuote", [spot], "POST", "/api/agent/spot/quote", undefined, spot],
  ["pmQuote", [pm], "POST", "/api/agent/pm/quote", undefined, pm],
  ["placeSpotOrder", [spot], "POST", "/api/agent/spot/order", undefined, spot],
  ["cancelSpotOrder", [7], "POST", "/api/agent/spot/order/7/cancel"],
  [
    "openFuturesPosition",
    [futures],
    "POST",
    "/api/agent/futures/open",
    undefined,
    futures,
  ],
  [
    "setFuturesSlTp",
    [{ positionId: 7, stopLossPrice: null }],
    "POST",
    "/api/agent/futures/sl-tp",
    undefined,
    { positionId: 7, stopLossPrice: null },
  ],
  [
    "closeFuturesPosition",
    [{ positionId: 7, idempotencyKey: "fixture" }],
    "POST",
    "/api/agent/futures/close",
    undefined,
    { positionId: 7, idempotencyKey: "fixture" },
  ],
  ["openPmPosition", [pm], "POST", "/api/agent/pm/open", undefined, pm],
  [
    "reportPmOpportunity",
    [{ kind: "abstained", agentTrace: trace }],
    "POST",
    "/api/agent/pm/opportunity",
    undefined,
    { kind: "abstained", agentTrace: trace },
  ],
];
const runnerContracts: Contract[] = [
  ["me", [trace], "GET", "/api/agent/me"],
  [
    "wallet",
    [{ coinId: "1" }, trace],
    "GET",
    "/api/agent/wallet",
    { coinId: "1" },
  ],
  [
    "resolve",
    ["BTC/USD", trace],
    "GET",
    "/api/agent/resolve",
    { q: "BTC/USD" },
  ],
  [
    "cryptoMovers",
    ["gainers", 5, trace],
    "GET",
    "/api/coins/top-gainers",
    { limit: "5" },
  ],
  [
    "cryptoMovers",
    ["losers", 5],
    "GET",
    "/api/coins/top-losers",
    { limit: "5" },
  ],
  ["market", ["id/1", trace], "GET", "/api/agent/market/id%2F1"],
  [
    "candles",
    ["id/1", "1D", trace],
    "GET",
    "/api/agent/market/id%2F1/candles",
    { range: "1D" },
  ],
  [
    "trades",
    [{ limit: 0, venue: "", updatedSince: undefined }, trace],
    "GET",
    "/api/agent/trades",
    { limit: "0" },
  ],
  [
    "futuresPositions",
    [undefined, trace],
    "GET",
    "/api/agent/positions/futures",
  ],
  [
    "futuresQuote",
    [futures, trace],
    "POST",
    "/api/agent/futures/quote",
    undefined,
    futures,
  ],
  ["openOrders", [undefined, trace], "GET", "/api/agent/orders/open"],
  [
    "spotQuote",
    [spot, trace],
    "POST",
    "/api/agent/spot/quote",
    undefined,
    spot,
  ],
  [
    "discoverPmMarkets",
    [{ q: "fixture" }, trace],
    "GET",
    "/api/agent/pm/discover",
    { q: "fixture" },
  ],
  [
    "agentNews",
    [{ coins: "BTC,ETH", limit: 2 }, trace],
    "GET",
    "/api/agent/news",
    { coins: "BTC,ETH", limit: "2" },
  ],
  ["pmPositions", [undefined, trace], "GET", "/api/agent/positions/pm"],
  ["pmQuote", [pm, trace], "POST", "/api/agent/pm/quote", undefined, pm],
  [
    "openFutures",
    [futures],
    "POST",
    "/api/agent/futures/open",
    undefined,
    futures,
  ],
  [
    "closeFutures",
    [{ positionId: 7, idempotencyKey: "fixture" }],
    "POST",
    "/api/agent/futures/close",
    undefined,
    { positionId: 7, idempotencyKey: "fixture" },
  ],
  [
    "setFuturesSlTp",
    [{ positionId: 7, takeProfitPrice: null }],
    "POST",
    "/api/agent/futures/sl-tp",
    undefined,
    { positionId: 7, takeProfitPrice: null },
  ],
  ["placeSpotOrder", [spot], "POST", "/api/agent/spot/order", undefined, spot],
  ["cancelSpotOrder", [7], "POST", "/api/agent/spot/order/7/cancel"],
  [
    "cancelSpotOrder",
    [7, "fixture", trace],
    "POST",
    "/api/agent/spot/order/7/cancel",
    undefined,
    { idempotencyKey: "fixture" },
  ],
  ["openPmPosition", [pm], "POST", "/api/agent/pm/open", undefined, pm],
  [
    "reportPmOpportunity",
    [{ kind: "abstained" }, trace],
    "POST",
    "/api/agent/pm/opportunity",
    undefined,
    { kind: "abstained", agentTrace: trace },
  ],
];

async function check(
  client: CoinRithmClient | RunnerClient,
  contract: Contract,
) {
  const [method, args, verb, path, query = {}, body] = contract;
  const call = (
    client as unknown as Record<
      string,
      (...args: unknown[]) => Promise<unknown>
    >
  )[method];
  await call.apply(client, args);
  expect(fetchMock).toHaveBeenCalledOnce();
  const [url, init] = fetchMock.mock.calls[0];
  const parsed = new URL(String(url));
  expect(parsed.origin).toBe(baseUrl);
  expect(parsed.pathname).toBe(path);
  expect(Object.fromEntries(parsed.searchParams)).toEqual(query);
  expect(init?.method).toBe(verb);
  expect(
    body === undefined ? init?.body : JSON.parse(String(init?.body)),
  ).toEqual(body);
  expect(new Headers(init?.headers).get("Authorization")).toBe(
    "Bearer fixture-default",
  );
}

describe("MCP and runner HTTP contracts", () => {
  it.each([...mcpReads, ...mcpWrites])(
    "MCP %s sends the declared route, body and key",
    async (...contract) => {
      await check(
        new CoinRithmClient({ apiKey: "fixture-default", baseUrl }),
        contract,
      );
    },
  );
  it.each(runnerContracts)(
    "runner %s sends the declared route, body and key",
    async (...contract) => {
      await check(
        new RunnerClient({
          apiKey: "fixture-default",
          baseUrl: `${baseUrl}///`,
          fetchFn: fetchMock,
        }),
        contract,
      );
    },
  );

  it("uses per-call keys without leaking one caller's key into another", async () => {
    const client = new CoinRithmClient({ apiKey: "fixture-default", baseUrl });
    await client.whoami("fixture-a", trace);
    await client.whoami("fixture-b", {});
    expect(
      new Headers(fetchMock.mock.calls[0][1]?.headers).get("authorization"),
    ).toBe("Bearer fixture-a");
    expect(
      new Headers(fetchMock.mock.calls[1][1]?.headers).get("authorization"),
    ).toBe("Bearer fixture-b");
    expect(fetchMock.mock.calls[0][1]?.headers).toMatchObject({
      "X-CoinRithm-Run-Id": "fixture-run",
      "X-CoinRithm-Decision-Id": "fixture-decision",
      "X-CoinRithm-Strategy-Label": "fixture-strategy",
      "X-CoinRithm-Confidence": "0",
    });
  });

  it("does not make authenticated requests without a key", async () => {
    expect(await new CoinRithmClient({ baseUrl }).whoami()).toMatchObject({
      ok: false,
      status: 401,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([null, "", "invalid", "-1", "7"])(
    "MCP preserves Retry-After evidence: %s",
    async (header) => {
      fetchMock.mockResolvedValueOnce(
        new Response("limited", {
          status: 429,
          headers: header == null ? {} : { "retry-after": header },
        }),
      );
      expect(
        await new CoinRithmClient({ apiKey: "fixture", baseUrl }).whoami(),
      ).toMatchObject({
        status: 429,
        data: {
          error: "limited",
          retryAfterSeconds: header === "7" ? 7 : null,
        },
      });
      expect(fetchMock).toHaveBeenCalledOnce();
    },
  );

  it.each(["", "not JSON", '{"error":"limited"}'])(
    "preserves response bodies: %s",
    async (body) => {
      fetchMock.mockResolvedValueOnce(
        new Response(body, { status: 429, headers: { "retry-after": "5" } }),
      );
      const result = await new CoinRithmClient({
        apiKey: "fixture",
        baseUrl,
      }).whoami();
      expect(result).toMatchObject({
        data: {
          error: body.startsWith("{") ? "limited" : body,
          retryAfterSeconds: 5,
        },
      });
    },
  );

  it.each([new Error("fixture network"), "fixture network"])(
    "returns transport errors without retrying",
    async (error) => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      fetchMock.mockRejectedValue(error);
      expect(
        await new CoinRithmClient({ apiKey: "fixture", baseUrl }).whoami(),
      ).toMatchObject({ status: 0, data: { message: "fixture network" } });
      expect(fetchMock).toHaveBeenCalledOnce();
    },
  );
});

describe("MCP configuration and header parsing", () => {
  it.each([
    [undefined, undefined],
    [[], undefined],
    ["", undefined],
    [" Bearer fixture ", "fixture"],
    [["Bearer fixture", "ignored"], "fixture"],
    [" fixture ", "fixture"],
  ] as const)("parses authorization %s", (input, expected) => {
    expect(bearerFromHeader(input as string | string[] | undefined)).toBe(
      expected,
    );
  });
  it("requires a stdio key but ignores it in hosted HTTP configuration", () => {
    vi.stubEnv("COINRITHM_API_KEY", "");
    vi.stubEnv("COINRITHM_API_URL", "");
    expect(() => loadConfig()).toThrow("COINRITHM_API_KEY is not set");
    expect(loadHttpConfig()).toEqual({ baseUrl: DEFAULT_BASE_URL });
    vi.stubEnv("COINRITHM_API_KEY", " crk_live_fixture ");
    vi.stubEnv("COINRITHM_API_URL", ` ${baseUrl}/// `);
    expect(loadConfig()).toEqual({ apiKey: "crk_live_fixture", baseUrl });
    expect(loadHttpConfig()).toEqual({ baseUrl });
    const warn = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubEnv("COINRITHM_API_KEY", "fixture-invalid-prefix");
    expect(loadConfig().apiKey).toBe("fixture-invalid-prefix");
    expect(warn).toHaveBeenCalledOnce();
  });
});
