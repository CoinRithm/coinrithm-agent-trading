// Observe phase: read CoinRithm state into one Observation. Sync-polls /trades
// before any write (polledBeforeWrite=true only after that succeeds). If a
// required read fails, or no watchlist symbol resolves, the cycle SKIPS writes.

import { CoinRithmClient } from "./client.js";
import {
  AgentSpec,
  RunState,
  Observation,
  OpenPosition,
  SpotOrder,
  PmPosition,
  PmMarket,
  WatchEntry,
  AgentTrace,
  Freshness,
} from "./types.js";
import { asObj, asArr, asNum, asStr } from "./extract.js";
import { computeIndicators, Candle, IndicatorSet } from "./indicators.js";
import { scanSetups } from "./setups.js";

export interface ObserveOutput {
  observation: Observation;
  skip?: string;
}

// Candle granularity feeding the indicators: the 1D range = 5-minute candles
// (~5-min fresh, ~288 bars — ample for EMA50/RSI14/Bollinger20), which suits the
// short cadence the hosted house agents run on. Probe-verified 2026-06-17.
const INDICATOR_RANGE = "1D";

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

// Fetch candles for one coin and reduce them to a compact indicator bundle.
// Tolerant by design: any failure (HTTP error, malformed/sparse candles) returns
// null so the cycle proceeds with price-only context rather than skipping.
async function fetchIndicators(
  client: CoinRithmClient,
  coinId: string,
  trace?: AgentTrace,
): Promise<IndicatorSet | null> {
  const cr = await client.candles(coinId, INDICATOR_RANGE, trace);
  if (!cr.ok) return null;
  // Endpoint shape: { candles: [{ t, o, h, l, c, v }] } ascending (oldest first).
  const candles: Candle[] = [];
  for (const raw of asArr(asObj(cr.data).candles)) {
    const c = asObj(raw);
    const open = asNum(c.o);
    const high = asNum(c.h);
    const low = asNum(c.l);
    const close = asNum(c.c);
    if (open == null || high == null || low == null || close == null) continue;
    candles.push({ open, high, low, close, volume: asNum(c.v) ?? undefined });
  }
  return computeIndicators(candles);
}

