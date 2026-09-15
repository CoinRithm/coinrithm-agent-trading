import { describe, expect, it, vi } from "vitest";
import { observe, isCalibrationChurnMarket } from "./observe.js";
import { parseSkill } from "./skill.js";
import { renderFolderOfOne } from "./templates.js";
import { newState } from "./state.js";
import type { CoinRithmClient } from "./client.js";

const ok = (data: unknown) => ({ ok: true, status: 200, data });
const failed = () => ({ ok: false, status: 503, data: {} });
const base = parseSkill(renderFolderOfOne("fixture", "conservative")).spec;
const spec = {
  ...base,
  capabilities: [] as typeof base.capabilities,
  risk: { ...base.risk, watchlist: ["BTC"] },
};
function fixture(over: Record<string, unknown> = {}) {
  return {
    me: async () =>
      ok({ scopes: ["read", "trade:futures", "trade:pm", "trade:spot"] }),
    portfolio: async () =>
      ok({ equity: { totalUsd: 50000, availableUsd: 1000 } }),
    wallet: async () => ok({ usdt: { available: 1000 } }),
    futuresPositions: async () => ok({ positions: [] }),
    trades: async () => ok({ trades: [] }),
    resolve: async () => ok({ match: { coinId: "1" } }),
    market: async () =>
      ok({
        price: { usd: 100 },
        observation: { freshness: { status: "fresh" } },
      }),
    openOrders: async () => ok({ orders: [] }),
    pmPositions: async () => ok({ positions: [] }),
    discoverPmMarkets: async () => ok({ data: [] }),
    ...over,
  } as unknown as CoinRithmClient;
}

