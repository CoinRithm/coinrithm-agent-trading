import { describe, it, expect } from "vitest";
import {
  sma,
  ema,
  rsi,
  atr,
  bollinger,
  recentHighLow,
  computeIndicators,
  type Candle,
} from "./indicators.js";

const flatCandle = (close: number, spread = 5): Candle => ({
  open: close,
  high: close + spread,
  low: close - spread,
  close,
});

describe("sma / ema", () => {
  it("sma is the mean of the last `period`", () => {
    expect(sma([1, 2, 3, 4, 5], 5)).toBe(3);
    expect(sma([10, 10, 1, 2, 3], 3)).toBe(2);
  });
  it("returns null with too few values", () => {
    expect(sma([1, 2], 5)).toBeNull();
    expect(ema([1, 2], 5)).toBeNull();
  });
  it("ema of a constant series is that constant", () => {
    expect(ema([5, 5, 5, 5, 5, 5], 3)).toBe(5);
  });
  it("ema reacts faster than sma to a recent jump", () => {
    // 20 bars at 10, then a jump to 20: EMA weights the newest bar (2/(n+1))
    // more than SMA (1/n), so it sits above the SMA right after the jump.
    const series = [...Array(20).fill(10), 20];
    expect(ema(series, 10)!).toBeGreaterThan(sma(series, 10)!);
  });
});

describe("rsi (Wilder)", () => {
  it("is 100 for a monotonically rising series", () => {
    expect(
      rsi(
        Array.from({ length: 15 }, (_, i) => i + 1),
        14,
      ),
    ).toBe(100);
  });
  it("is 0 for a monotonically falling series", () => {
    expect(
      rsi(
        Array.from({ length: 15 }, (_, i) => 15 - i),
        14,
      ),
    ).toBe(0);
  });
  it("is 50 for a flat series", () => {
    expect(rsi(Array(15).fill(100), 14)).toBe(50);
  });
  it("returns null with fewer than period+1 closes", () => {
    expect(rsi(Array(14).fill(1), 14)).toBeNull();
  });
});

describe("atr (Wilder)", () => {
  it("equals the constant true range", () => {
    // close=100, high=105, low=95 -> TR = max(10, 5, 5) = 10 every bar.
    const candles = Array.from({ length: 20 }, () => flatCandle(100, 5));
    expect(atr(candles, 14)).toBe(10);
  });
  it("returns null with too few candles", () => {
    expect(
      atr(
        Array.from({ length: 10 }, () => flatCandle(100)),
        14,
      ),
    ).toBeNull();
  });
});

describe("bollinger", () => {
  it("collapses to the value on a constant series (sd=0)", () => {
    const bb = bollinger(Array(20).fill(100), 20, 2);
    expect(bb).toEqual({ upper: 100, mid: 100, lower: 100 });
  });
  it("brackets the mean with ±mult·sd", () => {
    const bb = bollinger([1, 2, 3, 4, 5], 5, 2)!;
    expect(bb.mid).toBe(3);
    expect(bb.upper).toBeGreaterThan(bb.mid);
    expect(bb.lower).toBeLessThan(bb.mid);
  });
});

describe("recentHighLow", () => {
  it("finds the highest high and lowest low in the lookback", () => {
    const candles: Candle[] = [
      { open: 1, high: 12, low: 8, close: 10 },
      { open: 1, high: 20, low: 5, close: 15 },
      { open: 1, high: 18, low: 9, close: 14 },
    ];
    expect(recentHighLow(candles, 3)).toEqual({ high: 20, low: 5 });
  });
});

describe("computeIndicators", () => {
  // 60 flat candles around 100, then a candle closing at a new high -> breakout.
  const base = Array.from({ length: 60 }, () => flatCandle(100, 5));
  const breakout: Candle = { open: 100, high: 112, low: 100, close: 111 };
  const series = [...base, breakout];

  it("returns the compact bundle with derived flags", () => {
    const ind = computeIndicators(series)!;
    expect(ind.asOfClose).toBe(111);
    expect(ind.rsi14).not.toBeNull();
    expect(ind.ema20).not.toBeNull();
    expect(ind.ema50).not.toBeNull();
    expect(ind.atr14).not.toBeNull();
    expect(ind.bollinger).not.toBeNull();
    // close 111 is above the prior-20 high (~105) -> breakout true.
    expect(ind.brokeRecentHigh).toBe(true);
    expect(ind.brokeRecentLow).toBe(false);
    expect(ind.aboveEma20).toBe(true);
  });

  it("returns null on empty input", () => {
    expect(computeIndicators([])).toBeNull();
  });

  it("leaves long-window indicators null when there is too little data", () => {
    const ind = computeIndicators([
      ...Array.from({ length: 15 }, () => flatCandle(100)),
    ])!;
    expect(ind.ema50).toBeNull();
    expect(ind.ema20AboveEma50).toBeNull(); // depends on ema50
    expect(ind.rsi14).not.toBeNull(); // 15 candles is enough for rsi14
  });
});
