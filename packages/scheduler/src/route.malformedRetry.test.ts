import { afterEach, describe, expect, it, vi } from "vitest";
import {
  type DecideResult,
  type ProviderRouteOptions,
} from "@coinrithm/mcp-trading/engine";
import {
  MAX_CONCURRENT_OWNER_WAITS,
  MAX_OWNER_REFILL_WAIT_MS,
  NEMOTRON_SUPER,
  NEMOTRON_NANO,
  ownerWaitsInFlightNow,
  ROUTE_CHANGED_ERROR,
  RoutedProvider,
  type ModelRoute,
  type RouteHooks,
} from "./route.js";

const input = { system: "strategy", user: "observation", timeoutMs: 1000 };
const superRoute: ModelRoute = {
  provider: "nvidia",
  model: NEMOTRON_SUPER,
  keyRef: "shared:1",
};
const nanoRoute: ModelRoute = { ...superRoute, model: NEMOTRON_NANO };
const bad: DecideResult = {
  ok: true,
  text: '{"decision":"act","actions":"[]","reason":"private"}',
  responseSource: "tool_call",
  usage: { promptTokens: 100, completionTokens: 10 },
};
const good: DecideResult = {
  ok: true,
  text: '{"decision":"skip","actions":[]}',
  responseSource: "content",
  usage: { promptTokens: 90, completionTokens: 8 },
};

function harness(
  results: DecideResult[],
  routes = [superRoute, nanoRoute],
  clock?: () => number,
) {
  const hooks: RouteHooks<string> = {
    availability: vi.fn(async () => ({ eligible: true })),
    acquire: vi.fn(async () => ({ ok: true, lease: "fixture" })),
    release: vi.fn(async () => {}),
    observe: vi.fn(async () => {}),
  };
  const requests: Array<{
    route: ModelRoute;
    options?: ProviderRouteOptions;
    timeoutMs?: number;
  }> = [];
  let now = 0;
  const build = vi.fn((route: ModelRoute, options?: ProviderRouteOptions) => ({
    label: "fixture",
    decide: async (request: typeof input) => {
      requests.push({ route, options, timeoutMs: request.timeoutMs });
      now += 200;
      return results.shift() ?? good;
    },
  }));
  const provider = new RoutedProvider(
    "strong",
    routes,
    false,
    build,
    hooks,
    () => now + (clock?.() ?? 0),
  );
  return {
    hooks,
    requests,
    provider,
    build,
    setNow: (value: number) => {
      now = value;
    },
  };
}

