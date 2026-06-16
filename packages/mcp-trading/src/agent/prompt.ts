// Build the system + user prompts for one decide step. The system prompt is the
// static character (cached prefix); the user prompt is the fresh observation.
// The model only PROPOSES — the runner re-checks every action against the caps,
// so the prompt states the caps but never relies on the model to honor them.

import { AgentSpec, Observation } from "./types.js";

export function buildSystemPrompt(spec: AgentSpec, mergedProse: string): string {
  const r = spec.risk;
  const v = spec.venues;
  const actions: string[] = [];
  if (v.includes("futures")) {
    actions.push(
      '{"type":"futures_open","symbol","side":"long"|"short","leverage","marginMusd","stopLossPrice","takeProfitPrice"}',
      '{"type":"futures_close","positionId","fraction"}',
      '{"type":"futures_set_sltp","positionId","stopLossPrice","takeProfitPrice"}',
    );
  }
  if (v.includes("spot")) {
    actions.push(
      '{"type":"spot_order","symbol","side":"buy"|"sell","orderType":"market"|"limit"|"stop","quantity","limitPrice","stopPrice"}',
      '{"type":"spot_cancel","orderId"}',
    );
  }
  if (v.includes("pm")) {
    actions.push(
      '{"type":"pm_open","source","slug","outcomeExternalMarketId","stakeMusd"}  (ONLY a market from observation.pmMarkets; stakeMusd >= 10)',
    );
  }
  return [
    "You operate a CoinRithm PAPER-TRADING agent (simulated 50,000 mUSD; not real money, not financial advice).",
    "You only PROPOSE actions as structured JSON. A separate runner re-validates every action against hard caps and executes it; you cannot bypass a cap.",
    "",
    "## Your strategy (your borders)",
    mergedProse.trim() || "(no strategy prose provided)",
    "",
    "## Hard caps the runner enforces (do not exceed; proposing over a cap wastes the cycle)",
    `- venues you may act in: ${v.join(", ")}`,
    `- perTradeMarginMusd ${r.perTradeMarginMusd} is the per-trade SIZE cap (futures margin / spot buy notional / PM stake)`,
    `- futures: maxLeverage ${r.maxLeverage}, maxConcurrentPositions ${r.maxConcurrentPositions}, requireStopLoss ${r.requireStopLoss} (long stop below entry, short stop above)`,
    `- watchlist (spot + futures use ONLY these): ${r.watchlist.join(", ")}`,
    "- prediction markets: pick ONLY a market listed in observation.pmMarkets; minimum stake 10 mUSD",
    `- abstention.minConfidence ${spec.abstention.minConfidence}; a skipped cycle is correct and cheap`,
    "",
    "## Output contract — return ONLY this JSON object, nothing else:",
    '{"decision":"skip"|"act","confidence":0..1,"reason":"short","actions":[]}',
    "Each action is one of:",
    ...actions.map((a) => `- ${a}`),
    "Prefer skip when the signal is weak or data is stale.",
  ].join("\n");
}

export function buildUserPrompt(obs: Observation): string {
  return [
    "Decide for THIS cycle using only the observation below (data available now — no look-ahead).",
    "",
    "```json",
    JSON.stringify(
      {
        asOf: obs.asOf,
        cashAvailableMusd: obs.cashAvailableMusd,
        equityMusd: obs.equityMusd,
        openPositions: obs.openPositions,
        openOrders: obs.openOrders,
        pmPositions: obs.pmPositions,
        pmMarkets: obs.pmMarkets,
        watch: obs.watch,
        newClosedTrades: obs.newClosedTrades,
        polledBeforeWrite: obs.polledBeforeWrite,
      },
      null,
      2,
    ),
    "```",
    "",
    "Return ONLY the JSON decision object.",
  ].join("\n");
}
