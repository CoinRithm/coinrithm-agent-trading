// The bench: run variants of an agent on the SAME recorded inputs, K times
// each, next to built-in baselines, and report honest paired statistics.
//
// Every replayed cycle goes through the production runCycle in DRY-RUN with a
// ReplayClient, so prompt building, parsing, ref resolution, capital sizing,
// validation and every reject code are exactly the shipped code paths. There
// is no bench-only decision logic to drift from production.
//
// Each cycle starts from a fresh run state (the same state recording used),
// so daily counters, debounce and journal can never leak between cassettes or
// repeats. The consequence: replay shows how a variant decides on a first
// look at a recorded market, not how it behaves deep into a running streak.
//
// Clock: Date.now() reads the recording's clock plus the real time elapsed in
// this cycle, so freshness and entry-predicate age checks see the age the data
// had when recorded (plus the variant's own model latency, as in production).

import { buildAgentDefinitionSnapshot } from "../definitionSnapshot.js";
import { clearPmCalibrationCache, type ObserveOptions } from "../observe.js";
import { Provider } from "../providers.js";
import { runCycle } from "../runner.js";
import { newState } from "../state.js";
import { AgentSpec, CycleResult, ProposedAction } from "../types.js";
import { Cassette, mechanicalBaselineSpec } from "./cassette.js";
import type { BenchmarkStrategy } from "../mechanical.js";
import {
  FUTURES_SYNTHETIC_FEE_BPS,
  PM_SYNTHETIC_FEE_RATE_AT_MID,
  SPOT_SYNTHETIC_FEE_BPS,
} from "./costs.js";
import { LabelFile, scoreAction } from "./labels.js";
import { BENCH_RUN_ID, SKIP_PROVIDER } from "./recordingClient.js";
import { ReplayClient } from "./replayClient.js";
import {
  ActionRow,
  BenchReport,
  buildReport,
  chronological,
  CycleRow,
  VariantInfo,
} from "./report.js";

export const BASELINE_SKIP = "baseline:skip";
export const BASELINE_MARKET = "baseline:market";
export const BASELINE_BASE_RATE = "baseline:base-rate";
export const BASELINE_RANDOM = "baseline:random";
/**
 * Mechanical PM baselines, one deterministic run per cassette each: the
 * market's own probability, an uninformative 50, and a seeded random
 * forecast (mechanical.ts). They need the recorded PM observation, so a
 * futures/spot-only corpus has only baseline:skip.
 */
export const MECHANICAL_BASELINES: ReadonlyArray<
  readonly [name: string, strategy: BenchmarkStrategy]
> = [
  [BASELINE_MARKET, "market-implied"],
  [BASELINE_BASE_RATE, "base-rate"],
  [BASELINE_RANDOM, "random"],
];
export const DEFAULT_REPEATS = 3;
export const MAX_REPEATS = 50;
export const DEFAULT_SEED = 20261007;
export const DEFAULT_BOOTSTRAP_RESAMPLES = 2000;
const VARIANT_NAME_RE = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,39}$/;

export interface BenchVariant {
  name: string;
  spec: AgentSpec;
  mergedProse: string;
  provider: Provider;
}

export interface RunBenchOptions {
  cassettes: Cassette[];
  variants: BenchVariant[];
  repeats?: number;
  labels?: Record<string, LabelFile>;
  seed?: number;
  bootstrapResamples?: number;
  /** Include the skip and market-implied baselines (default true). */
  baselines?: boolean;
  log?: (line: string) => void;
}

/**
 * Run `fn` with Date.now() reading `clockMs` plus the real time elapsed since
 * the call. Restored afterwards even when `fn` throws. `new Date()` with no
 * argument is NOT shifted (it does not call Date.now); in the runner it only
 * stamps the whale-context fetchedAt and fallback asOf values.
 */
