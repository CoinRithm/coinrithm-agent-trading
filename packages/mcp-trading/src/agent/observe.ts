// Observe phase: read CoinRithm state into one Observation. Sync-polls /trades
// before any write (polledBeforeWrite=true only after that succeeds). If a
// required read fails, or no watchlist symbol resolves, the cycle SKIPS writes.

import { CoinRithmClient } from "./client.js";
import {
  AgentSpec,
  RunState,
  Observation,
  OpenPosition,
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

  const observation: Observation = {
    asOf: syncCursor ?? new Date().toISOString(),
    scopes,
    cashAvailableMusd,
    equityMusd,
    openPositions,
    watch,
    syncCursor,
    newClosedTrades,
    polledBeforeWrite,
  };

  if (!resolvedAny) return { observation, skip: "no watchlist symbol resolved to a coin" };
  if (spec.sync.requirePollBeforeWrite && !polledBeforeWrite) {
    return { observation, skip: "poll-before-write required but /trades poll failed" };
  }
  return { observation };
}
