// Outcome labels for bench actions. Pure functions, no network.
//
// Labels are OPTIONAL in this slice. When `<corpus>/labels/<cassetteId>.json`
// exists the bench scores accepted opens against it; otherwise every accepted
// open is reported as "unlabelled" (counted, never dropped). This slice never
// fetches labels: whoever builds the label file must take its data from AFTER
// the cassette's asOf, and the scorer enforces that for price bars by ignoring
// every bar at or before asOf (no look-ahead from the decision's own inputs).
//
// A futures outcome is a MODEL, not a fill record. It walks OHLC bars after
// asOf with these assumptions (also listed in every report's `assumptions`):
//   - entry at the recorded (synthesized) quote price with the paper fee model;
//     entry latency is not modelled;
//   - inside one bar the price path is unknown, so a bar that touches both the
//     stop and the take-profit is resolved as the STOP (conservative) and is
//     counted (sameBarStopAndTarget) so its share is visible;
//   - a missing bar before the exit (or before the horizon end) makes the
//     outcome "unlabelled_gap": counted, never filled or interpolated;
//   - only bars that open after asOf AND close by the horizon end are
//     walked, so no price after the horizon is ever seen; with a horizon
//     that does not end on a bar boundary the walk stops at the last full
//     bar before it (horizonFlooredToBar), a conservative cutoff;
//   - funding is included only when the label file carries funding events for
//     the symbol; otherwise the score says fundingIncluded: false.
//
// Label file shape:
//   {
//     "pm": { "<source>/<slug>/<outcomeExternalMarketId>": { "settled": 0 | 1 } },
//     "prices": { "<SYMBOL>": [{ "t": <bar open, unix seconds>, "h": n, "l": n, "c": n }] },
//     "barSeconds": <optional bar interval, default 300>,
//     "funding": { "<SYMBOL>": [{ "t": <unix seconds>, "rate": <fraction of notional per event> }] },
//     "horizonHours": <optional number: stop the walk at asOf + horizon>
//   }
// `settled: 1` means the outcome the agent BOUGHT won. A positive funding rate
// is paid by longs and received by shorts.

import { ProposedAction, QuoteEvidence } from "../types.js";
import { baseSymbol } from "../setups.js";
import { FUTURES_SYNTHETIC_FEE_BPS } from "./costs.js";

export const DEFAULT_BAR_SECONDS = 300;

export interface PriceBar {
  t: number;
  h: number;
  l: number;
  c: number;
}

export interface FundingEvent {
  t: number;
  rate: number;
}

export interface LabelFile {
  pm?: Record<string, { settled: 0 | 1 }>;
  prices?: Record<string, PriceBar[]>;
  barSeconds?: number;
  funding?: Record<string, FundingEvent[]>;
  horizonHours?: number;
}

export type ActionScore =
  | { status: "not_scored"; reason: string }
  | { status: "unlabelled"; reason: string }
  | { status: "unlabelled_gap"; reason: string }
  | {
      status: "labelled";
      venue: "pm";
      settled: 0 | 1;
      /** Fee-inclusive cost per share, 0..1 (stake / net shares). */
      cost: number;
      /** settled - cost: P&L per share bought. */
      pnlPerShare: number;
      /** (settled - cost) / cost: P&L per 1 mUSD staked. */
      returnOnStake: number;
      pnlMusd: number;
      /** Brier of the agent's own forecast; absent when it sent none. */
      brier?: number;
      /** Brier of the market's raw entry probability on the same outcome. */
      marketBrier?: number;
    }
  | {
      status: "labelled";
      venue: "futures";
      basis: "ohlc_walk_model";
      exit: "stop" | "take_profit" | "liquidation" | "horizon";
      exitPrice: number;
      /** One bar touched both stop and target; resolved as the stop. */
      sameBarStopAndTarget: boolean;
      /** The horizon was not on a bar boundary: the walk ended at the last
       *  full bar before it (never at a close after the horizon). */
      horizonFlooredToBar: boolean;
      fundingIncluded: boolean;
      /** After fees (and funding when included), fraction of margin, >= -1. */
      returnOnMargin: number;
      pnlMusd: number;
    };

const isFiniteNumber = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);

const isObject = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);

