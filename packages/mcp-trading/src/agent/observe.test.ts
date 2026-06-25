import { describe, it, expect } from "vitest";
import { observe } from "./observe.js";
import { parseSkill } from "./skill.js";
import { renderFolderOfOne } from "./templates.js";
import { newState } from "./state.js";
import { CoinRithmClient } from "./client.js";

const okData = (data: unknown) => ({ ok: true, status: 200, data });
const spec = parseSkill(renderFolderOfOne("a", "conservative")).spec;

function fakeClient(over: Record<string, unknown> = {}): CoinRithmClient {
  return {
    me: async () => okData({ scopes: ["trade:futures"] }),
    portfolio: async () =>
      okData({ equity: { totalUsd: 50000, availableUsd: 1000 } }),
    wallet: async () => okData({ usdt: { available: 1000 } }),
    futuresPositions: async () => okData({ positions: [] }),
    trades: async () => okData({ asOf: "T1", trades: [] }),
    resolve: async (q: string) => okData({ match: { coinId: "1", name: q } }),
    market: async () =>
      okData({
        price: { usd: 67000 },
        observation: { freshness: { status: "fresh" } },
      }),
    ...over,
  } as unknown as CoinRithmClient;
}

describe("observe", () => {
  it("records poll-before-write after /trades succeeds", async () => {
    const { observation, skip } = await observe(
      fakeClient(),
      spec,
      newState("r"),
    );
    expect(skip).toBeUndefined();
    expect(observation.polledBeforeWrite).toBe(true);
    expect(observation.watch.length).toBeGreaterThan(0);
  });

  it("skips when no watchlist symbol resolves", async () => {
    const c = fakeClient({ resolve: async () => okData({}) });
    const { skip } = await observe(c, spec, newState("r"));
    expect(skip).toMatch(/no watchlist coin resolved/);
  });

  it("skips when a required read fails", async () => {
    const c = fakeClient({
      portfolio: async () => ({ ok: false, status: 403, data: {} }),
    });
    const { skip } = await observe(c, spec, newState("r"));
    expect(skip).toMatch(/required reads failed/);
  });

  it("does not set poll-before-write when /trades fails", async () => {
    const c = fakeClient({
      trades: async () => ({ ok: false, status: 500, data: {} }),
    });
    const { observation, skip } = await observe(c, spec, newState("r"));
    expect(observation.polledBeforeWrite).toBe(false);
    expect(skip).toMatch(/poll-before-write/);
  });

  it("expands discovered PM markets from the real data[].outcomes[] shape", async () => {
    // REAL /api/agent/pm/discover payload: { data: [event] }, source/slug/freshness
    // at the event level, the quoteable id nested at outcomes[].externalMarketId.
    const pmSpec = {
      ...spec,
      venues: ["pm", "futures"] as ("spot" | "futures" | "pm")[],
    };
    const c = fakeClient({
      pmPositions: async () => okData({ positions: [] }),
      discoverPmMarkets: async () =>
        okData({
          data: [
            {
              source: "Kalshi", // mixed case -> lowercased
              slug: "BTC-UP",
              title: "BTC up?",
              freshness: { status: "fresh" },
              outcomes: [
                { externalMarketId: "yes-1", name: "Yes" },
                { externalMarketId: "no-1", name: "No" },
              ],
            },
          ],
        }),
    });
    const { observation } = await observe(c, pmSpec, newState("r"));
    expect(observation.pmMarkets.length).toBe(2); // one row per quoteable outcome
    expect(observation.pmMarkets[0]).toMatchObject({
      source: "kalshi",
      slug: "btc-up",
      outcomeExternalMarketId: "yes-1",
    });
    expect(
      observation.pmMarkets.every((m) => m.outcomeExternalMarketId.length > 0),
    ).toBe(true);
  });

  it("drops outcomes the backend flagged not-openable (eligible === false) and stamps contiguous refs", async () => {
    const pmSpec = {
      ...spec,
      venues: ["pm", "futures"] as ("spot" | "futures" | "pm")[],
    };
    const c = fakeClient({
      pmPositions: async () => okData({ positions: [] }),
      discoverPmMarkets: async () =>
        okData({
          data: [
            {
              source: "polymarket",
              slug: "btc-bucket",
              title: "BTC price bucket",
              freshness: { status: "fresh" },
              eligible: true,
              outcomes: [
                { externalMarketId: "a", name: "60-65k", probability: 40, eligible: true },
                { externalMarketId: "b", name: "65-70k", probability: 35, eligible: true },
                { externalMarketId: "z", name: "0% tail", probability: 0, eligible: false },
              ],
            },
          ],
        }),
    });
    const { observation } = await observe(c, pmSpec, newState("r"));
    // The eligible:false outcome is dropped; the two openable ones remain.
    expect(observation.pmMarkets.length).toBe(2);
    expect(
      observation.pmMarkets.some((m) => m.outcomeExternalMarketId === "z"),
    ).toBe(false);
    // Refs are contiguous pm1..pmN over the surviving rows.
    expect(observation.pmMarkets.map((m) => m.ref)).toEqual(["pm1", "pm2"]);
  });

  // ── news capability ─────────────────────────────────────────────────────────
  it("fetches and compacts watchlist news when the `news` capability is set", async () => {
    const newsSpec = {
      ...spec,
      capabilities: [...spec.capabilities, "news"] as typeof spec.capabilities,
    };
    let calledWith: { coins?: string } | null = null;
    const c = fakeClient({
      agentNews: async (q: { coins?: string }) => {
        calledWith = q;
        return okData({
          coins: ["bitcoin"],
          items: [
            {
              title: "BTC ETF inflows hit record",
              source: "Coindesk",
              sentiment: "bullish",
              importance: 9,
              ageMinutes: 30,
              coins: ["bitcoin"],
            },
          ],
        });
      },
    });
    const { observation } = await observe(c, newsSpec, newState("r"));
    expect(calledWith).not.toBeNull();
    expect(typeof (calledWith as { coins?: string } | null)?.coins).toBe(
      "string",
    );
    expect(observation.news?.length).toBe(1);
    expect(observation.news?.[0]).toMatchObject({
      title: "BTC ETF inflows hit record",
      sentiment: "bullish",
      importance: 9,
      ageHours: 0.5,
    });
  });

  it("does not fetch news without the `news` capability", async () => {
    let called = false;
    const c = fakeClient({
      agentNews: async () => {
        called = true;
        return okData({ items: [] });
      },
    });
    const { observation } = await observe(c, spec, newState("r"));
    expect(called).toBe(false);
    expect(observation.news).toBeUndefined();
  });

  // ── indicators capability ──────────────────────────────────────────────────
  const candlesPayload = (n: number) => {
    const candles = [];
    for (let i = 0; i < n; i++) {
      const base = 60000 + i * 10;
      candles.push({
        t: 1700000000 + i * 300,
        o: base,
        h: base + 50,
        l: base - 50,
        c: base + 20,
        v: 1000,
      });
    }
    return { candles };
  };
  const indicators = ["indicators"] as ("websearch" | "indicators")[];

  it("attaches computed indicators when the agent declares the capability", async () => {
    let candleCalls = 0;
    const c = fakeClient({
      candles: async () => {
        candleCalls++;
        return okData(candlesPayload(60));
      },
    });
    const { observation } = await observe(
      c,
      { ...spec, capabilities: indicators },
      newState("r"),
    );
    expect(candleCalls).toBeGreaterThan(0);
    const entry = observation.watch.find((w) => w.coinId);
    expect(entry?.indicators).toBeDefined();
    expect(typeof entry?.indicators?.asOfClose).toBe("number");
    expect(typeof entry?.indicators?.rsi14).toBe("number");
    expect(typeof entry?.indicators?.aboveEma20).toBe("boolean");
  });

  it("does NOT fetch candles when the capability is absent", async () => {
    let candleCalls = 0;
    const c = fakeClient({
      candles: async () => {
        candleCalls++;
        return okData(candlesPayload(60));
      },
    });
    const { observation } = await observe(
      c,
      { ...spec, capabilities: [] },
      newState("r"),
    );
    expect(candleCalls).toBe(0);
    expect(observation.watch.find((w) => w.coinId)?.indicators).toBeUndefined();
  });

  it("tolerates a failed candle fetch — omits indicators, cycle proceeds", async () => {
    const c = fakeClient({
      candles: async () => ({ ok: false, status: 500, data: {} }),
    });
    const { observation, skip } = await observe(
      c,
      { ...spec, capabilities: indicators },
      newState("r"),
    );
    expect(skip).toBeUndefined();
    expect(observation.watch.find((w) => w.coinId)?.indicators).toBeUndefined();
  });
});