export async function withReplayClock<T>(
  clockMs: number,
  fn: () => Promise<T>,
): Promise<T> {
  const realNow = Date.now;
  const offset = clockMs - realNow();
  Date.now = () => realNow() + offset;
  try {
    return await fn();
  } finally {
    Date.now = realNow;
  }
}

/**
 * The identity of a move WITHOUT its size, for action-set overlap and repeat
 * consistency: did the variant do the same thing, not the same amount.
 */
export function actionKey(action: ProposedAction): string {
  const lower = (s: string | undefined) => (s ?? "").toLowerCase();
  const upper = (s: string | undefined) => (s ?? "").toUpperCase();
  switch (action.type) {
    case "pm_open":
      return `pm_open:${lower(action.source)}/${lower(action.slug)}/${action.outcomeExternalMarketId ?? action.ref ?? ""}`;
    case "futures_open":
      return `futures_open:${upper(action.symbol)}:${action.side}`;
    case "futures_close":
      return `futures_close:${action.positionId}`;
    case "futures_set_sltp":
      return `futures_set_sltp:${action.positionId}`;
    case "spot_order":
      return `spot_order:${upper(action.symbol)}:${action.side}:${action.orderType}`;
    case "spot_cancel":
      return `spot_cancel:${action.orderId}`;
  }
}

function sizeOf(action: ProposedAction): number | undefined {
  if (action.type === "pm_open") return action.stakeMusd;
  if (action.type === "futures_open") return action.marginMusd;
  return undefined;
}

function toRow(
  cassette: Cassette,
  variant: string,
  repeat: number,
  result: CycleResult | undefined,
  runtimeError: string | undefined,
  client: ReplayClient,
  labels: LabelFile | undefined,
): CycleRow {
  const actions: ActionRow[] = (result?.planned ?? []).map((p) => {
    const forecast = (p.action as { forecastProbability?: unknown })
      .forecastProbability;
    return {
      key: actionKey(p.action),
      type: p.action.type,
      accepted: p.accepted,
      ...(p.accepted ? {} : { code: p.code ?? "unknown" }),
      ...(p.quote ? { quote: "synthesized" as const } : {}),
      ...(typeof forecast === "number"
        ? { forecastProbability: forecast }
        : {}),
      ...(p.quote?.entryProbability !== undefined
        ? { entryProbability: p.quote.entryProbability }
        : {}),
      ...(sizeOf(p.action) !== undefined ? { sizeMusd: sizeOf(p.action) } : {}),
      ...(p.accepted
        ? {
            score: scoreAction({
              action: p.action,
              quote: p.quote,
              asOf: cassette.asOf,
              labels,
            }),
          }
        : {}),
    };
  });
  const decisionType = runtimeError
    ? "runtime_error"
    : (result?.decisionType ?? (result?.decision === "act" ? "act" : "skip"));
  return {
    cassetteId: cassette.id,
    asOf: cassette.asOf,
    variant,
    repeat,
    decision: result?.decision ?? "skip",
    decisionType,
    modelFailed: result?.modelFailed === true,
    llmCallMade: result?.llmCallMade === true,
    ...(result?.triggerCodes ? { triggerCodes: [...result.triggerCodes] } : {}),
    ...(result?.skipReason
      ? { skipReason: result.skipReason.slice(0, 200) }
      : {}),
    ...(runtimeError ? { runtimeError: runtimeError.slice(0, 200) } : {}),
    actions,
    missingInputs: [...new Set(client.stats.missing)].sort(),
    synthesizedQuotes: client.stats.synthesizedQuotes.length,
    refusedWrites: [...client.stats.refusedWrites],
  };
}

