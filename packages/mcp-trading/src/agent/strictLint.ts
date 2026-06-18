// Strict key/enum lint over the RESOLVED frontmatter — the fix for the
// "silently coerced to a default" footgun (Codex audit #9). A typo like
// `maxLevrage: 3` must NOT silently become the default; it must be surfaced
// (with a "did you mean" suggestion). The runner uses this in hosted mode to
// fail closed; self-host can treat the issues as warnings.

import {
  ResolveIssue,
  PROVIDERS,
  VENUES,
  ALLOWED_CAPABILITIES,
  OBJECTIVE_PRIMARIES,
} from "./types.js";

// Allowed keys per block. `null` = free-form (sizing is soft guidance; its
// enforced-key ban is handled in the resolver, not here).
const ALLOWED_KEYS: Record<string, string[] | null> = {
  $root: [
    "name",
    "description",
    "spec",
    "mode",
    "trigger",
    "model",
    "venues",
    "risk",
    "sizing",
    "limits",
    "abstention",
    "sync",
    "killSwitch",
    "objective",
    "capabilities",
    "include",
    "watchlist",
  ],
  trigger: ["cadence", "timezone", "events"],
  model: ["provider", "name", "baseUrl"],
  risk: [
    "maxLeverage",
    "perTradeMarginMusd",
    "maxConcurrentPositions",
    "requireStopLoss",
    "watchlist",
    "blocklist",
  ],
  sizing: null,
  limits: [
    "maxTradesPerDay",
    "maxWritesPerCycle",
    "maxDailyLossMusd",
    "maxOpenMarginMusd",
  ],
  abstention: [
    "onStaleData",
    "onWeakSignal",
    "onMissingQuote",
    "onInsufficientBalance",
    "minConfidence",
  ],
  sync: ["requirePollBeforeWrite"],
  killSwitch: [
    "maxDrawdownMusd",
    "maxConsecutiveRejects",
    "maxConsecutiveModelFailures",
    "onRateLimitPressure",
  ],
  objective: ["primary", "secondary", "horizon"],
};

export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const d: number[] = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    let prev = d[0];
    d[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = d[j];
      d[j] = Math.min(
        d[j] + 1,
        d[j - 1] + 1,
        prev + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      prev = tmp;
    }
  }
  return d[n];
}

function suggest(key: string, allowed: string[]): string | null {
  let best: string | null = null;
  let bestDist = 3; // only suggest within edit distance 2
  for (const cand of allowed) {
    const dist = levenshtein(key.toLowerCase(), cand.toLowerCase());
    if (dist < bestDist) {
      bestDist = dist;
      best = cand;
    }
  }
  return best;
}

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

function lintKeys(
  block: string,
  obj: Record<string, unknown>,
  issues: ResolveIssue[],
): void {
  const allowed = ALLOWED_KEYS[block];
  if (!allowed) return; // free-form (null) or unknown block
  for (const k of Object.keys(obj)) {
    if (!allowed.includes(k)) {
      const s = suggest(k, allowed);
      issues.push({
        code: "unknown_key",
        path: block === "$root" ? k : `${block}.${k}`,
        message: `unknown key "${k}"${s ? ` — did you mean "${s}"?` : ""}`,
      });
    }
  }
}

export function strictLint(raw: Record<string, unknown>): ResolveIssue[] {
  const issues: ResolveIssue[] = [];

  lintKeys("$root", raw, issues);
  for (const block of [
    "trigger",
    "model",
    "risk",
    "limits",
    "abstention",
    "sync",
    "killSwitch",
    "objective",
  ]) {
    if (isObj(raw[block])) lintKeys(block, raw[block] as Record<string, unknown>, issues);
  }

  // Enum checks.
  const model = raw.model;
  if (
    isObj(model) &&
    typeof model.provider === "string" &&
    !(PROVIDERS as readonly string[]).includes(model.provider)
  ) {
    issues.push({
      code: "bad_enum",
      path: "model.provider",
      message: `model.provider "${model.provider}" is not one of: ${PROVIDERS.join(", ")}`,
    });
  }
  if (Array.isArray(raw.venues)) {
    for (const v of raw.venues) {
      if (!(VENUES as readonly unknown[]).includes(v)) {
        issues.push({
          code: "bad_enum",
          path: "venues",
          message: `unknown venue "${String(v)}" (allowed: ${VENUES.join(", ")})`,
        });
      }
    }
  }
  if (Array.isArray(raw.capabilities)) {
    for (const c of raw.capabilities) {
      if (!(ALLOWED_CAPABILITIES as readonly unknown[]).includes(c)) {
        issues.push({
          code: "bad_enum",
          path: "capabilities",
          message: `unknown capability "${String(c)}" (allowed: ${ALLOWED_CAPABILITIES.join(", ")})`,
        });
      }
    }
  }
  const objective = raw.objective;
  if (
    isObj(objective) &&
    typeof objective.primary === "string" &&
    !(OBJECTIVE_PRIMARIES as readonly string[]).includes(objective.primary)
  ) {
    issues.push({
      code: "bad_enum",
      path: "objective.primary",
      message: `objective.primary "${objective.primary}" is not one of: ${OBJECTIVE_PRIMARIES.join(", ")}`,
    });
  }

  return issues;
}
