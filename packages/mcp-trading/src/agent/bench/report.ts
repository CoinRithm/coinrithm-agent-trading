// The bench report: deterministic JSON over replayed cycles.
//
// Determinism rules: no wall-clock field, cassettes in chronological order,
// every map key sorted, every number rounded to 6 decimals, and the bootstrap
// driven by a SEEDED PRNG (never Math.random). The same corpus and the same
// decisions therefore produce the same JSON and the same contentHash (sha256
// of the canonical JSON, the scorecard.ts approach). With a real model the
// decisions themselves vary run to run; that is what --repeats measures.
//
// Statistics, stated plainly:
//   - Paired comparison: for every cassette both variants saw, the per-cassette
//     difference of a metric (each side averaged over its repeats). The report
//     gives the mean difference and a percentile bootstrap 95% CI over
//     cassettes. A CI that excludes 0 is evidence of a difference on THIS
//     corpus, not a guarantee; few cassettes give wide intervals.
//   - Chronological split: cassettes sorted by asOf; the first 70% are "tune",
//     the last 30% "holdout". Choose between variants on tune, report holdout.
//   - Failures are results: model failures, runtime errors and validator
//     rejections are counted per variant and never dropped from a denominator.
//   - Calibrated null: a single A/A comparison can exclude 0 by chance (about
//     1 time in 20 at 95%). So the report does not demand that every A/A CI
//     covers 0. Instead, per variant with 2+ repeats, it builds many seeded
//     A/A comparisons from the variant's OWN repeats (two different repeats
//     per cassette) and reports how often the 95% CI test fires. That
//     false-positive rate should sit near 5%; far above means the CI is too
//     narrow for this corpus and its differences must not be trusted.

import { canonicalJson, sha256Hex } from "./cassette.js";
import { ActionScore } from "./labels.js";

export const REPORT_SCHEMA = "coinrithm.bench.report.v1";
export const TUNE_FRACTION = 0.7;
export const NULL_CALIBRATION_RESAMPLINGS = 200;
export const NULL_CALIBRATION_BOOTSTRAP = 500;
export const NULL_CALIBRATION_TARGET = 0.05;

export interface ActionRow {
  /** Identity of the move without its size (see actionKey). */
  key: string;
  type: string;
  accepted: boolean;
  code?: string;
  /** Present when the action's quote was synthesized by the replay client. */
  quote?: "synthesized";
  forecastProbability?: number;
  entryProbability?: number;
  sizeMusd?: number;
  score?: ActionScore;
}

export interface CycleRow {
  cassetteId: string;
  asOf: string;
  variant: string;
  repeat: number;
  decision: "act" | "skip";
  decisionType: string;
  modelFailed: boolean;
  llmCallMade: boolean;
  /**
   * Gate trigger codes for the cycle. Tells a real setup (PRICE_BREAKOUT,
   * MOMENTUM_TREND, ...) apart from the periodic PM wake (PM_PERIODIC). Each
   * cycle starts from a fresh state, so a cassette with PM markets and no
   * setup or open position CAN wake periodically.
   */
  triggerCodes?: string[];
  skipReason?: string;
  runtimeError?: string;
  actions: ActionRow[];
  missingInputs: string[];
  synthesizedQuotes: number;
  refusedWrites: string[];
}

export interface VariantInfo {
  name: string;
  kind: "variant" | "baseline";
  definitionHash?: string;
}

export interface CiResult {
  n: number;
  meanA: number | null;
  meanB: number | null;
  meanDiff: number | null;
  ci95: [number, number] | null;
  excludesZero: boolean;
}

/** Deterministic 32-bit PRNG (mulberry32). Same seed, same sequence. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function fnv1a32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

const mean = (xs: number[]): number | null =>
  xs.length === 0 ? null : xs.reduce((s, x) => s + x, 0) / xs.length;

/**
 * Percentile bootstrap CI of the mean of `diffs`. Deterministic for a given
 * seed. n = 0 gives null; n = 1 gives a degenerate [d, d] interval.
 */
export function bootstrapMeanCi(
  diffs: number[],
  seed: number,
  resamples: number,
): [number, number] | null {
  const n = diffs.length;
  if (n === 0) return null;
  const rand = mulberry32(seed);
  const means: number[] = [];
  for (let b = 0; b < resamples; b++) {
    let s = 0;
    for (let i = 0; i < n; i++) s += diffs[Math.floor(rand() * n)];
    means.push(s / n);
  }
  means.sort((x, y) => x - y);
  const at = (q: number) =>
    means[
      Math.min(means.length - 1, Math.max(0, Math.floor(q * means.length)))
    ];
  return [at(0.025), at(0.975)];
}