/** Parse and validate a label file. Throws on a malformed file (fail closed). */
export function parseLabelFile(value: unknown, source: string): LabelFile {
  const bad = (why: string): never => {
    throw new Error(`label file ${source} is invalid: ${why}`);
  };
  if (!isObject(value)) return bad("not a JSON object");
  const root: Record<string, unknown> = value;
  const out: LabelFile = {};
  if (root.pm !== undefined) {
    if (!isObject(root.pm)) return bad("pm must be an object");
    out.pm = {};
    for (const [key, label] of Object.entries(root.pm)) {
      const settled = isObject(label) ? label.settled : undefined;
      if (settled !== 0 && settled !== 1)
        return bad(`pm["${key}"].settled must be 0 or 1`);
      if (key.split("/").length < 3)
        return bad(
          `pm key "${key}" must be source/slug/outcomeExternalMarketId`,
        );
      out.pm[key] = { settled: settled as 0 | 1 };
    }
  }
  const series = <T>(
    field: "prices" | "funding",
    keys: readonly string[],
  ): Record<string, T[]> | undefined => {
    const raw = root[field];
    if (raw === undefined) return undefined;
    if (!isObject(raw)) return bad(`${field} must be an object`);
    const result: Record<string, T[]> = {};
    for (const [symbol, rows] of Object.entries(raw)) {
      if (!Array.isArray(rows))
        return bad(`${field}["${symbol}"] must be an array`);
      result[symbol.toUpperCase()] = rows.map((row, i) => {
        if (!isObject(row) || !keys.every((k) => isFiniteNumber(row[k])))
          return bad(
            `${field}["${symbol}"][${i}] needs numeric ${keys.join(", ")}`,
          );
        return Object.fromEntries(keys.map((k) => [k, row[k]])) as T;
      });
    }
    return result;
  };
  const prices = series<PriceBar>("prices", ["t", "h", "l", "c"]);
  if (prices) out.prices = prices;
  const funding = series<FundingEvent>("funding", ["t", "rate"]);
  if (funding) out.funding = funding;
  for (const field of ["horizonHours", "barSeconds"] as const) {
    const v = root[field];
    if (v === undefined) continue;
    if (!isFiniteNumber(v) || v <= 0)
      return bad(`${field} must be a positive number`);
    out[field] = v;
  }
  return out;
}

function pmLabel(
  labels: LabelFile,
  action: Extract<ProposedAction, { type: "pm_open" }>,
): 0 | 1 | undefined {
  const want = `${action.source.toLowerCase()}/${action.slug.toLowerCase()}/${action.outcomeExternalMarketId}`;
  for (const [key, label] of Object.entries(labels.pm ?? {})) {
    const [source, slug, ...rest] = key.split("/");
    if (
      `${source.toLowerCase()}/${slug.toLowerCase()}/${rest.join("/")}` === want
    )
      return label.settled;
  }
  return undefined;
}

function scorePm(
  action: Extract<ProposedAction, { type: "pm_open" }>,
  quote: QuoteEvidence | undefined,
  labels: LabelFile,
): ActionScore {
  const settled = pmLabel(labels, action);
  if (settled === undefined)
    return { status: "unlabelled", reason: "no_pm_settlement_label" };
  const stake = quote?.stakeMusd;
  const shares = quote?.sharesEstimate;
  const market = quote?.entryProbability;
  // Fee-inclusive cost first, the raw entry probability only as a fallback.
  const cost =
    isFiniteNumber(stake) && isFiniteNumber(shares) && stake > 0 && shares > 0
      ? stake / shares
      : isFiniteNumber(market)
        ? market / 100
        : undefined;
  if (cost === undefined || cost <= 0)
    return { status: "unlabelled", reason: "no_entry_cost" };
  const forecast = action.forecastProbability;
  const returnOnStake = (settled - cost) / cost;
  return {
    status: "labelled",
    venue: "pm",
    settled,
    cost,
    pnlPerShare: settled - cost,
    returnOnStake,
    pnlMusd: returnOnStake * action.stakeMusd,
    ...(isFiniteNumber(forecast)
      ? { brier: (forecast / 100 - settled) ** 2 }
      : {}),
    ...(isFiniteNumber(market)
      ? { marketBrier: (market / 100 - settled) ** 2 }
      : {}),
  };
}

const seconds = (t: number) => (t > 1e12 ? t / 1000 : t);

function seriesFor<T>(
  map: Record<string, T[]> | undefined,
  symbol: string,
): T[] | undefined {
  return map?.[symbol.toUpperCase()] ?? map?.[baseSymbol(symbol)];
}

