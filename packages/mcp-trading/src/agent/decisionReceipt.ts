// PRIVATE, partial structured evidence. Never an AgentTrace, prompt, reasoning
// transcript, historical attestation, or promise of deterministic model replay.
import type { AgentSpec, Observation, RunState } from "./types.js";
import { buildDailyRiskBudget, type DailyRiskBudget } from "./prompt.js";
import { sha256, stableStringify } from "./util.js";
import {
  sourceTimestamp,
  FRESHNESS_BASES,
  PM_BLOCK_REASONS,
  PM_WARNING_REASONS,
  PM_FLAGS,
  PM_TIERS,
  PM_SPREAD_TIERS,
  PM_QUALITY_CAPS,
  pmQualityOf,
  pmDecisionSupportOf,
  freshnessOf as parseFreshness,
} from "./pmContext.js";

export const DECISION_INPUT_MAX_BYTES = 16 * 1024;
export type DecisionInputPhase =
  "before_observation" | "observed" | "decision_input";
type Scalar = string | number | boolean | null;
type Row = Record<
  string,
  Scalar | string[] | Record<string, Scalar | string[]>
>;
export interface DecisionInputRecord {
  version: "coinrithm.decision-input.v1";
  visibility: "private";
  completeness: "partial";
  phase: DecisionInputPhase;
  outcome: "pending" | "returned" | "runtime_error";
  runId: string | null;
  decisionId: string | null;
  configFingerprint: string | null;
  observationFingerprint: string | null;
  preThesisObservationFingerprint: string | null;
  dailyRiskBudget: DailyRiskBudget | null;
  guardState: Record<string, number | boolean | null>;
  account: Record<string, number | boolean | string | null> | null;
  lists: Record<string, Row[]>;
  counts: Record<string, { source: number; retained: number; omitted: number }>;
  omissions: string[];
}

export interface DecisionInputCapture {
  phase: DecisionInputPhase;
  runId: string;
  decisionId: string;
  spec: AgentSpec;
  mergedProse: string;
  state: RunState;
  observation?: Observation;
  observationFingerprint?: string;
  preThesisObservationFingerprint?: string;
}

const num = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;
const bool = (value: unknown): boolean | null =>
  typeof value === "boolean" ? value : null;
const obj = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const arr = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const credential =
  /(crk_live_|sk-|sk_live_|ghp_|nvapi-|AIza|bearer|password|secret|token)/i;
function id(value: unknown, max = 96): string | null {
  return typeof value === "string" &&
    value.length <= max &&
    /^[a-zA-Z0-9][a-zA-Z0-9_.:/-]*$/.test(value) &&
    !credential.test(value)
    ? value
    : null;
}
const code = (value: unknown, allowed: readonly string[]): string | null =>
  typeof value === "string" && allowed.includes(value) ? value : null;
const fingerprint = (value: unknown): string | null =>
  typeof value === "string" && /^sha256:[a-f0-9]{64}$/.test(value)
    ? value
    : null;
const numeric = (
  raw: Record<string, unknown>,
  keys: readonly string[],
): Record<string, number | null> =>
  Object.fromEntries(keys.map((key) => [key, num(raw[key])]));
const freshness = (value: unknown): Record<string, Scalar> => {
  const raw = obj(parseFreshness({ freshness: value }));
  return {
    status: code(raw.status, [
      "fresh",
      "stale",
      "lagging",
      "never_ingested",
      "unknown",
    ]),
    ageSeconds: num(raw.ageSeconds),
    asOf: sourceTimestamp(raw.asOf) ?? null,
    basis: code(raw.basis, FRESHNESS_BASES),
  };
};

