// Deterministic merge rules for the agent resolver.
//
// Codex audit, adopted: HARD CAPS merge by "most-restrictive-wins", NOT
// last-writer-wins. A skill/tactic module may only TIGHTEN a cap; any attempt
// to WIDEN one is rejected (fail-closed), never silently ignored. This makes a
// decomposed agent strictly safer than its inline form can be — a part-file or
// a tactic can never loosen a limit, regardless of file/merge order.
//
// Normal (non-cap) config uses simple precedence (inline > $ref > defaults),
// handled in the resolver; this module owns only the cap arithmetic.

import { ResolveIssue } from "./types.js";

// Direction in which a cap becomes MORE restrictive.
//   "lower" — a smaller number is tighter (leverage, margins, counts, loss caps)
//   "higher" — a larger number is tighter (a confidence FLOOR)
//   "true"  — true is tighter (requireStopLoss)
export type CapDirection = "lower" | "higher" | "true";

// risk.* hard caps a tactic module may tighten.
export const RISK_CAPS: Record<string, CapDirection> = {
  maxLeverage: "lower",
  perTradeMarginMusd: "lower",
  maxConcurrentPositions: "lower",
  requireStopLoss: "true",
};

// limits.* throughput/spend caps a tactic module may tighten.
export const LIMIT_CAPS: Record<string, CapDirection> = {
  maxTradesPerDay: "lower",
  maxWritesPerCycle: "lower",
  maxDailyLossMusd: "lower",
  maxOpenMarginMusd: "lower",
};

// Is `candidate` at least as restrictive as `base` (i.e. a legal tightening)?
export function isAtLeastAsRestrictive(
  dir: CapDirection,
  candidate: unknown,
  base: unknown,
): boolean {
  if (dir === "true") {
    // true is tighter than false. candidate must not be LESS strict than base.
    // legal: base=false→candidate any; base=true→candidate must be true.
    return base === true ? candidate === true : true;
  }
  if (typeof candidate !== "number" || typeof base !== "number") {
    // a non-numeric cap candidate where a number is expected is not a legal
    // tightening (caller will surface a type issue separately).
    return false;
  }
  return dir === "lower" ? candidate <= base : candidate >= base;
}

// The more-restrictive of two values for a cap field.
export function mostRestrictive(dir: CapDirection, a: unknown, b: unknown): unknown {
  if (dir === "true") return a === true || b === true ? true : false;
  if (typeof a !== "number") return b;
  if (typeof b !== "number") return a;
  return dir === "lower" ? Math.min(a, b) : Math.max(a, b);
}

export interface CapMergeResult {
  merged: Record<string, unknown>;
  issues: ResolveIssue[];
}

// Merge a tactic-module cap patch onto a base cap block under tighten-only +
// most-restrictive-wins. `caps` is the field→direction map (RISK_CAPS/LIMIT_CAPS).
// A patch key that is NOT a known cap, or that WIDENS a cap, is an issue.
export function mergeCapPatch(
  base: Record<string, unknown>,
  patch: Record<string, unknown>,
  caps: Record<string, CapDirection>,
  sourceLabel: string,
): CapMergeResult {
  const merged: Record<string, unknown> = { ...base };
  const issues: ResolveIssue[] = [];

  for (const [key, value] of Object.entries(patch)) {
    const dir = caps[key];
    if (!dir) {
      issues.push({
        code: "skill_patch_unknown_cap",
        path: sourceLabel,
        message: `tactic "${sourceLabel}" may only tighten known caps (${Object.keys(caps).join(", ")}); got "${key}"`,
      });
      continue;
    }
    if (!(key in base) || base[key] === undefined) {
      // No base to tighten against — accept the value as-is (it can't widen
      // something that wasn't set; the top-level/defaults still bound it).
      merged[key] = value;
      continue;
    }
    if (!isAtLeastAsRestrictive(dir, value, base[key])) {
      issues.push({
        code: "skill_patch_widens_cap",
        path: sourceLabel,
        message: `tactic "${sourceLabel}" tries to WIDEN ${key} (${JSON.stringify(base[key])} → ${JSON.stringify(value)}); a tactic may only tighten`,
      });
      continue;
    }
    merged[key] = mostRestrictive(dir, base[key], value);
  }

  return { merged, issues };
}
