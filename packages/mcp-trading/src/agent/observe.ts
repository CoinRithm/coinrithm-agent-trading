// Observe phase: read CoinRithm state into one Observation. Sync-polls /trades
// before any write (polledBeforeWrite=true only after that succeeds). If a
// required read fails, or no watchlist symbol resolves, the cycle SKIPS writes.

import {
  INDICATOR_RANGES,
  indicatorRangeOf,
  signalThresholdsOf,
  type IndicatorRange,
} from "./signals.js";
import {
  filterUniverseRows,
  scansUniverse,
  universeQuery,
  universeQueryParams,
  universeResolveTop,
  universeSectorsOf,
  UNIVERSE_MAX_SCAN_LIMIT,
  type UniverseRow,
} from "./universe.js";
import { futuresEntryEligibilityOf } from "./futuresEligibility.js";
import { CoinRithmClient } from "./client.js";
import {
  AgentSpec,
  RunState,
  Observation,
  OpenPosition,
  SpotOrder,
  PmPosition,
  PmResolution,
  PmMarket,
  NewsItem,
  CoinFundamentals,
  OpenInterestContext,
  PositioningContext,
  LiquidationContext,
  LiquidationWindow,
  MacroContext,
  MacroQuote,
  DatedValue,
  WatchEntry,
  IndicatorContext,
  AgentTrace,
  PmCalibration,
  WhaleContext,
  WhaleTradeContext,
  WhaleWalletContext,
  WhaleWalletFillContext,
} from "./types.js";
import { asObj, asArr, asNum, asStr } from "./extract.js";
import { computeIndicators, Candle, IndicatorSet } from "./indicators.js";
import { scanSetups } from "./setups.js";
import {
  freshnessOf,
  pmQualityOf,
  pmDecisionSupportOf,
  pmConsensusOf,
  pmCalibrationOf,
  pmSettlementRuleOf,
  pmOutcomeRuleOf,
} from "./pmContext.js";
import { deriveCapitalBook, usesCapitalSizing } from "./capitalSizing.js";

export interface ObserveOutput {
  observation: Observation;
  skip?: string;
}

function contextTimestamp(value: unknown): string | undefined {
  const text = asStr(value);
  return text &&
    text.length <= 40 &&
    /^\d{4}-\d{2}-\d{2}T/.test(text) &&
    Number.isFinite(Date.parse(text))
    ? text
    : undefined;
}

/** Keep sentiment's sample and dates together on both watchlist paths. */
function sentimentContextOf(
  market: Record<string, unknown>,
): Pick<
  WatchEntry,
  | "sentimentBullishPct"
  | "sentimentTotalVotes"
  | "sentimentDayUtc"
  | "sentimentUpdatedAt"
> {
  const sentiment = asObj(market.sentiment);
  const votes = asNum(sentiment.totalVotes);
  return {
    sentimentBullishPct: asNum(sentiment.bullishPct),
    sentimentTotalVotes:
      votes !== undefined && Number.isSafeInteger(votes) && votes >= 0
        ? votes
        : undefined,
    sentimentDayUtc: contextTimestamp(sentiment.dayUtc),
    sentimentUpdatedAt: contextTimestamp(sentiment.updatedAt),
  };
}

const WHALE_READ_TIMEOUT_MS = 5_000;
const MAX_WHALE_TRADES = 10;
const MAX_WHALE_WALLETS = 2;
const MAX_WALLET_DAILY = 30;
const MAX_WALLET_FILLS = 6;
const MAX_EVENT_SLUG_LENGTH = 240;
const MAX_TIMESTAMP_LENGTH = 40;
const PUBLIC_WALLET_SOURCES = new Set(["polymarket", "limitless", "myriad"]);
const FULL_EVM_ADDRESS = /^0x[a-fA-F0-9]{40}$/;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

function whaleFailure(result: {
  status: number;
  data: unknown;
}): WhaleContext["reason"] {
  if (result.status === 0) {
    return asObj(result.data).error === "timeout" ? "timeout" : "network_error";
  }
  return "http_error";
}

function compactWalletFill(value: unknown): WhaleWalletFillContext | undefined {
  const row = asObj(value);
  const event = asObj(row.event);
  const side = asStr(row.side);
  if (!side) return undefined;
  return {
    ...(asStr(event.slug)
      ? { eventSlug: asStr(event.slug)?.slice(0, MAX_EVENT_SLUG_LENGTH) }
      : {}),
    ...(asStr(event.title)
      ? { eventTitle: asStr(event.title)?.slice(0, 180) }
      : {}),
    ...(asStr(row.marketQuestion)
      ? { marketQuestion: asStr(row.marketQuestion)?.slice(0, 240) }
      : {}),
    side: side.slice(0, 24),
    ...(asStr(row.outcome)
      ? { outcome: asStr(row.outcome)?.slice(0, 120) }
      : {}),
    ...(asNum(row.usdValue) !== undefined
      ? { usdValue: asNum(row.usdValue) }
      : {}),
    ...(asNum(row.price) !== undefined ? { price: asNum(row.price) } : {}),
    ...(asStr(row.evidenceType)
      ? { evidenceType: asStr(row.evidenceType)?.slice(0, 48) }
      : {}),
    ...(asStr(row.tradedAt)
      ? { tradedAt: asStr(row.tradedAt)?.slice(0, MAX_TIMESTAMP_LENGTH) }
      : {}),
    ...(asStr(row.sourceMarketRef)
      ? { sourceMarketRef: asStr(row.sourceMarketRef)?.slice(0, 120) }
      : {}),
  };
}

function compactWallet(
  value: unknown,
  expectedSource: string,
  expectedAddress: string,
): WhaleWalletContext | undefined {
  const row = asObj(value);
  const returnedSource = asStr(row.source)?.toLowerCase();
  const returnedAddress = asStr(row.wallet) ?? asStr(row.address);
  if (
    returnedSource !== expectedSource ||
    !returnedAddress ||
    returnedAddress.toLowerCase() !== expectedAddress
  ) {
    return undefined;
  }
  if (
    !row.summary30d ||
    typeof row.summary30d !== "object" ||
    Array.isArray(row.summary30d)
  ) {
    return undefined;
  }
  if (!Array.isArray(row.daily) || !Array.isArray(row.recentFills)) {
    return undefined;
  }
  const summary = asObj(row.summary30d);
  const daily = asArr(row.daily)
    .filter((item) => ISO_DAY.test(asStr(asObj(item).day) ?? ""))
    .map((item) => {
      const day = asObj(item);
      return {
        ...(asStr(day.day) ? { day: asStr(day.day) } : {}),
        ...(asNum(day.tradeCount) !== undefined
          ? { tradeCount: asNum(day.tradeCount) }
          : {}),
        ...(asNum(day.buyCount) !== undefined
          ? { buyCount: asNum(day.buyCount) }
          : {}),
        ...(asNum(day.sellCount) !== undefined
          ? { sellCount: asNum(day.sellCount) }
          : {}),
        ...(asNum(day.notionalUsd) !== undefined
          ? { notionalUsd: asNum(day.notionalUsd) }
          : {}),
      };
    })
    .sort((a, b) => (b.day ?? "").localeCompare(a.day ?? ""))
    .slice(0, MAX_WALLET_DAILY);
  const recentFills = asArr(row.recentFills)
    .map(compactWalletFill)
    .filter((item): item is WhaleWalletFillContext => !!item)
    .slice(0, MAX_WALLET_FILLS);
  return {
    source: expectedSource,
    address: expectedAddress,
    ...(asStr(row.asOf)
      ? { asOf: asStr(row.asOf)?.slice(0, MAX_TIMESTAMP_LENGTH) }
      : {}),
    summary30d: {
      ...(asStr(summary.basis)
        ? { basis: asStr(summary.basis)?.slice(0, 48) }
        : {}),
      ...(asStr(summary.windowStart)
        ? {
            windowStart: asStr(summary.windowStart)?.slice(
              0,
              MAX_TIMESTAMP_LENGTH,
            ),
          }
        : {}),
      ...(asNum(summary.tradeCount) !== undefined
        ? { tradeCount: asNum(summary.tradeCount) }
        : {}),
      ...(asNum(summary.notionalUsd) !== undefined
        ? { notionalUsd: asNum(summary.notionalUsd) }
        : {}),
      ...(asNum(summary.buyNotionalUsd) !== undefined
        ? { buyNotionalUsd: asNum(summary.buyNotionalUsd) }
        : {}),
      ...(asNum(summary.sellNotionalUsd) !== undefined
        ? { sellNotionalUsd: asNum(summary.sellNotionalUsd) }
        : {}),
    },
    rollup: {
      ...(typeof asObj(row.rollup).available === "boolean"
        ? { available: asObj(row.rollup).available as boolean }
        : {}),
      ...(asNum(asObj(row.rollup).coveredDays) !== undefined
        ? { coveredDays: asNum(asObj(row.rollup).coveredDays) }
        : {}),
      ...(asStr(asObj(row.rollup).from)
        ? {
            from: asStr(asObj(row.rollup).from)?.slice(0, MAX_TIMESTAMP_LENGTH),
          }
        : {}),
      ...(asStr(asObj(row.rollup).to)
        ? { to: asStr(asObj(row.rollup).to)?.slice(0, MAX_TIMESTAMP_LENGTH) }
        : {}),
      ...(asStr(asObj(row.rollup).computedAt)
        ? {
            computedAt: asStr(asObj(row.rollup).computedAt)?.slice(
              0,
              MAX_TIMESTAMP_LENGTH,
            ),
          }
        : {}),
    },
    daily,
    recentFills,
  };
}

