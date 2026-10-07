import { describe, expect, it } from "vitest";
import { liquidationsOf, macroOf, positioningOf } from "./observe.js";

// Positioning, liquidations and macro reach every agent from the /market call
// the runner already makes (owner 2026-10-07; backend-v2 #136, #139, #137).
// Shapes follow those summaries. Context only, never a rule.

const NOW = Date.parse("2026-10-07T03:11:54.000Z");
const dated = (value: number, asOf = "2026-10-07T03:00:00.000Z") => ({
  value,
  asOf,
  stale: false,
});

describe("positioningOf", () => {
  const market = (positioning: unknown) => ({ derivatives: { positioning } });

  it("keeps each metric with its own time, including a valid zero", () => {
    expect(
      positioningOf(
        market({
          venue: "binance",
          symbol: "BTCUSDT",
          longShortAccountRatio: dated(0),
          longAccountPct: dated(56.62),
          topTraderPositionRatio: dated(1.6229),
          takerBuySellRatio: dated(1.2308, "2026-10-07T02:45:00.000Z"),
        }),
        NOW,
      ),
    ).toEqual({
      venue: "binance",
      symbol: "BTCUSDT",
      longShortAccountRatio: dated(0),
      longAccountPct: dated(56.62),
      topTraderPositionRatio: dated(1.6229),
      takerBuySellRatio: dated(1.2308, "2026-10-07T02:45:00.000Z"),
    });
  });

  it("drops malformed, negative or future-dated metrics and omits an empty block", () => {
    const out = positioningOf(
      market({
        venue: "binance",
        symbol: "BTCUSDT",
        longShortAccountRatio: dated(-1),
        longAccountPct: dated(140),
        topTraderPositionRatio: dated(1.6, "2026-10-07T05:00:00.000Z"),
        takerBuySellRatio: { value: "1.2", asOf: "2026-10-07T03:00:00Z" },
      }),
      NOW,
    );
    expect(out).toBeUndefined();
    expect(positioningOf({}, NOW)).toBeUndefined();
  });
});

describe("liquidationsOf", () => {
  const window = (over: Record<string, unknown> = {}) => ({
    longLiquidatedUsdt: 874,
    shortLiquidatedUsdt: 100,
    events: 2,
    capturedPct: 100,
    ...over,
  });
  const market = (liquidations: unknown) => ({
    derivatives: { liquidations },
  });

  it("keeps both windows with their capture coverage", () => {
    expect(
      liquidationsOf(
        market({
          venue: "okx",
          instId: "SAND-USDT-SWAP",
          last1h: window(),
          last24h: window({ capturedPct: 37.5 }),
          lastEventAt: "2026-10-07T03:10:00.000Z",
        }),
        NOW,
      ),
    ).toEqual({
      venue: "okx",
      instId: "SAND-USDT-SWAP",
      last1h: window(),
      last24h: window({ capturedPct: 37.5 }),
      lastEventAt: "2026-10-07T03:10:00.000Z",
    });
  });

  it("omits the block when a window is malformed or coverage is out of range", () => {
    expect(
      liquidationsOf(
        market({
          venue: "okx",
          instId: "SAND-USDT-SWAP",
          last1h: window({ capturedPct: 140 }),
          last24h: window(),
          lastEventAt: null,
        }),
        NOW,
      ),
    ).toBeUndefined();
    expect(
      liquidationsOf(
        market({ venue: "okx", instId: "SAND-USDT-SWAP", last1h: window() }),
        NOW,
      ),
    ).toBeUndefined();
  });

  it("requires a whole event count", () => {
    for (const events of [2.5, Number.NaN, "2"]) {
      expect(
        liquidationsOf(
          market({
            venue: "okx",
            instId: "SAND-USDT-SWAP",
            last1h: window({ events }),
            last24h: window(),
            lastEventAt: null,
          }),
          NOW,
        ),
      ).toBeUndefined();
    }
  });

  it("never shows a future lastEventAt", () => {
    expect(
      liquidationsOf(
        market({
          venue: "okx",
          instId: "SAND-USDT-SWAP",
          last1h: window(),
          last24h: window(),
          lastEventAt: "2026-10-07T09:00:00.000Z",
        }),
        NOW,
      )?.lastEventAt,
    ).toBeNull();
  });
});

describe("macroOf", () => {
  const quote = (over: Record<string, unknown> = {}) => ({
    symbol: "xyz:SP500",
    label: "S&P 500",
    kind: "index",
    price: 7822.2,
    change24hPct: 0.57,
    asOf: "2026-10-07T03:10:00.000Z",
    ageSeconds: 114,
    stale: false,
    ...over,
  });

  it("keeps well-formed quotes with the proxy note", () => {
    const out = macroOf(
      { macro: { note: "proxies, not exchange quotes", quotes: [quote()] } },
      NOW,
    );
    expect(out?.note).toMatch(/proxies/);
    expect(out?.quotes).toEqual([
      {
        symbol: "xyz:SP500",
        label: "S&P 500",
        kind: "index",
        price: 7822.2,
        change24hPct: 0.57,
        asOf: "2026-10-07T03:10:00.000Z",
        stale: false,
      },
    ]);
  });

  it("drops future-dated or unpriced quotes and omits an empty block", () => {
    expect(
      macroOf(
        {
          macro: {
            note: "proxies",
            quotes: [
              quote({ asOf: "2026-10-07T05:00:00.000Z" }),
              quote({ symbol: "xyz:GOLD", price: 0 }),
            ],
          },
        },
        NOW,
      ),
    ).toBeUndefined();
  });
});