function scoreFutures(
  action: Extract<ProposedAction, { type: "futures_open" }>,
  quote: QuoteEvidence | undefined,
  asOf: string,
  labels: LabelFile,
): ActionScore {
  const entry = quote?.entryPrice;
  if (!isFiniteNumber(entry) || entry <= 0)
    return { status: "unlabelled", reason: "no_entry_price" };
  const asOfSec = Date.parse(asOf) / 1000;
  if (!Number.isFinite(asOfSec))
    return { status: "unlabelled", reason: "asof_unparseable" };
  const series = seriesFor(labels.prices, action.symbol);
  if (!series) return { status: "unlabelled", reason: "no_price_series" };
  const barSeconds = labels.barSeconds ?? DEFAULT_BAR_SECONDS;
  const horizonEnd =
    labels.horizonHours !== undefined
      ? asOfSec + labels.horizonHours * 3600
      : Infinity;
  // Only bars that open strictly AFTER the decision's asOf (no look-ahead)
  // and CLOSE by the horizon end: a bar straddling the horizon could carry
  // a stop or target after it, and a still-open bar is not final.
  const bars = series
    .map((b) => ({ ...b, t: seconds(b.t) }))
    .filter((b) => b.t > asOfSec && b.t + barSeconds <= horizonEnd)
    .sort((a, b) => a.t - b.t);
  const gap = (why: string): ActionScore => ({
    status: "unlabelled_gap",
    reason: why,
  });
  if (bars.length === 0) return gap("no_bars_after_asof");

  const long = action.side === "long";
  const lev = action.leverage;
  const liquidation = long ? entry * (1 - 1 / lev) : entry * (1 + 1 / lev);
  const stop = isFiniteNumber(action.stopLossPrice)
    ? action.stopLossPrice
    : undefined;
  const target = isFiniteNumber(action.takeProfitPrice)
    ? action.takeProfitPrice
    : undefined;
  // The adverse trigger nearest to entry fires first.
  const adverse = long
    ? Math.max(stop ?? -Infinity, liquidation)
    : Math.min(stop ?? Infinity, liquidation);
  const adverseExit: "stop" | "liquidation" =
    adverse === liquidation ? "liquidation" : "stop";

  type Exit = "stop" | "take_profit" | "liquidation" | "horizon";
  let exit: { kind: Exit; price: number; t: number } | undefined;
  let sameBar = false;
  let previousT = asOfSec;
  for (const bar of bars) {
    // A bar that opens more than one interval after the previous one (or,
    // for the first bar, after asOf) leaves an unobserved stretch where the
    // stop could have fired. Never fill it.
    if (bar.t - previousT > barSeconds) return gap("missing_bar_before_exit");
    previousT = bar.t;
    const hitAdverse = long ? bar.l <= adverse : bar.h >= adverse;
    const hitTarget =
      target !== undefined && (long ? bar.h >= target : bar.l <= target);
    if (hitAdverse) {
      sameBar = hitTarget;
      exit = { kind: adverseExit, price: adverse, t: bar.t };
      break;
    }
    if (hitTarget && target !== undefined) {
      exit = { kind: "take_profit", price: target, t: bar.t };
      break;
    }
  }
  if (!exit) {
    // No trigger: mark at the last close, but only when the bars reach the
    // last full bar before the horizon end (when one is set); a short series
    // is a gap, not an exit.
    if (
      Number.isFinite(horizonEnd) &&
      horizonEnd - (previousT + barSeconds) >= barSeconds
    )
      return gap("bars_end_before_horizon");
    const last = bars[bars.length - 1];
    exit = { kind: "horizon", price: last.c, t: last.t };
  }
  const exitT = exit.t;
  const fundingEvents = seriesFor(labels.funding, action.symbol);
  const fundingCost = (fundingEvents ?? [])
    .map((f) => ({ ...f, t: seconds(f.t) }))
    .filter((f) => f.t > asOfSec && f.t <= exitT)
    .reduce((s, f) => s + (long ? f.rate : -f.rate) * lev, 0);
  const fees = (2 * FUTURES_SYNTHETIC_FEE_BPS * lev) / 10_000;
  const gross = ((long ? 1 : -1) * (exit.price - entry) * lev) / entry;
  // Liquidation forfeits the margin (openapi: no adverse fill cost on top).
  const returnOnMargin =
    exit.kind === "liquidation" ? -1 : Math.max(-1, gross - fees - fundingCost);
  return {
    status: "labelled",
    venue: "futures",
    basis: "ohlc_walk_model",
    exit: exit.kind,
    exitPrice: exit.price,
    sameBarStopAndTarget: sameBar,
    // Candle times are epoch multiples of the bar size: a horizon end off
    // that grid was cut back to the last full bar before it.
    horizonFlooredToBar:
      Number.isFinite(horizonEnd) && horizonEnd % barSeconds !== 0,
    fundingIncluded: fundingEvents !== undefined,
    returnOnMargin,
    pnlMusd: returnOnMargin * action.marginMusd,
  };
}

/**
 * Score one ACCEPTED action. Only risk-increasing PM and futures opens are
 * scored in this slice; closes, protection updates, cancels and spot orders
 * are "not_scored". An open with no matching label is "unlabelled"; a futures
 * open whose bar path has holes is "unlabelled_gap".
 */
export function scoreAction(input: {
  action: ProposedAction;
  quote?: QuoteEvidence;
  asOf: string;
  labels?: LabelFile;
}): ActionScore {
  const { action, quote, asOf, labels } = input;
  if (action.type !== "pm_open" && action.type !== "futures_open")
    return { status: "not_scored", reason: `${action.type}_not_scored` };
  if (!labels) return { status: "unlabelled", reason: "no_label_file" };
  return action.type === "pm_open"
    ? scorePm(action, quote, labels)
    : scoreFutures(action, quote, asOf, labels);
}