export interface NullCalibration {
  resamplings: number;
  /** Cassettes with at least two repeat values for this metric. */
  usableCassettes: number;
  falsePositives: number;
  /** Share of seeded A/A resamplings whose 95% CI excluded 0. */
  falsePositiveRate: number | null;
}

/**
 * Calibrated-null check of the paired bootstrap test. `repeatValues` holds,
 * per cassette, one metric value per repeat of the SAME variant. Each of the
 * `resamplings` draws two different repeats per cassette (seeded), treats them
 * as A and B, and runs the same 95% CI test the comparisons use. Under this
 * construction there is no true difference, so the share of draws whose CI
 * excludes 0 estimates the test's false-positive rate. A draw where every
 * difference is exactly 0 has CI [0, 0] and counts as a non-rejection.
 */
export function calibrateNull(
  repeatValues: number[][],
  seed: number,
  resamplings = NULL_CALIBRATION_RESAMPLINGS,
  bootstrapResamples = NULL_CALIBRATION_BOOTSTRAP,
): NullCalibration {
  const usable = repeatValues.filter((v) => v.length >= 2);
  if (usable.length < 2)
    return {
      resamplings: 0,
      usableCassettes: usable.length,
      falsePositives: 0,
      falsePositiveRate: null,
    };
  const rand = mulberry32(seed);
  let falsePositives = 0;
  for (let s = 0; s < resamplings; s++) {
    const diffs = usable.map((v) => {
      const i = Math.floor(rand() * v.length);
      let j = Math.floor(rand() * (v.length - 1));
      if (j >= i) j += 1;
      return v[i] - v[j];
    });
    const innerSeed = Math.floor(rand() * 4294967296) >>> 0;
    if (diffs.every((d) => d === 0)) continue;
    const ci = bootstrapMeanCi(diffs, innerSeed, bootstrapResamples);
    if (ci && (ci[0] > 0 || ci[1] < 0)) falsePositives += 1;
  }
  return {
    resamplings,
    usableCassettes: usable.length,
    falsePositives,
    falsePositiveRate: falsePositives / resamplings,
  };
}

/** Jaccard similarity of two action-key sets; two empty sets count as 1. */
export function jaccard(a: string[], b: string[]): number {
  const sa = new Set(a);
  const sb = new Set(b);
  if (sa.size === 0 && sb.size === 0) return 1;
  let inter = 0;
  for (const k of sa) if (sb.has(k)) inter += 1;
  return inter / (sa.size + sb.size - inter);
}

/** Round every finite number in a JSON-like value (deterministic output). */
export function roundDeep(value: unknown, digits = 6): unknown {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    const f = 10 ** digits;
    const r = Math.round(value * f) / f;
    return Object.is(r, -0) ? 0 : r;
  }
  if (Array.isArray(value)) return value.map((v) => roundDeep(v, digits));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (v !== undefined) out[k] = roundDeep(v, digits);
    }
    return out;
  }
  return value;
}

// ── per-cassette summaries ──────────────────────────────────────────────────

const PAIRED_METRICS = [
  "acceptedActions",
  "rejectedActions",
  "actRate",
  "modelFailureRate",
  "labelledPnlMusd",
  "pmBrier",
  "pmReturnOnStake",
  "futuresReturnOnMargin",
] as const;
type PairedMetric = (typeof PAIRED_METRICS)[number];

interface CassetteSummary {
  values: Partial<Record<PairedMetric, number>>;
  perRepeat: Partial<Record<PairedMetric, number>>[];
  /** One sorted accepted-action-key list per repeat. */
  actionSets: string[][];
}

function acceptedKeys(row: CycleRow): string[] {
  return [
    ...new Set(row.actions.filter((a) => a.accepted).map((a) => a.key)),
  ].sort();
}

