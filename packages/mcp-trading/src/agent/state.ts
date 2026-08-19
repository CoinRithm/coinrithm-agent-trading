// Local run state: the cursor, dedupe set, daily counters, and the kill-switch
// inputs. Persisted to a JSON file so a re-run resumes where it left off.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import { RunState, AgentSpec } from "./types.js";
import { dayKey } from "./util.js";
import { asObj, asNum } from "./extract.js";

// Disable after this many 429s in a session when killSwitch.onRateLimitPressure.
const RATE_LIMIT_PRESSURE_THRESHOLD = 5;

export function newState(runId: string): RunState {
  return {
    runId,
    cyclesRun: 0,
    writesToday: 0,
    realizedPnlMusd: 0,
    peakRealizedMusd: 0,
    consecutiveRejectCycles: 0,
    consecutiveModelFailures: 0,
    rateLimitHits: 0,
    disabled: false,
    dayKey: dayKey(),
    cursor: null,
    seen: [],
    realizedPnlTodayMusd: 0,
    consecutiveExecFailures: 0,
    intentSeq: {},
  };
}

// A corrupt EXISTING state file is FAIL-CLOSED: we refuse to run rather than
// silently reset and (e.g.) re-enable a kill-switched agent or zero the daily
// counters. A missing file is fine (fresh start).
export function loadState(file: string | undefined, runId: string): RunState {
  if (file && existsSync(file)) {
    let parsed: Partial<RunState>;
    try {
      parsed = JSON.parse(readFileSync(file, "utf8")) as Partial<RunState>;
    } catch (e) {
      throw new Error(
        `run state file is corrupt (${file}): ${e instanceof Error ? e.message : String(e)} — fix or delete it before running`,
      );
    }
    const base = newState(parsed.runId ?? runId);
    return rollDay({
      ...base,
      ...parsed,
      seen: Array.isArray(parsed.seen) ? parsed.seen : [],
      intentSeq:
        parsed.intentSeq &&
        typeof parsed.intentSeq === "object" &&
        !Array.isArray(parsed.intentSeq)
          ? parsed.intentSeq
          : {},
    });
  }
  return newState(runId);
}

export function saveState(file: string | undefined, state: RunState): void {
  if (!file) return;
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(state, null, 2), "utf8");
}

export function rollDay(state: RunState): RunState {
  const today = dayKey();
  if (state.dayKey !== today) {
    state.dayKey = today;
    state.writesToday = 0;
    state.realizedPnlTodayMusd = 0;
  }
  return state;
}

// Accrue realized PnL from newly-closed trades into both the session total (for
// drawdown) and today's total (for the daily-loss cap). Dedupe by the caller.
export function accrueRealized(
  state: RunState,
  closedTrades: Record<string, unknown>[],
): void {
  for (const t of closedTrades) {
    const pnl = asNum(asObj(t).realizedPnlMusd);
    if (pnl != null) {
      state.realizedPnlMusd += pnl;
      state.realizedPnlTodayMusd += pnl;
    }
  }
  if (state.realizedPnlMusd > state.peakRealizedMusd)
    state.peakRealizedMusd = state.realizedPnlMusd;
}

// A transient model-failure streak (free models occasionally time out/hang) must
// never disable an agent on a hair-trigger, so the model-failure kill-switch is
// floored at this many consecutive failures regardless of an agent's own (lower)
// setting. The scheduler additionally auto-revives any model-failure disable.
const MODEL_FAILURE_FLOOR = 10;

// ── Permanent-failure classification (2026-08-19) ───────────────────────────
// The generic kill-switch treats every failure as transient — correct for
// timeouts/blips, catastrophic for DETERMINISTIC failures. Live-measured: one
// agent spent 93% of 782 cycles/24h on a Groq 404 (model decommissioned),
// revived 7 times in 3h by the self-heal; four others burned ~1,500 cycles/day
// on a revoked CoinRithm key (HTTP 401). These classifiers give such failures
// a fast, NON-revivable disable with a machine-readable reason prefix the
// scheduler's self-heal exempts ('model_unavailable' / 'key_invalid').
//
// Permanent model errors are deterministic, so the threshold is small — 3
// consecutive occurrences rules out a one-off routing fluke without burning a
// day. Auth failures get 10: a key rotation/propagation blip should not kill
// an agent, but nothing recovers from an actually-revoked key.
export const PERMANENT_MODEL_ERROR_RE =
  /model_not_found|model[_ ]decommissioned|has been decommissioned|\b404\b|does not exist or you do not have access/i;
export const PERMANENT_MODEL_ERROR_THRESHOLD = 3;
export const AUTH_FAILURE_THRESHOLD = 10;

export const isPermanentModelError = (error: string): boolean =>
  PERMANENT_MODEL_ERROR_RE.test(error);

// The observe phase folds a rejected key into its required-reads skip reason
// as "... (HTTP 401)".
export const isAuthFailureSkip = (skipReason: string): boolean =>
  /HTTP 401/.test(skipReason);

// Returns a disable reason if any kill-switch condition is tripped, else null.
export function checkKillSwitch(
  spec: AgentSpec,
  state: RunState,
): string | null {
  const ks = spec.killSwitch;
  if (ks.maxConsecutiveModelFailures > 0) {
    const threshold = Math.max(
      ks.maxConsecutiveModelFailures,
      MODEL_FAILURE_FLOOR,
    );
    if (state.consecutiveModelFailures >= threshold) {
      return `consecutive model failures ${state.consecutiveModelFailures} >= ${threshold}`;
    }
  }
  if (
    ks.maxConsecutiveRejects > 0 &&
    state.consecutiveRejectCycles >= ks.maxConsecutiveRejects
  ) {
    return `consecutive reject cycles ${state.consecutiveRejectCycles} >= ${ks.maxConsecutiveRejects}`;
  }
  if (
    ks.maxDrawdownMusd > 0 &&
    state.peakRealizedMusd - state.realizedPnlMusd >= ks.maxDrawdownMusd
  ) {
    return `drawdown ${(state.peakRealizedMusd - state.realizedPnlMusd).toFixed(2)} >= ${ks.maxDrawdownMusd}`;
  }
  if (
    ks.onRateLimitPressure &&
    state.rateLimitHits >= RATE_LIMIT_PRESSURE_THRESHOLD
  ) {
    return `rate-limit pressure: ${state.rateLimitHits} 429s this session`;
  }
  return null;
}
