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
      '{"type":"pm_open","ref":"pmN","stakeMusd","confidence":0..1}  (set "ref" to the `ref` of the ONE observation.pmMarkets entry you are betting — e.g. "pm3" — copied EXACTLY; stakeMusd >= 10)',
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
    "- prediction markets are a FIRST-CLASS venue for you — a pm_open is as real a trade as a futures/spot open, not an afterthought. Each observation.pmMarkets entry carries a short `ref` (pm1, pm2, …), an `outcome` label, and `prob` (0..1, the market's CURRENT odds). BET (pm_open) an outcome when YOUR estimate of its true probability differs MATERIALLY from the market's — that gap is your edge (e.g. prob 0.35 but you think it's really ~0.55 -> buy). Skip only markets pinned near 0 or 1 (no edge left). Every entry in observation.pmMarkets is already filtered to one you CAN open (binary/settlement-grade) — so a listed market will not bounce at quote. Pick ONLY a listed market and identify it by copying its `ref` into the action; min stake 10 mUSD. Do NOT re-bet a market+outcome you ALREADY hold (check observation.pmPositions) — that is churn and will be rejected; bet a DIFFERENT market or skip.",
    "- YOUR SHARPEST PM EDGE is the crypto price view you JUST formed: crypto PM markets resolve on the very prices you analyse, so you have a genuine information edge there that you do NOT have on coin futures alone. EVERY cycle you reach a price conviction, it is REQUIRED that you scan observation.pmMarkets for a crypto market that same view prices wrong and, if one is materially mispriced, open it with pm_open — treat that mispricing exactly like a flagged coin setup (an ACT, not a skip). If you are bearish BTC, a 'BTC above $X by <date>' priced high is a NO; if bullish ETH, an 'ETH above $Y' priced low is a YES. Leaving a clearly mispriced crypto market untraded is the same mistake as ignoring a flagged setup. (For non-crypto events you have no special edge; skip unless the odds are obviously off.)",
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
    ...(spec.capabilities.includes("news")
      ? [
          "",
          "## Market news (observation.news) — catalysts the price chart can't show",
          "Each item has `importance` (0..10; >=8 = genuinely market-moving), `sentiment` (bullish/bearish/neutral), `ageHours`, and the `coins` it concerns. Use it to CONFIRM or VETO the price read, never to trade on alone:",
          "- A fresh high-importance (>=8) bullish story on a coin you're watching strengthens a long and warns against shorting into it; a bearish >=8 is the reverse. A surprise catalyst can matter more than the chart.",
          "- Weight by importance AND freshness: a 9 from 30 min ago outweighs a stale 4 from yesterday. Old or low-importance news is noise — don't over-react.",
          "- For PM: a high-importance catalyst is exactly the kind of mispricing edge to act on if the market hasn't repriced it yet.",
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
    "",
    "## Flagged setups this cycle — your wake-up list (observation.setups)",
    "A deterministic scan already checked every watchlist coin and put the ones with real, tradeable structure RIGHT NOW into observation.setups — each has symbol, kind, bias, strength, and a factual note (trend / RSI / breakout / ATR reads). This is your shortlist; you do NOT need to re-derive whether a setup exists.",
    '- If observation.setups is NON-EMPTY: act on the strongest one that fits YOUR strategy. The `bias` is the trend-following read; if you are a contrarian / mean-reversion trader, FADE it with the same facts (e.g. a downtrend that is also "RSI oversold" is YOUR long). Skipping a flagged setup needs a SPECIFIC reason tied to your thesis — "no clear setup" is NOT a valid skip when setups are listed.',
    "- If observation.setups is EMPTY: no coin has a flagged structure right now — but BEFORE you skip, check observation.pmMarkets for a crypto market your current read prices wrong (a PM mispricing is a valid ACT even with zero coin setups). Only then, if nothing is mispriced, skip new entries and just manage any open positions.",
    '- A setup tagged `held` (held: long|short) is a position you ALREADY hold. Do NOT propose a new open on it — that only hits the margin cap and wastes the cycle. MANAGE it instead: trail the stop toward your target, ADD only if you have margin room AND fresh conviction, or cut if the thesis broke.',
    "",
    "## After you act — hold with conviction, do not churn",
    "A position is a thesis that needs TIME to work. Once you are in WITH a stop, let the stop or your target close it: do NOT bail on the next cycle over a small adverse tick, and do NOT manually close a fresh position unless the thesis is structurally invalidated (the level broke, the trend flipped) — not merely because price wiggled against you. A trade opened and closed minutes later just donates the round-trip fee + spread to noise.",
    "Place each stop at a real structural level with ROOM to breathe — past the swing or extreme by a sensible margin — and size the position DOWN to keep the risk small. A stop hugging your entry gets clipped by normal volatility and bleeds you a cut at a time. After a stop-out, do not immediately re-enter the same name and direction (that level is hot — wait for a genuinely fresh setup). Decisive entries, patient holds.",
    "",
    "## Manage your open positions — ride winners, cut losers",
    "Each cycle, look at your OPEN positions FIRST, not just new entries. A position that is working is your best opportunity: once it moves your way, move the stop to breakeven and then TRAIL it behind the move with futures_set_sltp so a winner keeps running instead of being cut early — and you may ADD to a confirming winner (scale in, never beyond your caps). A position that is clearly wrong — the level broke, the thesis failed — cut it cleanly instead of nursing it. Riding one good trade beats opening ten fresh ones.",
  ].join("\n");
}