function freshnessOf(block: Record<string, unknown>): Freshness | undefined {
  const fr = asObj(block.freshness);
  const status = asStr(fr.status);
  return status ? { status, ageSeconds: asNum(fr.ageSeconds) } : undefined;
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
    .map((p) => ({
      venue: "futures" as const,
      id: Number(asNum(p.id) ?? p.id),
      coinId: asStr(p.coinId),
      symbol: asStr(p.symbol),
      side: asStr(p.side),
      status: asStr(p.status) ?? "open",
      marginMusd: asNum(p.marginMusd),
      unrealizedPnlMusd: asNum(p.unrealizedPnlMusd),
    }));

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
  let marketMood: { fearGreed: number; label: string } | undefined;
  const wantIndicators = spec.capabilities.includes("indicators");
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
      sentimentBullishPct: asNum(asObj(m.sentiment).bullishPct) ?? undefined,
      // Freshness lives under the response's `observation` block.
      freshness: freshnessOf(asObj(m.observation)),
    };
    // Capture the market-wide Fear & Greed regime once (same across coins).
    if (!marketMood) {
      const fg = asObj(m.fearGreed);
      const v = asNum(fg.value);
      if (v != null) marketMood = { fearGreed: v, label: asStr(fg.label) ?? "" };
    }
    // `indicators` capability: enrich the observation with computed TA so the
    // model reasons over structure (trend/momentum/volatility/breakout) instead
    // of price + %change alone. Backed by the candles endpoint's shared cache.
    if (wantIndicators) {
      const ind = await fetchIndicators(client, coinId, trace);
      if (ind) entry.indicators = ind;
    }
    watch.push(entry);
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
  let pmMarkets: PmMarket[] = [];
  if (wantPm) {
    // Bias PM discovery toward CRYPTO markets the agent has a price view on — the
    // only PM edge a price agent reliably has (probed 2026-06-24: the default board
    // is World Cup / elections / F1, which an agent has no edge on). The discover
    // `q` is an AND/phrase match, so query ONE coin — the agent's TOP watchlist coin,
    // where its price view is sharpest — never the joined list (matches ~nothing).
    // Fall back to Bitcoin (always plentiful) — NEVER the general non-crypto board.
    const topCoin = (spec.risk.watchlist[0] ?? "").toUpperCase();
    const pmQuery = PM_COIN_NAMES[topCoin] ?? spec.risk.watchlist[0] ?? "Bitcoin";
    const [pmPosR, pmDiscFirst] = await Promise.all([
      client.pmPositions(undefined, trace),
      client.discoverPmMarkets({ q: pmQuery, limit: 12 }, trace),
    ]);
    let pmDiscR = pmDiscFirst;
    const firstCount = pmDiscR.ok
      ? asArr(
          asObj(pmDiscR.data).data ??
            asObj(pmDiscR.data).markets ??
            asObj(pmDiscR.data).results,
        ).length
      : 0;
    if (firstCount < 3 && pmQuery !== "Bitcoin") {
      const fb = await client.discoverPmMarkets({ q: "Bitcoin", limit: 12 }, trace);
      if (fb.ok) pmDiscR = fb;
    }
    if (pmPosR.ok) {
      pmPositions = asArr(asObj(pmPosR.data).positions)
        .map(asObj)
        .filter((p) => (asStr(p.status) ?? "open") === "open")
        .map((p) => ({
          id: Number(asNum(p.id) ?? p.id),
          source: asStr(p.source),
          slug: asStr(p.slug),
          outcomeExternalMarketId: asStr(p.outcomeExternalMarketId),
          stakeMusd: asNum(p.stakeMusd),
          status: asStr(p.status) ?? "open",
        }));
    }
    if (pmDiscR.ok) {
      const dd = asObj(pmDiscR.data);
      // Real /api/agent/pm/discover payload: { data: [event], pagination, meta }.
      // Each EVENT carries source/slug/title/freshness at the top level and the
      // quoteable id NESTED at outcomes[].externalMarketId — so expand one
      // PmMarket per quoteable outcome. (Tolerant `markets`/`results` and flat
      // `outcomeExternalMarketId` fallbacks kept for older/mocked shapes.)
      pmMarkets = asArr(dd.data ?? dd.markets ?? dd.results)
        .map(asObj)
        .flatMap((ev) => {
          const source = (asStr(ev.source) ?? "").toLowerCase();
          const slug = (asStr(ev.slug) ?? "").toLowerCase();
          // Keep titles SHORT: the model only needs to recognise the market.
          // Untrimmed titles, one per outcome across many events, ballooned the
          // prompt to ~69k tokens (413s on small-context free models).
          const title = (asStr(ev.title) ?? asStr(ev.question) ?? "").slice(0, 80);
          const freshness = freshnessOf(ev); // freshness is event-level
          // At most a few outcomes per event so a wide multi-outcome market
          // (e.g. dozens of price buckets) can't explode the prompt.
          const outcomes = asArr(ev.outcomes).map(asObj).slice(0, 3);
          // A market with no outcomes array still round-trips a flat fallback row.
          const rows = outcomes.length > 0 ? outcomes : [ev];
          return rows.map((o) => ({
            source,
            slug,
            outcomeExternalMarketId:
              asStr(o.externalMarketId) ??
              asStr(o.outcomeExternalMarketId) ??
              "",
            // Carry the odds through: the model needs the outcome label + current
            // probability to spot a mispriced market and bet it (was stripped).
            outcomeName: asStr(o.name) ?? asStr(o.outcomeName) ?? undefined,
            // Backend returns probability as 0..100 (percent) — normalise to 0..1
            // to match the prompt's "0..1" framing (probed 2026-06-24).
            probability: ((p) => (p == null ? undefined : p > 1 ? p / 100 : p))(
              asNum(o.probability),
            ),
            title,
            freshness,
          }));
        })
        .filter((m) => m.source && m.slug && m.outcomeExternalMarketId)
        // Hard cap the PM block: a handful of fresh markets is plenty to pick from.
        .slice(0, 12)
        // Stamp a short, stable per-cycle ref (pm1…pmN) the model copies instead of
        // the long outcomeExternalMarketId. Assigned AFTER the slice so refs are a
        // contiguous 1..N matching exactly what the prompt shows.
        .map((m, i) => ({ ...m, ref: `pm${i + 1}` }));
    }
  }

  const observation: Observation = {
    asOf: syncCursor ?? new Date().toISOString(),
    scopes,
    cashAvailableMusd,
    equityMusd,
    openPositions,
    openOrders,
    pmPositions,
    pmMarkets,
    watch,
    // Deterministic structure flags computed from the watch indicators — the
    // model acts on these instead of re-deciding "is there a setup?" from scratch.
    // openPositions are passed so setups on a held symbol are tagged "manage,
    // don't re-open".
    setups: scanSetups(watch, openPositions),
    marketMood,
    syncCursor,
    newClosedTrades,
    polledBeforeWrite,
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