export function buildDecisionInputRecord(
  input: DecisionInputCapture,
): DecisionInputRecord {
  let configFingerprint: string | null = null;
  try {
    configFingerprint = sha256(
      stableStringify({ spec: input.spec, prose: input.mergedProse }),
    );
  } catch {
    /* evidence must not interrupt trading */
  }
  const state = obj(input.state);
  const budget = buildDailyRiskBudget(input.spec, input.state);
  const record: DecisionInputRecord = {
    version: "coinrithm.decision-input.v1",
    visibility: "private",
    completeness: "partial",
    phase: input.phase,
    outcome: "pending",
    runId: id(input.runId, 160),
    decisionId: id(input.decisionId, 160),
    configFingerprint,
    observationFingerprint: fingerprint(input.observationFingerprint),
    preThesisObservationFingerprint: fingerprint(
      input.preThesisObservationFingerprint,
    ),
    dailyRiskBudget: {
      version: "coinrithm.daily-risk-budget.v1",
      utcDay: /^\d{4}-\d{2}-\d{2}$/.test(budget.utcDay)
        ? budget.utcDay
        : "unknown",
      limit: num(budget.limit),
      used: num(budget.used) ?? 0,
      remaining: num(budget.remaining),
    },
    guardState: {
      ...numeric(state, [
        "riskIncreasesToday",
        "writesToday",
        "realizedPnlTodayMusd",
        "realizedPnlMusd",
        "peakRealizedMusd",
        "consecutiveRejectCycles",
        "consecutiveModelFailures",
        "consecutiveExecFailures",
        "rateLimitHits",
      ]),
      disabled: bool(state.disabled),
    },
    account: null,
    lists: {},
    counts: {},
    omissions: [
      "partial_projection_not_full_model_input",
      "fingerprints_not_historical_attestation",
      "no_model_replay_guarantee",
      "prose_prompts_and_model_reasoning_excluded",
      "journal_news_thesis_and_other_free_text_excluded",
      "some_source_timestamps_and_source_counts_not_available",
      "pm_discovery_filtered_candidates_not_recorded",
      "raw_closed_trade_records_excluded",
    ],
  };
  if (!record.runId || !record.decisionId)
    record.omissions.push("unsafe_identifier_omitted");
  if (!configFingerprint)
    record.omissions.push("config_fingerprint_unavailable");
  const obs = input.observation;
  if (!obs) {
    record.omissions.push("observation_not_available");
    return record;
  }
  record.account = {
    asOf:
      typeof obs.asOf === "string" &&
      obs.asOf.length <= 30 &&
      /^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/.test(obs.asOf)
        ? obs.asOf
        : null,
    cashAvailableMusd: num(obs.cashAvailableMusd),
    equityMusd: num(obs.equityMusd),
    polledBeforeWrite: bool(obs.polledBeforeWrite),
  };
  const add = (
    name: string,
    items: unknown,
    project: (row: Record<string, unknown>) => Row,
  ) => {
    const all = arr(items);
    // Bound work/space independently of the upstream list limit. Preserve order,
    // not only traded assets; every excluded row is counted explicitly.
    record.lists[name] = all.slice(0, 40).map((item) => project(obj(item)));
    record.counts[name] = {
      source: all.length,
      retained: record.lists[name].length,
      omitted: Math.max(0, all.length - record.lists[name].length),
    };
  };
  add("watch", obs.watch, (r) => ({
    symbol: id(r.symbol, 20),
    coinId: id(r.coinId, 32),
    discovered: bool(r.discovered),
    ...numeric(r, [
      "priceUsd",
      "change1h",
      "change24h",
      "change7d",
      "sentimentBullishPct",
    ]),
    freshness: freshness(r.freshness),
    indicators: {
      ...numeric(obj(r.indicators), [
        "asOfClose",
        "rsi14",
        "ema20",
        "ema50",
        "atr14",
      ]),
      aboveEma20: bool(obj(r.indicators).aboveEma20),
      ema20AboveEma50: bool(obj(r.indicators).ema20AboveEma50),
      brokeRecentHigh: bool(obj(r.indicators).brokeRecentHigh),
      brokeRecentLow: bool(obj(r.indicators).brokeRecentLow),
    },
    fundamentals: numeric(obj(r.fundamentals), [
      "marketCapRank",
      "marketCapUsd",
      "volume24hUsd",
    ]),
  }));
  add("futuresPositions", obs.openPositions, (r) => ({
    id: num(r.id),
    symbol: id(r.symbol, 20),
    coinId: id(r.coinId, 32),
    side: code(r.side, ["long", "short"]),
    ...numeric(r, [
      "leverage",
      "marginMusd",
      "unrealizedPnlMusd",
      "entryPrice",
      "markPrice",
      "liquidationPrice",
      "stopLossPrice",
      "takeProfitPrice",
    ]),
  }));
  add("spotOrders", obs.openOrders, (r) => ({
    id: num(r.id),
    symbol: id(r.symbol, 20),
    side: code(r.side, ["buy", "sell"]),
    orderType: code(r.orderType, ["market", "limit", "stop"]),
    quantity: num(r.quantity),
  }));
  add("pmPositions", obs.pmPositions, (r) => ({
    id: num(r.id),
    source: id(r.source, 32),
    slug: id(r.slug, 128),
    outcomeExternalMarketId: id(r.outcomeExternalMarketId, 128),
    side: code(r.side, ["yes", "no"]),
    ...numeric(r, [
      "stakeMusd",
      "unrealizedPnlMusd",
      "entryProbability",
      "currentProbability",
    ]),
  }));
  add("pmMarkets", obs.pmMarkets, (r) => {
    const quality = pmQualityOf(r.quality);
    const support = pmDecisionSupportOf(r.decisionSupport);
    return {
      ref: id(r.ref, 16),
      source: id(r.source, 32),
      slug: id(r.slug, 128),
      outcomeExternalMarketId: id(r.outcomeExternalMarketId, 128),
      ...numeric(r, ["probability", "volumeUsd", "liquidityUsd"]),
      freshness: freshness(r.freshness),
      quality: {
        decisionEligible: quality?.decisionEligible ?? null,
        policyVersion: quality?.policyVersion ?? null,
        assessedAt: quality?.assessedAt ?? null,
        warningReasons: quality?.warningReasons ?? [],
        blockReasons: quality?.blockReasons ?? [],
        reasonsOmitted: quality?.reasonsOmitted ?? null,
      },
      decisionSupport: {
        qualityScore: support?.qualityScore ?? null,
        qualityTier: support?.qualityTier ?? null,
        qualityCapReason: support?.qualityCapReason ?? null,
        spreadTier: support?.spreadTier ?? null,
        liquidityTier: support?.liquidityTier ?? null,
        volumeTier: support?.volumeTier ?? null,
        ...Object.fromEntries(
          PM_FLAGS.map((key) => [key, support?.flags?.[key] ?? null]),
        ),
      },
    };
  });
  add("signals", obs.setups, (r) => ({
    symbol: id(r.symbol, 20),
    kind: code(r.kind, [
      "breakout",
      "breakdown",
      "uptrend",
      "downtrend",
      "stretched",
    ]),
    bias: code(r.bias, ["long", "short", "fade-long", "fade-short"]),
    strength: num(r.strength),
    held: code(r.held, ["long", "short"]),
  }));
  for (const [name, values] of [
    ["news", obs.news],
    ["pmResolutions", obs.pmResolutions],
    ["newClosedTrades", obs.newClosedTrades],
    ["universeMovers", obs.universeMovers],
    ["journal", input.state.journal],
  ] as const) {
    record.counts[name] = {
      source: arr(values).length,
      retained: 0,
      omitted: arr(values).length,
    };
  }
  record.omissions.push("unlisted_fields_and_nested_indicators_excluded");
  if (Object.values(record.counts).some((v) => v.omitted > 0))
    record.omissions.push("list_rows_omitted");
  // Leave room for fixed outcome/error metadata. Drop the largest remaining
  // list's tail, updating exact counts, until the serialized record is bounded.
  while (
    Buffer.byteLength(JSON.stringify(record), "utf8") >
    DECISION_INPUT_MAX_BYTES - 256
  ) {
    const largest = Object.keys(record.lists).sort(
      (a, b) =>
        JSON.stringify(record.lists[b]).length -
        JSON.stringify(record.lists[a]).length,
    )[0];
    if (!largest || record.lists[largest].length === 0) break;
    record.lists[largest].pop();
    record.counts[largest].retained -= 1;
    record.counts[largest].omitted += 1;
    if (!record.omissions.includes("byte_budget_exceeded"))
      record.omissions.push("byte_budget_exceeded");
  }
  return record;
}