/**
 * Add bounded public whale context after the deterministic gate. This is
 * deliberately separate from observe(): a skipped or mechanical cycle never
 * pays for the public reads, and this context cannot widen candidate selection.
 */
export async function enrichWhaleContext(
  client: CoinRithmClient,
  observation: Observation,
): Promise<WhaleContext> {
  const fetchedAt = () => new Date().toISOString();
  const relevant = new Set(
    [...observation.pmMarkets, ...observation.pmPositions]
      .map((item) =>
        item.source && item.slug
          ? `${item.source.toLowerCase()}|${item.slug.toLowerCase()}`
          : undefined,
      )
      .filter((item): item is string => !!item),
  );
  const unavailable = (reason: WhaleContext["reason"]): WhaleContext => ({
    status: "unavailable",
    fetchedAt: fetchedAt(),
    coverage: "relevant_events",
    trades: [],
    wallets: [],
    omitted: 0,
    ...(reason ? { reason } : {}),
  });
  if (relevant.size === 0) {
    return {
      status: "available",
      fetchedAt: fetchedAt(),
      coverage: "no_relevant_events",
      trades: [],
      wallets: [],
      omitted: 0,
    };
  }
  const tape = await client.getPublicPmWhales({
    limit: 50,
    timeoutMs: WHALE_READ_TIMEOUT_MS,
  });
  if (!tape.ok) return unavailable(whaleFailure(tape));
  const root = asObj(tape.data);
  if (!Array.isArray(root.trades)) return unavailable("invalid_payload");

  let omitted = 0;
  const trades: WhaleTradeContext[] = [];
  const walletRequests: Array<{ source: string; address: string }> = [];
  for (const value of root.trades) {
    const row = asObj(value);
    const source = asStr(row.source)?.toLowerCase();
    const eventSlug = asStr(row.eventSlug);
    const side = asStr(row.side);
    if (
      !source ||
      !eventSlug ||
      !side ||
      !relevant.has(`${source}|${eventSlug.toLowerCase()}`)
    ) {
      omitted += 1;
      continue;
    }
    const walletAddress = asStr(row.walletAddress)?.trim();
    const validWalletAddress =
      walletAddress &&
      PUBLIC_WALLET_SOURCES.has(source) &&
      FULL_EVM_ADDRESS.test(walletAddress)
        ? walletAddress.toLowerCase()
        : undefined;
    if (
      validWalletAddress &&
      !walletRequests.some(
        (item) => item.source === source && item.address === validWalletAddress,
      )
    ) {
      walletRequests.push({ source, address: validWalletAddress });
    }
    if (trades.length >= MAX_WHALE_TRADES) {
      omitted += 1;
      continue;
    }
    const trade: WhaleTradeContext = {
      source,
      eventSlug: eventSlug.slice(0, MAX_EVENT_SLUG_LENGTH),
      side: side.slice(0, 24),
      ...(asStr(row.eventTitle)
        ? { eventTitle: asStr(row.eventTitle)?.slice(0, 180) }
        : {}),
      ...(asStr(row.marketQuestion)
        ? { marketQuestion: asStr(row.marketQuestion)?.slice(0, 240) }
        : {}),
      ...(asStr(row.outcome)
        ? { outcome: asStr(row.outcome)?.slice(0, 120) }
        : {}),
      ...(asNum(row.usdValue) !== undefined
        ? { usdValue: asNum(row.usdValue) }
        : {}),
      ...(asNum(row.price) !== undefined ? { price: asNum(row.price) } : {}),
      ...(asStr(row.sourceMarketRef)
        ? { sourceMarketRef: asStr(row.sourceMarketRef)?.slice(0, 120) }
        : {}),
      ...(asStr(row.valueBasis)
        ? { valueBasis: asStr(row.valueBasis)?.slice(0, 64) }
        : {}),
      ...(asStr(row.evidenceType)
        ? { evidenceType: asStr(row.evidenceType)?.slice(0, 48) }
        : {}),
      ...(asStr(row.evidenceRef)
        ? { evidenceRef: asStr(row.evidenceRef)?.slice(0, 160) }
        : {}),
      ...(asNum(row.nativeValue) !== undefined
        ? { nativeValue: asNum(row.nativeValue) }
        : {}),
      ...(asStr(row.nativeCurrency)
        ? { nativeCurrency: asStr(row.nativeCurrency)?.slice(0, 24) }
        : {}),
      ...(asStr(row.availability) &&
      ["live", "delayed", "unavailable"].includes(asStr(row.availability)!)
        ? {
            availability: asStr(row.availability) as
              "live" | "delayed" | "unavailable",
          }
        : {}),
      ...(asStr(row.tradedAt)
        ? { tradedAt: asStr(row.tradedAt)?.slice(0, MAX_TIMESTAMP_LENGTH) }
        : {}),
      ...(asStr(row.observedAt)
        ? { observedAt: asStr(row.observedAt)?.slice(0, MAX_TIMESTAMP_LENGTH) }
        : {}),
      ...(asNum(row.latencySeconds) !== undefined
        ? { latencySeconds: asNum(row.latencySeconds) }
        : {}),
      ...(validWalletAddress ? { walletAddress: validWalletAddress } : {}),
    };
    trades.push(trade);
  }

  const wallets: WhaleWalletContext[] = [];
  let reason: WhaleContext["reason"];
  for (const request of walletRequests.slice(0, MAX_WHALE_WALLETS)) {
    const detail = await client.getPublicPmWhaleWallet(
      request.source,
      request.address,
      { timeoutMs: WHALE_READ_TIMEOUT_MS },
    );
    if (!detail.ok) {
      omitted += 1;
      reason ??= whaleFailure(detail);
      continue;
    }
    const wallet = compactWallet(detail.data, request.source, request.address);
    if (!wallet) {
      omitted += 1;
      reason ??= "invalid_payload";
      continue;
    }
    wallets.push(wallet);
  }
  return {
    status: reason ? "partial" : "available",
    fetchedAt: fetchedAt(),
    coverage: "relevant_events",
    trades,
    wallets,
    omitted,
    ...(reason ? { reason } : {}),
  };
}

// The agent's own settled PM forecast record changes only as bets settle, so
// it is read at most once per PM_CALIBRATION_TTL_MS per credential. The cache
// is module-level because the hosted scheduler builds a new client every
// cycle; it is keyed by a hash of base URL + API key, never the key itself.
// Every attempt (success, failure, or a backend without the field) is cached
// for the full TTL, a read is never retried (no 429 retry either) and it has
// its own short deadline, so it can neither block nor repeat within a cycle.
const PM_CALIBRATION_TTL_MS = 30 * 60_000;
const PM_CALIBRATION_READ_TIMEOUT_MS = 5_000;
const PM_CALIBRATION_CACHE_MAX = 2_000;
const pmCalibrationCache = new Map<
  string,
  { at: number; value: Promise<PmCalibration | undefined> }
>();

export function clearPmCalibrationCache(): void {
  pmCalibrationCache.clear();
}

export async function readPmCalibration(
  client: CoinRithmClient,
  trace?: AgentTrace,
  nowMs: number = Date.now(),
): Promise<PmCalibration | undefined> {
  try {
    const key = client.credentialFingerprint();
    const hit = pmCalibrationCache.get(key);
    if (hit && nowMs >= hit.at && nowMs - hit.at < PM_CALIBRATION_TTL_MS)
      return await hit.value;
    const value = client
      .performance(trace, {
        timeoutMs: PM_CALIBRATION_READ_TIMEOUT_MS,
        maxRetries: 0,
      })
      .then((r) =>
        r.ok ? pmCalibrationOf(asObj(r.data).pmCalibration) : undefined,
      )
      .catch(() => undefined);
    // Re-insert so Map order tracks recency, then drop the oldest entries.
    pmCalibrationCache.delete(key);
    pmCalibrationCache.set(key, { at: nowMs, value });
    for (const oldest of pmCalibrationCache.keys()) {
      if (pmCalibrationCache.size <= PM_CALIBRATION_CACHE_MAX) break;
      pmCalibrationCache.delete(oldest);
    }
    return await value;
  } catch {
    // A client without the read (or any synchronous failure) omits the block.
    return undefined;
  }
}

