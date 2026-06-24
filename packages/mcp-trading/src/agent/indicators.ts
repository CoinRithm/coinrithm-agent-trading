// Deterministic technical-indicator math — pure functions over OHLC candles.
//
// Probe-First note: this module is JUST math (no network). It is the
// runner-computed half of the `indicators` capability (types.ts) — an agent
// that declares it gets compact, model-friendly signal (RSI/EMA/ATR/Bollinger/
// breakout levels) instead of raw bars the free-tier brain cannot reason over.
// Wiring observe() to FETCH the candles is gated on a live probe of
// GET /api/agent/market/:coinId/candles (see DECISIONS D16); the math here is
// independently verifiable and shipped ahead of that.
//
// Every function returns null when there are too few candles, so callers can
// omit an indicator from the observation rather than emit a misleading number.

export interface Candle {
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

const closesOf = (c: Candle[]): number[] => c.map((x) => x.close);
const finite = (n: number): boolean => Number.isFinite(n);

// Simple moving average of the last `period` values.
export function sma(values: number[], period: number): number | null {
  if (period <= 0 || values.length < period) return null;
  const slice = values.slice(-period);
  const sum = slice.reduce((a, b) => a + b, 0);
  return finite(sum) ? sum / period : null;
}

// Exponential moving average, seeded with the SMA of the first `period` values
// (the standard, deterministic seeding).
export function ema(values: number[], period: number): number | null {
  if (period <= 0 || values.length < period) return null;
  const k = 2 / (period + 1);
  let prev = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < values.length; i++) {
    prev = values[i]! * k + prev * (1 - k);
  }
  return finite(prev) ? prev : null;
}

// Wilder's RSI over `period` (default 14). 100 = only gains, 0 = only losses.
export function rsi(closes: number[], period = 14): number | null {
  if (period <= 0 || closes.length < period + 1) return null;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const ch = closes[i]! - closes[i - 1]!;
    if (ch >= 0) gain += ch;
    else loss -= ch;
  }
  let avgGain = gain / period;
  let avgLoss = loss / period;
  for (let i = period + 1; i < closes.length; i++) {
    const ch = closes[i]! - closes[i - 1]!;
    const g = ch >= 0 ? ch : 0;
    const l = ch < 0 ? -ch : 0;
    avgGain = (avgGain * (period - 1) + g) / period;
    avgLoss = (avgLoss * (period - 1) + l) / period;
  }
  if (avgLoss === 0) return avgGain === 0 ? 50 : 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

// Wilder's Average True Range over `period` (default 14) — a volatility gauge.
export function atr(candles: Candle[], period = 14): number | null {
  if (period <= 0 || candles.length < period + 1) return null;
  const tr: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const h = candles[i]!.high;
    const l = candles[i]!.low;
    const pc = candles[i - 1]!.close;
    tr.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
  }
  if (tr.length < period) return null;
  let prev = tr.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < tr.length; i++) {
    prev = (prev * (period - 1) + tr[i]!) / period;
  }
  return finite(prev) ? prev : null;
}

export interface Bollinger {
  upper: number;
  mid: number;
  lower: number;
}

// Bollinger bands: SMA(period) ± mult·stddev over the last `period` closes.
export function bollinger(closes: number[], period = 20, mult = 2): Bollinger | null {
  if (period <= 0 || closes.length < period) return null;
  const slice = closes.slice(-period);
  const mid = slice.reduce((a, b) => a + b, 0) / period;
  const variance = slice.reduce((a, b) => a + (b - mid) ** 2, 0) / period;
  const sd = Math.sqrt(variance);
  if (!finite(mid) || !finite(sd)) return null;
  return { upper: mid + mult * sd, mid, lower: mid - mult * sd };
}

export interface HighLow {
  high: number;
  low: number;
}

// Highest high / lowest low over the last `lookback` candles (breakout levels).
export function recentHighLow(candles: Candle[], lookback: number): HighLow | null {
  if (lookback <= 0 || candles.length === 0) return null;
  const slice = candles.slice(-lookback);
  let high = -Infinity;
  let low = Infinity;
  for (const c of slice) {
    if (c.high > high) high = c.high;
    if (c.low < low) low = c.low;
  }
  return finite(high) && finite(low) ? { high, low } : null;
}

export interface IndicatorSet {
  asOfClose: number;
  rsi14: number | null;
  ema20: number | null;
  ema50: number | null;
  atr14: number | null;
  bollinger: Bollinger | null;
  recent20: HighLow | null;
  // Derived flags — cheap, model-friendly reads so a weak free-tier brain can
  // act on structure without recomputing. Null when the inputs are unavailable.
  aboveEma20: boolean | null;
  ema20AboveEma50: boolean | null;
  brokeRecentHigh: boolean | null; // close >= prior-20 high (breakout)
  brokeRecentLow: boolean | null; // close <= prior-20 low (breakdown)
}

export interface IndicatorOpts {
  rsiPeriod?: number;
  emaFast?: number;
  emaSlow?: number;
  atrPeriod?: number;
  bbPeriod?: number;
  breakoutLookback?: number;
}

// Compute the compact indicator bundle the runner injects into the observation
// for an agent that declared the `indicators` capability. The breakout flags
// compare the latest close against the high/low of the PRECEDING window (so a
// candle closing at a new 20-bar high reads as a breakout, not a tautology).
export function computeIndicators(candles: Candle[], opts: IndicatorOpts = {}): IndicatorSet | null {
  if (candles.length === 0) return null;
  const closes = closesOf(candles);
  const close = closes[closes.length - 1]!;
  const {
    rsiPeriod = 14,
    emaFast = 20,
    emaSlow = 50,
    atrPeriod = 14,
    bbPeriod = 20,
    breakoutLookback = 20,
  } = opts;

  const ema20 = ema(closes, emaFast);
  const ema50 = ema(closes, emaSlow);
  // Breakout vs the window BEFORE the latest candle (exclude the current bar).
  const prior = recentHighLow(candles.slice(0, -1), breakoutLookback);
  const atr14 = atr(candles, atrPeriod);
  const bb = bollinger(closes, bbPeriod);
  const r20 = recentHighLow(candles, breakoutLookback);
  const rsi14 = rsi(closes, rsiPeriod);

  // Round numbers the model sees/echoes to clean significant figures, so reasoning
  // reads "recent20 low 6.29216" not "6.292164535198927" — and stays clean for both
  // $62k coins and sub-cent ones. The booleans below use the RAW locals, so the
  // trend/breakout reads are unaffected.
  const sig = (n: number, figs = 6): number => {
    if (!Number.isFinite(n) || n === 0) return n;
    const f = Math.pow(10, figs - Math.ceil(Math.log10(Math.abs(n))));
    return Math.round(n * f) / f;
  };
  const sigN = (n: number | null, figs = 6): number | null => (n == null ? null : sig(n, figs));

  return {
    asOfClose: sig(close),
    rsi14: rsi14 == null ? null : Math.round(rsi14 * 10) / 10,
    ema20: sigN(ema20),
    ema50: sigN(ema50),
    atr14: sigN(atr14),
    bollinger: bb == null ? null : { upper: sig(bb.upper), mid: sig(bb.mid), lower: sig(bb.lower) },
    recent20: r20 == null ? null : { high: sig(r20.high), low: sig(r20.low) },
    aboveEma20: ema20 == null ? null : close > ema20,
    ema20AboveEma50: ema20 == null || ema50 == null ? null : ema20 > ema50,
    brokeRecentHigh: prior == null ? null : close >= prior.high,
    brokeRecentLow: prior == null ? null : close <= prior.low,
  };
}