export function buildUserPrompt(
  obs: Observation,
  journal?: Array<{ at: string; did: string }>,
): string {
  const lines: string[] = [
    "Decide for THIS cycle using only the observation below (data available now — no look-ahead).",
  ];
  // Flat-state steer: when the agent holds NOTHING, weaker models (Llama 3.1 8B)
  // still emit futures_close / futures_set_sltp / spot_cancel with a hallucinated
  // positionId/orderId — which fails the whole cycle's strict parse (one bad id
  // zeroes the cycle). There is nothing to manage when flat, so say so plainly and
  // point the model at OPENING. (Observed: an 8B agent dead 36/60 cycles this way.)
  if (
    (obs.openPositions?.length ?? 0) === 0 &&
    (obs.pmPositions?.length ?? 0) === 0
  ) {
    lines.push(
      "You currently hold NO open positions and NO resting orders — there is NOTHING to manage or close this cycle. Do NOT emit any futures_close, futures_set_sltp, or spot_cancel action (you have no position/order id to act on; doing so just wastes the cycle). Your ONLY moves are to OPEN the best available setup (futures_open / spot_order / pm_open) or to skip.",
    );
  }
  // Slice-3 memory: the agent's own recent moves, so it manages with continuity —
  // remembers the thesis behind each open position and does not re-open an idea it
  // just acted on.
  if (journal && journal.length > 0) {
    lines.push(
      "",
      "## Your recent moves (memory, newest last) — manage these with continuity; do NOT churn by re-opening an idea you just acted on:",
      ...journal.slice(-6).map((j) => `- ${j.did}`),
    );
  }
  lines.push(
    "",
    "```json",
    // Compact (no pretty-print indentation — ~40% fewer tokens, still valid JSON)
    // and the trade ledger is capped so a busy shared book can't bloat the prompt.
    JSON.stringify({
      asOf: obs.asOf,
      cashAvailableMusd: obs.cashAvailableMusd,
      equityMusd: obs.equityMusd,
      openPositions: obs.openPositions,
      openOrders: obs.openOrders,
      pmPositions: obs.pmPositions,
      // Compact display: the model picks a market by its short `ref` and never
      // sees (or mis-copies) the long source/slug/outcomeExternalMarketId — the
      // runner resolves the ref back to those. Also ~halves the PM block's tokens.
      pmMarkets: obs.pmMarkets.map((m) => ({
        ref: m.ref,
        source: m.source,
        title: m.title,
        outcome: m.outcomeName,
        prob: m.probability,
        freshness: m.freshness?.status,
      })),
      watch: obs.watch,
      setups: obs.setups,
      news: obs.news,
      marketMood: obs.marketMood,
      newClosedTrades: obs.newClosedTrades.slice(0, 20),
      polledBeforeWrite: obs.polledBeforeWrite,
    }),
    "```",
    "",
    "Return ONLY the JSON decision object.",
  );
  return lines.join("\n");
}
