import { describe, it, expect } from "vitest";
import { scanSetups } from "./setups.js";
import { WatchEntry } from "./types.js";
import { IndicatorSet } from "./indicators.js";

function ind(partial: Partial<IndicatorSet>): IndicatorSet {
  return {
    asOfClose: 100,
    rsi14: 50,
    ema20: 100,
    ema50: 100,
    atr14: 2,
    bollinger: null,
    recent20: null,
    aboveEma20: null,
    ema20AboveEma50: null,
    brokeRecentHigh: null,
    brokeRecentLow: null,
    ...partial,
  };
}

function entry(symbol: string, change24h: number, i: Partial<IndicatorSet>): WatchEntry {
  return { symbol, coinId: symbol.toLowerCase(), change24h, indicators: ind(i) };
}

describe("scanSetups", () => {
  it("flags a clean downtrend as a short", () => {
    const out = scanSetups([
      entry("ETH", -3.6, { aboveEma20: false, ema20AboveEma50: false, rsi14: 34 }),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]!.kind).toBe("downtrend");
    expect(out[0]!.bias).toBe("short");
    expect(out[0]!.note).toContain("downtrend");
  });

  it("flags a breakout as a long with high strength", () => {
    const out = scanSetups([
      entry("SOL", 5, { aboveEma20: true, ema20AboveEma50: true, brokeRecentHigh: true, rsi14: 62 }),
    ]);
    expect(out[0]!.kind).toBe("breakout");
    expect(out[0]!.bias).toBe("long");
    expect(out[0]!.strength).toBeGreaterThanOrEqual(0.8);
  });

  it("flags an oversold-but-flat coin as a fade-long", () => {
    const out = scanSetups([
      entry("ADA", -0.3, { rsi14: 30, aboveEma20: null, ema20AboveEma50: null }),
    ]);
    expect(out[0]!.kind).toBe("stretched");
    expect(out[0]!.bias).toBe("fade-long");
  });

  it("does NOT flag a genuinely flat, mid-RSI coin", () => {
    const out = scanSetups([
      entry("XRP", 0.2, { rsi14: 51, aboveEma20: null, ema20AboveEma50: null }),
    ]);
    expect(out).toHaveLength(0);
  });

  it("skips entries with no indicators", () => {
    expect(scanSetups([{ symbol: "BTC", coinId: "btc", change24h: -3 }])).toHaveLength(0);
  });

  it("sorts strongest-first across the watchlist", () => {
    const out = scanSetups([
      entry("ADA", -0.3, { rsi14: 30 }), // stretched ~0.55
      entry("SOL", 5, { aboveEma20: true, ema20AboveEma50: true, brokeRecentHigh: true }), // breakout 0.8
    ]);
    expect(out[0]!.symbol).toBe("SOL");
    expect(out[0]!.strength).toBeGreaterThan(out[1]!.strength);
  });
});
