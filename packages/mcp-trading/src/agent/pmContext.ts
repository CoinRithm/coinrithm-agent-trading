// Compact allowlists for already-returned API facts. Never infer eligibility,
// source type, winning probability, or reference data from a quality badge.
import type {
  Freshness,
  PmCalibration,
  PmConsensus,
  PmDecisionSupport,
  PmQuality,
} from "./types.js";
import { asArr, asNum, asObj } from "./extract.js";

export const PM_BLOCK_REASONS = [
  "structurally_invalid",
  "stale_freshness",
  "freshness_unknown",
  "unpriced",
  "quote_dead",
  "dead_zero",
  "not_open",
  "source_degraded",
  "settlement_limbo",
] as const;
export const PM_WARNING_REASONS = [
  "lagging_freshness",
  "unproven_no_activity",
  "untraded_default",
  "play_money",
  "anomaly_flagged",
  "source_time_unverified",
  "sum_atypical_independent",
] as const;
export const PM_FLAGS = [
  "thinMarket",
  "inactiveMarket",
  "highAmbiguity",
  "nearResolution",
  "staleData",
] as const;
export const FRESHNESS_BASES = [
  "latest_snapshot",
  "source_update",
  "processed",
  "event_update",
  "unknown",
] as const;
export const PM_TIERS = ["high", "medium", "low", "unknown"] as const;
export const PM_SPREAD_TIERS = [
  "tight",
  "moderate",
  "wide",
  "unknown",
] as const;
export const PM_QUALITY_CAPS = [
  "unassessable",
  "raw_book",
  "pinned_outcome",
] as const;

export const knownCode = (
  value: unknown,
  allowed: readonly string[],
): string | undefined =>
  typeof value === "string" && allowed.includes(value) ? value : undefined;

export function sourceTimestamp(value: unknown): string | undefined {
  if (
    typeof value !== "string" ||
    value.length > 30 ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)
  )
    return undefined;
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) return undefined;
  const iso = new Date(ms).toISOString();
  const normalized = value.replace(
    /(?:\.(\d{1,3}))?Z$/,
    (_match, fraction: string | undefined) =>
      `.${(fraction ?? "").padEnd(3, "0")}Z`,
  );
  // Date.parse otherwise silently rolls impossible calendar dates forward.
  return iso === normalized ? iso : undefined;
}

export function freshnessOf(
  block: Record<string, unknown>,
): Freshness | undefined {
  const fr = asObj(block.freshness);
  const status = knownCode(fr.status, [
    "fresh",
    "stale",
    "lagging",
    "never_ingested",
    "unknown",
  ]);
  if (!status) return undefined;
  const seconds = asNum(fr.ageSeconds);
  const minutes = asNum(fr.ageMinutes);
  const age = seconds ?? (minutes == null ? undefined : minutes * 60);
  return {
    status,
    ...(age != null && Number.isFinite(age) && age >= 0
      ? { ageSeconds: age }
      : {}),
    ...(sourceTimestamp(fr.asOf) ? { asOf: sourceTimestamp(fr.asOf) } : {}),
    ...(knownCode(fr.basis, FRESHNESS_BASES)
      ? { basis: knownCode(fr.basis, FRESHNESS_BASES) }
      : {}),
  };
}

export function pmQualityOf(value: unknown): PmQuality | undefined {
  const raw = asObj(value);
  if (Object.keys(raw).length === 0) return undefined;
  const reasons = (v: unknown, allowed: readonly string[]) => [
    ...new Set(
      asArr(v)
        .slice(0, 32)
        .filter((r): r is string => !!knownCode(r, allowed)),
    ),
  ];
  const warningReasons = reasons(raw.warningReasons, PM_WARNING_REASONS);
  const blockReasons = reasons(raw.blockReasons, PM_BLOCK_REASONS);
  const omitted = (v: unknown, allowed: readonly string[]) =>
    !Array.isArray(v) || v.length > 32 || v.some((r) => !knownCode(r, allowed));
  return {
    ...(typeof raw.decisionEligible === "boolean"
      ? { decisionEligible: raw.decisionEligible }
      : {}),
    warningReasons,
    blockReasons,
    ...(typeof raw.policyVersion === "string" &&
    /^pm-quality-\d{1,3}$/.test(raw.policyVersion)
      ? { policyVersion: raw.policyVersion }
      : {}),
    ...(sourceTimestamp(raw.assessedAt)
      ? { assessedAt: sourceTimestamp(raw.assessedAt) }
      : {}),
    reasonsOmitted:
      raw.reasonsOmitted === true ||
      omitted(raw.warningReasons, PM_WARNING_REASONS) ||
      omitted(raw.blockReasons, PM_BLOCK_REASONS),
  };
}

export const PM_CONSENSUS_KINDS = ["binary", "leader"] as const;

