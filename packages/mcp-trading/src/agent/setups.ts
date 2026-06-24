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

import { SetupSignal, WatchEntry } from "./types.js";

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

// Classify ONE coin into at most one primary setup. Order = priority: a fresh
// breakout/breakdown beats a standing trend beats a stretched/exhausted read.
function classify(w: WatchEntry): SetupSignal | null {
  const ind = w.indicators;
  if (!ind) return null;
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

  let kind: SetupSignal["kind"];
  let bias: SetupSignal["bias"];
  let strength: number;

  if (ind.brokeRecentHigh === true) {
    kind = "breakout";
    bias = "long";
    strength = 0.8;
  } else if (ind.brokeRecentLow === true) {
    kind = "breakdown";
    bias = "short";
    strength = 0.8;
  } else if (up && ch >= LEAN_MOVE_PCT) {
    kind = "uptrend";
    bias = "long";
    strength = ch >= STRONG_MOVE_PCT ? 0.75 : 0.6;
  } else if (down && ch <= -LEAN_MOVE_PCT) {
    kind = "downtrend";
    bias = "short";
    strength = ch <= -STRONG_MOVE_PCT ? 0.75 : 0.6;
  } else if (overbought) {
    kind = "stretched";
    bias = "fade-short";
    strength = 0.55;
  } else if (oversold) {
    kind = "stretched";
    bias = "fade-long";
    strength = 0.55;
  } else if (Math.abs(ch) >= STRONG_MOVE_PCT) {
    // A strong move with no clean EMA stack — still tradeable momentum.
    kind = ch > 0 ? "uptrend" : "downtrend";
    bias = ch > 0 ? "long" : "short";
    strength = 0.55;
  } else {
    return null; // genuinely no structure on this coin this cycle
  }

  return { symbol: w.symbol, kind, bias, strength, note: facts.join(" · ") };
}

// Scan the whole watchlist, return the flagged setups strongest-first. An empty
// list = a flat tape = a legitimate reason to skip new entries this cycle.
export function scanSetups(watch: WatchEntry[]): SetupSignal[] {
  const out: SetupSignal[] = [];
  for (const w of watch) {
    const s = classify(w);
    if (s && s.strength >= MIN_STRENGTH) out.push(s);
  }
  return out.sort((a, b) => b.strength - a.strength);
}
