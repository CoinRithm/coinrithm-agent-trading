import { describe, expect, it, vi } from "vitest";
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

function harness(results: DecideResult[], routes = [superRoute, nanoRoute]) {
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
    () => now,
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
