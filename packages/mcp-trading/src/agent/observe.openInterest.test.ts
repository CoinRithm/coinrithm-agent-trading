import { describe, expect, it } from "vitest";
import { observe, openInterestOf } from "./observe.js";
import { buildSystemPrompt } from "./prompt.js";
import { parseSkill } from "./skill.js";
import { renderFolderOfOne } from "./templates.js";
import { newState } from "./state.js";
import type { CoinRithmClient } from "./client.js";

// Perpetual open interest reaches every agent (owner 2026-10-07; Data's
// backend-v2 #133 adds derivatives.openInterest to GET /api/agent/market).
// It is context only, read from the /market call the runner already makes.

// Shape served by backend-v2 #133 (summarizeOpenInterest).
const block = {
  totalUsd: 2_200_000_000,
  change1hPct: 1.25,
  change24hPct: -3.4,
  venues: [
    { venue: "bybit", symbol: "BTCUSDT", openInterestUsd: 1_200_000_000 },
  ],
  asOf: "2026-10-07T02:45:00.000Z",
  ageSeconds: 300,
  stale: false,
};

describe("openInterestOf", () => {
  it("keeps the compact fields and drops the venue breakdown", () => {
    expect(openInterestOf({ derivatives: { openInterest: block } })).toEqual({
      totalUsd: 2_200_000_000,
      change1hPct: 1.25,
      change24hPct: -3.4,
      asOf: "2026-10-07T02:45:00.000Z",
      stale: false,
    });
  });

  it("keeps an unknown change as null and the stale flag", () => {
    expect(
      openInterestOf({
        derivatives: {
          openInterest: { ...block, change24hPct: null, stale: true },
        },
      }),
    ).toMatchObject({ change24hPct: null, stale: true });
  });

  it.each([
    [{}],
    [{ derivatives: { openInterest: null } }],
    [{ derivatives: { openInterest: { ...block, totalUsd: 0 } } }],
    [{ derivatives: { openInterest: { ...block, asOf: undefined } } }],
    [{ derivatives: { openInterest: { ...block, totalUsd: "lots" } } }],
  ])("omits a missing or malformed block %#", (m) => {
    expect(openInterestOf(m as Record<string, unknown>)).toBeUndefined();
  });
});

describe("observe carries open interest on watch entries", () => {
  const ok = (data: unknown) => ({ ok: true, status: 200, data });
  const base = parseSkill(renderFolderOfOne("fixture", "conservative")).spec;
  const spec = {
    ...base,
    capabilities: [] as typeof base.capabilities,
    risk: { ...base.risk, watchlist: ["BTC"] },
  };
  const client = (market: unknown) =>
    ({
      me: async () =>
        ok({ scopes: ["read", "trade:futures", "trade:pm", "trade:spot"] }),
      portfolio: async () =>
        ok({ equity: { totalUsd: 50000, availableUsd: 1000 } }),
      wallet: async () => ok({ usdt: { available: 1000 } }),
      futuresPositions: async () => ok({ positions: [] }),
      trades: async () => ok({ trades: [] }),
      resolve: async () => ok({ match: { coinId: "1" } }),
      market: async () => ok(market),
      openOrders: async () => ok({ orders: [] }),
      pmPositions: async () => ok({ positions: [] }),
      discoverPmMarkets: async () => ok({ data: [] }),
    }) as unknown as CoinRithmClient;

  it("adds openInterest when the API serves it, without an extra call", async () => {
    const { observation } = await observe(
      client({
        price: { usd: 100 },
        observation: { freshness: { status: "fresh" } },
        derivatives: { openInterest: block },
      }),
      spec,
      newState("fixture"),
    );
    expect(observation.watch[0]!.openInterest).toMatchObject({
      totalUsd: 2_200_000_000,
      change1hPct: 1.25,
    });
  });

  it("an older API without the block leaves the entry unchanged", async () => {
    const { observation } = await observe(
      client({
        price: { usd: 100 },
        observation: { freshness: { status: "fresh" } },
      }),
      spec,
      newState("fixture"),
    );
    expect(observation.watch[0]).not.toHaveProperty("openInterest");
  });

  it("the prompt tells coin-venue agents how to read it", () => {
    expect(buildSystemPrompt(spec, "body")).toContain(
      "price up and open interest down means shorts are closing",
    );
  });
});
