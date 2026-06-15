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
    expect(skip).toMatch(/no watchlist symbol resolved/);
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
});