function rowValues(row: CycleRow): Partial<Record<PairedMetric, number>> {
  const accepted = row.actions.filter((a) => a.accepted);
  const labelled = accepted
    .map((a) => a.score)
    .filter(
      (s): s is Extract<ActionScore, { status: "labelled" }> =>
        s?.status === "labelled",
    );
  const pm = labelled.filter(
    (s): s is Extract<ActionScore, { venue: "pm" }> => s.venue === "pm",
  );
  const futures = labelled.filter(
    (s): s is Extract<ActionScore, { venue: "futures" }> =>
      s.venue === "futures",
  );
  const briers = pm
    .map((s) => s.brier)
    .filter((b): b is number => b !== undefined);
  const out: Partial<Record<PairedMetric, number>> = {
    acceptedActions: accepted.length,
    rejectedActions: row.actions.length - accepted.length,
    actRate: row.decisionType === "act" ? 1 : 0,
    modelFailureRate: row.modelFailed || row.runtimeError ? 1 : 0,
  };
  // A genuine no-action cycle earns zero. Missing outcomes/inputs are unknown,
  // not cash: zero-filling them biases comparisons toward unlabelled trades.
  if (
    !row.runtimeError &&
    row.missingInputs.length === 0 &&
    accepted.every((a) => a.score?.status === "labelled")
  )
    out.labelledPnlMusd = labelled.reduce((s, x) => s + x.pnlMusd, 0);
  const pmBrier = mean(briers);
  if (pmBrier !== null) out.pmBrier = pmBrier;
  const pmRet = mean(pm.map((s) => s.returnOnStake));
  if (pmRet !== null) out.pmReturnOnStake = pmRet;
  const futRet = mean(futures.map((s) => s.returnOnMargin));
  if (futRet !== null) out.futuresReturnOnMargin = futRet;
  return out;
}

function summarize(rows: CycleRow[]): CassetteSummary {
  const perRepeat = rows.map(rowValues);
  const values: Partial<Record<PairedMetric, number>> = {};
  for (const m of PAIRED_METRICS) {
    // Compare equal repeat sets, never just whichever repeats got labels.
    if (m === "labelledPnlMusd" && perRepeat.some((r) => r[m] === undefined))
      continue;
    const v = mean(
      perRepeat.map((r) => r[m]).filter((x): x is number => x !== undefined),
    );
    if (v !== null) values[m] = v;
  }
  return { values, perRepeat, actionSets: rows.map(acceptedKeys) };
}

// ── variant aggregates ──────────────────────────────────────────────────────

function variantMetrics(
  rows: CycleRow[],
  summaries: CassetteSummary[],
): Record<string, unknown> {
  const decisionMix: Record<string, number> = {
    act: 0,
    skip: 0,
    gate_skip: 0,
    model_error: 0,
    runtime_error: 0,
  };
  // Trigger code occurrences across rows (a row can carry several codes), not
  // model calls: llmCallMade/decisionMix count those.
  const triggerMix: Record<string, number> = {};
  const rejectCodes: Record<string, number> = {};
  let proposed = 0;
  let accepted = 0;
  const missingKeys = new Set<string>();
  const scores: ActionScore[] = [];
  for (const row of rows) {
    decisionMix[row.decisionType] = (decisionMix[row.decisionType] ?? 0) + 1;
    for (const code of row.triggerCodes ?? [])
      triggerMix[code] = (triggerMix[code] ?? 0) + 1;
    for (const a of row.actions) {
      proposed += 1;
      if (a.accepted) {
        accepted += 1;
        if (a.score) scores.push(a.score);
      } else {
        const code = a.code ?? "unknown";
        rejectCodes[code] = (rejectCodes[code] ?? 0) + 1;
      }
    }
    for (const k of row.missingInputs) missingKeys.add(k);
  }
  const pm = scores.filter(
    (s): s is Extract<ActionScore, { venue: "pm" }> =>
      s.status === "labelled" && s.venue === "pm",
  );
  const futures = scores.filter(
    (s): s is Extract<ActionScore, { venue: "futures" }> =>
      s.status === "labelled" && s.venue === "futures",
  );
  const consistent = summaries.filter((s) =>
    s.actionSets.every((set) => set.join("|") === s.actionSets[0].join("|")),
  ).length;
  return {
    cassettes: summaries.length,
    cycles: rows.length,
    modelFailures: rows.filter((r) => r.modelFailed).length,
    runtimeErrors: rows.filter((r) => r.runtimeError).length,
    decisionMix,
    triggerMix,
    actions: {
      proposed,
      accepted,
      rejected: proposed - accepted,
      rejectCodes,
    },
    repeatConsistency:
      summaries.length === 0 ? null : consistent / summaries.length,
    synthesizedQuotes: rows.reduce((s, r) => s + r.synthesizedQuotes, 0),
    cyclesWithMissingInputs: rows.filter((r) => r.missingInputs.length > 0)
      .length,
    missingInputKeys: [...missingKeys].sort(),
    refusedWrites: rows.reduce((s, r) => s + r.refusedWrites.length, 0),
    pnlComparableCycles: rows.filter(
      (r) => rowValues(r).labelledPnlMusd !== undefined,
    ).length,
    pnlExcludedCycles: rows.filter(
      (r) => rowValues(r).labelledPnlMusd === undefined,
    ).length,
    labelled: {
      pmOpens: pm.length,
      pmBrierMean: mean(
        pm.map((s) => s.brier).filter((b): b is number => b !== undefined),
      ),
      pmMarketBrierMean: mean(
        pm
          .map((s) => s.marketBrier)
          .filter((b): b is number => b !== undefined),
      ),
      pmReturnOnStakeMean: mean(pm.map((s) => s.returnOnStake)),
      futuresOpens: futures.length,
      futuresReturnOnMarginMean: mean(futures.map((s) => s.returnOnMargin)),
      futuresSameBarStopFirst: futures.filter((s) => s.sameBarStopAndTarget)
        .length,
      futuresFundingIncluded: futures.filter((s) => s.fundingIncluded).length,
      unlabelledOpens: scores.filter((s) => s.status === "unlabelled").length,
      unlabelledGapOpens: scores.filter((s) => s.status === "unlabelled_gap")
        .length,
      labelledPnlMusd: [...pm, ...futures].reduce((s, x) => s + x.pnlMusd, 0),
    },
  };
}

