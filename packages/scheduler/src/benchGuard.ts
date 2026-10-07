// Guard for admitted bench comparisons (C3 of the item-3 plan, root 57066 /
// 57074). The bench's model calls go through the scheduler's own routed
// provider (same NVIDIA key buckets, model cooldowns and usage debt as live
// agents); this wrapper adds the run-level safety rules on top:
//
//   - a hard cap on provider calls for the whole run (attempts that reached a
//     provider, not local deferrals), enforced BEFORE each decision: a
//     decision may make up to MAX_ROUTE_ATTEMPTS provider calls (a
//     malformed-output recovery retries the same model), so it starts only
//     when that worst case still fits under the cap;
//   - a minimum interval between decisions, so one run never bursts;
//   - abort on the first provider capacity failure (429), on any local
//     cooldown hold (another caller's 429 already cooled the route), and on
//     a streak of owner-budget denials;
//   - once aborted, every later decision returns a deferred result without
//     touching the provider;
//   - the provider call runs on the REAL clock. The bench replays each
//     cassette under its historical Date.now (withReplayClock); inside the
//     provider path that clock would turn a real Retry-After into hours of
//     SHARED route cooldown and stop successes clearing current backoff
//     (root 57085). The guard restores the real Date.now, captured when the
//     guard is created (before any replay), for exactly the inner decide()
//     and puts the replay clock back afterwards; strategy evidence keeps the
//     historical clock.
//
// It never retries, never raises a quota and never changes a live agent.

import type { DecideInput, DecideResult } from "@coinrithm/mcp-trading/engine";
import { OWNER_BUDGET_DEFERRED_ERROR } from "./sharedPolicy.js";
import { MAX_ROUTE_ATTEMPTS, type RouteMetadata } from "./route.js";

export const BENCH_MAX_CALLS = 40;

export interface BenchGuardOptions {
  maxCalls: number;
  minIntervalMs: number;
  maxOwnerDenialStreak: number;
  /** Worst-case provider calls one decision can make (router limit). */
  attemptsPerDecision?: number;
  /** Real-clock end of the approved window (epoch ms): no decision starts
   *  at or after it, nor one whose spacing wait would cross it. */
  deadlineMs?: number;
  /** The real clock. Default: Date.now as it is when the guard is created,
   *  which must be before any replay clock is installed. */
  realNow?: () => number;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

export interface BenchGuardState {
  providerCalls: number;
  decisions: number;
  ownerDenialStreak: number;
  aborted: string | null;
}

type GuardedProvider = {
  label: string;
  decide(input: DecideInput): Promise<DecideResult>;
};

const deferred = (why: string): DecideResult => ({
  ok: false,
  deferred: true,
  error: `bench aborted: ${why}`,
});

/** Pure: why a routed result must stop the run, or null. */
export function abortReasonOf(
  route: RouteMetadata | undefined,
): "provider_capacity" | "route_cooldown" | null {
  for (const a of route?.attempts ?? []) {
    if (a.outcome !== "deferred" && a.failureClass === "capacity")
      return "provider_capacity";
    if (
      a.admissionReasons?.some(
        (r) => r === "model_cooldown" || r === "shared_key_cooldown",
      )
    )
      return "route_cooldown";
  }
  return null;
}

/** Pure: provider calls a routed result made (attempts past local admission). */
export function providerCallsOf(route: RouteMetadata | undefined): number {
  return (route?.attempts ?? []).filter((a) => a.outcome !== "deferred").length;
}

/**
 * Wrap the routed providers of one bench run. All variants share one state,
 * so the call cap and abort rules hold for the run as a whole.
 */
export function createBenchGuard(opts: BenchGuardOptions): {
  state: BenchGuardState;
  wrap(inner: GuardedProvider): GuardedProvider;
  /** Stop the run: every later decision is deferred (signal, operator). */
  abort(reason: string): void;
} {
  if (
    !Number.isInteger(opts.maxCalls) ||
    opts.maxCalls < 1 ||
    opts.maxCalls > BENCH_MAX_CALLS
  )
    throw new Error(`maxCalls must be an integer from 1 to ${BENCH_MAX_CALLS}`);
  const perDecision = opts.attemptsPerDecision ?? MAX_ROUTE_ATTEMPTS;
  if (!Number.isInteger(perDecision) || perDecision < 1)
    throw new Error("attemptsPerDecision must be a positive integer");
  if (opts.maxCalls < perDecision)
    throw new Error(
      `maxCalls ${opts.maxCalls} cannot cover one decision (up to ${perDecision} provider calls)`,
    );
  const realNow = opts.realNow ?? Date.now;
  const now = opts.now ?? realNow;
  const sleep =
    opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const state: BenchGuardState = {
    providerCalls: 0,
    decisions: 0,
    ownerDenialStreak: 0,
    aborted: null,
  };
  let lastDecisionAt: number | null = null;
  // Decisions are serialized: the bench runs sequentially, and a guard that
  // let two through at once could exceed the cap or the interval.
  let queue: Promise<unknown> = Promise.resolve();

  const run = async (
    inner: GuardedProvider,
    input: DecideInput,
  ): Promise<DecideResult> => {
    if (state.aborted) return deferred(state.aborted);
    // Reserve the worst case BEFORE the decision: the router may retry the
    // same model once inside one decide(), so checking afterwards could let
    // a single decision overshoot the cap.
    if (state.providerCalls + perDecision > opts.maxCalls) {
      state.aborted = `call cap ${opts.maxCalls} reached (${state.providerCalls} used, a decision may need ${perDecision})`;
      return deferred(state.aborted);
    }
    const deadline = opts.deadlineMs ?? Infinity;
    const startAt =
      lastDecisionAt === null
        ? realNow()
        : Math.max(realNow(), lastDecisionAt + opts.minIntervalMs);
    if (startAt >= deadline) {
      state.aborted = "approved window ended";
      return deferred(state.aborted);
    }
    if (lastDecisionAt !== null) {
      const wait = lastDecisionAt + opts.minIntervalMs - now();
      if (wait > 0) await sleep(wait);
    }
    if (state.aborted) return deferred(state.aborted);
    lastDecisionAt = now();
    state.decisions += 1;
    // The provider path (Retry-After parsing, call timing, backoff clearing)
    // must see the real clock; the replay clock is restored afterwards.
    const replayNow = Date.now;
    Date.now = realNow;
    let result: DecideResult & { route?: RouteMetadata };
    try {
      result = (await inner.decide(input)) as DecideResult & {
        route?: RouteMetadata;
      };
    } finally {
      Date.now = replayNow;
    }
    state.providerCalls += providerCallsOf(result.route);
    const abort = abortReasonOf(result.route);
    if (abort) state.aborted = abort;
    if (!result.ok && result.error === OWNER_BUDGET_DEFERRED_ERROR) {
      state.ownerDenialStreak += 1;
      if (state.ownerDenialStreak >= opts.maxOwnerDenialStreak)
        state.aborted ??= `${state.ownerDenialStreak} owner-budget denials in a row`;
    } else if (result.ok) state.ownerDenialStreak = 0;
    if (state.providerCalls > opts.maxCalls)
      state.aborted ??= `call cap ${opts.maxCalls} exceeded by a fallback`;
    return result;
  };

  return {
    state,
    abort: (reason: string) => {
      state.aborted ??= reason;
    },
    wrap: (inner) => ({
      label: `bench-guard(${inner.label})`,
      decide: (input) => {
        const next = queue.then(() => run(inner, input));
        queue = next.catch(() => undefined);
        return next;
      },
    }),
  };
}
