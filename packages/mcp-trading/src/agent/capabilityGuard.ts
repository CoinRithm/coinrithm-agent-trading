// Capability drift guard.
//
// An agent's PROSE (thesis, persona, tactic skills) is authored separately from
// the runner's code, so a skill can name a venue, an action, or a cap that the
// runner does NOT support — and rot silently, exactly the way a stale doc drifts
// from a live enum. (We watched this happen in a sibling system: a knowledge file
// kept naming post types the live enum had dropped, and a test pinned the stale
// names so the suite stayed green while the model was fed a wrong taxonomy.)
//
// This guard asserts that every capability IDENTIFIER referenced in authored
// prose is in the runner's LIVE capability set AND — for actions/venues — in THIS
// agent's enabled venues. It is deliberately deterministic and low-false-positive:
// it inspects only identifier-shaped tokens (snake_case `<venue>_<verb>` actions
// scanned anywhere; cap/venue identifiers scanned only inside markdown code
// spans), never free English. Runtime memory (journal/notes.md) is excluded — it
// records history, and may legitimately recall a venue later disabled.

import {
  AgentSpec,
  ResolvedAgent,
  ResolveIssue,
  VENUES,
  Venue,
  ACTION_TYPES,
} from "./types.js";
import { levenshtein } from "./strictLint.js";
import { RISK_CAPS, LIMIT_CAPS } from "./mergeRules.js";

const KNOWN_ACTIONS = new Set<string>(ACTION_TYPES);

// Every enforced cap the runner knows: risk + limits + killSwitch + abstention.
const LIVE_CAPS: readonly string[] = [
  ...Object.keys(RISK_CAPS),
  ...Object.keys(LIMIT_CAPS),
  "maxDrawdownMusd",
  "maxConsecutiveRejects",
  "maxConsecutiveModelFailures",
  "onRateLimitPressure",
  "onStaleData",
  "onWeakSignal",
  "onMissingQuote",
  "onInsufficientBalance",
  "minConfidence",
];
const LIVE_CAP_SET = new Set(LIVE_CAPS);

// `<venue>_<verb>` action references. The verb is restricted to the runner's
// real verbs, so descriptive tokens (spot_price, futures_curve) never match —
// only action-shaped references (real OR plausibly-fake) do.
const ACTION_RE = /\b(spot|futures|pm)_(open|close|order|cancel|set_sltp)\b/g;
// camelCase cap-shaped identifiers (maxLeverage, minConfidence, requireStopLoss…).
const CAP_RE = /\b(?:max|min|require|on|per)[A-Z][A-Za-z0-9]+\b/g;
// markdown inline code spans — where authors put identifiers.
const CODESPAN_RE = /`([^`\n]+)`/g;

// Levenshtein threshold for "this is a typo/rename of a real cap" — matches the
// strictLint "did you mean" threshold (< 3, i.e. edit distance <= 2).
const CAP_NEARMISS_MAX = 3;

function venueOf(action: string): Venue {
  return action.split("_")[0] as Venue;
}

// Authored knowledge only: keystone + character/* + skills/*. journal/notes.md is
// runtime memory and is intentionally NOT checked.
function authoredProse(
  resolved: ResolvedAgent,
): Array<{ source: string; text: string }> {
  return resolved.proseParts.filter((p) => p.source !== "journal/notes.md");
}

// Returns one issue per (token, source) drift found. Empty = no drift.
export function checkCapabilityDrift(
  resolved: ResolvedAgent,
  spec: AgentSpec,
): ResolveIssue[] {
  const issues: ResolveIssue[] = [];
  const enabled = new Set<string>(spec.venues);
  const seen = new Set<string>(); // dedupe "kind|token|source"

  const once = (key: string): boolean => {
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  };

  for (const part of authoredProse(resolved)) {
    const where = part.source;

    // ── action references (anywhere in the body) ──
    for (const m of part.text.matchAll(ACTION_RE)) {
      const action = m[0];
      if (!once(`a|${action}|${where}`)) continue;
      if (!KNOWN_ACTIONS.has(action)) {
        issues.push({
          code: "drift_unknown_action",
          path: where,
          message: `prose references action \`${action}\`, which the runner does not support (allowed: ${ACTION_TYPES.join(", ")})`,
        });
      } else {
        const venue = venueOf(action);
        if (!enabled.has(venue)) {
          issues.push({
            code: "drift_venue_not_enabled",
            path: where,
            message: `prose references \`${action}\` but venue \`${venue}\` is not in this agent's venues [${spec.venues.join(", ")}]`,
          });
        }
      }
    }

    // ── venue + cap references inside code spans only ──
    for (const span of part.text.matchAll(CODESPAN_RE)) {
      const inner = span[1];

      // An exact venue identifier in a code span (e.g. `pm`) that the agent has
      // not enabled — a prose promise the runner cannot keep.
      if (
        (VENUES as readonly string[]).includes(inner) &&
        !enabled.has(inner) &&
        once(`v|${inner}|${where}`)
      ) {
        issues.push({
          code: "drift_venue_not_enabled",
          path: where,
          message: `prose references venue \`${inner}\` but it is not in this agent's venues [${spec.venues.join(", ")}]`,
        });
      }

      // cap-shaped identifiers — flag only a near-miss of a REAL cap (a typo or
      // rename); unrelated identifiers are left alone to avoid false positives.
      for (const cm of inner.matchAll(CAP_RE)) {
        const token = cm[0];
        if (LIVE_CAP_SET.has(token)) continue;
        let nearest: string | null = null;
        let best = CAP_NEARMISS_MAX;
        for (const cap of LIVE_CAPS) {
          const d = levenshtein(token.toLowerCase(), cap.toLowerCase());
          if (d < best) {
            best = d;
            nearest = cap;
          }
        }
        if (nearest && once(`c|${token}|${where}`)) {
          issues.push({
            code: "drift_unknown_cap",
            path: where,
            message: `prose references cap \`${token}\`, which is not a runner cap — did you mean \`${nearest}\`?`,
          });
        }
      }
    }
  }

  return issues;
}