describe("shared Super malformed tool recovery", () => {
  afterEach(() => vi.useRealTimers());

  it.each([48000, 60000])(
    "waits once for %ims authoritative owner refill without a lease, then rechecks and re-admits",
    async (waitMs) => {
      vi.useFakeTimers();
      vi.setSystemTime(0);
      const h = harness([bad, good], [superRoute], () => Date.now());
      vi.mocked(h.hooks.acquire)
        .mockResolvedValueOnce({ ok: true, lease: "first" })
        .mockResolvedValueOnce({
          ok: false,
          scope: "owner",
          admissionReasons: ["token_budget"],
          retryAfterMs: waitMs,
        })
        .mockResolvedValueOnce({ ok: true, lease: "retry" });
      const pending = h.provider.decide({ ...input, timeoutMs: 100000 });
      await vi.advanceTimersByTimeAsync(waitMs - 1);
      expect(h.hooks.acquire).toHaveBeenCalledTimes(2);
      expect(h.hooks.release).toHaveBeenCalledExactlyOnceWith(
        superRoute,
        "first",
        bad,
      );
      expect(h.build).toHaveBeenCalledOnce();
      await vi.advanceTimersByTimeAsync(1);
      const result = await pending;
      expect(result).toMatchObject({
        ok: true,
        usage: { promptTokens: 190, completionTokens: 18 },
      });
      expect(h.hooks.availability).toHaveBeenCalledTimes(3);
      expect(h.hooks.acquire).toHaveBeenCalledTimes(3);
      expect(h.hooks.release).toHaveBeenCalledTimes(2);
      expect(h.requests[1]!.timeoutMs).toBe(100000 - waitMs - 200);
      expect(result.route.attempts).toHaveLength(2);
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it.each([undefined, null, 0, -1, NaN, Infinity, 60001])(
    "does not wait for unusable refill hint %s",
    async (hint) => {
      vi.useFakeTimers();
      vi.setSystemTime(0);
      const h = harness([bad], [superRoute], () => Date.now());
      vi.mocked(h.hooks.acquire)
        .mockResolvedValueOnce({ ok: true, lease: "first" })
        .mockResolvedValueOnce({
          ok: false,
          scope: "owner",
          admissionReasons: ["token_budget"],
          retryAfterMs: hint as number | undefined,
        });
      expect(
        await h.provider.decide({ ...input, timeoutMs: 300000 }),
      ).toMatchObject({ ok: false, deferred: false, usage: bad.usage });
      expect(h.hooks.acquire).toHaveBeenCalledTimes(2);
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it.each([
    { scope: "key" as const, reasons: ["token_budget"] as const },
    { scope: "owner" as const, reasons: ["concurrency"] as const },
    {
      scope: "owner" as const,
      reasons: ["token_budget", "model_cooldown"] as const,
    },
    { scope: "owner" as const, reasons: [] as const },
  ])(
    "does not infer a wait for unrelated admission %j",
    async ({ scope, reasons }) => {
      vi.useFakeTimers();
      const h = harness([bad], [superRoute]);
      vi.mocked(h.hooks.acquire)
        .mockResolvedValueOnce({ ok: true, lease: "first" })
        .mockResolvedValueOnce({
          ok: false,
          scope,
          admissionReasons: [...reasons],
          retryAfterMs: 1000,
        });
      expect(
        (await h.provider.decide({ ...input, timeoutMs: 300000 })).ok,
      ).toBe(false);
      expect(h.hooks.acquire).toHaveBeenCalledTimes(2);
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it("does not wait when less than thirty seconds would remain for a response", async () => {
    vi.useFakeTimers();
    const h = harness([bad], [superRoute]);
    vi.mocked(h.hooks.acquire)
      .mockResolvedValueOnce({ ok: true, lease: "first" })
      .mockResolvedValueOnce({
        ok: false,
        scope: "owner",
        admissionReasons: ["token_budget"],
        retryAfterMs: 60000,
      });
    expect((await h.provider.decide({ ...input, timeoutMs: 90000 })).ok).toBe(
      false,
    );
    expect(h.hooks.acquire).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([
    "deadline_during_wait",
    "circuit_after_wait",
    "deadline_during_availability",
    "denied_again",
    "deadline_during_readmission",
  ])(
    "preserves the original failure without looping when recovery hits %s",
    async (mode) => {
      vi.useFakeTimers();
      vi.setSystemTime(0);
      const h = harness([bad], [superRoute], () => Date.now());
      vi.mocked(h.hooks.acquire)
        .mockResolvedValueOnce({ ok: true, lease: "first" })
        .mockResolvedValueOnce({
          ok: false,
          scope: "owner",
          admissionReasons: ["token_budget"],
          retryAfterMs: 1000,
        })
        .mockImplementationOnce(async () => {
          if (mode === "deadline_during_readmission") {
            h.setNow(90000);
            return { ok: true, lease: "unused" };
          }
          return {
            ok: false,
            scope: "owner",
            admissionReasons: ["token_budget"],
            retryAfterMs: 1000,
          };
        });
      vi.mocked(h.hooks.availability)
        .mockResolvedValueOnce({ eligible: true })
        .mockResolvedValueOnce({ eligible: true })
        .mockImplementationOnce(async () => {
          if (mode === "deadline_during_availability") h.setNow(90000);
          return { eligible: mode !== "circuit_after_wait", reason: "circuit" };
        });
      const pending = h.provider.decide({ ...input, timeoutMs: 90000 });
      await vi.advanceTimersByTimeAsync(500);
      if (mode === "deadline_during_wait") h.setNow(90000);
      await vi.advanceTimersByTimeAsync(500);
      const result = await pending;
      expect(result).toMatchObject({
        ok: false,
        deferred: false,
        error: expect.stringContaining("Expected array"),
        usage: bad.usage,
      });
      expect(h.build).toHaveBeenCalledOnce();
      expect(vi.getTimerCount()).toBe(0);
      if (mode === "deadline_during_readmission")
        expect(h.hooks.release).toHaveBeenLastCalledWith(
          superRoute,
          "unused",
          expect.any(Object),
          true,
        );
    },
  );
  it.each([false, true])(
    "uses the existing second attempt with fresh admission even when pinned=%s",
    async (pinned) => {
      const h = harness([bad, good], pinned ? [superRoute] : undefined);
      const result = await h.provider.decide(input);
      expect(result).toMatchObject({
        ok: true,
        usage: { promptTokens: 190, completionTokens: 18 },
        route: { effectiveModel: NEMOTRON_SUPER, reason: "malformed_fallback" },
      });
      expect(
        result.route.attempts.map((a) => [
          a.model,
          a.outcome,
          a.responseSource,
        ]),
      ).toEqual([
        [NEMOTRON_SUPER, "failed", "tool_call"],
        [NEMOTRON_SUPER, "success", "content"],
      ]);
      expect(h.requests).toEqual([
        { route: superRoute, options: undefined, timeoutMs: 1000 },
        {
          route: superRoute,
          options: { nemotronJsonContent: true },
          timeoutMs: 800,
        },
      ]);
      expect(h.hooks.acquire).toHaveBeenCalledTimes(2);
      expect(h.hooks.release).toHaveBeenNthCalledWith(
        1,
        superRoute,
        "fixture",
        bad,
      );
      expect(h.hooks.release).toHaveBeenNthCalledWith(
        2,
        superRoute,
        "fixture",
        good,
      );
      expect(JSON.stringify(result.route)).not.toContain("private");
    },
  );

  it.each(["owner", "key", "route"] as const)(
    "preserves real malformed failure and usage when retry hits %s capacity",
    async (scope) => {
      const h = harness([bad]);
      vi.mocked(h.hooks.acquire)
        .mockResolvedValueOnce({ ok: true, lease: "first" })
        .mockResolvedValueOnce({
          ok: false,
          scope,
          error: "budget unavailable",
        });
      const result = await h.provider.decide(input);
      expect(result).toMatchObject({
        ok: false,
        deferred: false,
        usage: bad.usage,
      });
      expect(result.route.attempts.map((a) => a.outcome)).toEqual([
        "failed",
        "deferred",
      ]);
      expect(h.build).toHaveBeenCalledTimes(1);
      expect(h.hooks.release).toHaveBeenCalledOnce();
    },
  );

  it("honors circuit eligibility and does not retry a now-unavailable route", async () => {
    const h = harness([bad], [superRoute]);
    vi.mocked(h.hooks.availability)
      .mockResolvedValueOnce({ eligible: true })
      .mockResolvedValueOnce({ eligible: false, reason: "circuit" });
    expect(await h.provider.decide(input)).toMatchObject({
      ok: false,
      usage: bad.usage,
    });
    expect(h.build).toHaveBeenCalledOnce();
  });

  it("does not spend a third attempt or coerce malformed retry content", async () => {
    const h = harness([bad, { ...bad, responseSource: "content" }]);
    const result = await h.provider.decide(input);
    expect(result).toMatchObject({
      ok: false,
      usage: { promptTokens: 200, completionTokens: 20 },
    });
    expect(result.route.attempts).toHaveLength(2);
    expect(h.build).toHaveBeenCalledTimes(2);
    expect(result).not.toHaveProperty("text");
  });

  it("cannot add a third call when Super was already the fallback", async () => {
    const h = harness(
      [{ ok: false, error: "busy", status: 429 }, bad],
      [nanoRoute, superRoute],
    );
    expect((await h.provider.decide(input)).ok).toBe(false);
    expect(h.build).toHaveBeenCalledTimes(2);
    expect(h.requests.every((r) => r.options === undefined)).toBe(true);
  });

  it.each([
    { result: good, route: superRoute, calls: 1 },
    {
      result: { ...bad, responseSource: "content" } as DecideResult,
      route: superRoute,
      calls: 2,
    },
    { result: bad, route: nanoRoute, calls: 2 },
    {
      result: bad,
      route: { ...superRoute, baseUrl: "https://custom.example/v1" },
      calls: 2,
    },
    {
      result: {
        ...bad,
        text: '{"decision":"invalid","actions":[]}',
      } as DecideResult,
      route: superRoute,
      calls: 2,
    },
  ])(
    "leaves unrelated responses on the original route chain: %j",
    async ({ result, route, calls }) => {
      const h = harness([result, good], [route, nanoRoute]);
      await h.provider.decide(input);
      expect(h.build).toHaveBeenCalledTimes(calls);
      expect(h.requests.every((r) => r.options === undefined)).toBe(true);
      if (calls === 2) expect(h.requests[1]!.route).toEqual(nanoRoute);
    },
  );

  it("releases admitted retry without calling the provider after deadline exhaustion", async () => {
    const h = harness([bad]);
    vi.mocked(h.hooks.acquire)
      .mockResolvedValueOnce({ ok: true, lease: "first" })
      .mockImplementationOnce(async () => {
        h.setNow(1000);
        return { ok: true, lease: "second" };
      });
    expect(await h.provider.decide(input)).toMatchObject({
      ok: false,
      usage: bad.usage,
    });
    expect(h.build).toHaveBeenCalledOnce();
    expect(h.hooks.release).toHaveBeenCalledTimes(2);
  });
});

describe("first-attempt owner refill wait (owner fairness, 009)", () => {
  afterEach(() => vi.useRealTimers());
  const ownerDenial = (retryAfterMs: number, reasons = ["token_budget"]) => ({
    ok: false as const,
    scope: "owner" as const,
    admissionReasons: reasons as ("token_budget" | "request_budget")[],
    retryAfterMs,
  });

  it("waits once for the owner refill, re-checks eligibility and re-admits", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const h = harness([good], [superRoute], () => Date.now());
    h.hooks.stillEligible = vi.fn(async () => true);
    h.hooks.abandonOwnerWait = vi.fn(async () => {});
    vi.mocked(h.hooks.acquire)
      .mockResolvedValueOnce(ownerDenial(6133))
      .mockResolvedValueOnce({ ok: true, lease: "after-wait" });
    const pending = h.provider.decide({ ...input, timeoutMs: 100000 });
    await vi.advanceTimersByTimeAsync(6132);
    expect(h.build).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    const result = await pending;
    expect(result.ok).toBe(true);
    expect(h.hooks.stillEligible).toHaveBeenCalledOnce();
    expect(h.hooks.acquire).toHaveBeenCalledTimes(2);
    expect(h.build).toHaveBeenCalledOnce();
    expect(h.hooks.abandonOwnerWait).not.toHaveBeenCalled();
    expect(result.route.attempts).toHaveLength(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("does not dispatch a paused or switched agent after waiting; ends its claim", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const h = harness([good], [superRoute], () => Date.now());
    h.hooks.stillEligible = vi.fn(async () => false);
    h.hooks.abandonOwnerWait = vi.fn(async () => {});
    vi.mocked(h.hooks.acquire).mockResolvedValueOnce(ownerDenial(5000));
    const pending = h.provider.decide({ ...input, timeoutMs: 100000 });
    await vi.advanceTimersByTimeAsync(5000);
    const result = await pending;
    expect(result.ok).toBe(false);
    expect(h.build).not.toHaveBeenCalled();
    expect(h.hooks.acquire).toHaveBeenCalledOnce();
    expect(h.hooks.abandonOwnerWait).toHaveBeenCalledWith(superRoute);
    // Logged as a route change, not as owner-budget starvation (Data 56939).
    expect(result.route.attempts[0]).toMatchObject({
      outcome: "deferred",
      error: ROUTE_CHANGED_ERROR,
    });
    expect(result.route.attempts[0]!.admissionReasons).toBeUndefined();
  });

  it.each([
    [
      "a refill hint over 120 s",
      ownerDenial(MAX_OWNER_REFILL_WAIT_MS + 1),
      300000,
    ],
    ["too little time left for a response", ownerDenial(50_000), 70000],
    ["a busy call slot", ownerDenial(1000, ["concurrency"]), 300000],
  ])(
    "ends the claim at once instead of waiting for %s",
    async (_label, denial, timeoutMs) => {
      vi.useFakeTimers();
      vi.setSystemTime(0);
      const h = harness([good], [superRoute], () => Date.now());
      h.hooks.abandonOwnerWait = vi.fn(async () => {});
      vi.mocked(h.hooks.acquire).mockResolvedValueOnce(
        denial as Awaited<ReturnType<RouteHooks<string>["acquire"]>>,
      );
      const result = await h.provider.decide({ ...input, timeoutMs });
      expect(result.ok).toBe(false);
      expect(h.hooks.acquire).toHaveBeenCalledOnce();
      expect(h.hooks.abandonOwnerWait).toHaveBeenCalledOnce();
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it("ends the claim when re-admission still fails, and survives a failing hook", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const h = harness([good], [superRoute], () => Date.now());
    h.hooks.abandonOwnerWait = vi.fn(async () => {
      throw new Error("db down");
    });
    vi.mocked(h.hooks.acquire)
      .mockResolvedValueOnce(ownerDenial(2000))
      .mockResolvedValueOnce(ownerDenial(2000));
    const pending = h.provider.decide({ ...input, timeoutMs: 100000 });
    await vi.advanceTimersByTimeAsync(2000);
    const result = await pending;
    expect(result.ok).toBe(false);
    expect(h.hooks.acquire).toHaveBeenCalledTimes(2);
    expect(h.hooks.abandonOwnerWait).toHaveBeenCalledOnce();
    expect(h.build).not.toHaveBeenCalled();
  });

  it("admits Mia's worst case: a 24k reserve from an empty bucket (~57.6 s)", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const h = harness([good], [superRoute], () => Date.now());
    vi.mocked(h.hooks.acquire)
      .mockResolvedValueOnce(ownerDenial(57_600))
      .mockResolvedValueOnce({ ok: true, lease: "after-wait" });
    // A 90 s cycle deadline still leaves the 30 s response margin.
    const pending = h.provider.decide({ ...input, timeoutMs: 90_000 });
    await vi.advanceTimersByTimeAsync(57_600);
    expect((await pending).ok).toBe(true);
    expect(h.hooks.acquire).toHaveBeenCalledTimes(2);
  });

  it("waits for an oversized first owner refill (a41-mon-olivia's live 88.9 s hint)", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const h = harness([good], [superRoute], () => Date.now());
    h.hooks.stillEligible = vi.fn(async () => true);
    h.hooks.abandonOwnerWait = vi.fn(async () => {});
    vi.mocked(h.hooks.acquire)
      .mockResolvedValueOnce(ownerDenial(88_887))
      .mockResolvedValueOnce({ ok: true, lease: "after-wait" });
    const pending = h.provider.decide({ ...input, timeoutMs: 300_000 });
    await vi.advanceTimersByTimeAsync(88_886);
    expect(h.build).not.toHaveBeenCalled();
    expect(ownerWaitsInFlightNow()).toBe(1);
    await vi.advanceTimersByTimeAsync(1);
    const result = await pending;
    expect(result.ok).toBe(true);
    expect(h.hooks.stillEligible).toHaveBeenCalledOnce();
    expect(h.hooks.acquire).toHaveBeenCalledTimes(2);
    expect(h.build).toHaveBeenCalledOnce();
    expect(h.hooks.abandonOwnerWait).not.toHaveBeenCalled();
    expect(ownerWaitsInFlightNow()).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([
    [
      "the full 120 s ceiling with the 30 s margin left",
      120_000,
      150_000,
      true,
    ],
    [
      "a 100 s hint that would cut into the 30 s margin",
      100_000,
      129_999,
      false,
    ],
  ])(
    "bounds a long wait by the original deadline: %s",
    async (_label, hint, timeoutMs, waits) => {
      vi.useFakeTimers();
      vi.setSystemTime(0);
      const h = harness([good], [superRoute], () => Date.now());
      h.hooks.abandonOwnerWait = vi.fn(async () => {});
      vi.mocked(h.hooks.acquire)
        .mockResolvedValueOnce(ownerDenial(hint))
        .mockResolvedValueOnce({ ok: true, lease: "after-wait" });
      const pending = h.provider.decide({ ...input, timeoutMs });
      await vi.advanceTimersByTimeAsync(hint);
      const result = await pending;
      expect(result.ok).toBe(waits);
      expect(h.hooks.acquire).toHaveBeenCalledTimes(waits ? 2 : 1);
      expect(h.hooks.abandonOwnerWait).toHaveBeenCalledTimes(waits ? 0 : 1);
      expect(h.build).toHaveBeenCalledTimes(waits ? 1 : 0);
      expect(ownerWaitsInFlightNow()).toBe(0);
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it("ends the claim after a long wait when the agent was paused or re-admission fails", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const paused = harness([good], [superRoute], () => Date.now());
    paused.hooks.stillEligible = vi.fn(async () => false);
    paused.hooks.abandonOwnerWait = vi.fn(async () => {});
    vi.mocked(paused.hooks.acquire).mockResolvedValueOnce(ownerDenial(110_000));
    const denied = harness([good], [superRoute], () => Date.now());
    denied.hooks.abandonOwnerWait = vi.fn(async () => {});
    vi.mocked(denied.hooks.acquire)
      .mockResolvedValueOnce(ownerDenial(110_000))
      .mockResolvedValueOnce(ownerDenial(5_000));
    const results = Promise.all([
      paused.provider.decide({ ...input, timeoutMs: 300_000 }),
      denied.provider.decide({ ...input, timeoutMs: 300_000 }),
    ]);
    await vi.advanceTimersByTimeAsync(110_000);
    for (const r of await results) expect(r.ok).toBe(false);
    expect(paused.hooks.acquire).toHaveBeenCalledOnce();
    expect(denied.hooks.acquire).toHaveBeenCalledTimes(2);
    for (const h of [paused, denied]) {
      expect(h.build).not.toHaveBeenCalled();
      expect(h.hooks.abandonOwnerWait).toHaveBeenCalledOnce();
    }
    expect(ownerWaitsInFlightNow()).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("keeps other owners moving while two 120 s waits hold their slots", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const waiting = Array.from({ length: MAX_CONCURRENT_OWNER_WAITS }, () => {
      const h = harness([good], [superRoute], () => Date.now());
      vi.mocked(h.hooks.acquire)
        .mockResolvedValueOnce(ownerDenial(MAX_OWNER_REFILL_WAIT_MS))
        .mockResolvedValueOnce({ ok: true, lease: "after-wait" });
      return h.provider.decide({ ...input, timeoutMs: 300_000 });
    });
    await vi.advanceTimersByTimeAsync(1);
    expect(ownerWaitsInFlightNow()).toBe(MAX_CONCURRENT_OWNER_WAITS);
    // Another owner's admitted agent dispatches at once, mid-wait.
    const other = harness([good], [superRoute], () => Date.now());
    vi.mocked(other.hooks.acquire).mockResolvedValueOnce({
      ok: true,
      lease: "other-owner",
    });
    expect(
      (await other.provider.decide({ ...input, timeoutMs: 300_000 })).ok,
    ).toBe(true);
    expect(other.build).toHaveBeenCalledOnce();
    // A third owner denial cannot join the waits: it defers and ends its claim.
    const extra = harness([good], [superRoute], () => Date.now());
    extra.hooks.abandonOwnerWait = vi.fn(async () => {});
    vi.mocked(extra.hooks.acquire).mockResolvedValueOnce(ownerDenial(10_000));
    expect(
      (await extra.provider.decide({ ...input, timeoutMs: 300_000 })).ok,
    ).toBe(false);
    expect(extra.hooks.abandonOwnerWait).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(MAX_OWNER_REFILL_WAIT_MS);
    for (const r of await Promise.all(waiting)) expect(r.ok).toBe(true);
    expect(ownerWaitsInFlightNow()).toBe(0);
  });

  it("caps concurrent first-attempt waits so waiting owners cannot hold every slot", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const waiting = Array.from({ length: MAX_CONCURRENT_OWNER_WAITS }, () => {
      const h = harness([good], [superRoute], () => Date.now());
      vi.mocked(h.hooks.acquire)
        .mockResolvedValueOnce(ownerDenial(10_000))
        .mockResolvedValueOnce({ ok: true, lease: "after-wait" });
      return h.provider.decide({ ...input, timeoutMs: 100000 });
    });
    await vi.advanceTimersByTimeAsync(1);
    expect(ownerWaitsInFlightNow()).toBe(MAX_CONCURRENT_OWNER_WAITS);
    const extra = harness([good], [superRoute], () => Date.now());
    extra.hooks.abandonOwnerWait = vi.fn(async () => {});
    vi.mocked(extra.hooks.acquire).mockResolvedValueOnce(ownerDenial(10_000));
    // Over the cap: no wait, defer now, claim released.
    expect(
      (await extra.provider.decide({ ...input, timeoutMs: 100000 })).ok,
    ).toBe(false);
    expect(extra.hooks.abandonOwnerWait).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(10_000);
    for (const r of await Promise.all(waiting)) expect(r.ok).toBe(true);
    expect(ownerWaitsInFlightNow()).toBe(0);
  });

  it("ends the claim when the deadline runs out after a post-wait re-admission", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    let jump = 0;
    const h = harness([good], [superRoute], () => Date.now() + jump);
    h.hooks.abandonOwnerWait = vi.fn(async () => {});
    vi.mocked(h.hooks.acquire)
      .mockResolvedValueOnce(ownerDenial(1000))
      .mockImplementationOnce(async () => {
        jump = 80_000; // admission itself took the remaining margin
        return { ok: true, lease: "late" };
      });
    const pending = h.provider.decide({ ...input, timeoutMs: 100_000 });
    await vi.advanceTimersByTimeAsync(1000);
    const result = await pending;
    expect(result.ok).toBe(false);
    expect(h.build).not.toHaveBeenCalled();
    expect(h.hooks.release).toHaveBeenCalledWith(
      superRoute,
      "late",
      expect.objectContaining({ ok: false }),
      true,
    );
    expect(h.hooks.abandonOwnerWait).toHaveBeenCalledOnce();
  });

  it("still waits when the configured route was only cooling down (live Mia, 07:37 UTC)", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const h = harness([good], [nanoRoute, superRoute], () => Date.now());
    h.hooks.abandonOwnerWait = vi.fn(async () => {});
    vi.mocked(h.hooks.acquire)
      .mockResolvedValueOnce({
        ok: false,
        scope: "route",
        admissionReasons: ["model_cooldown"],
        error: "provider model cooldown active",
      })
      .mockResolvedValueOnce(ownerDenial(11_996))
      .mockResolvedValueOnce({ ok: true, lease: "after-wait" });
    const pending = h.provider.decide({ ...input, timeoutMs: 100000 });
    await vi.advanceTimersByTimeAsync(11_996);
    const result = await pending;
    expect(result.ok).toBe(true);
    expect(h.hooks.acquire).toHaveBeenCalledTimes(3);
    // One provider call, on the fallback, after the bounded wait.
    expect(h.requests).toHaveLength(1);
    expect(h.requests[0]!.route).toEqual(superRoute);
    expect(result.route.attempts.map((a) => a.outcome)).toEqual([
      "deferred",
      "success",
    ]);
  });

  it("does not wait once a provider call has already been made this cycle", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const h = harness(
      [{ ok: false, error: "provider HTTP 429", status: 429 }],
      [nanoRoute, superRoute],
      () => Date.now(),
    );
    h.hooks.abandonOwnerWait = vi.fn(async () => {});
    vi.mocked(h.hooks.acquire)
      .mockResolvedValueOnce({ ok: true, lease: "first" })
      .mockResolvedValueOnce(ownerDenial(5_000));
    const result = await h.provider.decide({ ...input, timeoutMs: 100000 });
    expect(result.ok).toBe(false);
    expect(h.hooks.acquire).toHaveBeenCalledTimes(2);
    expect(h.requests).toHaveLength(1);
    expect(vi.getTimerCount()).toBe(0);
  });
});