// The candle range is the agent's data diet (spec.data.indicatorRange, default
// 1D = 288 five-minute bars; 1W = 15m, 1M = 1h, 3M = 4h). Timestamps and gaps
// are checked separately; requesting a range does not establish freshness.

// `universe_scan` bounds: how many top movers to pull, and how many of those
// to fully resolve into tradable watch entries (each resolved row costs a
// resolve + market [+ candles] call).
//
// RESOLVE_TOP 3 -> 6 on 2026-08-21. Only a resolved row carries indicators, and
// therefore a `setups` flag; the unresolved remainder is bare symbol + 24h
// change + price. At 3, a discovery-driven strategy could reason properly about
// exactly three coins per cycle out of fifteen surfaced.
//
// That bit a real user case. A pump-fade agent identifies a candidate from a
// `stretched`/`fade-short` setup (RSI14 >= 68) and then waits for exhaustion,
// which by definition means RSI is NO LONGER extreme. Nothing persists between
// cycles, so the candidate has to still be a resolved row at the moment the
// exhaustion evidence appears. Discovery is gainers-ranked, so a retracing coin
// slides down the list — at 3 it fell out almost immediately and went blind
// exactly when the strategy needed to look at it.
//
// 6 roughly doubles how far a coin can slide before losing its indicators. Cost
// is 3 extra market+candles calls per cycle against CoinRithm's own API (never
// the model quota) and ~3 more watch entries in the prompt, and only for agents
// that declare universe_scan.
const UNIVERSE_SCAN_LIMIT = 15;
const UNIVERSE_RESOLVE_TOP = 6;

// A number that may arrive as a decimal string (the public movers feed).
const asNumLoose = (v: unknown): number | undefined => {
  if (typeof v === "number") return Number.isFinite(v) ? v : undefined;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
};

// Watchlist symbols -> the coin NAMES prediction-market titles use, so an agent
// discovers PM markets about the coins it actually has a price view on.
const PM_COIN_NAMES: Record<string, string> = {
  BTC: "Bitcoin",
  ETH: "Ethereum",
  SOL: "Solana",
  XRP: "XRP",
  DOGE: "Dogecoin",
  ADA: "Cardano",
  AVAX: "Avalanche",
  LINK: "Chainlink",
  BNB: "BNB",
  MATIC: "Polygon",
  DOT: "Polkadot",
  LTC: "Litecoin",
  SHIB: "Shiba",
  TRX: "Tron",
  UNI: "Uniswap",
  SUI: "Sui",
};

// Repeated micro-contracts are useful for execution smoke tests but are a poor
// forecasting universe: outcomes overlap heavily, resolve too quickly to admit
// meaningful independent research, and are priced off the same public spot
// prices the agent sees. In production (30 days to 2026-09-29) these churn rows
// were 72% of all LLM PM decisions and drowned the public scorecard in Bitcoin
// coin flips. Every non-mechanical agent (any objective, not only
// calibration) therefore receives a deeper discovery page with these rows
// removed. Mechanical baselines intentionally keep the unmodified universe so
// their reference contract remains reproducible.
const PM_CALIBRATION_CHURN_RE =
  /(updown|up-or-down|-5-?min|-5m-|-15m|15m(?:-|$)|(?:5|15)\s+min(?:ute)?s?|-1h-|hourly|-daily-|\bdaily\b|what-price-will[^\n]*(?:today|tomorrow)|-above-on-|-price-on-|this[ -]week|of[ -]the[ -]week|-weekly-)/i;

export function isCalibrationChurnMarket(market: {
  slug?: string;
  title?: string;
}): boolean {
  return PM_CALIBRATION_CHURN_RE.test(
    `${market.slug ?? ""} ${market.title ?? ""}`,
  );
}

// What one candles fetch yields beyond the bars: the indicator bundle and the
// coin's 24h volume. Live probe 2026-09-02 (GET /api/coins/bitcoin/candles?
// range=1D, the same loader as the agent endpoint): each bar's `v` is the
// tracked-exchange ROLLING 24h quote volume at that tick (288 five-minute bars
// of 2.2B-5.1B each; their sum was ~1T), so the LATEST bar's `v` IS the 24h
// volume and summing the bars would be wrong by ~288x.
interface CandleContext {
  indicators: IndicatorSet | null;
  indicatorContext?: IndicatorContext;
  volume24hUsd?: number;
  volumeMissingVenues?: number;
}

// The live endpoint's t is Unix seconds. Missing/malformed values (including
// millisecond epochs) stay unknown; never substitute retrieval time.
function candleTimestamp(value: unknown): number | undefined {
  return typeof value === "number" &&
    Number.isInteger(value) &&
    value > 0 &&
    value <= 253_402_300_799
    ? value
    : undefined;
}

function candleIntervals(
  times: Array<number | undefined>,
  intervalSeconds: number,
) {
  let timestampedBarCount = 0;
  let checkedIntervalCount = 0;
  let irregularIntervalCount = 0;
  let maxGapSeconds: number | undefined;
  for (let i = 0; i < times.length; i++) {
    const current = times[i];
    if (current === undefined) continue;
    timestampedBarCount++;
    const previous = times[i - 1];
    if (previous === undefined) continue;
    const gap = current - previous;
    checkedIntervalCount++;
    if (gap !== intervalSeconds) irregularIntervalCount++;
    maxGapSeconds = Math.max(maxGapSeconds ?? 0, gap);
  }
  const intervalStatus: IndicatorContext["intervalStatus"] =
    irregularIntervalCount > 0
      ? "irregular"
      : times.length < 2 || timestampedBarCount !== times.length
        ? "unknown"
        : "regular";
  return {
    barCount: times.length,
    timestampedBarCount,
    checkedIntervalCount,
    irregularIntervalCount,
    intervalStatus,
    ...(maxGapSeconds === undefined ? {} : { maxGapSeconds }),
  };
}

// Fetch candles for one coin and reduce them to a compact indicator bundle plus
// the 24h volume. Tolerant by design: any failure (HTTP error, malformed/sparse
// candles) yields null indicators so the cycle proceeds with price-only context
// rather than skipping.
async function fetchCandleContext(
  client: CoinRithmClient,
  coinId: string,
  range: IndicatorRange,
  trace?: AgentTrace,
): Promise<CandleContext> {
  const intervalSeconds = INDICATOR_RANGES[range];
  // The try honors the documented tolerance for SYNCHRONOUS throws too (an
  // unexpected client error must degrade to price-only context, never kill
  // the cycle).
  let cr: Awaited<ReturnType<CoinRithmClient["candles"]>>;
  try {
    cr = await client.candles(coinId, range, trace);
  } catch {
    return { indicators: null };
  }
  if (!cr.ok) return { indicators: null };
  // Endpoint shape: { candles: [{ t, o, h, l, c, v, vm }] } ascending (oldest first).
  const candles: Candle[] = [];
  const times: Array<number | undefined> = [];
  let latestVolume: number | undefined;
  let latestVolumeMissingVenues: number | undefined;
  for (const raw of asArr(asObj(cr.data).candles)) {
    const c = asObj(raw);
    const open = asNum(c.o);
    const high = asNum(c.h);
    const low = asNum(c.l);
    const close = asNum(c.c);
    if (open == null || high == null || low == null || close == null) continue;
    const volume = asNum(c.v);
    candles.push({ open, high, low, close, volume: volume ?? undefined });
    times.push(candleTimestamp(c.t));
    latestVolume = volume != null && volume >= 0 ? volume : undefined;
    const coverage = asNum(c.vm);
    latestVolumeMissingVenues =
      latestVolume != null &&
      coverage != null &&
      Number.isInteger(coverage) &&
      coverage >= 0
        ? coverage
        : undefined;
  }
  const latestTime = times.at(-1);
  const recent = candleIntervals(times.slice(-15), intervalSeconds);
  return {
    indicators: computeIndicators(candles),
    indicatorContext: {
      range,
      nominalIntervalSeconds: intervalSeconds,
      ...candleIntervals(times, intervalSeconds),
      ...(latestTime === undefined
        ? {}
        : { asOf: new Date(latestTime * 1000).toISOString() }),
      recent15: {
        barCount: recent.barCount,
        intervalStatus: recent.intervalStatus,
      },
    },
    volume24hUsd: latestVolume,
    volumeMissingVenues: latestVolumeMissingVenues,
  };
}

// The fundamentals leg of a watch entry, read from the /market context the
// entry is already built from (coin.categories, coin.marketCapRank,
// price.marketCapUsd). Absent fields stay absent.
function coinFundamentalsOf(
  m: Record<string, unknown>,
): CoinFundamentals | undefined {
  const coin = asObj(m.coin);
  const price = asObj(m.price);
  const out: CoinFundamentals = {};
  const categories = asArr(coin.categories)
    .map((c) => asStr(c))
    .filter((c): c is string => !!c)
    .slice(0, 3);
  if (categories.length > 0) out.categories = categories;
  const rank = asNum(coin.marketCapRank);
  if (rank != null) out.marketCapRank = rank;
  const marketCapUsd = asNum(price.marketCapUsd);
  if (marketCapUsd != null) out.marketCapUsd = marketCapUsd;
  return Object.keys(out).length > 0 ? out : undefined;
}