describe("observation tolerates incomplete data without inventing evidence", () => {
  it("stops immediately when identity cannot be read", async () => {
    const portfolio = vi.fn();
    const result = await observe(
      fixture({ me: failed, portfolio }),
      spec,
      newState("fixture"),
    );
    expect(result.skip).toBe("me failed (HTTP 503)");
    expect(result.observation.polledBeforeWrite).toBe(false);
    expect(portfolio).not.toHaveBeenCalled();
  });
  it.each([true, false])(
    "uses legacy account balances only when present (%s)",
    async (present) => {
      const result = await observe(
        fixture({
          wallet: async () => ok({}),
          portfolio: async () =>
            ok(
              present ? { equity: { availableUsd: 700 }, equityUsd: 900 } : {},
            ),
        }),
        spec,
        newState("fixture"),
      );
      expect(result.observation.cashAvailableMusd).toBe(present ? 700 : null);
      expect(result.observation.equityMusd).toBe(present ? 900 : null);
    },
  );
  it("normalizes legacy position/order ids, filters closed records and retains the old cursor", async () => {
    const state = newState("fixture");
    state.cursor = "previous";
    state.seen = ["futures:9"];
    const client = fixture({
      futuresPositions: async () =>
        ok({ positions: [{ id: "7" }, { id: 8, status: "closed" }] }),
      trades: async () => ok({ trades: [{ id: "9" }, { id: "10" }] }),
      openOrders: async () =>
        ok({ openOrders: [{ id: "11" }, { id: 12, status: "closed" }] }),
      pmPositions: async () =>
        ok({
          positions: [{ id: "13" }, { id: 14, status: "closed" }],
          recentlyResolved: [
            { id: "15", event: { title: "Resolved fixture" }, slug: "fixture" },
            { id: "invalid" },
          ],
        }),
    });
    const { observation } = await observe(
      client,
      { ...spec, venues: ["spot", "futures", "pm"] },
      state,
    );
    expect(observation.openPositions).toMatchObject([
      { id: 7, status: "open" },
    ]);
    expect(observation.openOrders).toMatchObject([{ id: 11, status: "open" }]);
    expect(observation.pmPositions).toMatchObject([{ id: 13, status: "open" }]);
    expect(observation.pmResolutions).toMatchObject([
      { id: 15, eventTitle: "Resolved fixture", slug: "fixture" },
    ]);
    expect(observation.newClosedTrades).toEqual([{ id: "10" }]);
    expect(observation.syncCursor).toBe("previous");
  });
  it("does not turn failed optional feeds into positions or candidates", async () => {
    const client = fixture({
      openOrders: failed,
      pmPositions: failed,
      discoverPmMarkets: failed,
    });
    const { observation } = await observe(
      client,
      {
        ...spec,
        venues: ["spot", "futures", "pm"],
        risk: { ...spec.risk, watchlist: ["ETH"] },
      },
      newState("fixture"),
    );
    expect(observation.openOrders).toEqual([]);
    expect(observation.pmPositions).toEqual([]);
    expect(observation.pmMarkets).toEqual([]);
  });
  it.each(
    [
      [],
      [{ o: null, h: 1, l: 1, c: 1 }],
      [{ o: 1, h: null, l: 1, c: 1 }],
      [{ o: 1, h: 1, l: null, c: 1 }],
      [{ o: 1, h: 1, l: 1, c: null }],
      [{ o: 1, h: 2, l: 1, c: 2 }],
      [{ o: 1, h: 2, l: 1, c: 2, v: 0 }],
    ].map((candles) => ({ candles })),
  )(
    "keeps sparse or incomplete candles as unknown indicators ($candles)",
    async ({ candles }) => {
      const { observation } = await observe(
        fixture({ candles: async () => ok({ candles }) }),
        { ...spec, capabilities: ["indicators"] },
        newState("fixture"),
      );
      expect(observation.watch[0]!.indicators?.rsi14 ?? null).toBeNull();
      expect(observation.watch[0]!.indicators?.ema50 ?? null).toBeNull();
      expect(observation.watch[0]!.volume24hUsd).toBeUndefined();
    },
  );
  it.each([false, true])(
    "handles mixed mover data and failed symbol resolution (indicators=%s)",
    async (indicators) => {
      const rows = [
        { symbol: "ONE", ucid: "2", change24h: 4, currentPrice: 9 },
        { symbol: "TWO", ucid: "3", change24h: Infinity, currentPrice: NaN },
        { symbol: "THREE", ucid: "4", change24h: "unknown", currentPrice: " " },
        { symbol: "FOUR", ucid: "5", change24h: null },
        { symbol: "UNKNOWN", change24h: false },
        { symbol: "FIVE", ucid: "6", change24h: "5", currentPrice: "9" },
        {},
        { symbol: "TAIL" },
      ];
      const candles = vi.fn(async () => ok({ candles: [] }));
      const client = fixture({
        cryptoMovers: async () => ok(rows),
        resolve: async (q: string) =>
          q === "UNKNOWN" ? failed() : ok({ match: { coinId: "1" } }),
        market: async () => ok({ fearGreed: { value: 0 } }),
        candles,
      });
      const { observation } = await observe(
        client,
        {
          ...spec,
          capabilities: indicators
            ? ["universe_scan", "indicators"]
            : ["universe_scan"],
          risk: { ...spec.risk, blocklist: undefined },
        },
        newState("fixture"),
      );
      expect(observation.watch.map((w) => w.symbol)).toEqual([
        "BTC",
        "ONE",
        "TWO",
        "THREE",
        "FOUR",
        "FIVE",
      ]);
      expect(observation.watch.find((w) => w.symbol === "ONE")).toMatchObject({
        priceUsd: 9,
        change24h: 4,
      });
      expect(
        observation.watch.find((w) => w.symbol === "TWO")!.priceUsd,
      ).toBeUndefined();
      expect(observation.universeMovers).toMatchObject([{ symbol: "TAIL" }]);
      expect(observation.marketMood).toEqual({ fearGreed: 0, label: "" });
      expect(candles).toHaveBeenCalledTimes(indicators ? 6 : 0);
    },
  );
  it.each(["markets", "results"])(
    "accepts legacy %s discovery while excluding incomplete identities",
    async (field) => {
      const rows = [
        {
          source: "polymarket",
          slug: "fixture",
          question: "Fixture question",
          outcomeExternalMarketId: "yes",
          probability: 50,
        },
        { slug: "missing-source", externalMarketId: "yes", probability: 50 },
        { source: "polymarket", externalMarketId: "yes", probability: 50 },
        { source: "polymarket", slug: "missing-outcome", probability: 50 },
      ];
      const { observation } = await observe(
        fixture({ discoverPmMarkets: async () => ok({ [field]: rows }) }),
        { ...spec, venues: ["pm"], risk: { ...spec.risk, watchlist: [] } },
        newState("fixture"),
      );
      expect(observation.pmMarkets).toMatchObject([
        {
          source: "polymarket",
          slug: "fixture",
          title: "Fixture question",
          outcomeExternalMarketId: "yes",
          probability: 0.5,
        },
      ]);
    },
  );
  it("supports a ticker outside the built-in name map without inventing untitled matches", async () => {
    const discoverPmMarkets = vi.fn(async () =>
      ok({
        data: [
          {
            source: "polymarket",
            slug: "fixture",
            externalMarketId: "yes",
            probability: 50,
          },
          {
            source: "polymarket",
            slug: "other",
            externalMarketId: "yes",
            probability: 50,
          },
          {
            source: "polymarket",
            slug: "third",
            externalMarketId: "yes",
            probability: 50,
          },
        ],
      }),
    );
    await observe(
      fixture({ discoverPmMarkets }),
      { ...spec, venues: ["pm"], risk: { ...spec.risk, watchlist: ["XYZ"] } },
      newState("fixture"),
    );
    expect(discoverPmMarkets).toHaveBeenCalledTimes(2);
    expect(isCalibrationChurnMarket({})).toBe(false);
  });
});