/** Replay one cassette for one variant once, through the real runCycle. */
export async function replayCycle(
  cassette: Cassette,
  variant: string,
  repeat: number,
  spec: AgentSpec,
  mergedProse: string,
  provider: Provider,
  labels?: LabelFile,
  observeOptions?: ObserveOptions,
): Promise<CycleRow> {
  clearPmCalibrationCache();
  const client = new ReplayClient(cassette);
  let result: CycleResult | undefined;
  let runtimeError: string | undefined;
  try {
    result = await withReplayClock(cassette.clockMs, () =>
      runCycle({
        client,
        provider,
        spec,
        mergedProse,
        state: newState(BENCH_RUN_ID),
        live: false,
        ...(observeOptions ? { observeOptions } : {}),
      }),
    );
  } catch (error) {
    // A crash is a result for this variant, never a reason to drop the cycle.
    runtimeError = error instanceof Error ? error.message : String(error);
  }
  return toRow(cassette, variant, repeat, result, runtimeError, client, labels);
}

/** The always-skip baseline: no reads, no model, no action, by definition. */
function skipBaselineRow(cassette: Cassette): CycleRow {
  return {
    cassetteId: cassette.id,
    asOf: cassette.asOf,
    variant: BASELINE_SKIP,
    repeat: 0,
    decision: "skip",
    decisionType: "skip",
    modelFailed: false,
    llmCallMade: false,
    skipReason: "baseline: always skip",
    actions: [],
    missingInputs: [],
    synthesizedQuotes: 0,
    refusedWrites: [],
  };
}

/**
 * Every modelling assumption behind the numbers, written into each report so
 * a reader never has to guess what a "stop" or a "cost" means here.
 */
export function benchAssumptions(): Record<string, unknown> {
  return {
    quotes:
      "every quote is synthesized from recorded evidence (PM: the discover probability of the chosen outcome; futures/spot: the recorded market price); none comes from the paper engine",
    entry:
      "entry at the recorded (synthesized) quote with the paper fee model below; entry latency is not modelled",
    pmFee: {
      constant: "PM_SYNTHETIC_FEE_RATE_AT_MID",
      value: PM_SYNTHETIC_FEE_RATE_AT_MID,
      model:
        "fee = rate x 4p(1-p) of the price paid (openapi Paper Execution Realism v1 shape: ~1.8% near 50%, ~0 at the extremes); ask spread and size slippage are not modelled, so PM cost is optimistic by an unmeasured amount",
    },
    futuresFee: {
      constant: "FUTURES_SYNTHETIC_FEE_BPS",
      value: FUTURES_SYNTHETIC_FEE_BPS,
      model:
        "flat taker fee on notional at entry and at exit (the runner's conservative pre-quote estimate); spread and slippage not modelled",
    },
    spotFee: {
      constant: "SPOT_SYNTHETIC_FEE_BPS",
      value: SPOT_SYNTHETIC_FEE_BPS,
    },
    pmEntryFloor:
      "the synthesized quote does not apply the server floor; the runner validator rejects the same action as pm_entry_below_floor (production: quote_ineligible)",
    pmOutcome:
      "settled 0/1 from the label file; cost = stake / net shares (fee-inclusive); Brier uses the forecast the agent sent",
    futuresOutcome:
      "an OHLC walk MODEL over label bars that open after asOf; it is not exact fill or stop behaviour",
    sameBarStopAndTarget:
      "a bar touching both stop and take-profit is resolved as the STOP (conservative) and counted in labelled.futuresSameBarStopFirst",
    missingBars:
      "a missing bar before the exit (or before the horizon end) gives outcome unlabelled_gap: counted, never filled",
    funding:
      "included only when the label file carries funding events for the symbol (labelled.futuresFundingIncluded); otherwise excluded",
    liquidation:
      "approximated at entry x (1 -/+ 1/leverage); forfeits the margin with no extra fill cost",
    state:
      "fresh run state per cycle: no journal, theses, debounce or daily counters carried between cassettes or repeats",
    clock:
      "Date.now = recording clock + real elapsed time, so data ages as recorded plus model latency",
    outcomeCutoff:
      "asOf is the end of all recording reads; it is not the earlier trades sync cursor",
    pnlComparisons:
      "zero means a complete no-action cycle; cycles with missing inputs, runtime errors, or any unscored accepted action are excluded from paired PnL, with exclusion counts shown; all repeats of a cassette must qualify",
    inference:
      "per-cassette bootstrap assumes independent observations; overlapping market windows can violate that assumption; repeated A/A calibration does not establish independence or future performance",
  };
}