// The discover event's optional `referenceProbability` (0..100 points, open
// events only) as event-level consensus on the 0..1 `prob` scale. Returns
// undefined when the key is absent (older backend) and null when it is null
// or unusable. It is copied as-is: never mapped onto a specific outcome row
// and never flipped for a NO side, because orientation must not be inferred.
// An unknown kind, or a leader with no named outcome, cannot be read safely
// and is null.
export function pmConsensusOf(
  event: Record<string, unknown>,
): PmConsensus | null | undefined {
  if (!Object.hasOwn(event, "referenceProbability")) return undefined;
  const raw = event.referenceProbability;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const probability = asNum(r.probability);
  const venues = asNum(r.venueCount);
  const spreadPts = asNum(r.spreadPoints);
  const kind = knownCode(r.kind, PM_CONSENSUS_KINDS) as
    PmConsensus["kind"] | undefined;
  const outcome =
    typeof r.outcomeName === "string" && r.outcomeName.trim() !== ""
      ? r.outcomeName.slice(0, 80)
      : r.outcomeName == null
        ? null
        : undefined;
  if (
    probability == null ||
    probability < 0 ||
    probability > 100 ||
    venues == null ||
    !Number.isSafeInteger(venues) ||
    venues < 1 ||
    spreadPts == null ||
    spreadPts < 0 ||
    spreadPts > 100 ||
    !kind ||
    outcome === undefined ||
    (kind === "leader" && outcome === null)
  )
    return null;
  return { prob: probability / 100, venues, spreadPts, kind, outcome };
}

// Below this many settled forecasts the record is too noisy to steer the
// model, so it is not shown at all.
export const PM_CALIBRATION_MIN_SETTLED = 20;
const PM_CALIBRATION_MAX_BANDS = 10;

// The optional `pmCalibration` block of GET /api/agent/performance, compacted
// for the prompt: Brier to 3 decimals, percentages to whole points, bands
// with an invalid or empty range dropped. Returns undefined when the block is
// missing, malformed or has fewer than PM_CALIBRATION_MIN_SETTLED settled.
export function pmCalibrationOf(value: unknown): PmCalibration | undefined {
  const raw = asObj(value);
  const settled = asNum(raw.settled);
  if (
    settled == null ||
    !Number.isSafeInteger(settled) ||
    settled < PM_CALIBRATION_MIN_SETTLED
  )
    return undefined;
  const brier = (v: unknown): number | null => {
    const n = asNum(v);
    return n != null && n >= 0 && n <= 1 ? Math.round(n * 1000) / 1000 : null;
  };
  const pct = (v: unknown): number | null => {
    const n = asNum(v);
    return n != null && n >= 0 && n <= 100 ? Math.round(n) : null;
  };
  const bands = asArr(raw.bands)
    .map(asObj)
    .flatMap((b) => {
      const fromPct = asNum(b.fromPct);
      const toPct = asNum(b.toPct);
      const n = asNum(b.n);
      const meanForecastPct = pct(b.meanForecastPct);
      const winRatePct = pct(b.winRatePct);
      if (
        fromPct == null ||
        toPct == null ||
        fromPct < 0 ||
        toPct > 100 ||
        fromPct >= toPct ||
        n == null ||
        !Number.isSafeInteger(n) ||
        n < 1 ||
        meanForecastPct == null ||
        winRatePct == null
      )
        return [];
      return [{ fromPct, toPct, n, meanForecastPct, winRatePct }];
    })
    .slice(0, PM_CALIBRATION_MAX_BANDS);
  return {
    settled,
    brierAgent: brier(raw.brierAgent),
    brierMarket: brier(raw.brierMarket),
    meanForecastPct: pct(raw.meanForecastPct),
    winRatePct: pct(raw.winRatePct),
    bands,
  };
}

export function pmDecisionSupportOf(
  value: unknown,
): PmDecisionSupport | undefined {
  const raw = asObj(value);
  if (Object.keys(raw).length === 0) return undefined;
  const score = asNum(raw.qualityScore);
  const rawFlags = asObj(raw.flags);
  return {
    ...(score != null && score >= 0 && score <= 100
      ? { qualityScore: score }
      : {}),
    qualityTier: knownCode(raw.qualityTier, PM_TIERS),
    qualityCapReason:
      raw.qualityCapReason === null
        ? null
        : knownCode(raw.qualityCapReason, PM_QUALITY_CAPS),
    spreadTier: knownCode(raw.spreadTier, PM_SPREAD_TIERS),
    liquidityTier: knownCode(raw.liquidityTier, PM_TIERS),
    volumeTier: knownCode(raw.volumeTier, PM_TIERS),
    flags: Object.fromEntries(
      PM_FLAGS.filter((key) => typeof rawFlags[key] === "boolean").map(
        (key) => [key, rawFlags[key]],
      ),
    ),
  };
}
