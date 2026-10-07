// Outcome labels for bench cassettes, built from data published AFTER each
// cassette's asOf (C2 of the item-3 bench plan). Reads only; never writes to
// the API.
//
// Prices: OHLC bars from GET /api/agent/market/:coinId/candles, the same
// loader and shape as the public /api/coins/:slug/candles (probed live
// 2026-10-07: range=1D -> 288 five-minute bars {t, o, h, l, c, v}, t = bar
// open in unix seconds). Candle storage keeps fine bars only briefly (about
// 24 h of 5-minute bars, 7 days of 15-minute, 30 days of hourly), so the bar
// size follows the cassette's age: the finest range whose window still covers
// asOf. A label file has one bar size (barSeconds).
//
// PM settlement is NOT built here. A pm_open's outcome needs the production
// settlement verdict (backend-v2 decideSettlement: single-winner events vs
// per-market contracts, the outcome set frozen at open, voids). Rebuilding it
// here would be an approximation, so PM opens stay "unlabelled" until that
// verdict is readable.

import { ApiResult } from "../types.js";
import { Cassette } from "./cassette.js";
import { LabelFile, PriceBar } from "./labels.js";

export const LABEL_RANGES = [
  { range: "1D", spanSeconds: 86_400, barSeconds: 300 },
  { range: "1W", spanSeconds: 7 * 86_400, barSeconds: 900 },
  { range: "1M", spanSeconds: 30 * 86_400, barSeconds: 3_600 },
  { range: "3M", spanSeconds: 90 * 86_400, barSeconds: 14_400 },
] as const;

export const DEFAULT_LABEL_HORIZON_HOURS = 24;

export type PriceLabelPlan =
  | {
      status: "ready";
      range: string;
      barSeconds: number;
      fromSec: number;
      toSec: number;
    }
  | { status: "not_yet"; labelableAfter: string }
  | { status: "too_old" };

/**
 * Which candle range can label [asOf, asOf + horizon] right now. The horizon
 * must have fully elapsed, and the range window (ending now) must still hold
 * the bar that contains asOf.
 */
export function planPriceLabels(
  asOf: string,
  horizonHours: number,
  nowMs: number,
): PriceLabelPlan {
  const asOfMs = Date.parse(asOf);
  if (!Number.isFinite(asOfMs)) throw new Error(`invalid asOf "${asOf}"`);
  if (!Number.isFinite(horizonHours) || horizonHours <= 0)
    throw new Error("horizon hours must be a positive number");
  const fromSec = Math.floor(asOfMs / 1000);
  const toSec = fromSec + Math.round(horizonHours * 3600);
  const nowSec = Math.floor(nowMs / 1000);
  if (toSec > nowSec)
    return {
      status: "not_yet",
      labelableAfter: new Date(toSec * 1000).toISOString(),
    };
  const age = nowSec - fromSec;
  const pick = LABEL_RANGES.find((r) => age + r.barSeconds <= r.spanSeconds);
  return pick
    ? {
        status: "ready",
        range: pick.range,
        barSeconds: pick.barSeconds,
        fromSec,
        toSec,
      }
    : { status: "too_old" };
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);

/** The coins a cassette observed: its recorded GET /api/agent/market/:id reads. */
export function cassetteCoins(
  cassette: Pick<Cassette, "responses">,
): Array<{ coinId: string; symbol: string }> {
  const out = new Map<string, string>();
  for (const r of cassette.responses) {
    const m = /^\/api\/agent\/market\/([^/]+)$/.exec(r.path);
    if (!m || r.method !== "GET" || !r.ok) continue;
    const coin = isObject(r.data) ? r.data.coin : undefined;
    const symbol = isObject(coin) ? coin.symbol : undefined;
    if (typeof symbol === "string" && symbol.trim())
      out.set(decodeURIComponent(m[1]!), symbol.trim().toUpperCase());
  }
  return [...out].map(([coinId, symbol]) => ({ coinId, symbol }));
}

