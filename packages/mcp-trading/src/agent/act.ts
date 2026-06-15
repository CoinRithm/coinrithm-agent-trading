// Act phase: fetch the quote evidence for an open (the runner does this, never
// the model) and execute a validated futures action with an idempotency key.

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
  if (action.type !== "futures_open") return undefined;
  const coinId = coinIdFor(observation, action.symbol);
  if (!coinId) return { eligible: false, blockReasons: ["unresolved_symbol"] };
  const r = await client.futuresQuote(
    { coinId, side: action.side, leverage: action.leverage, marginMusd: action.marginMusd },
    trace,
  );
  if (!r.ok) return { eligible: false, blockReasons: [`quote_http_${r.status}`] };
  const d = asObj(r.data);
  return {
    eligible: d.eligible === true,
    blockReasons: d.blockReasons,
    entryPrice: asNum(d.entryPrice),
    liquidationPrice: asNum(d.liquidationPrice),
    // Freshness lives in the response's `observation` block (anti-look-ahead).
    freshness: freshnessOf(asObj(d.observation)),
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
      agentTrace: trace,
    });
  }
  return { ok: false, status: 0, data: { error: "unsupported_action" } };
}
