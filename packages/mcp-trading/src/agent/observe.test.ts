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
    portfolio: async () => okData({ equity: { totalUsd: 50000, availableUsd: 1000 } }),
    wallet: async () => okData({ usdt: { available: 1000 } }),
    futuresPositions: async () => okData({ positions: [] }),
    trades: async () => okData({ asOf: "T1", trades: [] }),
    resolve: async (q: string) => okData({ match: { coinId: "1", name: q } }),
    market: async () => okData({ price: { usd: 67000 }, observation: { freshness: { status: "fresh" } } }),
    ...over,
  } as unknown as CoinRithmClient;
}

describe("observe", () => {
  it("records poll-before-write after /trades succeeds", async () => {
    const { observation, skip } = await observe(fakeClient(), spec, newState("r"));
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
    const c = fakeClient({ portfolio: async () => ({ ok: false, status: 403, data: {} }) });
    const { skip } = await observe(c, spec, newState("r"));
    expect(skip).toMatch(/required reads failed/);
  });

  it("does not set poll-before-write when /trades fails", async () => {
    const c = fakeClient({ trades: async () => ({ ok: false, status: 500, data: {} }) });
    const { observation, skip } = await observe(c, spec, newState("r"));
    expect(observation.polledBeforeWrite).toBe(false);
    expect(skip).toMatch(/poll-before-write/);
  });

  it("expands discovered PM markets from the real data[].outcomes[] shape", async () => {
    // REAL /api/agent/pm/discover payload: { data: [event] }, source/slug/freshness
    // at the event level, the quoteable id nested at outcomes[].externalMarketId.
    const pmSpec = { ...spec, venues: ["pm", "futures"] as ("spot" | "futures" | "pm")[] };
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
    expect(observation.pmMarkets.every((m) => m.outcomeExternalMarketId.length > 0)).toBe(true);
  });
});