// Perpetual open interest from the same /market context (no extra call).
// Keep venue coverage with each delta: it need not cover the whole total.
// A malformed or absent block is omitted; a real zero reading is valid.
export function openInterestOf(
  m: Record<string, unknown>,
  nowMs = Date.now(),
): OpenInterestContext | undefined {
  const oi = asObj(asObj(m.derivatives).openInterest);
  const totalUsd = asNum(oi.totalUsd);
  const asOf = asStr(oi.asOf);
  const sourceMs = asOf ? Date.parse(asOf) : NaN;
  if (
    totalUsd == null ||
    totalUsd < 0 ||
    !asOf ||
    !Number.isFinite(sourceMs) ||
    sourceMs > nowMs + 60_000
  )
    return undefined;
  const names = (v: unknown): string[] =>
    Array.isArray(v)
      ? [
          ...new Set(
            v.filter((x): x is string => typeof x === "string" && x.length > 0),
          ),
        ].sort()
      : [];
  const change1hVenues = names(oi.change1hVenues);
  const change24hVenues = names(oi.change24hVenues);
  const pct = (v: unknown) => {
    const n = asNum(v);
    return n == null ? null : n;
  };
  return {
    totalUsd,
    venues: names(asArr(oi.venues).map((v) => asObj(v).venue)),
    change1hPct: change1hVenues.length ? pct(oi.change1hPct) : null,
    change1hVenues,
    change24hPct: change24hVenues.length ? pct(oi.change24hPct) : null,
    change24hVenues,
    asOf,
    stale: oi.stale !== false || nowMs - sourceMs > 45 * 60_000,
  };
}

// A provider time we can show: parseable and not more than 60 s ahead.
const shownTime = (v: unknown, nowMs: number): string | undefined => {
  const s = asStr(v);
  if (!s) return undefined;
  const ms = Date.parse(s);
  return Number.isFinite(ms) && ms <= nowMs + 60_000 ? s : undefined;
};

// A dated metric from the API's {value, asOf, stale}; omitted when malformed,
// negative or dated in the future. A real zero is valid.
const datedValueOf = (v: unknown, nowMs: number): DatedValue | undefined => {
  const o = asObj(v);
  const value = asNum(o.value);
  const asOf = shownTime(o.asOf, nowMs);
  if (value == null || value < 0 || !asOf) return undefined;
  return { value, asOf, stale: o.stale !== false };
};

// Binance positioning ratios from the same /market context (no extra call).
// Each metric keeps its own provider time; malformed metrics are dropped and
// the block is omitted when none is usable.
export function positioningOf(
  m: Record<string, unknown>,
  nowMs = Date.now(),
): PositioningContext | undefined {
  const p = asObj(asObj(m.derivatives).positioning);
  const venue = asStr(p.venue);
  const symbol = asStr(p.symbol);
  if (!venue || !symbol) return undefined;
  const out: PositioningContext = { venue, symbol };
  const a = datedValueOf(p.longShortAccountRatio, nowMs);
  const l = datedValueOf(p.longAccountPct, nowMs);
  const t = datedValueOf(p.topTraderPositionRatio, nowMs);
  const k = datedValueOf(p.takerBuySellRatio, nowMs);
  if (a) out.longShortAccountRatio = a;
  if (l && l.value <= 100) out.longAccountPct = l;
  if (t) out.topTraderPositionRatio = t;
  if (k) out.takerBuySellRatio = k;
  return Object.keys(out).length > 2 ? out : undefined;
}

const liquidationWindowOf = (v: unknown): LiquidationWindow | undefined => {
  const w = asObj(v);
  const longU = asNum(w.longLiquidatedUsdt);
  const shortU = asNum(w.shortLiquidatedUsdt);
  const events = asNum(w.events);
  const captured = asNum(w.capturedPct);
  if (
    longU == null ||
    shortU == null ||
    events == null ||
    captured == null ||
    longU < 0 ||
    shortU < 0 ||
    events < 0 ||
    !Number.isInteger(events) ||
    captured < 0 ||
    captured > 100
  )
    return undefined;
  return {
    longLiquidatedUsdt: longU,
    shortLiquidatedUsdt: shortU,
    events,
    capturedPct: captured,
  };
};

// OKX liquidations from the same /market context. Both windows must be well
// formed; capturedPct travels with every sum (a lower bound of our capture
// uptime, not exchange completeness). Event counts must be whole numbers.
export function liquidationsOf(
  m: Record<string, unknown>,
  nowMs = Date.now(),
): LiquidationContext | undefined {
  const q = asObj(asObj(m.derivatives).liquidations);
  const venue = asStr(q.venue);
  const instId = asStr(q.instId);
  const last1h = liquidationWindowOf(q.last1h);
  const last24h = liquidationWindowOf(q.last24h);
  if (!venue || !instId || !last1h || !last24h) return undefined;
  const lastEventAt =
    q.lastEventAt == null ? null : (shownTime(q.lastEventAt, nowMs) ?? null);
  return { venue, instId, last1h, last24h, lastEventAt };
}

// Macro proxies from the /market context (same block for every coin). Quotes
// that are malformed or future-dated are dropped; omitted when none remain.
export function macroOf(
  m: Record<string, unknown>,
  nowMs = Date.now(),
): MacroContext | undefined {
  const mc = asObj(m.macro);
  const note = asStr(mc.note);
  const quotes: MacroQuote[] = [];
  for (const raw of asArr(mc.quotes)) {
    const q = asObj(raw);
    const symbol = asStr(q.symbol);
    const label = asStr(q.label);
    const kind = asStr(q.kind);
    const price = asNum(q.price);
    const asOf = shownTime(q.asOf, nowMs);
    if (!symbol || !label || !kind || price == null || price <= 0 || !asOf)
      continue;
    const change = asNum(q.change24hPct);
    quotes.push({
      symbol,
      label,
      kind,
      price,
      change24hPct: change == null ? null : change,
      asOf,
      stale: q.stale !== false,
    });
  }
  return note && quotes.length > 0 ? { note, quotes } : undefined;
}

// Enrich a watch entry with what the candles fetch yields (indicators + 24h
// volume) when the `indicators` capability is on. One call, both fields.
async function enrichFromCandles(
  client: CoinRithmClient,
  entry: WatchEntry,
  coinId: string,
  range: IndicatorRange,
  trace?: AgentTrace,
): Promise<void> {
  const cc = await fetchCandleContext(client, coinId, range, trace);
  if (cc.indicators) entry.indicators = cc.indicators;
  if (cc.indicatorContext) entry.indicatorContext = cc.indicatorContext;
  if (cc.volume24hUsd != null) {
    entry.fundamentals = {
      ...(entry.fundamentals ?? {}),
      volume24hUsd: cc.volume24hUsd,
    };
  }
  if (cc.volumeMissingVenues != null) {
    entry.fundamentals = {
      ...(entry.fundamentals ?? {}),
      volumeMissingVenues: cc.volumeMissingVenues,
    };
  }
}

const HEADLINES_PER_COIN = 3;
const HEADLINE_TITLE_CHARS = 110;
const escapeRegExp = (s: string): string =>
  s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Attribute the fetched news to the coins on watch: by the curated slug link
// when the entry's slug is known (the graph, never a fuzzy match), else by a
// case-insensitive coin-name or exact-case ticker mention in the title. At most
// HEADLINES_PER_COIN per coin, in the API's importance-then-recency order.
function attachHeadlines(watch: WatchEntry[], items: NewsItem[]): void {
  for (const w of watch) {
    const slug = (w.slug ?? "").toLowerCase();
    const name = (w.name ?? "").toLowerCase();
    const tickerRe = new RegExp(`\\b${escapeRegExp(w.symbol)}\\b`);
    const mine = items
      .filter((it) => {
        if (slug) return (it.coins ?? []).some((c) => c.toLowerCase() === slug);
        const title = it.title.toLowerCase();
        return (
          (name.length >= 3 && title.includes(name)) || tickerRe.test(it.title)
        );
      })
      .slice(0, HEADLINES_PER_COIN);
    if (mine.length === 0) continue;
    w.fundamentals = {
      ...(w.fundamentals ?? {}),
      headlines: mine.map((it) => ({
        title: it.title.slice(0, HEADLINE_TITLE_CHARS),
        ...(it.publishedAt ? { at: it.publishedAt } : {}),
        ...(it.importance != null ? { importance: it.importance } : {}),
        ...(it.sentiment ? { sentiment: it.sentiment } : {}),
      })),
    };
  }
}

