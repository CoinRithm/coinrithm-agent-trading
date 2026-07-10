// Mechanical BENCHMARK baseline agents — the living reference line the Arena
// measures skill against (sol-audit #7 baselines).
//
// These are NOT LLM agents. There is no model, no prompt, and no inference cost.
// Each cycle the runner short-circuits the provider and computes a decision
// deterministically from the observation, so a benchmark's forecast is fully
// reproducible from (market, date) alone. Three strategies, ALL mechanical:
//
//   • market-implied — submits a forecast EXACTLY equal to the market's own
//     probability at decision time. This is the definition of the baseline the
//     forecast-skill scorecard measures against, and the ONLY agent for which an
//     echo of the market price is correct BY DESIGN. Its description says
//     BENCHMARK so the runner's anti-echo log is never read as a defect.
//   • base-rate     — submits an uninformative 50 for every market. We do NOT
//     invent per-category historical base rates: the observation carries no
//     calibrated category prior, so the honest baseline is the uninformative
//     prior. If a cheap calibrated base rate is ever surfaced in the
//     observation, swap it in here (documented, never fabricated).
//   • random        — submits a deterministic pseudo-random forecast in [20,80]
//     seeded from (market key, UTC date), so a run is reproducible and a "null"
//     forecaster's noise floor is a fair, stable comparison.
//
// The market PICK rule is identical across all three (highest-volume eligible
// market that carries a usable probability and is not already held), so the
// three benchmarks bet the SAME markets and differ ONLY in the forecast — which
// is exactly what a clean baseline comparison needs.

import {
  AgentSpec,
  Decision,
  Observation,
  PmMarket,
  PmPosition,
  ProposedAction,
  SPEC_VERSION,
} from "./types.js";
import { dayKey } from "./util.js";

// ───────────────────────── Strategy vocabulary ──────────────────────────────

export const BENCHMARK_STRATEGIES = [
  "market-implied",
  "base-rate",
  "random",
] as const;
export type BenchmarkStrategy = (typeof BENCHMARK_STRATEGIES)[number];

export function isBenchmarkStrategy(s: string): s is BenchmarkStrategy {
  return (BENCHMARK_STRATEGIES as readonly string[]).includes(s);
}

// The uninformative prior the base-rate benchmark submits. Documented, NOT an
// invented per-category historical rate: the observation carries no calibrated
// category prior to read, so 50 (maximum entropy for a binary) is the honest,
// non-fabricated baseline. See the module header.
export const BASE_RATE_UNINFORMATIVE = 50;

// Tiny fixed stake (mUSD). Equal to the server's PM minimum so a benchmark bets
// the smallest honest ticket — it exists to record forecasts, not to size risk.
export const BENCHMARK_STAKE_MUSD = 10;

// The random/null benchmark's forecast range (inclusive), kept away from the
// [1,99] extremes so a "no-information" forecaster never masquerades as confident.
export const RANDOM_FORECAST_MIN = 20;
export const RANDOM_FORECAST_MAX = 80;

// ───────────────────────── Deterministic helpers ────────────────────────────

// A market's stable identity: the canonical triple, lower-cased. Doubles as the
// dedupe key against held positions and the seed component for the random RNG.
export function marketKey(m: {
  source: string;
  slug: string;
  outcomeExternalMarketId: string;
}): string {
  return `${m.source.toLowerCase()}|${m.slug.toLowerCase()}|${m.outcomeExternalMarketId}`;
}

// FNV-1a 32-bit string hash — small, dependency-free, and deterministic across
// platforms. Used only to derive the reproducible random-benchmark forecast.
function fnv1a32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    // h *= 16777619, kept in 32-bit unsigned space via Math.imul.
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// Deterministic pseudo-random forecast in [RANDOM_FORECAST_MIN,
// RANDOM_FORECAST_MAX], one-decimal, seeded from (marketKey, dateKey). Same seed
// ⇒ same value, so a re-run of the same cycle reproduces exactly.
export function seededRandomForecast(seed: string): number {
  const span = RANDOM_FORECAST_MAX - RANDOM_FORECAST_MIN;
  // 0..1 from the hash, then map into the span at one-decimal precision.
  const unit = fnv1a32(seed) / 0xffffffff;
  const raw = RANDOM_FORECAST_MIN + unit * span;
  return Math.round(raw * 10) / 10;
}

