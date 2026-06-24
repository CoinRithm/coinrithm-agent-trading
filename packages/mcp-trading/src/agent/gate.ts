// Slice-2 preflight gate: decides whether a cycle SPENDS an LLM call.
//
// content-engine's lesson made load-bearing: don't pay the model to stare at a
// flat tape. A cycle only "fires" (calls the LLM) when a deterministic trigger is
// present — a flagged entry setup, or an open position to manage. No trigger => a
// cheap heartbeat skip, zero tokens. This is the cost/scale win (a free pool hosts
// far more agents), the agentic feel (waits, then strikes), AND the metering
// substrate (every cycle records what fired).
//
// Pure + deterministic: the caller injects nowMs so debounce/budget are testable
// without timers. The gate NEVER widens a hard cap — it only decides whether to
// think; the runner still validates every action against the caps.

import { Observation, RunState, SetupSignal, TriggerPolicy } from "./types.js";

// Abs unrealized PnL (mUSD) on a single open position that counts as a swing worth
// a fresh look even if no entry trigger fired.
const BIG_SWING_MUSD = 150;

export interface GateResult {
  fire: boolean; // call the LLM this cycle?
  codes: string[]; // trigger codes that fired (heartbeat + metering)
  reason: string; // human-readable why-fired / why-suppressed
}

// Map a flagged setup to its entry trigger code.
function entryCode(s: SetupSignal): string {
  switch (s.kind) {
    case "breakout":
      return "PRICE_BREAKOUT";
    case "breakdown":
      return "PRICE_BREAKDOWN";
    case "uptrend":
    case "downtrend":
      return "MOMENTUM_TREND";
    case "stretched":
      return "RSI_EXTREME";
  }
}

export function evaluateGate(
  observation: Observation,
  state: RunState,
  policy: TriggerPolicy,
  nowMs: number,
): GateResult {
  const codes = new Set<string>();

  // ENTRY triggers: a flagged setup we do NOT already hold is a fresh entry signal.
  for (const s of observation.setups) {
    if (!s.held) codes.add(entryCode(s));
  }

  // MANAGE triggers: an open position is always evaluated through the manage path.
  const hasPosition = observation.openPositions.length > 0;
  if (hasPosition && policy.alwaysManageOpenPositions) {
    codes.add("POSITION_OPEN");
    for (const p of observation.openPositions) {
      if (Math.abs(p.unrealizedPnlMusd ?? 0) >= BIG_SWING_MUSD) {
        codes.add("POSITION_BIG_PNL_SWING");
        break;
      }
    }
  }

  const codeList = [...codes];

  // Legacy / explicit always-on: never gate (call every cycle).
  if (policy.mode === "always" || !policy.skipLlmWhenNoTrigger) {
    return {
      fire: true,
      codes: codeList,
      reason: codeList.length ? `triggers: ${codeList.join(",")}` : "always-on",
    };
  }

  // No trigger -> cheap heartbeat, no LLM call. THE cost/scale win.
  if (codeList.length === 0) {
    return { fire: false, codes: [], reason: "no trigger (flat tape, no open position)" };
  }

  // A real trigger exists. Open positions are NEVER starved by budget/debounce
  // (managing a live position is always allowed); the caps below only throttle
  // fresh entry-only cycles so a chop-storm of entry setups can't burn the budget.
  if (!hasPosition) {
    if (policy.maxLlmCallsPerHour > 0) {
      const recent = (state.llmCallTimestamps ?? []).filter((t) => nowMs - t < 3_600_000);
      if (recent.length >= policy.maxLlmCallsPerHour) {
        return { fire: false, codes: codeList, reason: `hourly LLM budget ${policy.maxLlmCallsPerHour} reached` };
      }
    }
    if (policy.debounceMinutes > 0) {
      const fp = [...codeList].sort().join(",");
      if (
        state.lastTriggerFingerprint === fp &&
        state.lastLlmCallAt != null &&
        nowMs - state.lastLlmCallAt < policy.debounceMinutes * 60_000
      ) {
        return { fire: false, codes: codeList, reason: `debounced (same triggers within ${policy.debounceMinutes}m)` };
      }
    }
  }

  return { fire: true, codes: codeList, reason: `triggers: ${codeList.join(",")}` };
}

// Record that this cycle spent an LLM call — feeds the budget + debounce next
// cycle. Mutates state; the caller persists it.
export function noteLlmCall(state: RunState, codes: string[], nowMs: number): void {
  state.llmCallTimestamps = [...(state.llmCallTimestamps ?? []), nowMs]
    .filter((t) => nowMs - t < 3_600_000)
    .slice(-200);
  state.lastLlmCallAt = nowMs;
  state.lastTriggerFingerprint = [...codes].sort().join(",");
}

// Notional cost from a coarse per-provider blended rate ($/1M tokens). Free tiers
// are ~$0; the number exists so tier pricing has real usage data to model from.
const RATE_PER_MTOK: Record<string, number> = {
  anthropic: 6,
  openai: 2.5,
  gemini: 0.3,
  groq: 0.1,
  nvidia: 0, // free hosted tier
  "openai-compatible": 0.5,
};
export function estimateCostUsd(provider: string, tokensIn: number, tokensOut: number): number {
  const rate = RATE_PER_MTOK[provider] ?? 0;
  return Math.round(((tokensIn + tokensOut) / 1_000_000) * rate * 1e6) / 1e6;
}
