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

export interface ObserveOutput {
  observation: Observation;
  skip?: string;
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
  if (!meR.ok) return { observation: emptyObservation(state), skip: `me failed (HTTP ${meR.status})` };
  const scopes = asArr(asObj(meR.data).scopes).filter((s): s is string => typeof s === "string");

  const [portR, walletR, posR] = await Promise.all([
    client.portfolio(trace),
    client.wallet(undefined, trace),
    client.futuresPositions(undefined, trace),
  ]);
  if (!portR.ok || !walletR.ok || !posR.ok) {
    return { observation: emptyObservation(state, scopes), skip: "required reads failed (portfolio/wallet/positions)" };
  }

  const usdt = asObj(asObj(walletR.data).usdt);
  const equity = asObj(asObj(portR.data).equity);
  const cashAvailableMusd = asNum(usdt.available) ?? asNum(equity.availableUsd) ?? null;
  const equityMusd = asNum(equity.totalUsd) ?? asNum(asObj(portR.data).equityUsd) ?? null;

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
    { venue: "futures", updatedSince: state.cursor ?? undefined, limit: state.cursor ? undefined : 1 },
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
      .filter((t) => !state.seen.includes(`${asStr(t.venue) ?? "futures"}:${asNum(t.id) ?? t.id}`));
  }

  // Watchlist market context.
  const watch: WatchEntry[] = [];
  let resolvedAny = false;
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
    watch.push({
      symbol,
      coinId,
      name: asStr(match.name),
      priceUsd: asNum(price.usd),
      change1h: asNum(price.change1h),
      change24h: asNum(price.change24h),
      change7d: asNum(price.change7d),
      // Freshness lives under the response's `observation` block.
      freshness: freshnessOf(asObj(m.observation)),
    });
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
    const [pmPosR, pmDiscR] = await Promise.all([
      client.pmPositions(undefined, trace),
      client.discoverPmMarkets({ limit: 8 }, trace),
    ]);
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
          const title = asStr(ev.title) ?? asStr(ev.question);
          const freshness = freshnessOf(ev); // freshness is event-level
          const outcomes = asArr(ev.outcomes).map(asObj);
          // A market with no outcomes array still round-trips a flat fallback row.
          const rows = outcomes.length > 0 ? outcomes : [ev];
          return rows.map((o) => ({
            source,
            slug,
            outcomeExternalMarketId:
              asStr(o.externalMarketId) ?? asStr(o.outcomeExternalMarketId) ?? "",
            title,
            freshness,
          }));
        })
        .filter((m) => m.source && m.slug && m.outcomeExternalMarketId);
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
    syncCursor,
    newClosedTrades,
    polledBeforeWrite,
  };

  // Skip only when there is NOTHING actionable: no coin resolved (futures/spot)
  // AND no PM candidate (pm). A pm-only agent proceeds on its discovered markets.
  if (!resolvedAny && pmMarkets.length === 0) {
    return { observation, skip: "no watchlist coin resolved and no PM markets available" };
  }
  if (spec.sync.requirePollBeforeWrite && !polledBeforeWrite) {
    return { observation, skip: "poll-before-write required but /trades poll failed" };
  }
  return { observation };
}
