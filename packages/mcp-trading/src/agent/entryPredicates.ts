import type {
  AgentSpec,
  Observation,
  ProposedAction,
  ValidationResult,
} from "./types.js";
import { fail, ok } from "./types.js";

export interface EntryPredicate {
  // Long includes spot buys. PM entries and risk-reducing actions are outside
  // this crypto-return policy; the existing financial controls still apply.
  side: "long" | "short";
  metric: "change1h" | "change24h";
  operator: "gte" | "lte";
  threshold: number; // percentage points (2 means 2%)
  maxAgeSeconds: number;
}

export function entryPredicateIssues(value: unknown): ValidationResult[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 16)
    return [
      fail(
        "entry_predicate_config",
        "risk.entryPredicates must contain 1–16 conditions",
      ),
    ];
  const keys = ["side", "metric", "operator", "threshold", "maxAgeSeconds"];
  const issues: ValidationResult[] = [];
  for (const [i, item] of value.entries()) {
    const p = item as EntryPredicate;
    if (
      !p ||
      typeof p !== "object" ||
      Array.isArray(p) ||
      Object.keys(p).some((key) => !keys.includes(key)) ||
      !["long", "short"].includes(p.side) ||
      !["change1h", "change24h"].includes(p.metric) ||
      !["gte", "lte"].includes(p.operator) ||
      typeof p.threshold !== "number" ||
      !Number.isFinite(p.threshold) ||
      typeof p.maxAgeSeconds !== "number" ||
      !Number.isFinite(p.maxAgeSeconds) ||
      p.maxAgeSeconds <= 0
    ) {
      issues.push(
        fail(
          "entry_predicate_config",
          `risk.entryPredicates[${i}] has an invalid condition`,
        ),
      );
    }
  }
  return issues;
}

export function checkEntryPredicates(
  action: ProposedAction,
  spec: AgentSpec,
  observation: Observation,
): ValidationResult {
  const rules = spec.risk.entryPredicates;
  if (rules === undefined) return ok();
  if (
    action.type !== "futures_open" &&
    !(action.type === "spot_order" && action.side === "buy")
  )
    return ok();
  const invalid = entryPredicateIssues(rules);
  if (invalid.length) return invalid[0];
  const side = action.type === "futures_open" ? action.side : "long";
  const applicable = rules.filter((rule) => rule.side === side);
  if (!applicable.length) return ok();
  const entry = observation.watch.find(
    (item) => item.symbol.toUpperCase() === action.symbol.toUpperCase(),
  );
  const observedAt = Date.parse(observation.asOf);
  const age = entry?.freshness?.ageSeconds;
  for (const rule of applicable) {
    const value = entry?.[rule.metric];
    // Missing evidence never becomes a passing predicate. Include time since
    // observation so a long model call cannot freeze the freshness clock.
    if (
      entry?.freshness?.status !== "fresh" ||
      typeof age !== "number" ||
      !Number.isFinite(age) ||
      age < 0 ||
      !Number.isFinite(observedAt) ||
      age + Math.max(0, (Date.now() - observedAt) / 1000) >
        rule.maxAgeSeconds ||
      typeof value !== "number" ||
      !Number.isFinite(value)
    ) {
      return fail(
        "entry_predicate_evidence",
        `fresh ${rule.metric} evidence required for ${action.symbol}`,
      );
    }
    if (
      !(rule.operator === "gte"
        ? value >= rule.threshold
        : value <= rule.threshold)
    ) {
      return fail(
        "entry_predicate_false",
        `${action.symbol} ${rule.metric}=${value} does not satisfy ${rule.operator} ${rule.threshold}`,
      );
    }
  }
  return ok();
}
