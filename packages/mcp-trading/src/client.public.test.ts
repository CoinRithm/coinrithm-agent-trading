import { afterEach, describe, expect, it, vi } from "vitest";
import { CoinRithmClient } from "./client.js";

const fetchMock = vi.fn<typeof fetch>();
vi.stubGlobal("fetch", fetchMock);

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

afterEach(() => {
  fetchMock.mockReset();
});

describe("public PM data client (keyless)", () => {
  it("never attaches the API key to public data requests", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ stats: {} }));
    const client = new CoinRithmClient({
      apiKey: "crk_live_secret",
      baseUrl: "https://api.example.test",
    });

    const result = await client.getPublicPmOverview({ fiat: "usd" });

    expect(result.ok).toBe(true);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toBe(
      "https://api.example.test/api/prediction-markets/overview?fiat=usd",
    );
    const headers = (init?.headers ?? {}) as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
    expect(JSON.stringify(headers)).not.toContain("crk_live_secret");
  });

  it("builds the event-detail path with encoded source and slug", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ event: {} }));
    const client = new CoinRithmClient({ baseUrl: "https://api.example.test" });

    await client.getPublicPmEvent("kalshi", "kxwc/advance 26");

    const [url] = fetchMock.mock.calls[0]!;
    expect(String(url)).toBe(
      "https://api.example.test/api/prediction-markets/events/kalshi/kxwc%2Fadvance%2026",
    );
  });

  it("marks an explicitly viewed event anonymously", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    const client = new CoinRithmClient({
      apiKey: "crk_live_secret",
      baseUrl: "https://api.example.test",
    });
    const result = await client.markPublicPmEventViewed("kalshi", "open/1");
    expect(result.ok).toBe(true);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toBe(
      "https://api.example.test/api/prediction-markets/events/kalshi/open%2F1/view",
    );
    expect(init?.method).toBe("POST");
    expect(new Headers(init?.headers).has("authorization")).toBe(false);
  });

  it("surfaces marker failures without throwing", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: "closed" }, 409));
    const client = new CoinRithmClient({ baseUrl: "https://api.example.test" });
    await expect(
      client.markPublicPmEventViewed("kalshi", "closed"),
    ).resolves.toMatchObject({ ok: false, status: 409 });
  });

  it("aborts a marker after one second without retry", async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementationOnce(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("aborted", "AbortError")),
          );
        }),
    );
    const client = new CoinRithmClient({ baseUrl: "https://api.example.test" });
    const pending = client.markPublicPmEventViewed("kalshi", "slow");
    await vi.advanceTimersByTimeAsync(1000);
    await expect(pending).resolves.toMatchObject({
      ok: false,
      status: 0,
      data: { error: "timeout" },
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("passes search filters as query params and surfaces non-2xx as ok:false", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: "not_found" }, 404));
    const client = new CoinRithmClient({ baseUrl: "https://api.example.test" });

    const result = await client.listPublicPmEvents({
      q: "world cup",
      source: "smarkets",
      limit: 5,
    });

    expect(result.ok).toBe(false);
    expect(result.status).toBe(404);
    const [url] = fetchMock.mock.calls[0]!;
    const parsed = new URL(String(url));
    expect(parsed.pathname).toBe("/api/prediction-markets/events");
    expect(parsed.searchParams.get("q")).toBe("world cup");
    expect(parsed.searchParams.get("source")).toBe("smarkets");
    expect(parsed.searchParams.get("limit")).toBe("5");
  });

  it("fails soft with status 0 on network errors", async () => {
    fetchMock.mockRejectedValueOnce(new Error("boom"));
    const client = new CoinRithmClient({ baseUrl: "https://api.example.test" });

    const result = await client.getPublicPmWhales();

    expect(result.ok).toBe(false);
    expect(result.status).toBe(0);
    expect(result.data).toMatchObject({ error: "network_error" });
  });

  it("never attaches the API key to disagreement-cluster requests", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: [] }));
    const client = new CoinRithmClient({
      apiKey: "crk_live_secret",
      baseUrl: "https://api.example.test",
    });

    const result = await client.getPublicPmMatches({
      limit: 5,
      sourceKind: "market",
      requirePriced: false,
    });

    expect(result.ok).toBe(true);
    const [url, init] = fetchMock.mock.calls[0]!;
    const parsed = new URL(String(url));
    expect(parsed.pathname).toBe("/api/prediction-markets/matches/public");
    expect(parsed.searchParams.get("limit")).toBe("5");
    expect(parsed.searchParams.get("sourceKind")).toBe("market");
    expect(parsed.searchParams.get("requirePriced")).toBe("false");
    const headers = (init?.headers ?? {}) as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
    expect(JSON.stringify(headers)).not.toContain("crk_live_secret");
  });

  it("never attaches the API key to calibration requests", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ scored: [] }));
    const client = new CoinRithmClient({
      apiKey: "crk_live_secret",
      baseUrl: "https://api.example.test",
    });

    const result = await client.getPublicPmCalibration();

    expect(result.ok).toBe(true);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toBe(
      "https://api.example.test/api/prediction-markets/calibration",
    );
    const headers = (init?.headers ?? {}) as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
  });

  it("never attaches the API key to canonical list/detail requests", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: [] }));
    fetchMock.mockResolvedValueOnce(jsonResponse({ canonical: {} }));
    const client = new CoinRithmClient({
      apiKey: "crk_live_secret",
      baseUrl: "https://api.example.test",
    });

    await client.getPublicPmCanonicalList({ limit: 25, cursor: 10 });
    const [listUrl, listInit] = fetchMock.mock.calls[0]!;
    const parsedList = new URL(String(listUrl));
    expect(parsedList.pathname).toBe("/api/prediction-markets/canonical");
    expect(parsedList.searchParams.get("limit")).toBe("25");
    expect(parsedList.searchParams.get("cursor")).toBe("10");
    expect(
      ((listInit?.headers ?? {}) as Record<string, string>).Authorization,
    ).toBeUndefined();

    await client.getPublicPmCanonicalDetail("kx wc/advance 26");
    const [detailUrl] = fetchMock.mock.calls[1]!;
    expect(String(detailUrl)).toBe(
      "https://api.example.test/api/prediction-markets/canonical/kx%20wc%2Fadvance%2026",
    );
  });

  it("encodes path segments of the outcome, instrument and TradFi reads", async () => {
    fetchMock.mockImplementation(async () => jsonResponse({}));
    const client = new CoinRithmClient({
      apiKey: "crk_live_secret",
      baseUrl: "https://api.example.test",
    });

    await client.getPublicPmPriceHistory("kalshi", "kx/a b", {
      interval: "1d",
    });
    await client.getPublicPmOrderBook("polymarket", "x?y", {
      outcomeExternalMarketId: "A&B",
    });
    await client.getPublicInstrumentMarkets("coin", "bit/coin", { limit: 5 });
    await client.getPublicTradfiReference("A/B", { window: "7d" });
    await client.getPublicTradfiReferences();

    expect(fetchMock.mock.calls.map(([url]) => String(url))).toEqual([
      "https://api.example.test/api/prediction-markets/event/kalshi/kx%2Fa%20b/price-history?interval=1d",
      "https://api.example.test/api/prediction-markets/event/polymarket/x%3Fy/orderbook?outcomeExternalMarketId=A%26B",
      "https://api.example.test/api/instruments/coin/bit%2Fcoin/markets?limit=5",
      "https://api.example.test/api/market/references/A%2FB?window=7d",
      "https://api.example.test/api/market/references",
    ]);
    for (const [, init] of fetchMock.mock.calls) {
      expect(
        ((init?.headers ?? {}) as Record<string, string>).Authorization,
      ).toBeUndefined();
    }
  });

  it("pages the resolved, expiring and surprise feeds with query params", async () => {
    fetchMock.mockImplementation(async () => jsonResponse({ data: [] }));
    const client = new CoinRithmClient({ baseUrl: "https://api.example.test" });

    await client.listPublicPmResolved({ limit: 5, year: 2026, month: 9 });
    await client.listPublicPmExpiring({ days: 3, source: "kalshi" });
    await client.listPublicPmSurprises({ window: "30d", offset: 10 });

    expect(fetchMock.mock.calls.map(([url]) => String(url))).toEqual([
      "https://api.example.test/api/prediction-markets/resolved?limit=5&year=2026&month=9",
      "https://api.example.test/api/prediction-markets/expiring?days=3&source=kalshi",
      "https://api.example.test/api/prediction-markets/surprises?window=30d&offset=10",
    ]);
  });

  it("encodes the coin slug of the profile and candle reads, keylessly", async () => {
    fetchMock.mockImplementation(async () => jsonResponse({}));
    const client = new CoinRithmClient({
      apiKey: "crk_live_secret",
      baseUrl: "https://api.example.test",
    });

    await client.getPublicCoin("bit/coin", { fiat: "EUR" });
    await client.getPublicCoin("bitcoin");
    await client.getPublicCoinCandles("a b", { range: "1H" });

    expect(fetchMock.mock.calls.map(([url]) => String(url))).toEqual([
      "https://api.example.test/api/coins/bit%2Fcoin?fiat=EUR",
      "https://api.example.test/api/coins/bitcoin",
      "https://api.example.test/api/coins/a%20b/candles?range=1H",
    ]);
    for (const [, init] of fetchMock.mock.calls) {
      expect(
        ((init?.headers ?? {}) as Record<string, string>).Authorization,
      ).toBeUndefined();
    }
  });

  it("never attaches the API key to volume-history requests", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ days: [] }));
    const client = new CoinRithmClient({
      apiKey: "crk_live_secret",
      baseUrl: "https://api.example.test",
    });

    const result = await client.getPublicPmVolumeHistory();

    expect(result.ok).toBe(true);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toBe(
      "https://api.example.test/api/prediction-markets/volume-history",
    );
    const headers = (init?.headers ?? {}) as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
    expect(JSON.stringify(headers)).not.toContain("crk_live_secret");
  });
});