/**
 * Bars from a candles response that can matter for [fromSec, toSec]: the bar
 * containing asOf onward (the scorer itself ignores every bar at or before
 * asOf), finite OHLC only, oldest first.
 */
export function priceBarsFor(
  data: unknown,
  fromSec: number,
  toSec: number,
  barSeconds: number,
): PriceBar[] {
  const rows =
    isObject(data) && Array.isArray(data.candles) ? data.candles : [];
  const bars: PriceBar[] = [];
  for (const row of rows) {
    if (!isObject(row)) continue;
    const { t, h, l, c } = row;
    if (
      [t, h, l, c].every((v) => typeof v === "number" && Number.isFinite(v)) &&
      (t as number) > fromSec - barSeconds &&
      (t as number) <= toSec
    )
      bars.push({
        t: t as number,
        h: h as number,
        l: l as number,
        c: c as number,
      });
  }
  return bars.sort((a, b) => a.t - b.t);
}

export type CassetteLabelResult =
  | { id: string; status: "not_yet"; labelableAfter: string }
  | { id: string; status: "too_old" }
  | { id: string; status: "kept" }
  | { id: string; status: "no_coins" }
  | {
      id: string;
      status: "built";
      file: LabelFile;
      range: string;
      symbols: string[];
      missing: string[];
    };

/**
 * Price labels for each cassette. `fetchCandles` is the agent API candles
 * read; one fetch per coin and range serves every cassette. An existing label
 * file keeps its PM and funding labels; its prices are replaced only with
 * `overwrite`. A symbol whose read fails or returns no bar in the window is
 * reported missing and stays unlabelled.
 */
export async function buildPriceLabels(
  cassettes: ReadonlyArray<Pick<Cassette, "id" | "asOf" | "responses">>,
  opts: {
    fetchCandles: (coinId: string, range: string) => Promise<ApiResult>;
    horizonHours?: number;
    nowMs: number;
    existing?: Record<string, LabelFile>;
    overwrite?: boolean;
  },
): Promise<CassetteLabelResult[]> {
  const horizonHours = opts.horizonHours ?? DEFAULT_LABEL_HORIZON_HOURS;
  const cache = new Map<string, Promise<ApiResult>>();
  const read = (coinId: string, range: string) => {
    const key = `${coinId}|${range}`;
    let hit = cache.get(key);
    if (!hit) {
      hit = opts
        .fetchCandles(coinId, range)
        .catch((): ApiResult => ({ ok: false, status: 0, data: null }));
      cache.set(key, hit);
    }
    return hit;
  };
  const results: CassetteLabelResult[] = [];
  for (const cassette of cassettes) {
    const existing = opts.existing?.[cassette.id];
    if (existing?.prices && !opts.overwrite) {
      results.push({ id: cassette.id, status: "kept" });
      continue;
    }
    const plan = planPriceLabels(cassette.asOf, horizonHours, opts.nowMs);
    if (plan.status !== "ready") {
      results.push({ id: cassette.id, ...plan });
      continue;
    }
    const coins = cassetteCoins(cassette);
    if (coins.length === 0) {
      results.push({ id: cassette.id, status: "no_coins" });
      continue;
    }
    const prices: Record<string, PriceBar[]> = {};
    const missing: string[] = [];
    for (const { coinId, symbol } of coins) {
      const res = await read(coinId, plan.range);
      const bars = res.ok
        ? priceBarsFor(res.data, plan.fromSec, plan.toSec, plan.barSeconds)
        : [];
      if (bars.length > 0) prices[symbol] = bars;
      else missing.push(symbol);
    }
    const {
      prices: _old,
      barSeconds: _bar,
      horizonHours: _h,
      ...kept
    } = existing ?? {};
    results.push({
      id: cassette.id,
      status: "built",
      range: plan.range,
      symbols: Object.keys(prices).sort(),
      missing: missing.sort(),
      file: {
        ...kept,
        prices,
        barSeconds: plan.barSeconds,
        horizonHours,
      },
    });
  }
  return results;
}
