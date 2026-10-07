import { describe, expect, it, vi } from "vitest";
import { fundingByVenueOf, observe } from "./observe.js";
import { buildSystemPrompt } from "./prompt.js";
import { parseSkill } from "./skill.js";
import { renderFolderOfOne } from "./templates.js";
import { newState } from "./state.js";
import type { CoinRithmClient } from "./client.js";
const NOW = Date.parse("2026-10-07T19:10:00Z");
const rate = (over = {}) => ({
  role: "context_only",
  venue: "hyperliquid",
  symbol: "BTC",
  source: "hyperliquid_predicted_fundings",
  rateFraction: 0.0000125,
  intervalHours: 1,
  hourlyEquivalentFraction: 0.0000125,
  nextFundingTime: "2026-10-07T20:00:00Z",
  fetchedAt: "2026-10-07T19:00:09.693Z",
  sourceAt: null,
  stale: false,
  freshnessBasis: "collection_time",
  ...over,
});
const market = (rates: unknown[] = [rate()]) => ({
  derivatives: {
    fundingByVenue: { rates, sameTime: false, note: "Independent clocks" },
  },
});
describe("fundingByVenueOf", () => {
  it("keeps raw fractions, unknown source time and independently aged reference", () => {
    const out = fundingByVenueOf(
      market([
        rate({
          role: "settlement_reference",
          venue: "binance",
          symbol: "BTCUSDT",
          source: "paper_futures_reference",
          rateFraction: 0.0001,
          intervalHours: 8,
          fetchedAt: "2026-10-07T18:30:00Z",
        }),
        rate(),
      ]),
      NOW,
    )!;
    expect(out.sameTime).toBe(false);
    expect(out.rates[0]).toMatchObject({
      hourlyEquivalentFraction: 0.0000125,
      ageSeconds: 2400,
      stale: true,
    });
    expect(out.rates[1]).toMatchObject({
      rateFraction: 0.0000125,
      sourceAt: null,
      ageSeconds: 590,
      stale: false,
    });
  });
  it("preserves zero, recomputes normalization and leaves unknown intervals null", () => {
    expect(
      fundingByVenueOf(
        market([rate({ rateFraction: 0, hourlyEquivalentFraction: 99 })]),
        NOW,
      )!.rates[0].hourlyEquivalentFraction,
    ).toBe(0);
    const out = fundingByVenueOf(
      market([
        rate({
          role: "settlement_reference",
          venue: "gate",
          source: "paper_futures_reference",
          intervalHours: null,
        }),
        rate(),
      ]),
      NOW,
    )!;
    expect(out.rates[0].hourlyEquivalentFraction).toBeNull();
  });
  it.each([
    { rateFraction: NaN },
    { intervalHours: 8 },
    { sourceAt: "2026-10-07T19:00:00Z" },
    { source: "invented" },
    { venue: "other" },
    { fetchedAt: "2026-10-07T19:12:00Z" },
  ])("omits unusable context %j", (over) =>
    expect(fundingByVenueOf(market([rate(over)]), NOW)).toBeUndefined(),
  );
  it("omits absent, duplicate and unbounded context; nulls rolled next time", () => {
    expect(fundingByVenueOf({}, NOW)).toBeUndefined();
    expect(fundingByVenueOf(market([rate(), rate()]), NOW)).toBeUndefined();
    expect(
      fundingByVenueOf(market([rate(), rate(), rate()]), NOW),
    ).toBeUndefined();
    expect(
      fundingByVenueOf(
        market([rate({ nextFundingTime: "2026-10-07T19:00:00Z" })]),
        NOW,
      )!.rates[0].nextFundingTime,
    ).toBeNull();
    expect(
      fundingByVenueOf(market([rate({ stale: undefined })]), NOW)!.rates[0]
        .stale,
    ).toBe(true);
  });
});

describe("funding context reaches watch and discovered observations without extra requests", () => {
  const ok = (data: unknown) => ({ ok: true, status: 200, data });
  const base = parseSkill(renderFolderOfOne("fixture", "conservative")).spec;
  const spec = {
    ...base,
    capabilities: ["universe_scan"] as typeof base.capabilities,
    risk: { ...base.risk, watchlist: ["BTC"] },
  };
  const client = (data: unknown) => ({
    me: async () =>
      ok({ scopes: ["read", "trade:futures", "trade:pm", "trade:spot"] }),
    portfolio: async () =>
      ok({ equity: { totalUsd: 50000, availableUsd: 1000 } }),
    wallet: async () => ok({ usdt: { available: 1000 } }),
    futuresPositions: async () => ok({ positions: [] }),
    trades: async () => ok({ trades: [] }),
    resolve: async () => ok({ match: { coinId: "1" } }),
    market: vi.fn(async () => ok(data)),
    cryptoMovers: async () =>
      ok([
        { symbol: "ETH", ucid: "1027", currentPrice: "3000", change24h: "1" },
      ]),
    openOrders: async () => ok({ orders: [] }),
    pmPositions: async () => ok({ positions: [] }),
    discoverPmMarkets: async () => ok({ data: [] }),
  });
  it("carries the context through both builders and labels its prompt semantics", async () => {
    const api = client({ price: { usd: 100 }, ...market() });
    const { observation } = await observe(
      api as unknown as CoinRithmClient,
      spec,
      newState("fixture"),
    );
    expect(observation.watch).toHaveLength(2);
    expect(
      observation.watch.every(
        (w) => w.fundingByVenue?.rates[0]?.rateFraction === 0.0000125,
      ),
    ).toBe(true);
    expect(observation.watch[1].discovered).toBe(true);
    expect(api.market).toHaveBeenCalledTimes(2);
    expect(buildSystemPrompt(spec, "body")).toContain(
      "not realized performance, APR or forecast return",
    );
  });
  it("preserves old observation shape when the field is absent", async () => {
    const { observation } = await observe(
      client({ price: { usd: 100 } }) as unknown as CoinRithmClient,
      spec,
      newState("fixture"),
    );
    for (const w of observation.watch)
      expect(w).not.toHaveProperty("fundingByVenue");
  });
});
