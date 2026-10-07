import { describe, expect, it } from "vitest";
import { chainTvlOf, stablecoinSupplyOf } from "./observe.js";

// DeFi context reaches every agent from the /market call the runner already
// makes (backend-v2 #147). Shapes follow that summary. Context only.

const NOW = Date.parse("2026-10-07T06:10:00.000Z");
const market = (defi: unknown) => ({ defi });

describe("chainTvlOf", () => {
  const block = (over: Record<string, unknown> = {}) => ({
    chain: "Ethereum",
    tvlUsd: 52951000000,
    publishedAt: "2026-10-07T05:02:21.000Z",
    fetchedAt: "2026-10-07T05:17:41.000Z",
    sourceObservedAt: null,
    stale: false,
    dayAt: "2026-10-07T00:00:00.000Z",
    change1dPct: 1.65,
    change7dPct: 5.72,
    note: "not the coin's market value",
    ...over,
  });

  it("keeps chain TVL with publication and daily-point dates, observation unknown", () => {
    expect(chainTvlOf(market({ chainTvl: block() }), NOW)).toEqual({
      chain: "Ethereum",
      tvlUsd: 52951000000,
      publishedAt: "2026-10-07T05:02:21.000Z",
      fetchedAt: "2026-10-07T05:17:41.000Z",
      sourceObservedAt: null,
      stale: false,
      dayAt: "2026-10-07T00:00:00.000Z",
      change1dPct: 1.65,
      change7dPct: 5.72,
    });
  });

  it("an unknown or future time is never fresh; no daily point means no changes", () => {
    expect(
      chainTvlOf(market({ chainTvl: block({ publishedAt: null }) }), NOW),
    ).toMatchObject({ publishedAt: null, stale: true });
    expect(
      chainTvlOf(
        market({
          chainTvl: block({ publishedAt: "2026-10-07T09:00:00.000Z" }),
        }),
        NOW,
      ),
    ).toMatchObject({ publishedAt: null, stale: true });
    expect(
      chainTvlOf(market({ chainTvl: block({ dayAt: null }) }), NOW),
    ).toMatchObject({ dayAt: null, change1dPct: null, change7dPct: null });
  });

  it("keeps our collection clock apart and never shows a future one", () => {
    expect(
      chainTvlOf(
        market({ chainTvl: block({ fetchedAt: "2026-10-07T09:00:00.000Z" }) }),
        NOW,
      ),
    ).toMatchObject({
      fetchedAt: null,
      publishedAt: "2026-10-07T05:02:21.000Z",
    });
    expect(
      chainTvlOf(market({ chainTvl: block({ fetchedAt: null }) }), NOW),
    ).toMatchObject({ fetchedAt: null, sourceObservedAt: null });
  });

  it("omits a missing or malformed block", () => {
    expect(chainTvlOf({}, NOW)).toBeUndefined();
    expect(chainTvlOf(market({ chainTvl: null }), NOW)).toBeUndefined();
    expect(
      chainTvlOf(market({ chainTvl: block({ tvlUsd: -1 }) }), NOW),
    ).toBeUndefined();
  });
});

describe("stablecoinSupplyOf", () => {
  it("keeps market-wide supply dated by its daily point", () => {
    expect(
      stablecoinSupplyOf(
        market({
          stablecoinSupply: {
            totalUsd: 312e9,
            dayAt: "2026-10-07T00:00:00.000Z",
            change1dPct: 0.32,
            change7dPct: 4,
            stale: false,
          },
        }),
        NOW,
      ),
    ).toEqual({
      totalUsd: 312e9,
      dayAt: "2026-10-07T00:00:00.000Z",
      change1dPct: 0.32,
      change7dPct: 4,
      stale: false,
    });
  });

  it("omits a future-dated or malformed block", () => {
    expect(
      stablecoinSupplyOf(
        market({
          stablecoinSupply: { totalUsd: 1, dayAt: "2026-10-08T00:00:00.000Z" },
        }),
        NOW,
      ),
    ).toBeUndefined();
    expect(stablecoinSupplyOf(market(null), NOW)).toBeUndefined();
  });
});
