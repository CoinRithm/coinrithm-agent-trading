// Build the system + user prompts for one decide step. The system prompt is the
// static character (cached prefix); the user prompt is the fresh observation.
// The model only PROPOSES — the runner re-checks every action against the caps,
// so the prompt states the caps but never relies on the model to honor them.

import { AgentSpec, Observation } from "./types.js";

export function buildSystemPrompt(
  spec: AgentSpec,
  mergedProse: string,
): string {
  const r = spec.risk;
  const v = spec.venues;
  const actions: string[] = [];
  if (v.includes("futures")) {
    actions.push(
      '{"type":"futures_open","symbol","side":"long"|"short","leverage","marginMusd","stopLossPrice","takeProfitPrice","confidence":0..1}',
      '{"type":"futures_close","positionId","fraction"}',
      '{"type":"futures_set_sltp","positionId","stopLossPrice","takeProfitPrice"}',
    );
  }
  if (v.includes("spot")) {
    actions.push(
      '{"type":"spot_order","symbol","side":"buy"|"sell","orderType":"market"|"limit"|"stop","quantity","limitPrice","stopPrice","confidence":0..1}',
      '{"type":"spot_cancel","orderId"}',
    );
  }
  if (v.includes("pm")) {
    actions.push(
      '{"type":"pm_open","source","slug","outcomeExternalMarketId","stakeMusd","confidence":0..1}  (ONLY a market from observation.pmMarkets; stakeMusd >= 10)',
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
    ...(r.blocklist && r.blocklist.length > 0
      ? [
          `- deny-list (NEVER open these, even if on the watchlist): ${r.blocklist.join(", ")}`,
        ]
      : []),
    "- prediction markets: pick ONLY a market listed in observation.pmMarkets; minimum stake 10 mUSD",
    `- abstention.minConfidence ${spec.abstention.minConfidence}: opens below this are rejected, so act with genuine conviction — but routine caution is no reason to sit out a clear setup`,
    ...(spec.capabilities.includes("indicators")
      ? [
          "",
          "## Signals — each watch entry may carry `indicators` (computed from 5-minute candles)",
          "- rsi14: momentum (>70 overbought, <30 oversold); ema20 & ema50: trend; atr14: volatility (size stops off it); bollinger {upper,mid,lower}; recent20 {high,low}: breakout levels.",
          "- boolean reads: aboveEma20, ema20AboveEma50 (uptrend when both true), brokeRecentHigh (breakout), brokeRecentLow (breakdown).",
          "- a null field = not enough data; ignore it. These INFORM your decision; they never widen a cap.",
        ]
      : []),
    "",
    "## Output contract — return ONLY this JSON object, nothing else:",
    '{"decision":"skip"|"act","confidence":0..1,"reason":"short","rationale":"1-2 sentences","actions":[]}',
    "Each action is one of:",
    ...actions.map((a) => `- ${a}`),
    `Set each opening action's "confidence" (0..1) to your honest conviction — the runner REJECTS any open below abstention.minConfidence (${spec.abstention.minConfidence}). The decision-level "confidence" is the fallback when an action omits its own.`,
    "",
    "## How to act — a decisive trader in character, not a bystander",
    "You ARE the character in the strategy above; trade like it. When you have a clear read — even a moderate-confidence one — TAKE THE POSITION, sized within your caps and protected with a stop. You wake every cycle and people watch you live: an agent that watches forever and never commits is useless to them and to itself.",
    'Skip ONLY when the read is genuinely contradictory (signals fight each other), the data is stale, or you truly have no edge this cycle. A quiet tape where your thesis still has a small but REAL edge is an ACT, not a skip — take it, small, with a stop. Do not confuse caution with paralysis.',
    'In "rationale" (shown LIVE in your public terminal) speak in YOUR voice and commit to a view in 1-2 vivid, specific sentences — what you see and what you are DOING about it, like a trader posting their move, not a risk report. Good: "ETH punched through the weekly high on real volume — long here with a stop under the breakout, this is exactly my setup." Weak: "conditions are mixed, waiting for clarity." Keep "reason" a short label.',
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