// Does a market title reference the given watchlist coin? Matches on the PM coin
// NAME ("Bitcoin") or the ticker ("BTC"), case-insensitively — the discover `q`
// is a phrase match so a q=Bitcoin result reliably carries "Bitcoin"/"BTC" in the
// title. Used both to decide whether the primary board already covers the coin the
// agent analysed and to keep the secondary (crypto-targeted) fetch on-topic.
function titleMentionsCoin(title: string | undefined, symbol: string): boolean {
  const t = (title ?? "").toLowerCase();
  if (!t) return false;
  const name = (PM_COIN_NAMES[symbol] ?? symbol).toLowerCase();
  const sym = symbol.toLowerCase();
  return t.includes(name) || t.includes(sym);
}

// Expand one raw /api/agent/pm/discover payload into per-outcome PmMarket rows
// (WITHOUT a ref — refs are stamped once over the final merged+sliced list so they
// stay contiguous pm1..pmN). One row per quoteable outcome; drops outcomes the
// backend flagged not-openable (eligible === false) and markets the agent already
// holds (heldPmKeys). Shared by the primary board fetch and the crypto-targeted
// secondary fetch so both go through the exact same filters.
function expandPmMarkets(
  discData: unknown,
  heldPmKeys: Set<string>,
): Omit<PmMarket, "ref">[] {
  const dd = asObj(discData);
  return (
    asArr(dd.data ?? dd.markets ?? dd.results)
      .map(asObj)
      .flatMap((ev) => {
        // Explicit negative evidence removes only NEW-entry candidates. Unknown
        // quality stays unknown; fresh quote + transactional guards remain final.
        if (
          ev.eligible === false ||
          asObj(ev.quality).decisionEligible === false
        )
          return [];
        const source = (asStr(ev.source) ?? "").toLowerCase();
        const slug = (asStr(ev.slug) ?? "").toLowerCase();
        // Keep titles SHORT: the model only needs to recognise the market.
        // Untrimmed titles, one per outcome across many events, ballooned the
        // prompt to ~69k tokens (413s on small-context free models).
        const title = (asStr(ev.title) ?? asStr(ev.question) ?? "").slice(
          0,
          80,
        );
        const freshness = freshnessOf(ev); // freshness is event-level
        const quality = pmQualityOf(ev.quality);
        const decisionSupport = pmDecisionSupportOf(ev.decisionSupport);
        // Event-level 24h volume (the discover payload's `volume24h`, USD). Feeds
        // the mechanical BENCHMARK agents' deterministic highest-volume pick rule.
        // Same for every outcome of the event; undefined on an older backend.
        const volumeUsd = asNum(ev.volume24h) ?? undefined;
        // Event-level cross-venue consensus, copied onto every outcome row of
        // the event as-is (never mapped to or flipped for a specific outcome).
        const consensus = pmConsensusOf(ev);
        // Event-level settlement terms, likewise copied to every outcome row;
        // the prompt prints them once per event.
        const rules = pmSettlementRuleOf(ev);
        // At most a few outcomes per event so a wide multi-outcome market
        // (e.g. dozens of price buckets) can't explode the prompt. Drop
        // outcomes the backend flagged NOT openable (eligible === false) so the
        // model never bets a market that would fail the binary entry gate at
        // quote. Back-compat: an older backend omits `eligible` (undefined) ->
        // the outcome is kept (current behaviour).
        const outcomes = (
          Object.hasOwn(ev, "outcomes") ? asArr(ev.outcomes) : [ev]
        )
          .map(asObj)
          .filter((o) => o.eligible !== false)
          .filter((o) => {
            const p = asNum(o.probability);
            return p != null && p >= 0 && p <= 100;
          })
          .slice(0, 3);
        // Only an absent legacy outcomes field permits the flat fallback. A
        // present empty/malformed/all-rejected array must never resurrect ev.
        return outcomes.map((o) => {
          // This outcome's own rule for a per-outcome event (bound by market
          // id at the API); undefined when the rule is not per-outcome.
          const outcomeRule = pmOutcomeRuleOf(rules, o);
          return {
            source,
            slug,
            outcomeExternalMarketId:
              asStr(o.externalMarketId) ??
              asStr(o.outcomeExternalMarketId) ??
              "",
            // Carry the odds through: the model needs the outcome label + current
            // probability to spot a mispriced market and bet it.
            outcomeName: asStr(o.name) ?? asStr(o.outcomeName) ?? undefined,
            // Backend returns probability as 0..100 (percent) — normalise to 0..1
            // to match the prompt's "0..1" framing (probed 2026-06-24).
            probability: ((p) =>
              p == null || p < 0 || p > 100 ? undefined : p / 100)(
              asNum(o.probability),
            ),
            title,
            freshness,
            quality,
            decisionSupport,
            volumeUsd,
            // Event-level fundamentals from the same payload (slice 2): the
            // resolution date and the venue-reported liquidity (USD).
            endDate: asStr(ev.endDate) ?? undefined,
            liquidityUsd: asNum(ev.liquidity) ?? undefined,
            ...(consensus !== undefined ? { consensus } : {}),
            ...(rules !== undefined ? { rules } : {}),
            ...(outcomeRule ? { outcomeRule } : {}),
          };
        });
      })
      .filter(
        (m) =>
          m.source &&
          m.slug &&
          m.outcomeExternalMarketId &&
          m.probability != null,
      )
      // Drop already-held markets so the model only sees markets it can actually
      // open — done BEFORE any slice so held positions don't consume candidate slots.
      .filter(
        (m) =>
          !heldPmKeys.has(
            `${m.source.toLowerCase()}|${m.slug.toLowerCase()}|${m.outcomeExternalMarketId}`,
          ),
      )
  );
}

function emptyObservation(state: RunState, scopes: string[] = []): Observation {
  return {
    asOf: state.cursor ?? new Date().toISOString(),
    scopes,
    cashAvailableMusd: null,
    equityMusd: null,
    openPositions: [],
    openOrders: [],
    pmPositions: [],
    pmResolutions: [],
    pmMarkets: [],
    watch: [],
    setups: [],
    syncCursor: state.cursor,
    newClosedTrades: [],
    polledBeforeWrite: false,
  };
}

