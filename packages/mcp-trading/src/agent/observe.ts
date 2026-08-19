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
  PmResolution,
  PmMarket,
  NewsItem,
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

// `universe_scan` bounds: how many top movers to pull, and how many of those
// to fully resolve into tradable watch entries (each resolved row costs a
// resolve + market [+ candles] call).
const UNIVERSE_SCAN_LIMIT = 15;
const UNIVERSE_RESOLVE_TOP = 3;

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
// calibration universe: outcomes overlap heavily, resolve too quickly to admit
// meaningful independent research, and drown the public scorecard in Bitcoin
// coin flips. Non-mechanical calibration agents receive a deeper discovery
// page with these rows removed. Mechanical baselines intentionally keep the
// unmodified universe so their reference contract remains reproducible.
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
        // Event-level 24h volume (the discover payload's `volume24h`, USD). Feeds
        // the mechanical BENCHMARK agents' deterministic highest-volume pick rule.
        // Same for every outcome of the event; undefined on an older backend.
        const volumeUsd = asNum(ev.volume24h) ?? undefined;
        // At most a few outcomes per event so a wide multi-outcome market
        // (e.g. dozens of price buckets) can't explode the prompt. Drop
        // outcomes the backend flagged NOT openable (eligible === false) so the
        // model never bets a market that would fail the binary entry gate at
        // quote. Back-compat: an older backend omits `eligible` (undefined) ->
        // the outcome is kept (current behaviour).
        const outcomes = asArr(ev.outcomes)
          .map(asObj)
          .filter((o) => o.eligible !== false)
          .slice(0, 3);
        // A market with no outcomes array still round-trips a flat fallback row.
        const rows = outcomes.length > 0 ? outcomes : [ev];
        return rows.map((o) => ({
          source,
          slug,
          outcomeExternalMarketId:
            asStr(o.externalMarketId) ?? asStr(o.outcomeExternalMarketId) ?? "",
          // Carry the odds through: the model needs the outcome label + current
          // probability to spot a mispriced market and bet it.
          outcomeName: asStr(o.name) ?? asStr(o.outcomeName) ?? undefined,
          // Backend returns probability as 0..100 (percent) — normalise to 0..1
          // to match the prompt's "0..1" framing (probed 2026-06-24).
          probability: ((p) => (p == null ? undefined : p > 1 ? p / 100 : p))(
            asNum(o.probability),
          ),
          title,
          freshness,
          volumeUsd,
        }));
      })
      .filter((m) => m.source && m.slug && m.outcomeExternalMarketId)
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
      return {
        venue: "futures" as const,
        id: Number(asNum(p.id) ?? p.id),
        coinId: asStr(coin.ucid) ?? asStr(p.coinId),
        symbol: asStr(coin.symbol) ?? asStr(p.symbol),
        side: asStr(p.side),
        status: asStr(p.status) ?? "open",
        leverage: asNum(p.leverage),
        marginMusd: asNum(p.marginMusd),
        unrealizedPnlMusd: asNum(p.unrealizedPnlMusd),
        entryPrice: asNum(p.entryPrice),
        markPrice: asNum(p.markPrice),
        liquidationPrice: asNum(p.liquidationPrice),
        stopLossPrice: asNum(p.stopLossPrice),
        takeProfitPrice: asNum(p.takeProfitPrice),
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
  let marketMood: { fearGreed: number; label: string } | undefined;
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
      sentimentBullishPct: asNum(asObj(m.sentiment).bullishPct) ?? undefined,
      // Freshness lives under the response's `observation` block.
      freshness: freshnessOf(asObj(m.observation)),
    };
    // Capture the market-wide Fear & Greed regime once (same across coins).
    if (!marketMood) {
      const fg = asObj(m.fearGreed);
      const v = asNum(fg.value);
      if (v != null)
        marketMood = { fearGreed: v, label: asStr(fg.label) ?? "" };
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
  if (spec.capabilities.includes("universe_scan")) {
    const mv = await client.cryptoMovers("gainers", UNIVERSE_SCAN_LIMIT, trace);
    if (mv.ok && Array.isArray(mv.data)) {
      const excluded = new Set(
        [...spec.risk.watchlist, ...(spec.risk.blocklist ?? [])].map((s) =>
          s.toUpperCase(),
        ),
      );
      const rows = mv.data
        .map(asObj)
        .map((r) => ({
          symbol: (asStr(r.symbol) ?? "").toUpperCase(),
          name: asStr(r.name),
          change24hPct: asNum(r.change24h),
          priceUsd: asNum(r.currentPrice),
        }))
        .filter((r) => r.symbol && !excluded.has(r.symbol));

      const resolveTop = rows.slice(0, UNIVERSE_RESOLVE_TOP);
      for (const row of resolveTop) {
        const rs = await client.resolve(row.symbol, trace);
        const match = asObj(asObj(rs.data).match);
        const coinId =
          rs.ok && match.coinId != null ? String(match.coinId) : null;
        if (!coinId) continue;
        const mk = await client.market(coinId, trace);
        const m = asObj(mk.data);
        const price = asObj(m.price);
        const entry: WatchEntry = {
          symbol: row.symbol,
          coinId,
          name: asStr(match.name) ?? row.name,
          priceUsd: asNum(price.usd) ?? row.priceUsd,
          change1h: asNum(price.change1h),
          change24h: asNum(price.change24h) ?? row.change24hPct,
          change7d: asNum(price.change7d),
          sentimentBullishPct:
            asNum(asObj(m.sentiment).bullishPct) ?? undefined,
          freshness: freshnessOf(asObj(m.observation)),
          discovered: true,
        };
        if (wantIndicators) {
          const ind = await fetchIndicators(client, coinId, trace);
          if (ind) entry.indicators = ind;
        }
        watch.push(entry);
      }
      const context = rows.slice(UNIVERSE_RESOLVE_TOP);
      if (context.length > 0) universeMovers = context;
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
  let pmResolutions: PmResolution[] = [];
  let pmMarkets: PmMarket[] = [];
  if (wantPm) {
    const curatedCalibrationBoard =
      spec.objective?.primary === "calibration" &&
      spec.model?.provider !== "mechanical";
    const primaryDiscoveryLimit = curatedCalibrationBoard ? 30 : 12;
    // Bias PM discovery toward CRYPTO markets the agent has a price view on — the
    // only PM edge a price agent reliably has (probed 2026-06-24: the default board
    // is World Cup / elections / F1, which an agent has no edge on). The discover
    // `q` is an AND/phrase match, so query ONE coin — the agent's TOP watchlist coin,
    // where its price view is sharpest — never the joined list (matches ~nothing).
    // Fall back to Bitcoin (always plentiful) — NEVER the general non-crypto board.
    const topCoin = (spec.risk.watchlist[0] ?? "").toUpperCase();
    const pmQuery =
      PM_COIN_NAMES[topCoin] ?? spec.risk.watchlist[0] ?? "Bitcoin";
    const [pmPosR, pmDiscFirst] = await Promise.all([
      client.pmPositions(undefined, trace),
      client.discoverPmMarkets(
        { q: pmQuery, limit: primaryDiscoveryLimit },
        trace,
      ),
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
      const fb = await client.discoverPmMarkets(
        { q: "Bitcoin", limit: 12 },
        trace,
      );
      if (fb.ok) pmDiscR = fb;
    }
    if (pmPosR.ok) {
      pmPositions = asArr(asObj(pmPosR.data).positions)
        .map(asObj)
        .filter((p) => (asStr(p.status) ?? "open") === "open")
        .map((p) => ({
          id: Number(asNum(p.id) ?? p.id),
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
      if (curatedCalibrationBoard) {
        mergedRows = mergedRows.filter(
          (market) => !isCalibrationChurnMarket(market),
        );
      }

      // ── Crypto-targeted secondary discover (pm_ref hallucination fix) ────────
      // The prompt tells the model its SHARPEST PM edge is the crypto price view it
      // JUST formed — but that is only actionable if the board actually LISTS a
      // market for the coin it analysed. The primary board is keyed to ONE query
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
          if (curatedCalibrationBoard) {
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
    const nr = await client.agentNews(
      { coins: newsCoins.join(","), limit: 8, hours: 48 },
      trace,
    );
    if (nr.ok) {
      news = asArr(asObj(nr.data).items)
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
          coins: asArr(it.coins)
            .map((c) => asStr(c))
            .filter((c): c is string => !!c),
        }))
        .filter((n) => n.title.length > 0)
        .slice(0, 6);
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
    pmResolutions,
    pmMarkets,
    watch,
    news,
    // Deterministic structure flags computed from the watch indicators — the
    // model acts on these instead of re-deciding "is there a setup?" from scratch.
    // openPositions are passed so setups on a held symbol are tagged "manage,
    // don't re-open".
    setups: scanSetups(watch, openPositions),
    marketMood,
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