// ── report ──────────────────────────────────────────────────────────────────

export interface BuildReportInput {
  cassettes: Array<{ id: string; asOf: string }>;
  rows: CycleRow[];
  variants: VariantInfo[];
  repeats: number;
  seed: number;
  bootstrapResamples: number;
  fidelity: Record<string, unknown>;
  assumptions: Record<string, unknown>;
}

export interface BenchReport {
  schema: typeof REPORT_SCHEMA;
  contentHash: string;
  [key: string]: unknown;
}

/** Chronological order: asOf (parsed when possible), then id. */
export function chronological<T extends { id: string; asOf: string }>(
  cassettes: T[],
): T[] {
  const t = (c: T) => {
    const ms = Date.parse(c.asOf);
    return Number.isFinite(ms) ? ms : Number.POSITIVE_INFINITY;
  };
  return [...cassettes].sort(
    (a, b) => t(a) - t(b) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
}

export function buildReport(input: BuildReportInput): BenchReport {
  const ordered = chronological(input.cassettes);
  const ids = ordered.map((c) => c.id);
  const tuneCount = Math.floor(ids.length * TUNE_FRACTION);
  const splits: Record<string, string[]> = {
    all: ids,
    tune: ids.slice(0, tuneCount),
    holdout: ids.slice(tuneCount),
  };

  const byKey = new Map<string, CycleRow[]>();
  for (const row of input.rows) {
    const k = `${row.variant}\u0000${row.cassetteId}`;
    const list = byKey.get(k) ?? [];
    list.push(row);
    byKey.set(k, list);
  }
  const rowsOf = (variant: string, id: string) =>
    (byKey.get(`${variant}\u0000${id}`) ?? []).sort(
      (a, b) => a.repeat - b.repeat,
    );
  const summaryCache = new Map<string, CassetteSummary | undefined>();
  const summaryOf = (variant: string, id: string) => {
    const k = `${variant}\u0000${id}`;
    if (!summaryCache.has(k)) {
      const rows = rowsOf(variant, id);
      summaryCache.set(k, rows.length > 0 ? summarize(rows) : undefined);
    }
    return summaryCache.get(k);
  };

  const variants: Record<string, unknown> = {};
  for (const v of input.variants) {
    const bySplit: Record<string, unknown> = {};
    for (const [split, splitIds] of Object.entries(splits)) {
      const rows = splitIds.flatMap((id) => rowsOf(v.name, id));
      const summaries = splitIds
        .map((id) => summaryOf(v.name, id))
        .filter((s): s is CassetteSummary => s !== undefined);
      bySplit[split] = variantMetrics(rows, summaries);
    }
    const allSummaries = ids
      .map((id) => summaryOf(v.name, id))
      .filter((s): s is CassetteSummary => s !== undefined);
    const nullMetrics: Record<string, NullCalibration> = {};
    if (v.kind === "variant" && input.repeats >= 2) {
      for (const m of PAIRED_METRICS) {
        nullMetrics[m] = calibrateNull(
          allSummaries.map((s) =>
            s.perRepeat
              .map((r) => r[m])
              .filter((x): x is number => x !== undefined),
          ),
          (input.seed ^ fnv1a32(`null|${v.name}|${m}`)) >>> 0,
        );
      }
    }
    variants[v.name] = {
      kind: v.kind,
      ...(v.definitionHash ? { definitionHash: v.definitionHash } : {}),
      ...bySplit,
      nullCalibration:
        Object.keys(nullMetrics).length === 0
          ? null
          : {
              method:
                "seeded A/A from this variant's own repeats (two different repeats per cassette), paired bootstrap 95% CI per resampling, all cassettes",
              target: NULL_CALIBRATION_TARGET,
              resamplings: NULL_CALIBRATION_RESAMPLINGS,
              bootstrapResamples: NULL_CALIBRATION_BOOTSTRAP,
              seed: input.seed,
              metrics: nullMetrics,
            },
    };
  }

  // Every variant against every later variant and every baseline; baselines
  // are not compared with each other.
  const comparisons: unknown[] = [];
  for (let i = 0; i < input.variants.length; i++) {
    for (let j = i + 1; j < input.variants.length; j++) {
      const a = input.variants[i];
      const b = input.variants[j];
      if (a.kind === "baseline" && b.kind === "baseline") continue;
      const bySplit: Record<string, unknown> = {};
      for (const [split, splitIds] of Object.entries(splits)) {
        const pairs = splitIds
          .map((id) => [summaryOf(a.name, id), summaryOf(b.name, id)] as const)
          .filter(
            (p): p is readonly [CassetteSummary, CassetteSummary] =>
              p[0] !== undefined && p[1] !== undefined,
          );
        const overlaps = pairs.map(([sa, sb]) => {
          const scores: number[] = [];
          for (const x of sa.actionSets)
            for (const y of sb.actionSets) scores.push(jaccard(x, y));
          return mean(scores) ?? 1;
        });
        const metrics: Record<string, CiResult> = {};
        for (const m of PAIRED_METRICS) {
          const both = pairs.filter(
            ([sa, sb]) =>
              sa.values[m] !== undefined && sb.values[m] !== undefined,
          );
          const va = both.map(([sa]) => sa.values[m] as number);
          const vb = both.map(([, sb]) => sb.values[m] as number);
          const diffs = va.map((x, k) => x - vb[k]);
          const ci = bootstrapMeanCi(
            diffs,
            (input.seed ^ fnv1a32(`${a.name}|${b.name}|${split}|${m}`)) >>> 0,
            input.bootstrapResamples,
          );
          metrics[m] = {
            n: diffs.length,
            meanA: mean(va),
            meanB: mean(vb),
            meanDiff: mean(diffs),
            ci95: ci,
            // One paired cassette is an anecdote, not evidence.
            excludesZero:
              ci !== null && diffs.length >= 2 && (ci[0] > 0 || ci[1] < 0),
          };
        }
        bySplit[split] = {
          pairedCassettes: pairs.length,
          actionOverlapJaccard: mean(overlaps),
          metrics,
        };
      }
      comparisons.push({ a: a.name, b: b.name, ...bySplit });
    }
  }

  const cycles = [...input.rows].sort(
    (x, y) =>
      ids.indexOf(x.cassetteId) - ids.indexOf(y.cassetteId) ||
      (x.variant < y.variant ? -1 : x.variant > y.variant ? 1 : 0) ||
      x.repeat - y.repeat,
  );

  const body = roundDeep({
    schema: REPORT_SCHEMA,
    corpus: {
      cassettes: ids.length,
      ids,
      split: {
        tuneFraction: TUNE_FRACTION,
        tune: splits.tune,
        holdout: splits.holdout,
      },
    },
    settings: {
      repeats: input.repeats,
      seed: input.seed,
      bootstrapResamples: input.bootstrapResamples,
      pairedMetrics: [...PAIRED_METRICS],
    },
    assumptions: input.assumptions,
    fidelity: input.fidelity,
    variants,
    comparisons,
    cycles,
  }) as Record<string, unknown>;
  const contentHash = `sha256:${sha256Hex(canonicalJson(body))}`;
  return { ...body, schema: REPORT_SCHEMA, contentHash };
}
