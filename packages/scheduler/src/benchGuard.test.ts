import { describe, expect, it, vi } from "vitest";
import {
  abortReasonOf,
  BENCH_MAX_CALLS,
  createBenchGuard,
  providerCallsOf,
} from "./benchGuard.js";
import { OWNER_BUDGET_DEFERRED_ERROR } from "./sharedPolicy.js";
import type { RouteAttempt, RouteMetadata } from "./route.js";

const route = (...attempts: Partial<RouteAttempt>[]): RouteMetadata =>
  ({
    policyVersion: "test",
    profile: "configured",
    reason: "configured",
    attempts: attempts.map((a) => ({
      provider: "nvidia",
      model: "nvidia/nemotron-3-super-120b-a12b",
      outcome: "success",
      latencyMs: 1,
      ...a,
    })),
  }) as RouteMetadata;

const ok = { ok: true, text: "{}", route: route({}) };
const input = { system: "s", user: "u" };

function harness(
  results: unknown[],
  over: Partial<Parameters<typeof createBenchGuard>[0]> = {},
) {
  let clock = 0;
  const sleeps: number[] = [];
  const guard = createBenchGuard({
    maxCalls: 40,
    minIntervalMs: 90_000,
    maxOwnerDenialStreak: 3,
    now: () => clock,
    sleep: async (ms) => {
      sleeps.push(ms);
      clock += ms;
    },
    ...over,
  });
  const decide = vi.fn(async () => results.shift() ?? ok);
  const provider = guard.wrap({ label: "router", decide } as never);
  return { guard, provider, decide, sleeps };
}

describe("bench guard", () => {
  it("allows 1..40 calls only", () => {
    expect(BENCH_MAX_CALLS).toBe(40);
    for (const maxCalls of [0, 1, 41, 1.5])
      expect(() =>
        createBenchGuard({
          maxCalls,
          minIntervalMs: 0,
          maxOwnerDenialStreak: 3,
        }),
      ).toThrow(/maxCalls/);
  });

  it("stops at the call cap without reaching the provider again", async () => {
    const h = harness([], { maxCalls: 4 });
    expect((await h.provider.decide(input)).ok).toBe(true);
    expect((await h.provider.decide(input)).ok).toBe(true);
    // 2 used + a worst-case 2 = 4: still fits.
    expect((await h.provider.decide(input)).ok).toBe(true);
    // 3 used + 2 > 4: refused before the provider is reached.
    const fourth = await h.provider.decide(input);
    expect(fourth).toMatchObject({ ok: false, deferred: true });
    expect(h.decide).toHaveBeenCalledTimes(3);
    expect(h.guard.state.providerCalls).toBe(3);
    expect(h.guard.state.aborted).toMatch(/^call cap 4 reached/);
  });

  it("reserves a recovery retry: one decision can never overshoot the cap", async () => {
    // A malformed first output plus the same-model recovery: 2 provider calls.
    const recovered = {
      ok: true,
      text: "{}",
      route: route(
        { outcome: "failed", failureClass: "malformed" },
        { outcome: "success" },
      ),
    };
    const h = harness([recovered, recovered], { maxCalls: 3 });
    expect((await h.provider.decide(input)).ok).toBe(true);
    expect(h.guard.state.providerCalls).toBe(2);
    // 2 used + a worst-case 2 > 3: the second decision never starts.
    expect((await h.provider.decide(input)).ok).toBe(false);
    expect(h.decide).toHaveBeenCalledOnce();
    expect(h.guard.state.providerCalls).toBeLessThanOrEqual(3);
  });

  it("spaces decisions by the minimum interval", async () => {
    const h = harness([]);
    await h.provider.decide(input);
    await h.provider.decide(input);
    await h.provider.decide(input);
    expect(h.sleeps).toEqual([90_000, 90_000]);
  });

  it("aborts on a provider 429 and on a cooldown hold, then never calls again", async () => {
    for (const r of [
      route({ outcome: "failed", failureClass: "capacity", status: 429 }),
      route({ outcome: "deferred", admissionReasons: ["model_cooldown"] }),
    ]) {
      const h = harness([{ ok: false, error: "x", route: r }]);
      await h.provider.decide(input);
      expect(h.guard.state.aborted).toMatch(/provider_capacity|route_cooldown/);
      expect((await h.provider.decide(input)).ok).toBe(false);
      expect(h.decide).toHaveBeenCalledOnce();
    }
  });

  it("aborts after three owner-budget denials in a row; a success resets the streak", async () => {
    const denial = {
      ok: false,
      deferred: true,
      error: OWNER_BUDGET_DEFERRED_ERROR,
      route: route({ outcome: "deferred", admissionReasons: ["token_budget"] }),
    };
    const h = harness([denial, denial, ok, denial, denial, denial]);
    for (let i = 0; i < 5; i++) await h.provider.decide(input);
    expect(h.guard.state.aborted).toBeNull();
    await h.provider.decide(input);
    expect(h.guard.state.aborted).toBe("3 owner-budget denials in a row");
    // Local deferrals never count as provider calls.
    expect(h.guard.state.providerCalls).toBe(1);
  });

  it("counts every attempt that reached a provider", () => {
    expect(
      providerCallsOf(
        route(
          { outcome: "deferred", admissionReasons: ["model_cooldown"] },
          { outcome: "failed", failureClass: "transient" },
          { outcome: "success" },
        ),
      ),
    ).toBe(2);
    expect(abortReasonOf(route({ outcome: "success" }))).toBeNull();
    expect(abortReasonOf(undefined)).toBeNull();
  });
});

describe("bench guard clocks (root 57085)", () => {
  it("runs the provider call on the real clock and restores the replay clock", async () => {
    const REAL = 1_791_400_000_000;
    const HISTORICAL = 1_791_359_520_689; // a cassette asOf, hours earlier
    const original = Date.now;
    const seen: number[] = [];
    const guard = createBenchGuard({
      maxCalls: 40,
      minIntervalMs: 0,
      maxOwnerDenialStreak: 3,
      realNow: () => REAL,
    });
    const provider = guard.wrap({
      label: "router",
      decide: async () => {
        seen.push(Date.now());
        return ok;
      },
    } as never);
    // What withReplayClock does around a replayed cycle.
    Date.now = () => HISTORICAL;
    try {
      await provider.decide(input);
      expect(seen).toEqual([REAL]);
      expect(Date.now()).toBe(HISTORICAL);
    } finally {
      Date.now = original;
    }
  });

  it("restores the replay clock even when the provider throws", async () => {
    const original = Date.now;
    const guard = createBenchGuard({
      maxCalls: 40,
      minIntervalMs: 0,
      maxOwnerDenialStreak: 3,
      realNow: () => 2,
    });
    const provider = guard.wrap({
      label: "router",
      decide: async () => {
        throw new Error("transport");
      },
    } as never);
    Date.now = () => 1;
    try {
      await expect(provider.decide(input)).rejects.toThrow("transport");
      expect(Date.now()).toBe(1);
    } finally {
      Date.now = original;
    }
  });
});
