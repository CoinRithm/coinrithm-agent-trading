// What counts as a signal, per agent (owner 2026-10-07, Telegram 56624: show
// that personality changes trade handling; audit: setup thresholds and the
// indicator window were hard-coded for every agent).
//
//   signals:                 # optional; absent = the platform defaults below
//     rsiOversold: 30        # RSI at or under this flags an oversold fade
//     rsiOverbought: 72      # RSI at or over this flags an overbought fade
//     strongMovePct: 3       # |24h %| that counts as a strong push
//     leanMovePct: 1         # smaller move that still confirms a trend stack
//     minStrength: 0.6       # flags under this are not raised at all
//   data:
//     indicatorRange: 1W     # 1D = 5m bars, 1W = 15m, 1M = 1h, 3M = 4h
//
// The flags feed both the prompt's setup shortlist AND the deterministic gate
// that decides whether a cycle calls the model at all, so these numbers change
// what the agent notices and when it thinks, not just what it is told.

import type { AgentSpec } from "./types.js";

export interface SignalThresholds {
  rsiOversold: number;
  rsiOverbought: number;
  strongMovePct: number;
  leanMovePct: number;
  minStrength: number;
}

export const DEFAULT_SIGNAL_THRESHOLDS: SignalThresholds = {
  rsiOversold: 35,
  rsiOverbought: 68,
  strongMovePct: 2.0,
  leanMovePct: 0.8,
  minStrength: 0.5,
};

/** Candle range -> bar interval, as GET /api/agent/market/:id/candles serves. */
export const INDICATOR_RANGES = {
  "1D": 300,
  "1W": 900,
  "1M": 3_600,
  "3M": 14_400,
} as const;
export type IndicatorRange = keyof typeof INDICATOR_RANGES;
export const DEFAULT_INDICATOR_RANGE: IndicatorRange = "1D";

/** Effective thresholds: declared values over the defaults. */
export function signalThresholdsOf(spec: {
  signals?: Partial<SignalThresholds>;
}): SignalThresholds {
  return { ...DEFAULT_SIGNAL_THRESHOLDS, ...(spec.signals ?? {}) };
}

export function indicatorRangeOf(spec: {
  data?: { indicatorRange?: IndicatorRange };
}): IndicatorRange {
  return spec.data?.indicatorRange ?? DEFAULT_INDICATOR_RANGE;
}

/** "5-minute", "15-minute", "1-hour", "4-hour". */
export function barLabel(range: IndicatorRange): string {
  const s = INDICATOR_RANGES[range];
  return s < 3_600 ? `${s / 60}-minute` : `${s / 3_600}-hour`;
}

const BOUNDS: Record<keyof SignalThresholds, [number, number]> = {
  rsiOversold: [5, 50],
  rsiOverbought: [50, 95],
  strongMovePct: [0.1, 50],
  leanMovePct: [0.05, 20],
  minStrength: [0, 1],
};

/** Validation issues for raw `signals` / `data` blocks ([] when valid). */
export function signalIssues(
  rawSignals: unknown,
  rawData: unknown,
): Array<[string, string]> {
  const issues: Array<[string, string]> = [];
  const add = (code: string, reason: string) => issues.push([code, reason]);
  const isMap = (v: unknown): v is Record<string, unknown> =>
    typeof v === "object" && v !== null && !Array.isArray(v);

  if (rawSignals !== undefined) {
    if (!isMap(rawSignals)) {
      add("skill_signals", "signals must be a mapping");
    } else {
      for (const [key, [lo, hi]] of Object.entries(BOUNDS)) {
        const v = rawSignals[key];
        if (v === undefined) continue;
        if (typeof v !== "number" || !Number.isFinite(v) || v < lo || v > hi)
          add(
            "skill_signals_range",
            `signals.${key} must be a number between ${lo} and ${hi}`,
          );
      }
      const t = signalThresholdsOf({
        signals: rawSignals as Partial<SignalThresholds>,
      });
      if (t.rsiOversold >= t.rsiOverbought)
        add(
          "skill_signals_rsi",
          "signals.rsiOversold must be below signals.rsiOverbought",
        );
      if (t.leanMovePct > t.strongMovePct)
        add(
          "skill_signals_moves",
          "signals.leanMovePct must not exceed signals.strongMovePct",
        );
    }
  }
  if (rawData !== undefined) {
    if (!isMap(rawData)) {
      add("skill_data", "data must be a mapping");
    } else if (
      rawData.indicatorRange !== undefined &&
      !Object.hasOwn(INDICATOR_RANGES, String(rawData.indicatorRange))
    ) {
      add(
        "skill_data_range",
        `data.indicatorRange must be one of ${Object.keys(INDICATOR_RANGES).join(", ")}`,
      );
    }
  }
  return issues;
}

/** Type guard used where only the spec shape is known. */
export type SignalSpec = Pick<AgentSpec, "signals" | "data">;
