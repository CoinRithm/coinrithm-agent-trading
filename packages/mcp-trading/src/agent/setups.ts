// Deterministic setup scan — the first slice of the preflight gate.
//
// The problem it solves: cautious free-tier brains were skipping 100% of cycles
// with "no clear setup" even while the tape moved 3-4%. The fix (drawn straight
// from content-engine's gate design): do NOT make the model decide whether a setup
// exists. Compute it deterministically from the indicators we already have, then
// hand the flagged setups to the model so it decides HOW to act, not WHETHER
// anything is happening. This flips the default from "no setup -> skip" to "here
// is the structure -> trade it (in your style) or give a real reason not to".
//
// Pure + stateless: no I/O, no model. Strategy-neutral — it reports the structure
// and the trend-following bias; a contrarian agent fades the same facts.

import { OpenPosition, SetupSignal, WatchEntry } from "./types.js";

// Thresholds tuned to FIRE readily on a normal moving market (the failure mode we
// are fixing is under-firing). A genuinely flat tape still yields an empty list,
// which is the correct "nothing to do" signal.
const STRONG_MOVE_PCT = 2.0; // |24h %| that counts as a real directional push
const LEAN_MOVE_PCT = 0.8; // smaller move that still confirms an EMA-stack trend
const RSI_OVERSOLD = 35;
const RSI_OVERBOUGHT = 68;
const MIN_STRENGTH = 0.5; // below this we do not flag (avoid noise)

function pct(n: number): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
}

// Normalize a symbol to its base asset so a watch "BTC" matches an open position
// "BTC-PERP" / "BTCUSDT" when checking whether we already hold it.
export function baseSymbol(s: string | undefined): string {
  return (s ?? "")
    .toUpperCase()
    .replace(/[-/]?(PERP|USDT|USDC|USD)$/i, "")
    .replace(/[^A-Z0-9]/g, "");
}

// Classify ONE coin into its setups. Usually one (the trend/breakout read), but a
// TRENDING coin that is also RSI-extreme emits a SECOND, counter-trend "fade"
// signal — the same structure is a momentum trade to a trend-follower and a
// mean-reversion trade to a contrarian, so we surface both and let each agent pick
// the one matching its style (fixes contrarians skipping "no setup fits me").
function classify(w: WatchEntry, openPositions: OpenPosition[]): SetupSignal[] {
  const ind = w.indicators;
  if (!ind) return [];
  const ch = w.change24h ?? 0;
  const rsi = ind.rsi14;
  const up = ind.ema20AboveEma50 === true && ind.aboveEma20 === true;
  const down = ind.ema20AboveEma50 === false && ind.aboveEma20 === false;
  const oversold = rsi != null && rsi <= RSI_OVERSOLD;
  const overbought = rsi != null && rsi >= RSI_OVERBOUGHT;

  // Compact, factual note the model reads (no interpretation — just the structure).
  const facts: string[] = [`${pct(ch)} 24h`];
  if (up) facts.push("price>EMA20>EMA50 (uptrend)");
  else if (down) facts.push("price<EMA20<EMA50 (downtrend)");
  if (rsi != null)
    facts.push(`RSI ${Math.round(rsi)}${oversold ? " oversold" : overbought ? " overbought" : ""}`);
  if (ind.brokeRecentHigh === true) facts.push("broke 20-bar high");
  if (ind.brokeRecentLow === true) facts.push("broke 20-bar low");
  if (ind.atr14 != null && ind.asOfClose)
    facts.push(`ATR ${((100 * ind.atr14) / ind.asOfClose).toFixed(1)}% (stop ~1.5xATR)`);
  const note = facts.join(" · ");

  const out: SetupSignal[] = [];

  // Primary trend-following / breakout read.
  if (ind.brokeRecentHigh === true) {
    out.push({ symbol: w.symbol, kind: "breakout", bias: "long", strength: 0.8, note });
  } else if (ind.brokeRecentLow === true) {
    out.push({ symbol: w.symbol, kind: "breakdown", bias: "short", strength: 0.8, note });
  } else if (up && ch >= LEAN_MOVE_PCT) {
    out.push({ symbol: w.symbol, kind: "uptrend", bias: "long", strength: ch >= STRONG_MOVE_PCT ? 0.75 : 0.6, note });
  } else if (down && ch <= -LEAN_MOVE_PCT) {
    out.push({ symbol: w.symbol, kind: "downtrend", bias: "short", strength: ch <= -STRONG_MOVE_PCT ? 0.75 : 0.6, note });
  } else if (overbought) {
    out.push({ symbol: w.symbol, kind: "stretched", bias: "fade-short", strength: 0.55, note });
  } else if (oversold) {
    out.push({ symbol: w.symbol, kind: "stretched", bias: "fade-long", strength: 0.55, note });
  } else if (Math.abs(ch) >= STRONG_MOVE_PCT) {
    // A strong move with no clean EMA stack — still tradeable momentum.
    out.push({ symbol: w.symbol, kind: ch > 0 ? "uptrend" : "downtrend", bias: ch > 0 ? "long" : "short", strength: 0.55, note });
  }

  // Secondary COUNTER-TREND fade: a standing trend that is ALSO RSI-extreme is a
  // mean-reversion candidate. Only add it when the primary was the trend itself
  // (so we don't double-list a pure stretched read).
  const primaryIsTrend = out[0] && (out[0].kind === "uptrend" || out[0].kind === "downtrend" || out[0].kind === "breakout" || out[0].kind === "breakdown");
  if (primaryIsTrend && (oversold || overbought)) {
    out.push({
      symbol: w.symbol,
      kind: "stretched",
      bias: oversold ? "fade-long" : "fade-short",
      strength: 0.6,
      note: `${note} — counter-trend fade (mean-reversion: ${oversold ? "oversold within downtrend" : "overbought within uptrend"})`,
    });
  }

  // Position awareness: if we already hold this symbol, tag every signal with the
  // side held AND the position's win/loss state right in the note — so the model
  // ADDS to a winner (only with free margin), trails, or cuts a loser, instead of
  // pointlessly re-opening the same size into the margin cap (the open_margin_
  // exceeds_cap churn). A winner with room is the one case a same-side "open" is OK
  // (scaling in); otherwise it's manage-only.
  const wb = baseSymbol(w.symbol);
  const pos = wb ? openPositions.find((p) => baseSymbol(p.symbol) === wb) : undefined;
  const held = pos && (pos.side === "long" || pos.side === "short") ? pos.side : undefined;
  if (held) {
    const u = pos?.unrealizedPnlMusd;
    const tag =
      u == null
        ? ` [HELD ${held} — manage, do NOT re-open]`
        : u >= 0
          ? ` [HELD ${held}, +${Math.round(u)}mUSD WINNER — ADD only if you have free margin (scale into strength), else trail the stop; never re-open the same size]`
          : ` [HELD ${held}, ${Math.round(u)}mUSD loser — trail or cut; do NOT average down or re-open]`;
    for (const s of out) {
      s.held = held;
      s.note = s.note + tag;
    }
  }

  return out;
}

// Scan the whole watchlist, return the flagged setups strongest-first. An empty
// list = a flat tape = a legitimate reason to skip new entries this cycle. Setups
// on a symbol we already hold are tagged `held` (manage, don't re-open).
export function scanSetups(watch: WatchEntry[], openPositions: OpenPosition[] = []): SetupSignal[] {
  const out: SetupSignal[] = [];
  for (const w of watch) {
    for (const s of classify(w, openPositions)) if (s.strength >= MIN_STRENGTH) out.push(s);
  }
  return out.sort((a, b) => b.strength - a.strength);
}
