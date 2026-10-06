import { afterEach, describe, expect, it, vi } from "vitest";
import {
  type DecideResult,
  type ProviderRouteOptions,
} from "@coinrithm/mcp-trading/engine";
import {
  NEMOTRON_SUPER,
  NEMOTRON_NANO,
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