export async function runBench(opts: RunBenchOptions): Promise<BenchReport> {
  const repeats = opts.repeats ?? DEFAULT_REPEATS;
  if (!Number.isInteger(repeats) || repeats < 1 || repeats > MAX_REPEATS)
    throw new Error(`repeats must be an integer from 1 to ${MAX_REPEATS}`);
  if (opts.variants.length === 0)
    throw new Error("at least one variant is required");
  const names = new Set<string>();
  for (const v of opts.variants) {
    if (!VARIANT_NAME_RE.test(v.name))
      throw new Error(
        `variant name "${v.name}" must be 1-40 letters, digits, "_", "." or "-"`,
      );
    if (names.has(v.name)) throw new Error(`duplicate variant "${v.name}"`);
    names.add(v.name);
  }
  if (opts.cassettes.length === 0)
    throw new Error("the corpus has no cassettes");
  const seed = (opts.seed ?? DEFAULT_SEED) >>> 0;
  const resamples = opts.bootstrapResamples ?? DEFAULT_BOOTSTRAP_RESAMPLES;
  const baselines = opts.baselines !== false;
  const log = opts.log ?? (() => {});

  const cassettes = chronological(opts.cassettes);
  const rows: CycleRow[] = [];
  for (const cassette of cassettes) {
    const labels = opts.labels?.[cassette.id];
    for (const v of opts.variants) {
      for (let r = 0; r < repeats; r++) {
        const row = await replayCycle(
          cassette,
          v.name,
          r,
          v.spec,
          v.mergedProse,
          v.provider,
          labels,
        );
        rows.push(row);
        log(
          `${cassette.id} ${v.name}#${r + 1}: ${row.decisionType}, ${row.actions.filter((a) => a.accepted).length}/${row.actions.length} accepted${row.missingInputs.length ? `, ${row.missingInputs.length} missing input(s)` : ""}`,
        );
      }
    }
    if (baselines) {
      rows.push(skipBaselineRow(cassette));
      // Deterministic, so one run per cassette each. Use the recorded agent's
      // board policy, not the replacement mechanical provider's policy.
      // Originally mechanical recordings keep their uncurated board.
      if (cassette.marketBaselineRecorded)
        for (const [name, strategy] of MECHANICAL_BASELINES)
          rows.push(
            await replayCycle(
              cassette,
              name,
              0,
              mechanicalBaselineSpec(cassette.spec, strategy),
              "",
              SKIP_PROVIDER,
              labels,
              {
                curatedPmBoard: cassette.spec.model?.provider !== "mechanical",
              },
            ),
          );
    }
  }

  const variants: VariantInfo[] = opts.variants.map((v) => ({
    name: v.name,
    kind: "variant",
    definitionHash: buildAgentDefinitionSnapshot(v.spec, v.mergedProse)
      .definitionHash,
  }));
  if (baselines) {
    variants.push({ name: BASELINE_SKIP, kind: "baseline" });
    if (cassettes.some((c) => c.marketBaselineRecorded))
      for (const [name] of MECHANICAL_BASELINES)
        variants.push({ name, kind: "baseline" });
  }
  const specHashes = [...new Set(cassettes.map((c) => c.agentSpecHash))].sort();
  return buildReport({
    cassettes,
    rows,
    variants,
    repeats,
    seed,
    bootstrapResamples: resamples,
    assumptions: benchAssumptions(),
    fidelity: {
      recordedAgentDefinitions: specHashes,
      synthesizedQuotes: rows.reduce((s, r) => s + r.synthesizedQuotes, 0),
      cyclesWithMissingInputs: rows.filter((r) => r.missingInputs.length > 0)
        .length,
      refusedWrites: rows.reduce((s, r) => s + r.refusedWrites.length, 0),
    },
  });
}