// Clamp any probability-percentage to the backend's exclusive (0,100) rail as a
// one-decimal value in [1,99] — the same rail the runner enforces on model
// forecasts. Non-finite input returns undefined.
function clampForecast(pct: number): number | undefined {
  if (!Number.isFinite(pct)) return undefined;
  const clamped = Math.min(99, Math.max(1, pct));
  return Math.round(clamped * 10) / 10;
}

// A market is a usable benchmark candidate iff it carries a real probability
// (needed for the market-implied echo) AND a canonical triple. Keeping the SAME
// gate for all three strategies is what makes them bet identical markets.
function hasUsableProbability(m: PmMarket): boolean {
  return (
    typeof m.probability === "number" &&
    Number.isFinite(m.probability) &&
    !!m.source &&
    !!m.slug &&
    !!m.outcomeExternalMarketId
  );
}

// Deterministic pick: among eligible (usable-probability), not-already-held
// candidates, the highest-volume market wins; ties break on the market key
// ascending so the choice is fully reproducible. `volumeUsd` absent ⇒ treated as
// 0, so an older backend that omits volume falls back to a pure key-ordered pick
// (still deterministic). observe() already excludes held markets and eligibility
// -false outcomes, so this is a belt-and-suspenders re-filter.
export function pickBenchmarkMarket(
  markets: PmMarket[],
  heldKeys: Set<string> = new Set(),
): PmMarket | undefined {
  const candidates = markets
    .filter(hasUsableProbability)
    .filter((m) => !heldKeys.has(marketKey(m)));
  if (candidates.length === 0) return undefined;
  return candidates.reduce((best, m) => {
    const bv = best.volumeUsd ?? 0;
    const mv = m.volumeUsd ?? 0;
    if (mv !== bv) return mv > bv ? m : best;
    return marketKey(m) < marketKey(best) ? m : best;
  });
}

// The per-strategy forecast (1..99) for a chosen market on a given UTC date.
// Returns undefined only if a market-implied echo can't be sized (non-finite
// probability) — the caller then skips rather than fabricating a value.
export function benchmarkForecast(
  strategy: BenchmarkStrategy,
  market: PmMarket,
  dateKey: string,
): number | undefined {
  switch (strategy) {
    case "market-implied":
      // Echo the market's own probability (0..1 ⇒ percentage). BY DESIGN — this
      // agent IS the market-implied baseline definition.
      return clampForecast(Math.round((market.probability ?? NaN) * 100));
    case "base-rate":
      return BASE_RATE_UNINFORMATIVE;
    case "random":
      return clampForecast(
        seededRandomForecast(`${marketKey(market)}|${dateKey}`),
      );
  }
}

// ───────────────────────── The mechanical decision ──────────────────────────

export interface MechanicalDecideInput {
  strategy: string; // carried in the agent's model.name; validated here
  observation: Observation;
  // UTC date component that seeds the random benchmark. Defaults to today so a
  // run is reproducible within a day; injected in tests for determinism.
  dateKey?: string;
  stakeMusd?: number; // default BENCHMARK_STAKE_MUSD
}

export interface MechanicalDecideResult {
  decision: Decision;
  log: string[];
}

const heldKeysOf = (positions: PmPosition[]): Set<string> =>
  new Set(
    positions
      .filter((p) => (p.status ?? "open") === "open")
      .map((p) =>
        marketKey({
          source: p.source ?? "",
          slug: p.slug ?? "",
          outcomeExternalMarketId: p.outcomeExternalMarketId ?? "",
        }),
      ),
  );