export async function observe(
  client: CoinRithmClient,
  spec: AgentSpec,
  state: RunState,
  trace?: AgentTrace,
): Promise<ObserveOutput> {
  const meR = await client.me(trace);
  if (!meR.ok)
    return {
      observation: emptyObservation(state),
      skip: `me failed (HTTP ${meR.status})`,
    };
  const scopes = asArr(asObj(meR.data).scopes).filter(
    (s): s is string => typeof s === "string",
  );

  const [portR, walletR, posR] = await Promise.all([
    client.portfolio(trace),
    client.wallet(undefined, trace),
    client.futuresPositions(undefined, trace),
  ]);
  if (!portR.ok || !walletR.ok || !posR.ok) {
    return {
      observation: emptyObservation(state, scopes),
      skip: "required reads failed (portfolio/wallet/positions)",
    };
  }

  const usdt = asObj(asObj(walletR.data).usdt);
  const equity = asObj(asObj(portR.data).equity);
  const cashAvailableMusd =
    asNum(usdt.available) ?? asNum(equity.availableUsd) ?? null;
  const equityMusd =
    asNum(equity.totalUsd) ?? asNum(asObj(portR.data).equityUsd) ?? null;

  const openPositions: OpenPosition[] = asArr(asObj(posR.data).positions)
    .map(asObj)
    .filter((p) => (asStr(p.status) ?? "open") === "open")
    .map((p) => {
      // /positions/futures returns the coin NESTED ({ucid,symbol,name}); the old
      // p.coinId/p.symbol reads were undefined (same field-drift class as the PM
      // dup-guard bug) — the model couldn't tell which coin a position was on.
      // It ALSO dropped every per-position price the backend already returns, so
      // the model proposed SL/TP blind to mark + liquidation (→ the
      // take_profit_not_*_mark + stop_loss_not_above_liquidation reject waves)
      // and could not tell a winner from a small loser before a manual close.
      // Tolerant fallbacks keep older/mocked shapes working.
      const coin = asObj(p.coin);
      const fundingPaidMusd = Object.prototype.hasOwnProperty.call(
        p,
        "fundingPaidMusd",
      )
        ? (asNum(p.fundingPaidMusd) ??
          (p.fundingPaidMusd === null ? null : undefined))
        : undefined;
      const fundingAppliedThrough = Object.prototype.hasOwnProperty.call(
        p,
        "fundingAppliedThrough",
      )
        ? (asStr(p.fundingAppliedThrough) ??
          (p.fundingAppliedThrough === null ? null : undefined))
        : undefined;
      return {
        venue: "futures" as const,
        id: Number(asNum(p.id) ?? p.id),
        ...(usesCapitalSizing(spec) ? { walletId: asNum(p.walletId) } : {}),
        coinId: asStr(coin.ucid) ?? asStr(p.coinId),
        symbol: asStr(coin.symbol) ?? asStr(p.symbol),
        side: asStr(p.side),
        status: asStr(p.status) ?? "open",
        leverage: asNum(p.leverage),
        marginMusd: asNum(p.marginMusd),
        unrealizedPnlMusd: asNum(p.unrealizedPnlMusd),
        ...(fundingPaidMusd !== undefined ? { fundingPaidMusd } : {}),
        ...(fundingAppliedThrough !== undefined
          ? { fundingAppliedThrough }
          : {}),
        entryPrice: asNum(p.entryPrice),
        markPrice: asNum(p.markPrice),
        liquidationPrice: asNum(p.liquidationPrice),
        stopLossPrice: asNum(p.stopLossPrice),
        takeProfitPrice: asNum(p.takeProfitPrice),
        openedAt: asStr(p.openedAt),
      };
    });

  // Sync poll: /trades since the persisted cursor.
  const tradesR = await client.trades(
    {
      venue: "futures",
      updatedSince: state.cursor ?? undefined,
      // Cap the sync poll: an unbounded fetch against a SHARED trade book (or an
      // old cursor) could pull thousands of rows into the prompt. 50 newest is
      // ample for the agent to react to its own fills/stops since last cycle.
      limit: state.cursor ? 50 : 1,
    },
    trace,
  );
  let polledBeforeWrite = false;
  let newClosedTrades: Record<string, unknown>[] = [];
  let syncCursor = state.cursor;
  if (tradesR.ok) {
    polledBeforeWrite = true;
    const td = asObj(tradesR.data);
    syncCursor = asStr(td.asOf) ?? state.cursor;
    newClosedTrades = asArr(td.trades)
      .map(asObj)
      .filter(
        (t) =>
          !state.seen.includes(
            `${asStr(t.venue) ?? "futures"}:${asNum(t.id) ?? t.id}`,
          ),
      );
  }

  // Watchlist market context.
  const watch: WatchEntry[] = [];
  let resolvedAny = false;
  // Bounded RAG: the market-wide Fear & Greed regime, captured once from the first
  // coin's /market context (it's market-wide, identical across coins).
  let marketMood: Observation["marketMood"];
  let macro: Observation["macro"];
  const wantIndicators = spec.capabilities.includes("indicators");
  const wantNews = spec.capabilities.includes("news");
  for (const symbol of spec.risk.watchlist) {
    const rs = await client.resolve(symbol, trace);
    const match = asObj(asObj(rs.data).match);
    const coinId = rs.ok && match.coinId != null ? String(match.coinId) : null;
    if (!coinId) {
      watch.push({ symbol, coinId: null });
      continue;
    }
    resolvedAny = true;
    const mk = await client.market(coinId, trace);
    const m = asObj(mk.data);
    const price = asObj(m.price);
    const entry: WatchEntry = {
      symbol,
      coinId,
      name: asStr(match.name),
      priceUsd: asNum(price.usd),
      change1h: asNum(price.change1h),
      change24h: asNum(price.change24h),
      change7d: asNum(price.change7d),
      // Community sentiment (already in the /market context, was stripped).
      ...sentimentContextOf(m),
      // Freshness lives under the response's `observation` block.
      freshness: freshnessOf(asObj(m.observation)),
      // Server futures-reference eligibility (undefined = unknown, older API).
      futuresEntryEligibility: futuresEntryEligibilityOf(m),
      // Canonical slug (the news graph's key): from the resolve match, else
      // the market context's observation.dataset.coinSlug.
      slug:
        asStr(match.slug) ??
        asStr(asObj(asObj(m.observation).dataset).coinSlug),
    };
    const fundamentals = coinFundamentalsOf(m);
    if (fundamentals) entry.fundamentals = fundamentals;
    const openInterest = openInterestOf(m);
    if (openInterest) entry.openInterest = openInterest;
    const positioning = positioningOf(m);
    if (positioning) entry.positioning = positioning;
    const liquidations = liquidationsOf(m);
    if (liquidations) entry.liquidations = liquidations;
    // Macro proxies are the same for every coin: keep the first usable block.
    if (!macro) macro = macroOf(m);
    // Capture the market-wide Fear & Greed regime once (same across coins).
    if (!marketMood) {
      const fg = asObj(m.fearGreed);
      const v = asNum(fg.value);
      const fetchedAt = contextTimestamp(fg.fetchedAt);
      if (v != null)
        marketMood = {
          fearGreed: v,
          label: asStr(fg.label) ?? "",
          ...(fetchedAt ? { fetchedAt } : {}),
        };
    }
    // `indicators` capability: enrich the observation with computed TA so the
    // model reasons over structure (trend/momentum/volatility/breakout) instead
    // of price + %change alone. Backed by the candles endpoint's shared cache.
    if (wantIndicators)
      await enrichFromCandles(
        client,
        entry,
        coinId,
        indicatorRangeOf(spec),
        trace,
      );
    watch.push(entry);
  }

  // `universe_scan` capability (2026-08-18, direct user request): discover the
  // top 24h movers across the whole tracked universe, resolve the strongest
  // few into FULL watch entries (marked discovered) and pass the remainder as
  // compact context. Bounds: one movers call + up to
  // UNIVERSE_RESOLVE_TOP resolve/market(+candles) calls per cycle — the same
  // per-symbol cost as ~3 extra watchlist rows, all against CoinRithm's own
  // API (never the model quota). Failures degrade to "no universe section",
  // never a skipped cycle. Watchlist + blocklist symbols are excluded up
  // front so a discovered row can never duplicate or bypass the deny-list.
  let universeMovers: Observation["universeMovers"];
  if (scansUniverse(spec)) {
    const excluded = new Set(
      [...spec.risk.watchlist, ...(spec.risk.blocklist ?? [])].map((s) =>
        s.toUpperCase(),
      ),
    );
    // Declared boundaries ask the screener; otherwise keep the original
    // top-gainers scan exactly. Either way the rows share one resolve path.
    let rows: UniverseRow[] = [];
    let resolveTopCount = UNIVERSE_RESOLVE_TOP;
    if (spec.universe) {
      const q = universeQuery(spec.universe);
      resolveTopCount = universeResolveTop(spec.universe);
      const ur = await client.agentUniverse(universeQueryParams(q), trace);
      if (ur.ok) {
        rows = filterUniverseRows(
          asArr(asObj(ur.data).rows)
            .map(asObj)
            .map((r) => ({
              symbol: (asStr(r.symbol) ?? "").toUpperCase(),
              name: asStr(r.name),
              slug: asStr(r.slug),
              coinId: asStr(r.ucid),
              marketCapRank: asNum(r.marketCapRank) ?? undefined,
              priceUsd: asNumLoose(r.priceUsd),
              change24h: asNumLoose(r.change24h),
              volume24hUsd: asNumLoose(r.volume24hUsd),
              // Missing stays missing: the filter must not read an absent
              // sector list as "no excluded sector".
              sectors: universeSectorsOf(r.sectors),
            })),
          q,
        );
      }
    } else {
      const mv = await client.cryptoMovers(
        "gainers",
        UNIVERSE_SCAN_LIMIT,
        trace,
      );
      if (mv.ok && Array.isArray(mv.data)) {
        rows = mv.data.map(asObj).map((r) => ({
          symbol: (asStr(r.symbol) ?? "").toUpperCase(),
          name: asStr(r.name),
          // Both serialize as decimal STRINGS on the live feed (openapi
          // PublicCryptoMover; probed 2026-09-02: "72.34"), so the strict
          // asNum read left them undefined. Parse the numeric string.
          change24h: asNumLoose(r.change24h),
          priceUsd: asNumLoose(r.currentPrice),
          slug: asStr(r.slug),
          // The movers row already carries the ucid, which IS the coinId every
          // downstream call takes. Kept so the resolve round-trip below can be
          // skipped — see the comment there.
          coinId: asStr(r.ucid),
        }));
      }
    }
    rows = rows.filter((r) => r.symbol && !excluded.has(r.symbol));

    for (const row of rows.slice(0, resolveTopCount)) {
      // Prefer the ucid the feed already gave us. Resolving the SYMBOL
      // instead was both a wasted call per discovered mover and a correctness
      // hazard: symbols collide across listings, so the resolver could hand
      // back a different coin than the one that actually moved, and the
      // agent would analyze (and trade) that other coin.
      let coinId = row.coinId;
      let resolvedName: string | undefined;
      if (!coinId) {
        const rs = await client.resolve(row.symbol, trace);
        const match = asObj(asObj(rs.data).match);
        coinId =
          rs.ok && match.coinId != null ? String(match.coinId) : undefined;
        resolvedName = asStr(match.name);
      }
      if (!coinId) continue;
      const mk = await client.market(coinId, trace);
      const m = asObj(mk.data);
      const price = asObj(m.price);
      const entry: WatchEntry = {
        symbol: row.symbol,
        coinId,
        name: resolvedName ?? row.name ?? undefined,
        priceUsd: asNum(price.usd) ?? row.priceUsd,
        change1h: asNum(price.change1h),
        change24h: asNum(price.change24h) ?? row.change24h,
        change7d: asNum(price.change7d),
        ...sentimentContextOf(m),
        freshness: freshnessOf(asObj(m.observation)),
        futuresEntryEligibility: futuresEntryEligibilityOf(m),
        discovered: true,
        slug: row.slug ?? asStr(asObj(asObj(m.observation).dataset).coinSlug),
      };
      const fundamentals = coinFundamentalsOf(m);
      if (fundamentals) entry.fundamentals = fundamentals;
      const openInterest = openInterestOf(m);
      if (openInterest) entry.openInterest = openInterest;
      const positioning = positioningOf(m);
      if (positioning) entry.positioning = positioning;
      const liquidations = liquidationsOf(m);
      if (liquidations) entry.liquidations = liquidations;
      if (!macro) macro = macroOf(m);
      if (wantIndicators)
        await enrichFromCandles(
          client,
          entry,
          coinId,
          indicatorRangeOf(spec),
          trace,
        );
      watch.push(entry);
    }
    const context = rows
      .slice(resolveTopCount)
      .map(({ symbol, name, change24h, priceUsd }) => ({
        symbol,
        name,
        change24hPct: change24h,
        priceUsd,
      }));
    if (context.length > 0) universeMovers = context;

    // Watchlist coins must also prove they are inside declared boundaries
    // before a new entry (universeEntryBlock). Bounded membership batches use
    // the same filters; a failed batch leaves its coins unverified (no entries),
    // never silently eligible. Held positions stay closable either way.
    if (spec.universe) {
      const toCheck = watch.filter((w) => !w.discovered && w.coinId);
      const ids = [...new Set(toCheck.map((w) => w.coinId as string))];
      for (
        let offset = 0;
        offset < ids.length;
        offset += UNIVERSE_MAX_SCAN_LIMIT
      ) {
        const batch = ids.slice(offset, offset + UNIVERSE_MAX_SCAN_LIMIT);
        const q = {
          ...universeQuery(spec.universe),
          sort: "rank" as const,
          limit: batch.length,
        };
        const mr = await client.agentUniverse(
          universeQueryParams(q, batch),
          trace,
        );
        if (mr.ok) {
          const inside = new Set(
            filterUniverseRows(
              asArr(asObj(mr.data).rows)
                .map(asObj)
                .map((r) => ({
                  symbol: (asStr(r.symbol) ?? "").toUpperCase(),
                  coinId: asStr(r.ucid),
                  marketCapRank: asNum(r.marketCapRank) ?? undefined,
                  volume24hUsd: asNumLoose(r.volume24hUsd),
                  sectors: universeSectorsOf(r.sectors),
                })),
              q,
            ).map((r) => r.coinId),
          );
          const checked = new Set(batch);
          for (const w of toCheck) {
            if (checked.has(w.coinId!))
              w.withinBoundaries = inside.has(w.coinId!);
          }
        }
      }
    }
  }

  // Spot resting orders (for cancel + affordability) — only if spot is enabled.
  const wantSpot = spec.venues.includes("spot");
  const wantPm = spec.venues.includes("pm");

  let openOrders: SpotOrder[] = [];
  if (wantSpot) {
    const ordR = await client.openOrders(undefined, trace);
    if (ordR.ok) {
      const od = asObj(ordR.data);
      openOrders = asArr(od.orders ?? od.openOrders)
        .map(asObj)
        .filter((o) => (asStr(o.status) ?? "open") === "open")
        .map((o) => ({
          id: Number(asNum(o.id) ?? o.id),
          coinId: asStr(o.coinId),
          symbol: asStr(o.symbol),
          side: asStr(o.side),
          orderType: asStr(o.orderType),
          quantity: asNum(o.quantity),
          status: asStr(o.status) ?? "open",
        }));
    }
  }

  // PM open positions + discovered quote-ready candidates — only if pm enabled.
  let pmPositions: PmPosition[] = [];
  let capitalPmData: unknown;
  let pmResolutions: PmResolution[] = [];
  let pmMarkets: PmMarket[] = [];
  let pmCalibration: PmCalibration | undefined;
  if (wantPm) {
    // Curated board for every non-mechanical agent: churn rows removed and a
    // deeper page so the filter does not empty it (see PM_CALIBRATION_CHURN_RE).
    const curatedPmBoard = spec.model?.provider !== "mechanical";
    const primaryDiscoveryLimit = curatedPmBoard ? 30 : 12;
    // Bias PM discovery toward CRYPTO markets the agent has a price view on, the
    // only PM markets where a price agent's view is even relevant (probed
    // 2026-06-24: the default board is World Cup / elections / F1). The discover
    // `q` is an AND/phrase match, so query ONE coin — the agent's TOP watchlist coin,
    // where its price view is sharpest — never the joined list (matches ~nothing).
    // Fall back to Bitcoin (always plentiful) — NEVER the general non-crypto board.
    const topCoin = (spec.risk.watchlist[0] ?? "").toUpperCase();
    const pmQuery =
      PM_COIN_NAMES[topCoin] ?? spec.risk.watchlist[0] ?? "Bitcoin";
    // The own-calibration read runs alongside the PM reads (cached, bounded,
    // never fatal). Mechanical agents have no prompt, so they skip it.
    const [pmPosR, pmDiscFirst, calibration] = await Promise.all([
      client.pmPositions(undefined, trace),
      client.discoverPmMarkets(
        { q: pmQuery, limit: primaryDiscoveryLimit },
        trace,
      ),
      curatedPmBoard
        ? readPmCalibration(client, trace)
        : Promise.resolve(undefined),
    ]);
    pmCalibration = calibration;
    let pmDiscR = pmDiscFirst;
    const firstCount = pmDiscR.ok
      ? asArr(
          asObj(pmDiscR.data).data ??
            asObj(pmDiscR.data).markets ??
            asObj(pmDiscR.data).results,
        ).length
      : 0;
    if (firstCount < 3 && pmQuery !== "Bitcoin") {
      // Same page depth as the primary: the Bitcoin board is the most
      // churn-heavy query, so a 12-row page could filter down to nothing.
      const fb = await client.discoverPmMarkets(
        { q: "Bitcoin", limit: primaryDiscoveryLimit },
        trace,
      );
      if (fb.ok) pmDiscR = fb;
    }
    if (pmPosR.ok) {
      capitalPmData = pmPosR.data;
      pmPositions = asArr(asObj(pmPosR.data).positions)
        .map(asObj)
        .filter((p) => (asStr(p.status) ?? "open") === "open")
        .map((p) => ({
          id: Number(asNum(p.id) ?? p.id),
          ...(usesCapitalSizing(spec) ? { walletId: asNum(p.walletId) } : {}),
          // The /positions/pm API returns `eventSlug` and the outcome id NESTED at
          // outcome.externalMarketId — NOT `slug` / `outcomeExternalMarketId`.
          // Reading the wrong keys left both undefined, which silently broke the
          // PM anti-churn guard (it could never match a held position) AND the
          // model's view of what it holds. Tolerant fallbacks keep older/mocked
          // shapes working.
          source: asStr(p.source),
          slug: asStr(p.eventSlug) ?? asStr(p.slug),
          outcomeExternalMarketId:
            asStr(asObj(p.outcome).externalMarketId) ??
            asStr(p.outcomeExternalMarketId),
          stakeMusd: asNum(p.stakeMusd),
          // Mark-to-market unrealized (field is `unrealizedPnl` on /positions/pm).
          // Feeds the equity-drawdown kill-switch so a large PM book that marks
          // down trips the stop too — not just futures.
          unrealizedPnlMusd:
            asNum(p.unrealizedPnl) ?? asNum(p.unrealizedPnlMusd),
          status: asStr(p.status) ?? "open",
          // Slice 2: what the bet IS (title, side) and its entry vs CURRENT
          // outcome probability (0..100 points; current only while open), so
          // the model and the thesis evaluator can re-judge a held bet.
          title: (asStr(p.eventTitle) ?? asStr(p.title))?.slice(0, 80),
          side: asStr(p.side),
          entryProbability: asNum(p.entryProbability),
          currentProbability: asNum(p.currentProbability),
          openedAt: asStr(p.openedAt),
        }));
      // Settlement-feedback loop: the SAME /positions/pm response carries an
      // additive `recentlyResolved` array — the agent's OWN bets that settled
      // win/loss/void since last cycle, with realized pnl. Surface it as reflective
      // context so the model learns from how its predictions actually resolved
      // (reinforce what worked, avoid what didn't). NOT an action — the runner never
      // bets off this. Fail-safe: an absent/old backend omits the key → [] (the
      // ?? [] in asArr + the guarded map), so this never breaks the open feed.
      pmResolutions = asArr(asObj(pmPosR.data).recentlyResolved)
        .map(asObj)
        .map((r) => ({
          id: Number(asNum(r.id) ?? r.id),
          // The backend nests the outcome label/title; carry the human-readable
          // title (or fall back to the slug) so the prompt can name the market.
          eventTitle:
            asStr(r.eventTitle) ?? asStr(asObj(r.event).title) ?? undefined,
          slug: asStr(r.eventSlug) ?? asStr(r.slug),
          side: asStr(r.side),
          status: asStr(r.status),
          pnlMusd: asNum(r.pnlMusd),
          stakeMusd: asNum(r.stakeMusd),
        }))
        // A resolution with no id is unusable for the model's reflection; drop it.
        .filter((r) => Number.isFinite(r.id))
        // Bound the block: a short recent window is enough reflective context, and
        // the backend already caps at ~25; cap again so a noisy response can't bloat
        // the prompt.
        .slice(0, 25);
    }
    if (pmDiscR.ok) {
      // Anti-churn: exclude markets the agent ALREADY holds an open position in
      // from the candidate list BEFORE it reaches the prompt — so the model never
      // sees (and re-picks) a held market only to have the runner/server reject it
      // as a duplicate, burning a whole cycle. Keyed source|slug|outcomeExternalMarketId
      // (lower-cased to match the discover rows). The runner preflight guard
      // (duplicate_intent) + server dedup (duplicate_open) remain the backstops.
      // Side-agnostic = no re-bet/hedge on a held outcome, matching the runner policy.
      const heldPmKeys = new Set(
        pmPositions
          .filter((p) => (p.status ?? "open") === "open")
          .map(
            (p) =>
              `${(p.source ?? "").toLowerCase()}|${(p.slug ?? "").toLowerCase()}|${p.outcomeExternalMarketId ?? ""}`,
          ),
      );
      // Real /api/agent/pm/discover payload: { data: [event], pagination, meta }.
      // Each EVENT carries source/slug/title/freshness at the top level and the
      // quoteable id NESTED at outcomes[].externalMarketId — expandPmMarkets turns
      // that into one row per quoteable outcome (eligible + not-held filtered).
      let mergedRows = expandPmMarkets(pmDiscR.data, heldPmKeys);
      if (curatedPmBoard) {
        mergedRows = mergedRows.filter(
          (market) => !isCalibrationChurnMarket(market),
        );
      }

      // ── Crypto-targeted secondary discover (pm_ref hallucination fix) ────────
      // The prompt tells the model crypto price markets are where its price view
      // is at least relevant, but that is only usable if the board actually LISTS
      // a market for the coin it analysed. The primary board is keyed to ONE query
      // (the top watchlist coin, with a Bitcoin fallback when that coin is thin),
      // so an agent whose top coin got displaced by the Bitcoin fallback sees NO
      // market for the coin it has a view on and an 8B model invents a pmN ref
      // (→ pm_ref_unknown, wasted cycle). When the top ANALYSED coin (its sharpest
      // edge) has no market in the primary board, fire ONE extra discover for that
      // coin and MERGE it in — giving the model a real ref to bet instead of a
      // hallucinated one. Budget: at most a single additional CoinRithm data-API
      // read, and only on cycles where the top coin is actually missing; the shared
      // free-tier model-call RateBudget (scheduler) is untouched — this is a read,
      // not an LLM call, and the client already backs off on 429.
      const analyzedCoins = watch
        .filter((w) => w.coinId)
        .map((w) => w.symbol.toUpperCase());
      const topAnalyzed = analyzedCoins[0];
      const primaryCoversTop =
        !topAnalyzed ||
        mergedRows.some((m) => titleMentionsCoin(m.title, topAnalyzed));
      if (topAnalyzed && !primaryCoversTop) {
        const targetName = PM_COIN_NAMES[topAnalyzed] ?? topAnalyzed;
        // limit 6 (not ~5): the eligible/held/dedupe filters shave the list, and we
        // then cap the merged contribution to 4 targeted rows below.
        const secR = await client.discoverPmMarkets(
          { q: targetName, limit: 6 },
          trace,
        );
        if (secR.ok) {
          // Dedupe the secondary rows against the primary list by source+slug (event
          // key) so a market already on the board is never shown twice, and keep only
          // rows that actually reference the targeted coin (a fuzzy backend match
          // can't dilute the board with off-topic events).
          const primaryEventKeys = new Set(
            mergedRows.map((m) => `${m.source}|${m.slug}`),
          );
          let secRows = expandPmMarkets(secR.data, heldPmKeys)
            .filter((m) => titleMentionsCoin(m.title, topAnalyzed))
            .filter((m) => !primaryEventKeys.has(`${m.source}|${m.slug}`));
          if (curatedPmBoard) {
            secRows = secRows.filter(
              (market) => !isCalibrationChurnMarket(market),
            );
          }
          secRows = secRows.slice(0, 4);
          // Reserve slots for the targeted rows so the 12-cap can't slice off the
          // very markets the secondary fetch exists to surface. Primary rows keep
          // priority; the targeted rows are appended.
          if (secRows.length > 0) {
            const primaryBudget = Math.max(0, 12 - secRows.length);
            mergedRows = [...mergedRows.slice(0, primaryBudget), ...secRows];
          }
        }
      }

      // Hard cap the PM block (a handful of fresh markets is plenty) and stamp a
      // short, stable per-cycle ref (pm1…pmN) the model copies instead of the long
      // outcomeExternalMarketId. Refs are assigned AFTER the merge + slice so they
      // are a contiguous 1..N matching exactly what the prompt shows.
      pmMarkets = mergedRows
        .slice(0, 12)
        .map((m, i) => ({ ...m, ref: `pm${i + 1}` }));
    }
  }

  // News context (only with the `news` capability): recent high-importance news
  // for the coins the agent is actually LOOKING AT this cycle — the watch array,
  // which includes any `universe_scan`-discovered movers. Keying this to the
  // static watchlist alone (the old behavior) starved exactly the case news
  // exists for: a discovered pump whose catalyst the agent is supposed to
  // investigate before acting (the pump-fade pattern, 2026-08-19). One cached
  // call; degrades to no news on failure (never blocks a cycle).
  let news: NewsItem[] | undefined;
  const newsCoins = Array.from(
    new Set([
      ...spec.risk.watchlist,
      ...watch.map((w) => w.symbol.toUpperCase()),
    ]),
  );
  if (wantNews && newsCoins.length > 0) {
    // limit 12 (was 8): the same single cached call now also feeds up to 3
    // headlines per coin (slice 2 fundamentals); the prompt's news block is
    // still capped at 6 below.
    const nr = await client.agentNews(
      { coins: newsCoins.join(","), limit: 12, hours: 48 },
      trace,
    );
    if (nr.ok) {
      const fetched: NewsItem[] = asArr(asObj(nr.data).items)
        .map(asObj)
        .map((it) => ({
          title: (asStr(it.title) ?? "").slice(0, 160),
          source: asStr(it.source) ?? undefined,
          sentiment: asStr(it.sentiment) ?? undefined,
          importance: asNum(it.importance) ?? undefined,
          ageHours: ((a) =>
            a == null ? undefined : Math.round((a / 60) * 10) / 10)(
            asNum(it.ageMinutes),
          ),
          publishedAt: asStr(it.publishedAt) ?? undefined,
          coins: asArr(it.coins)
            .map((c) => asStr(c))
            .filter((c): c is string => !!c),
        }))
        .filter((n) => n.title.length > 0);
      news = fetched.slice(0, 6);
      // Per-coin headlines (with timestamps) on the watch entries themselves,
      // drawn from the full fetched list so a busy BTC tape cannot crowd a
      // second coin's story out of the fundamentals.
      attachHeadlines(watch, fetched);
    }
  }

  const observation: Observation = {
    asOf: syncCursor ?? new Date().toISOString(),
    scopes,
    cashAvailableMusd,
    equityMusd,
    ...(usesCapitalSizing(spec)
      ? {
          capitalBook: deriveCapitalBook(
            portR.data,
            walletR.data,
            posR.data,
            capitalPmData,
          ),
        }
      : {}),
    openPositions,
    openOrders,
    pmPositions,
    pmResolutions,
    pmMarkets,
    ...(pmCalibration ? { pmCalibration } : {}),
    watch,
    news,
    // Deterministic structure flags computed from the watch indicators — the
    // model acts on these instead of re-deciding "is there a setup?" from scratch.
    // openPositions are passed so setups on a held symbol are tagged "manage,
    // don't re-open".
    setups: scanSetups(watch, openPositions, signalThresholdsOf(spec)),
    marketMood,
    ...(macro ? { macro } : {}),
    syncCursor,
    newClosedTrades,
    polledBeforeWrite,
    universeMovers,
  };

  // Skip only when there is NOTHING actionable: no coin resolved (futures/spot)
  // AND no PM candidate (pm). A pm-only agent proceeds on its discovered markets.
  if (!resolvedAny && pmMarkets.length === 0) {
    return {
      observation,
      skip: "no watchlist coin resolved and no PM markets available",
    };
  }
  if (spec.sync.requirePollBeforeWrite && !polledBeforeWrite) {
    return {
      observation,
      skip: "poll-before-write required but /trades poll failed",
    };
  }
  return { observation };
}
