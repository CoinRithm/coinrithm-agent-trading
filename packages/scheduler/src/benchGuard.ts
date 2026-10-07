// Guard for admitted bench comparisons (C3 of the item-3 plan, root 57066 /
// 57074). The bench's model calls go through the scheduler's own routed
// provider (same NVIDIA key buckets, model cooldowns and usage debt as live
// agents); this wrapper adds the run-level safety rules on top:
//
//   - a hard cap on provider calls for the whole run (attempts that reached a
//     provider, not local deferrals);
//   - a minimum interval between decisions, so one run never bursts;
//   - abort on the first provider capacity failure (429), on any local
//     cooldown hold (another caller's 429 already cooled the route), and on
//     a streak of owner-budget denials;
//   - once aborted, every later decision returns a deferred result without
//     touching the provider.
//
// It never retries, never raises a quota and never changes a live agent.

import type { DecideInput, DecideResult } from "@coinrithm/mcp-trading/engine";
import { OWNER_BUDGET_DEFERRED_ERROR } from "./sharedPolicy.js";
import type { RouteMetadata } from "./route.js";

export const BENCH_MAX_CALLS = 40;

export interface BenchGuardOptions {
  maxCalls: number;
  minIntervalMs: number;
  maxOwnerDenialStreak: number;
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
} {
  if (
    !Number.isInteger(opts.maxCalls) ||
    opts.maxCalls < 1 ||
    opts.maxCalls > BENCH_MAX_CALLS
  )
    throw new Error(`maxCalls must be an integer from 1 to ${BENCH_MAX_CALLS}`);
  const now = opts.now ?? Date.now;
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
    if (state.providerCalls >= opts.maxCalls) {
      state.aborted = `call cap ${opts.maxCalls} reached`;
      return deferred(state.aborted);
    }
    if (lastDecisionAt !== null) {
      const wait = lastDecisionAt + opts.minIntervalMs - now();
      if (wait > 0) await sleep(wait);
    }
    lastDecisionAt = now();
    state.decisions += 1;
    const result = (await inner.decide(input)) as DecideResult & {
      route?: RouteMetadata;
    };
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