// Compute one benchmark cycle's decision directly from the observation — no
// model call. Skips (never throws) when the strategy is unknown or no eligible
// market is available; otherwise emits a single pm_open carrying the strategy's
// forecast. Confidence is fixed at 1 (a benchmark never abstains on confidence).
export function decideMechanical(
  input: MechanicalDecideInput,
): MechanicalDecideResult {
  const log: string[] = [];
  const strategy = input.strategy;
  if (!isBenchmarkStrategy(strategy)) {
    log.push(`mechanical: unknown benchmark strategy "${strategy}" — skipping`);
    return { decision: { decision: "skip", reason: "unknown_strategy", actions: [] }, log };
  }

  const dateKey = input.dateKey ?? dayKey();
  const stakeMusd = input.stakeMusd ?? BENCHMARK_STAKE_MUSD;
  const held = heldKeysOf(input.observation.pmPositions);
  const market = pickBenchmarkMarket(input.observation.pmMarkets, held);
  if (!market) {
    log.push(
      `mechanical(${strategy}): no eligible PM market to benchmark this cycle — skipping`,
    );
    return { decision: { decision: "skip", reason: "no_eligible_market", actions: [] }, log };
  }

  const forecast = benchmarkForecast(strategy, market, dateKey);
  if (forecast == null) {
    log.push(
      `mechanical(${strategy}): could not size a forecast for ${market.slug} — skipping`,
    );
    return { decision: { decision: "skip", reason: "unsizable_forecast", actions: [] }, log };
  }

  const marketPct =
    typeof market.probability === "number"
      ? Math.round(market.probability * 100)
      : undefined;
  const rationale =
    strategy === "market-implied"
      ? `BENCHMARK market-implied: forecast ${forecast}% = market probability${marketPct != null ? ` ${marketPct}%` : ""} on ${market.source}/${market.slug} (echo is the baseline definition, not a defect).`
      : strategy === "base-rate"
        ? `BENCHMARK base-rate: uninformative ${forecast}% prior on ${market.source}/${market.slug} (no invented per-category base rate).`
        : `BENCHMARK random: seeded pseudo-random ${forecast}% on ${market.source}/${market.slug} (reproducible from market+date).`;

  const action: ProposedAction = {
    type: "pm_open",
    ref: market.ref,
    source: market.source,
    slug: market.slug,
    outcomeExternalMarketId: market.outcomeExternalMarketId,
    stakeMusd,
    confidence: 1,
    forecastProbability: forecast,
    rationaleSummary: rationale,
  };

  log.push(
    `mechanical(${strategy}): bet ${stakeMusd}mUSD on ${market.source}/${market.slug} @ forecast ${forecast}% (market ${marketPct ?? "?"}%, vol ${market.volumeUsd ?? 0})`,
  );
  return {
    decision: {
      decision: "act",
      confidence: 1,
      rationale,
      actions: [action],
    },
    log,
  };
}

// ───────────────────────── Agent definitions (DB seed) ──────────────────────

export interface BenchmarkAgentDefinition {
  handle: string;
  displayName: string;
  strategy: BenchmarkStrategy;
  cadenceSeconds: number;
  spec: AgentSpec;
  prose: string;
}

