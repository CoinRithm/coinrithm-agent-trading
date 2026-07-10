// Act phase: fetch the quote evidence for an open (the runner does this, never
// the model) and execute a validated action (futures / spot / PM) with an
// idempotency key.

import { CoinRithmClient } from "./client.js";
import { ProposedAction, AgentTrace, ApiResult, Observation, QuoteEvidence, Freshness } from "./types.js";
import { asObj, asNum, asStr } from "./extract.js";

function coinIdFor(observation: Observation, symbol: string): string | undefined {
  return observation.watch.find((w) => w.symbol.toUpperCase() === symbol.toUpperCase())?.coinId ?? undefined;
}

function freshnessOf(block: Record<string, unknown>): Freshness | undefined {
  const fr = asObj(block.freshness);
  const status = asStr(fr.status);
  return status ? { status, ageSeconds: asNum(fr.ageSeconds) } : undefined;
}

// Read-only quote BEFORE any open. Returns ineligible (never throws) on error.
export async function fetchQuote(
  client: CoinRithmClient,
  action: ProposedAction,
  observation: Observation,
  trace?: AgentTrace,
): Promise<QuoteEvidence | undefined> {
  let r: ApiResult;
  if (action.type === "futures_open") {
    const coinId = coinIdFor(observation, action.symbol);
    if (!coinId) return { eligible: false, blockReasons: ["unresolved_symbol"] };
    r = await client.futuresQuote(
      { coinId, side: action.side, leverage: action.leverage, marginMusd: action.marginMusd },
      trace,
    );
  } else if (action.type === "spot_order") {
    const coinId = coinIdFor(observation, action.symbol);
    if (!coinId) return { eligible: false, blockReasons: ["unresolved_symbol"] };
    r = await client.spotQuote({ coinId, side: action.side, quantity: action.quantity }, trace);
  } else if (action.type === "pm_open") {
    r = await client.pmQuote(
      {
        source: action.source,
        slug: action.slug,
        outcomeExternalMarketId: action.outcomeExternalMarketId,
        stakeMusd: action.stakeMusd,
      },
      trace,
    );
  } else {
    return undefined; // close / set-sltp / cancel need no quote
  }
  if (!r.ok) return { eligible: false, blockReasons: [`quote_http_${r.status}`] };
  const d = asObj(r.data);
  return {
    eligible: d.eligible === true,
    blockReasons: d.blockReasons,
    entryPrice: asNum(d.entryPrice), // futures
    liquidationPrice: asNum(d.liquidationPrice), // futures
    executionPrice: asNum(d.executionPrice), // spot live fill price
    estimatedCostMusd: asNum(d.estimatedCostMusd), // spot gross notional
    // Freshness lives in the response's `observation` block (anti-look-ahead).
    freshness: freshnessOf(asObj(d.observation)),
    // PM open-time quality-gate preview (additive; older backends omit it → the
    // runner just doesn't early-skip and falls through to the normal path).
    openBlocked: d.openBlocked === true,
    openBlockReasons: d.openBlockReasons,
  };
}

export async function executeAction(
  client: CoinRithmClient,
  action: ProposedAction,
  observation: Observation,
  trace: AgentTrace,
  idempotencyKey: string,
): Promise<ApiResult> {
  if (action.type === "futures_open") {
    const coinId = coinIdFor(observation, action.symbol);
    if (!coinId) return { ok: false, status: 0, data: { error: "unresolved_symbol" } };
    return client.openFutures({
      coinId,
      side: action.side,
      leverage: action.leverage,
      marginMusd: action.marginMusd,
      idempotencyKey,
      stopLossPrice: action.stopLossPrice ?? null,
      takeProfitPrice: action.takeProfitPrice ?? null,
      agentTrace: trace,
    });
  }
  if (action.type === "futures_close") {
    return client.closeFutures({
      positionId: action.positionId,
      fraction: action.fraction,
      idempotencyKey,
      agentTrace: trace,
    });
  }
  if (action.type === "futures_set_sltp") {
    return client.setFuturesSlTp({
      positionId: action.positionId,
      stopLossPrice: action.stopLossPrice ?? undefined,
      takeProfitPrice: action.takeProfitPrice ?? undefined,
      // Deterministic key (sltp:<posId>) so a retried cycle can't double-send,
      // consistent with the open/close/place ops. Server-side this op is also
      // idempotent (absolute-value set), so the key is belt-and-braces.
      idempotencyKey,
      agentTrace: trace,
    });
  }
  if (action.type === "spot_order") {
    const coinId = coinIdFor(observation, action.symbol);
    if (!coinId) return { ok: false, status: 0, data: { error: "unresolved_symbol" } };
    return client.placeSpotOrder({
      coinId,
      side: action.side,
      orderType: action.orderType,
      quantity: action.quantity,
      limitPrice: action.limitPrice,
      stopPrice: action.stopPrice,
      idempotencyKey,
      agentTrace: trace,
    });
  }
  if (action.type === "spot_cancel") {
    // Deterministic key (cancel:<orderId>) so a retried cycle can't double-send,
    // consistent with the open/place ops. Server-side a re-cancel is a no-op, so
    // the key is belt-and-braces.
    return client.cancelSpotOrder(action.orderId, idempotencyKey, trace);
  }
  if (action.type === "pm_open") {
    return client.openPmPosition({
      source: action.source,
      slug: action.slug,
      outcomeExternalMarketId: action.outcomeExternalMarketId,
      stakeMusd: action.stakeMusd,
      idempotencyKey,
      // The agent's OWN independent forecast (already clamped/omitted by the runner).
      // Included ONLY when present, so an absent forecast leaves the request body
      // byte-identical to pre-forecast behavior.
      ...(action.forecastProbability != null
        ? { forecastProbability: action.forecastProbability }
        : {}),
      agentTrace: trace,
    });
  }
  return { ok: false, status: 0, data: { error: "unsupported_action" } };
}