export function unavailableDecisionInputRecord(): DecisionInputRecord {
  return {
    version: "coinrithm.decision-input.v1",
    visibility: "private",
    completeness: "partial",
    phase: "before_observation",
    outcome: "pending",
    runId: null,
    decisionId: null,
    configFingerprint: null,
    observationFingerprint: null,
    preThesisObservationFingerprint: null,
    dailyRiskBudget: null,
    guardState: {},
    account: null,
    lists: {},
    counts: {},
    omissions: [
      "evidence_capture_failed",
      "partial_projection_not_full_model_input",
    ],
  };
}

const OMISSIONS = [
  "partial_projection_not_full_model_input",
  "fingerprints_not_historical_attestation",
  "no_model_replay_guarantee",
  "prose_prompts_and_model_reasoning_excluded",
  "journal_news_thesis_and_other_free_text_excluded",
  "source_timestamps_and_source_counts_not_available",
  "some_source_timestamps_and_source_counts_not_available",
  "pm_discovery_filtered_candidates_not_recorded",
  "raw_closed_trade_records_excluded",
  "unsafe_identifier_omitted",
  "config_fingerprint_unavailable",
  "observation_not_available",
  "unlisted_fields_and_nested_indicators_excluded",
  "list_rows_omitted",
  "byte_budget_exceeded",
  "evidence_capture_failed",
  "runtime_exception_after_snapshot",
];
const LIST_KEYS: Record<string, string[]> = {
  watch: [
    "symbol",
    "coinId",
    "discovered",
    "priceUsd",
    "change1h",
    "change24h",
    "change7d",
    "sentimentBullishPct",
    "freshness",
    "indicators",
    "fundamentals",
  ],
  futuresPositions: [
    "id",
    "symbol",
    "coinId",
    "side",
    "leverage",
    "marginMusd",
    "unrealizedPnlMusd",
    "entryPrice",
    "markPrice",
    "liquidationPrice",
    "stopLossPrice",
    "takeProfitPrice",
  ],
  spotOrders: ["id", "symbol", "side", "orderType", "quantity"],
  pmPositions: [
    "id",
    "source",
    "slug",
    "outcomeExternalMarketId",
    "side",
    "stakeMusd",
    "unrealizedPnlMusd",
    "entryProbability",
    "currentProbability",
  ],
  pmMarkets: [
    "ref",
    "source",
    "slug",
    "outcomeExternalMarketId",
    "probability",
    "volumeUsd",
    "liquidityUsd",
    "freshness",
    "quality",
    "decisionSupport",
  ],
  signals: ["symbol", "kind", "bias", "strength", "held"],
};
const NESTED_KEYS: Record<string, string[]> = {
  freshness: ["status", "ageSeconds", "asOf", "basis"],
  quality: [
    "decisionEligible",
    "policyVersion",
    "assessedAt",
    "warningReasons",
    "blockReasons",
    "reasonsOmitted",
  ],
  decisionSupport: [
    "qualityScore",
    "qualityTier",
    "qualityCapReason",
    "spreadTier",
    "liquidityTier",
    "volumeTier",
    ...PM_FLAGS,
  ],
  indicators: [
    "asOfClose",
    "rsi14",
    "ema20",
    "ema50",
    "atr14",
    "aboveEma20",
    "ema20AboveEma50",
    "brokeRecentHigh",
    "brokeRecentLow",
  ],
  fundamentals: ["marketCapRank", "marketCapUsd", "volume24hUsd"],
};
function keysOnly(value: unknown, keys: readonly string[]): boolean {
  return (
    !!value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).every((k) => keys.includes(k))
  );
}
function validRow(value: unknown, keys: string[]): boolean {
  if (!keysOnly(value, keys)) return false;
  return Object.entries(obj(value)).every(([key, v]) => {
    if (v === null) return true;
    if (NESTED_KEYS[key]) return validRow(v, NESTED_KEYS[key]);
    if (key === "asOf" || key === "assessedAt") return sourceTimestamp(v) === v;
    if (key === "basis") return code(v, FRESHNESS_BASES) !== null;
    if (key === "policyVersion")
      return typeof v === "string" && /^pm-quality-\d{1,3}$/.test(v);
    if (key === "warningReasons" || key === "blockReasons") {
      const allowed =
        key === "warningReasons" ? PM_WARNING_REASONS : PM_BLOCK_REASONS;
      return (
        Array.isArray(v) &&
        v.length <= allowed.length &&
        new Set(v).size === v.length &&
        v.every((x) => code(x, allowed) !== null)
      );
    }
    if (["qualityTier", "liquidityTier", "volumeTier"].includes(key))
      return code(v, PM_TIERS) !== null;
    if (key === "qualityCapReason") return code(v, PM_QUALITY_CAPS) !== null;
    if (key === "spreadTier") return code(v, PM_SPREAD_TIERS) !== null;
    if (key === "qualityScore")
      return num(v) !== null && (v as number) >= 0 && (v as number) <= 100;
    if (key === "ageSeconds") return num(v) !== null && (v as number) >= 0;
    if (
      [
        "symbol",
        "coinId",
        "source",
        "slug",
        "outcomeExternalMarketId",
        "ref",
      ].includes(key)
    )
      return id(v, key === "symbol" ? 20 : 128) !== null;
    if (["side", "orderType", "kind", "bias", "held", "status"].includes(key))
      return (
        code(v, [
          "long",
          "short",
          "yes",
          "no",
          "buy",
          "sell",
          "market",
          "limit",
          "stop",
          "breakout",
          "breakdown",
          "uptrend",
          "downtrend",
          "stretched",
          "fade-long",
          "fade-short",
          "fresh",
          "stale",
          "lagging",
          "never_ingested",
          "unknown",
        ]) !== null
      );
    if (
      [
        "discovered",
        "aboveEma20",
        "ema20AboveEma50",
        "brokeRecentHigh",
        "brokeRecentLow",
        "decisionEligible",
        "reasonsOmitted",
        ...PM_FLAGS,
      ].includes(key)
    )
      return typeof v === "boolean";
    return num(v) !== null;
  });
}