// A complete, valid AgentSpec for a mechanical benchmark. The strategy travels
// in model.name (provider "mechanical"); the runner reads it there. Caps are set
// so a benchmark NEVER self-disables (all kill-switches off — it is a permanent
// reference line) and never abstains on confidence (minConfidence 0). PM-only,
// tiny fixed stake, always-fire trigger policy (mechanical is free, so there is
// no reason to gate a cycle).
function benchmarkSpec(strategy: BenchmarkStrategy, cadenceSeconds: number): AgentSpec {
  const label = LABELS[strategy];
  return {
    name: `bench-${strategy}`,
    description: `BENCHMARK (${label}) — a mechanical, non-LLM baseline reference agent. ${DESCRIPTIONS[strategy]} It is NOT a skill agent; it exists so the Arena can show real agents beating (or not) a fixed, deterministic baseline. Paper-only, zero inference cost.`,
    spec: SPEC_VERSION,
    trigger: { cadence: `${Math.round(cadenceSeconds / 60)}m` },
    model: { provider: "mechanical", name: strategy },
    venues: ["pm"],
    risk: {
      maxLeverage: 1,
      perTradeMarginMusd: BENCHMARK_STAKE_MUSD, // per-trade stake cap = the tiny fixed stake
      maxConcurrentPositions: 1000, // PM opens aren't capped by this; kept generous
      requireStopLoss: false,
      // Discovery needs a query coin; PM-only agents still seed discover from the
      // watchlist. Majors give the broadest, most-liquid crypto board to benchmark.
      watchlist: ["BTC", "ETH", "SOL"],
    },
    limits: {
      maxTradesPerDay: 0, // 0 = unlimited: a benchmark records as many markets as it sees
      maxWritesPerCycle: 1, // one benchmarked market per cycle
      maxDailyLossMusd: 0, // disabled — a reference line never risk-stops
      maxOpenMarginMusd: 100000,
    },
    abstention: {
      onStaleData: false,
      onWeakSignal: false,
      onMissingQuote: false,
      onInsufficientBalance: false,
      minConfidence: 0, // a benchmark never abstains on confidence
    },
    sync: { requirePollBeforeWrite: false },
    killSwitch: {
      maxDrawdownMusd: 0,
      maxConsecutiveRejects: 0,
      maxConsecutiveModelFailures: 0,
      onRateLimitPressure: false,
    },
    objective: {
      primary: "calibration",
      secondary: ["benchmark", strategy],
      horizon: "all",
    },
    capabilities: [],
    triggerPolicy: {
      mode: "always", // mechanical = free; always evaluate, never gate a cycle
      skipLlmWhenNoTrigger: false,
      alwaysManageOpenPositions: true,
      maxLlmCallsPerHour: 0,
      debounceMinutes: 0,
      pmEvalCooldownMinutes: 0,
    },
  };
}

const LABELS: Record<BenchmarkStrategy, string> = {
  "market-implied": "market-implied",
  "base-rate": "base-rate",
  random: "random/null",
};

const DESCRIPTIONS: Record<BenchmarkStrategy, string> = {
  "market-implied":
    "Each cycle it picks the highest-volume eligible market and submits a forecast EXACTLY equal to the market's own probability — the market-implied baseline every skill claim is measured against.",
  "base-rate":
    "It submits an uninformative 50% prior on every market (no fabricated per-category base rate).",
  random:
    "It submits a deterministic pseudo-random forecast in [20,80] seeded from the market and date, giving a reproducible no-information noise floor.",
};

// Human-readable prose stored on the row. NEVER fed to a model (mechanical agents
// don't reason) — it exists so the Arena/terminal can describe the agent honestly.
function benchmarkProse(strategy: BenchmarkStrategy): string {
  return `# Benchmark: ${LABELS[strategy]}\n\nThis is a MECHANICAL BENCHMARK baseline, not a skill agent. ${DESCRIPTIONS[strategy]}\n\nIt calls no language model, has zero inference cost, and is fully deterministic and reproducible. It exists purely as a public reference line: the Arena compares real agents' calibration against these baselines. Paper-only.`;
}

// Default cadence: hourly. Frequent enough to accumulate a steady benchmark
// record, slow enough that the three benchmarks don't churn the discovered board.
const DEFAULT_BENCHMARK_CADENCE_SECONDS = 3600;

export const BENCHMARK_AGENTS: BenchmarkAgentDefinition[] =
  BENCHMARK_STRATEGIES.map((strategy) => ({
    handle: `bench-${strategy}`,
    displayName: `Benchmark: ${LABELS[strategy]}`,
    strategy,
    cadenceSeconds: DEFAULT_BENCHMARK_CADENCE_SECONDS,
    spec: benchmarkSpec(strategy, DEFAULT_BENCHMARK_CADENCE_SECONDS),
    prose: benchmarkProse(strategy),
  }));