/** Defense at the storage boundary. Reject rather than preserve an arbitrary
 * extension field. Detached JSON copy also prevents post-check mutation. */
export function sanitizeDecisionInputRecord(
  value: unknown,
): DecisionInputRecord | undefined {
  try {
    const encoded = JSON.stringify(value);
    if (
      !encoded ||
      Buffer.byteLength(encoded, "utf8") > DECISION_INPUT_MAX_BYTES
    )
      return undefined;
    const r = JSON.parse(encoded) as DecisionInputRecord;
    if (
      !keysOnly(r, [
        "version",
        "visibility",
        "completeness",
        "phase",
        "outcome",
        "runId",
        "decisionId",
        "configFingerprint",
        "observationFingerprint",
        "preThesisObservationFingerprint",
        "dailyRiskBudget",
        "guardState",
        "account",
        "lists",
        "counts",
        "omissions",
      ])
    )
      return undefined;
    if (
      r.version !== "coinrithm.decision-input.v1" ||
      r.visibility !== "private" ||
      r.completeness !== "partial"
    )
      return undefined;
    if (
      !code(r.phase, ["before_observation", "observed", "decision_input"]) ||
      !code(r.outcome, ["pending", "returned", "runtime_error"])
    )
      return undefined;
    if (
      ![r.runId, r.decisionId].every((v) => v === null || id(v, 160) !== null)
    )
      return undefined;
    if (
      ![
        r.configFingerprint,
        r.observationFingerprint,
        r.preThesisObservationFingerprint,
      ].every((v) => v === null || fingerprint(v) !== null)
    )
      return undefined;
    if (r.dailyRiskBudget !== null) {
      const b = r.dailyRiskBudget;
      if (
        !keysOnly(b, ["version", "utcDay", "limit", "used", "remaining"]) ||
        b.version !== "coinrithm.daily-risk-budget.v1" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(b.utcDay)
      )
        return undefined;
      if (
        num(b.used) === null ||
        ![b.limit, b.remaining].every((v) => v === null || num(v) !== null)
      )
        return undefined;
    }
    if (
      !keysOnly(r.guardState, [
        "riskIncreasesToday",
        "writesToday",
        "realizedPnlTodayMusd",
        "realizedPnlMusd",
        "peakRealizedMusd",
        "consecutiveRejectCycles",
        "consecutiveModelFailures",
        "consecutiveExecFailures",
        "rateLimitHits",
        "disabled",
      ])
    )
      return undefined;
    if (
      !Object.entries(r.guardState).every(
        ([k, v]) =>
          v === null ||
          (k === "disabled" ? typeof v === "boolean" : num(v) !== null),
      )
    )
      return undefined;
    if (
      r.account !== null &&
      (!keysOnly(r.account, [
        "asOf",
        "cashAvailableMusd",
        "equityMusd",
        "polledBeforeWrite",
      ]) ||
        !Object.entries(r.account).every(
          ([k, v]) =>
            v === null ||
            (k === "asOf"
              ? typeof v === "string" && /^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/.test(v)
              : k === "polledBeforeWrite"
                ? typeof v === "boolean"
                : num(v) !== null),
        ))
    )
      return undefined;
    if (!keysOnly(r.lists, Object.keys(LIST_KEYS))) return undefined;
    if (
      !Object.entries(r.lists).every(
        ([name, rows]) =>
          Array.isArray(rows) &&
          rows.length <= 40 &&
          rows.every((v) => validRow(v, LIST_KEYS[name])),
      )
    )
      return undefined;
    if (
      !keysOnly(r.counts, [
        ...Object.keys(LIST_KEYS),
        "news",
        "pmResolutions",
        "newClosedTrades",
        "universeMovers",
        "journal",
      ])
    )
      return undefined;
    if (
      !Object.entries(r.counts).every(
        ([name, c]) =>
          keysOnly(c, ["source", "retained", "omitted"]) &&
          [c.source, c.retained, c.omitted].every(
            (v) => Number.isSafeInteger(v) && v >= 0,
          ) &&
          c.source === c.retained + c.omitted &&
          c.retained === (r.lists[name]?.length ?? 0),
      )
    )
      return undefined;
    if (!Object.keys(r.lists).every((k) => k in r.counts)) return undefined;
    if (
      !Array.isArray(r.omissions) ||
      r.omissions.length > OMISSIONS.length ||
      !r.omissions.every((v) => OMISSIONS.includes(v))
    )
      return undefined;
    return r;
  } catch {
    return undefined;
  }
}
