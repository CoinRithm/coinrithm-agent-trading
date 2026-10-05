import { describe, expect, it, vi } from "vitest";
import {
  newState,
  runCycle,
  type CoinRithmClient,
  type DecideResult,
  type Provider,
} from "@coinrithm/mcp-trading/engine";
import { parseSkill } from "@coinrithm/mcp-trading/dist/agent/skill.js";
import { renderFolderOfOne } from "@coinrithm/mcp-trading/dist/agent/templates.js";
import {
  NEMOTRON_NANO,
  NEMOTRON_SUPER,
  NEMOTRON_LIGHTNING,
  RoutedProvider,
  classifyFailure,
  resolveRouteChain,
  type ModelRoute,
  type RouteAttempt,
  type RouteHooks,
} from "./route.js";

const input = { system: "system", user: "observation" };

describe("optional Lightning fallback", () => {
  it.each([NEMOTRON_SUPER, NEMOTRON_LIGHTNING, NEMOTRON_NANO, "custom"])(
    "uses the table candidate only on verified routes: %s",
    async (model) => {
      const h = harness([ok()]);
      const captured = vi.fn(async () => ok());
      const route = { provider: "nvidia" as const, model, keyRef: "fixture" };
      const p = new RoutedProvider(
        "strong",
        [route],
        false,
        () => ({ label: "fixture", decide: captured }),
        h.hooks,
      );
      const user = [NEMOTRON_SUPER, NEMOTRON_LIGHTNING].includes(model)
        ? "compact"
        : "original";
      await p.decide({ ...input, user: "original", compactUser: "compact" });
      expect(h.hooks.acquire).toHaveBeenCalledWith(
        route,
        expect.objectContaining({ user }),
      );
      expect(captured).toHaveBeenCalledWith(expect.objectContaining({ user }));
      expect(captured).toHaveBeenCalledWith(
        expect.not.objectContaining({ compactUser: "compact" }),
      );
    },
  );
  it.each([true, false])(
    "keeps BYO or custom endpoints on original prompt: %s",
    async (byo) => {
      const h = harness([ok()]);
      const captured = vi.fn(async () => ok());
      const p = new RoutedProvider(
        "strong",
        [
          {
            provider: "nvidia",
            model: NEMOTRON_SUPER,
            keyRef: "fixture",
            ...(byo ? {} : { baseUrl: "https://unverified.example/v1" }),
          },
        ],
        byo,
        () => ({ label: "fixture", decide: captured }),
        h.hooks,
      );
      await p.decide({ ...input, user: "original", compactUser: "compact" });
      expect(captured).toHaveBeenCalledWith(
        expect.objectContaining({ user: "original" }),
      );
    },
  );
  it("falls back from compact Super to original Nano without changing the decision contract", async () => {
    const h = harness([]),
      captured: Array<{ model: string; user: string }> = [];
    const routes = [NEMOTRON_SUPER, NEMOTRON_NANO].map((model) => ({
      provider: "nvidia" as const,
      model,
      keyRef: "fixture",
    }));
    const p = new RoutedProvider(
      "strong",
      routes,
      false,
      (r) => ({
        label: r.model,
        decide: async (d) => {
          captured.push({ model: r.model, user: d.user });
          return r.model === NEMOTRON_SUPER
            ? { ok: false, error: "capacity", status: 429 }
            : ok();
        },
      }),
      h.hooks,
    );
    expect(
      (await p.decide({ ...input, user: "original", compactUser: "compact" }))
        .ok,
    ).toBe(true);
    expect(captured).toEqual([
      { model: NEMOTRON_SUPER, user: "compact" },
      { model: NEMOTRON_NANO, user: "original" },
    ]);
  });
  const args = {
    configured: {
      provider: "nvidia" as const,
      model: NEMOTRON_SUPER,
      keyRef: "pool:1",
    },
    byo: false,
    openAiBackup: false,
    lightningFallback: true,
  };
  it("adds a same-key alternative without replacing the configured model or paid routes", () => {
    expect(resolveRouteChain(args).routes.map((r) => r.model)).toEqual([
      NEMOTRON_SUPER,
      NEMOTRON_LIGHTNING,
      NEMOTRON_NANO,
    ]);
    expect(
      resolveRouteChain(args).routes.every(
        (r) => r.provider === "nvidia" && r.keyRef === "pool:1",
      ),
    ).toBe(true);
    expect(
      resolveRouteChain({ ...args, lightningFallback: false }).routes.map(
        (r) => r.model,
      ),
    ).toEqual([NEMOTRON_SUPER, NEMOTRON_NANO]);
  });
  it.each([{ byo: true }, { pinnedModel: true }])(
    "respects exact model selection %j",
    (over) => {
      expect(
        resolveRouteChain({ ...args, ...over }).routes.map((r) => r.model),
      ).toEqual([NEMOTRON_SUPER]);
    },
  );
  it("does not add a fallback to unrelated configured models", () => {
    expect(
      resolveRouteChain({
        ...args,
        configured: { ...args.configured, model: "custom" },
      }).routes,
    ).toHaveLength(1);
  });
  it("rejects malformed Super output and audits valid Lightning fallback within two attempts", async () => {
    const h = harness([
      { ok: true, text: '{"decision":"act","actions":"broken"}' },
      ok(),
    ]);
    const chain = resolveRouteChain(args);
    const result = await new RoutedProvider(
      chain.profile,
      chain.routes,
      false,
      h.buildProvider,
      h.hooks,
    ).decide(input);
    expect(result.ok).toBe(true);
    expect(result.route.effectiveModel).toBe(NEMOTRON_LIGHTNING);
    expect(result.route.attempts.map((a) => a.outcome)).toEqual([
      "failed",
      "success",
    ]);
    expect(result.route.attempts[0].failureClass).toBe("malformed");
  });
  it("does not create a third attempt when both providers fail", async () => {
    const h = harness([
      { ok: false, error: "capacity", status: 429 },
      { ok: false, error: "capacity", status: 429 },
    ]);
    const chain = resolveRouteChain(args);
    const result = await new RoutedProvider(
      chain.profile,
      chain.routes,
      false,
      h.buildProvider,
      h.hooks,
    ).decide(input);
    expect(result.ok).toBe(false);
    expect(result.route.attempts).toHaveLength(2);
    expect(h.buildProvider).toHaveBeenCalledTimes(2);
  });
});
const ok = (reason = "ok"): DecideResult => ({
  ok: true,
  text: JSON.stringify({ decision: "skip", reason }),
});

function harness(results: DecideResult[], unavailable = new Set<string>()) {
  const observe = vi.fn(async () => {});
  const release = vi.fn(async () => {});
  const hooks: RouteHooks<string> = {
    availability: vi.fn(async (route) => ({
      eligible: !unavailable.has(route.model),
      reason: unavailable.has(route.model) ? "circuit" : undefined,
    })),
    acquire: vi.fn(async (route) => ({ ok: true, lease: route.model })),
    release,
    observe,
  };
  const buildProvider = vi.fn((_route: ModelRoute): Provider => ({
    label: "test",
    decide: vi.fn(async () => results.shift() ?? ok()),
  }));
  return { hooks, observe, release, buildProvider };
}

describe("routed failure attribution in the real runner", () => {
  it.each(["tool_call", "content", "content_fallback", undefined] as const)(
    "retains the successful response source without model text: %s",
    async (responseSource) => {
      const h = harness([
        { ...ok("PRIVATE_MODEL_OUTPUT"), responseSource } as DecideResult,
      ]);
      const provider = new RoutedProvider(
        "fast",
        [{ provider: "nvidia", model: "fixture", keyRef: "test" }],
        false,
        h.buildProvider,
        h.hooks,
      );
      const result = await provider.decide(input);
      expect(result.ok).toBe(true);
      expect(result.route.attempts).toHaveLength(1);
      expect(result.route.attempts[0]).toMatchObject({
        outcome: "success",
        responseSource,
      });
      expect(h.observe).toHaveBeenCalledWith(
        expect.any(Object),
        result.route.attempts[0],
        expect.any(Number),
      );
      expect(JSON.stringify(result.route)).not.toContain(
        "PRIVATE_MODEL_OUTPUT",
      );
      expect(JSON.stringify(h.observe.mock.calls)).not.toContain(
        "PRIVATE_MODEL_OUTPUT",
      );
    },
  );

  it("retains the request start time across slow release bookkeeping", async () => {
    const h = harness([ok()]);
    let clock = 100;
    h.release.mockImplementation(async () => {
      clock = 9000;
    });
    const route: ModelRoute = {
      provider: "nvidia",
      model: "fixture",
      keyRef: "key",
    };
    const provider = new RoutedProvider(
      "fast",
      [route],
      false,
      h.buildProvider,
      h.hooks,
      () => clock,
    );
    expect((await provider.decide(input)).ok).toBe(true);
    expect(h.observe).toHaveBeenCalledWith(
      route,
      expect.objectContaining({ outcome: "success" }),
      100,
    );
  });

  it("does not retain syntax-error excerpts in failed attempts before fallback", async () => {
    const h = harness([
      { ok: true, text: '{"decision":PRIVATE_MODEL_OUTPUT}' },
      ok(),
    ]);
    const provider = new RoutedProvider(
      "fast",
      [
        { provider: "nvidia", model: "model-a", keyRef: "test-a" },
        { provider: "nvidia", model: "model-b", keyRef: "test-b" },
      ],
      false,
      h.buildProvider,
      h.hooks,
    );
    const result = await provider.decide(input);
    expect(result.ok).toBe(true);
    expect(result.route.attempts).toHaveLength(2);
    expect(result.route.attempts[0]).toMatchObject({
      outcome: "failed",
      failureClass: "malformed",
      error: "model output is not valid JSON",
    });
    expect(JSON.stringify(result)).not.toContain("PRIVATE_MODEL_OUTPUT");
    expect(JSON.stringify(h.observe.mock.calls)).not.toContain(
      "PRIVATE_MODEL_OUTPUT",
    );
  });

  it("retains only diagnostic categories for a rejected encoded array before fallback", async () => {
    const h = harness([
      {
        ok: true,
        text: '{"decision":"act","actions":"[]"}',
        responseSource: "tool_call",
      },
      ok(),
    ]);
    const provider = new RoutedProvider(
      "fast",
      [
        { provider: "nvidia", model: "model-a", keyRef: "test-a" },
        { provider: "nvidia", model: "model-b", keyRef: "test-b" },
      ],
      false,
      h.buildProvider,
      h.hooks,
    );
    const result = await provider.decide(input);
    expect(result.ok).toBe(true);
    expect(result.route.attempts).toHaveLength(2);
    expect(result.route.attempts[0]).toMatchObject({
      outcome: "failed",
      failureClass: "malformed",
      actionsStringDiagnostic: "json_array_empty_valid_decision",
      responseSource: "tool_call",
    });
    expect(result.route.attempts[1].outcome).toBe("success");
    expect(result.route.effectiveModel).toBe("model-b");
  });
  it("preserves the consumed response source after provider fallback", async () => {
    const h = harness([
      { ok: false, error: "capacity", status: 429 },
      { ...ok(), responseSource: "content_fallback" } as DecideResult,
    ]);
    const provider = new RoutedProvider(
      "fast",
      [
        { provider: "nvidia", model: "model-a", keyRef: "test-a" },
        { provider: "nvidia", model: "model-b", keyRef: "test-b" },
      ],
      false,
      h.buildProvider,
      h.hooks,
    );
    const result = await provider.decide(input);
    expect(result).toMatchObject({
      ok: true,
      responseSource: "content_fallback",
    });
    expect(result.route.effectiveModel).toBe("model-b");
    expect(result.route.attempts[0]).not.toHaveProperty("responseSource");
    expect(result.route.attempts[1]).toMatchObject({
      outcome: "success",
      responseSource: "content_fallback",
    });
  });
  it.each(["404-429", "429-404", "404-deferred"])(
    "%s holds the model that returned the permanent error and preserves actual-call metering",
    async (sequence) => {
      const permanent: DecideResult = {
        ok: false,
        error: "provider HTTP 404 model_not_found test-credential",
        status: 404,
      };
      const capacity: DecideResult = {
        ok: false,
        error: "provider HTTP 429 rate limited",
        status: 429,
      };
      const responses =
        sequence === "404-deferred"
          ? [permanent]
          : sequence === "404-429"
            ? [permanent, capacity]
            : [capacity, permanent];
      const h = harness([...responses, ...responses, ...responses]);
      h.hooks.sanitizeError = (error) =>
        error.replaceAll("test-credential", "***");
      if (sequence === "404-deferred") {
        h.hooks.acquire = vi.fn(async (route) =>
          route.model === "model-b"
            ? { ok: false, scope: "route", error: "local capacity unavailable" }
            : { ok: true, lease: route.model },
        );
      }
      const provider = new RoutedProvider(
        "fast",
        [
          { provider: "nvidia", model: "model-a", keyRef: "test-a" },
          { provider: "nvidia", model: "model-b", keyRef: "test-b" },
        ],
        false,
        h.buildProvider,
        h.hooks,
      );
      const spec = parseSkill(
        renderFolderOfOne("fixture", "conservative"),
      ).spec;
      spec.model = { provider: "nvidia", name: "model-a" };
      spec.risk.watchlist = ["BTC"];
      spec.triggerPolicy = {
        mode: "always",
        skipLlmWhenNoTrigger: false,
        alwaysManageOpenPositions: true,
        maxLlmCallsPerHour: 0,
        debounceMinutes: 0,
        pmEvalCooldownMinutes: 0,
      };
      const okData = (data: unknown) => ({ ok: true, status: 200, data });
      const client = {
        me: async () => okData({ scopes: ["read", "trade:futures"] }),
        portfolio: async () =>
          okData({ equity: { totalUsd: 50000, availableUsd: 1000 } }),
        wallet: async () => okData({ usdt: { available: 1000 } }),
        futuresPositions: async () => okData({ positions: [] }),
        trades: async () => okData({ asOf: "T1", trades: [] }),
        resolve: async () =>
          okData({ match: { coinId: "1", name: "Bitcoin" } }),
        market: async () =>
          okData({
            price: { usd: 67000, change1h: 1, change24h: 2 },
            observation: { freshness: { status: "fresh" } },
          }),
      } as unknown as CoinRithmClient;
      const state = newState("failure-attribution-fixture");
      const failedModel = sequence === "429-404" ? "model-b" : "model-a";
      const meteredModel = sequence === "404-deferred" ? "model-a" : "model-b";
      for (let cycle = 1; cycle <= 3; cycle++) {
        const result = await runCycle({
          client,
          provider,
          spec,
          state,
          mergedProse: "fixture",
          live: false,
        });
        expect(result).toMatchObject({
          modelFailed: true,
          llmCallMade: true,
          effectiveProvider: "nvidia",
          effectiveModel: meteredModel,
          skipReason: expect.stringContaining("model_not_found ***"),
        });
        expect(state.consecutivePermanentModelErrors).toBe(cycle);
        expect(state.permanentModelErrorRoute).toEqual({
          provider: "nvidia",
          model: failedModel,
        });
        if (cycle < 3) expect(result.providerHold).toBeUndefined();
        else
          expect(result.providerHold).toMatchObject({
            provider: "nvidia",
            model: failedModel,
          });
      }
      expect(h.buildProvider).toHaveBeenCalledTimes(
        sequence === "404-deferred" ? 3 : 6,
      );
    },
  );
});

describe("route policy", () => {
  it("preserves BYO verbatim with exactly one route", () => {
    const configured = {
      provider: "openai-compatible" as const,
      model: "owner/model",
      baseUrl: "https://owner.example/v1",
      keyRef: "byo:42",
    };
    expect(
      resolveRouteChain({ configured, byo: true, openAiBackup: true }),
    ).toEqual({ profile: "configured", routes: [configured] });
  });

  it("maps current hosted models to versioned same-provider + optional independent backup chains", () => {
    const fast = resolveRouteChain({
      configured: { provider: "nvidia", model: NEMOTRON_NANO },
      byo: false,
      openAiBackup: true,
    });
    expect(fast.profile).toBe("fast");
    expect(fast.routes.map((r) => `${r.provider}/${r.model}`)).toEqual([
      `nvidia/${NEMOTRON_NANO}`,
      `nvidia/${NEMOTRON_SUPER}`,
      "openai/gpt-5-nano",
    ]);
  });
});

describe("RoutedProvider", () => {
  const routes = resolveRouteChain({
    configured: { provider: "nvidia", model: NEMOTRON_NANO },
    byo: false,
    openAiBackup: true,
  });

  it("falls back on 429 and records the effective route truth", async () => {
    const strongRoutes = resolveRouteChain({
      configured: { provider: "nvidia", model: NEMOTRON_SUPER },
      byo: false,
      openAiBackup: true,
    });
    const h = harness([
      {
        ok: false,
        error: "provider HTTP 429",
        status: 429,
        retryAfterMs: 12_000,
      },
      ok("fallback"),
    ]);
    const provider = new RoutedProvider(
      strongRoutes.profile,
      strongRoutes.routes,
      false,
      h.buildProvider,
      h.hooks,
      (() => {
        let n = 0;
        return () => (n += 25);
      })(),
    );
    const result = await provider.decide(input);
    expect(result.ok).toBe(true);
    expect(result.route.reason).toBe("capacity_fallback");
    // Live NIM evidence is model-scoped: Super 429 while Nano is clean on the
    // same key. The second attempt must therefore use Nano, not stall the key.
    expect(result.route.effectiveModel).toBe(NEMOTRON_NANO);
    expect(result.route.effectiveProvider).toBe("nvidia");
    expect(result.route.attempts).toHaveLength(2);
    expect(result.route.attempts[0]).toMatchObject({
      failureClass: "capacity",
      status: 429,
      retryAfterMs: 12_000,
    });
  });

  it("jumps to an independent provider on a provider-wide 5xx", async () => {
    const h = harness([
      { ok: false, error: "provider HTTP 503", status: 503 },
      ok("independent fallback"),
    ]);
    const provider = new RoutedProvider(
      routes.profile,
      routes.routes,
      false,
      h.buildProvider,
      h.hooks,
    );
    const result = await provider.decide(input);
    expect(result.ok).toBe(true);
    expect(result.route.effectiveProvider).toBe("openai");
    expect(h.buildProvider.mock.calls.map(([route]) => route.provider)).toEqual(
      ["nvidia", "openai"],
    );
  });

  it("falls back before runCycle when a 2xx body fails the real decision parser", async () => {
    const h = harness([
      { ok: true, text: "We need to think about this" },
      ok("valid"),
    ]);
    const provider = new RoutedProvider(
      routes.profile,
      routes.routes,
      false,
      h.buildProvider,
      h.hooks,
    );
    const result = await provider.decide(input);
    expect(result.ok).toBe(true);
    expect(result.route.reason).toBe("malformed_fallback");
    expect(result.route.attempts[0]?.failureClass).toBe("malformed");
  });

  it("skips open circuits and can reach the independent third route without exceeding two attempts", async () => {
    const h = harness([ok("openai")], new Set([NEMOTRON_NANO, NEMOTRON_SUPER]));
    const provider = new RoutedProvider(
      routes.profile,
      routes.routes,
      false,
      h.buildProvider,
      h.hooks,
    );
    const result = await provider.decide(input);
    expect(result.ok).toBe(true);
    expect(result.route.reason).toBe("circuit_fallback");
    expect(result.route.effectiveProvider).toBe("openai");
    expect(result.route.attempts).toHaveLength(1);
  });

  it("never makes more than two audited attempts when the chain is exhausted", async () => {
    const h = harness([
      { ok: false, error: "503", status: 503 },
      { ok: false, error: "timeout" },
      ok("must not run"),
    ]);
    const provider = new RoutedProvider(
      routes.profile,
      routes.routes,
      false,
      h.buildProvider,
      h.hooks,
    );
    const result = await provider.decide(input);
    expect(result.ok).toBe(false);
    expect(result.route.attempts).toHaveLength(2);
    expect(h.buildProvider).toHaveBeenCalledTimes(2);
  });

  // Aggregate result contract (Codex 50894): a later local capacity defer must
  // not relabel an earlier attempted upstream failure as "rate-limited".
  const deferSecondRoute = (h: ReturnType<typeof harness>) => {
    let calls = 0;
    h.hooks.acquire = vi.fn(async (route) => {
      calls += 1;
      if (calls === 1) return { ok: true, lease: route.model };
      return {
        ok: false,
        scope: "key" as const,
        retryAfterMs: 4_000,
        error: "local budget exhausted",
      };
    });
  };

  // The 50894 invariant: a later LOCAL defer must not erase an earlier
  // UPSTREAM failure. The fixture used to say "503 ResourceExhausted", which
  // was an unlucky choice of example — that is the one 503 body that really is
  // capacity (a full per-model worker pool), and treating it as a provider
  // outage retired healthy sibling NIM models and fed a model-failure streak
  // that can disable a working agent. The invariant is unchanged and still
  // asserted here; only the example is now a genuinely generic 503, with the
  // capacity variant covered separately below.
  it("keeps a real 503 as a provider failure when the alternate is deferred locally", async () => {
    const h = harness([
      {
        ok: false,
        error: 'provider HTTP 503: {"error":{"message":"Service Unavailable"}}',
        status: 503,
      },
    ]);
    deferSecondRoute(h);
    const provider = new RoutedProvider(
      routes.profile,
      routes.routes,
      false,
      h.buildProvider,
      h.hooks,
    );
    const result = await provider.decide(input);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.deferred).toBe(false);
    expect(result.error).toContain("503");
    expect(result.route.attempts.map((a) => a.outcome)).toEqual([
      "failed",
      "deferred",
    ]);
    expect(result.route.attempts[0]?.failureClass).toBe("transient");
  });

  it("blocks only the saturated route when a worker pool is full", async () => {
    // Per-model backpressure must not retire the sibling model behind the same
    // provider: the transient class blocks the whole provider, capacity blocks
    // just this route, and NIM limits are per-model.
    const h = harness([
      {
        ok: false,
        error:
          'provider HTTP 503: {"error":{"message":"ResourceExhausted: Worker local total request limit reached (16/16)","type":"Service Unavailable","code":503}}',
        status: 503,
      },
    ]);
    const provider = new RoutedProvider(
      routes.profile,
      routes.routes,
      false,
      h.buildProvider,
      h.hooks,
    );
    const result = await provider.decide(input);
    expect(result.route.attempts[0]?.failureClass).toBe("capacity");
    // The second route still gets its turn rather than being blocked out.
    expect(result.route.attempts.length).toBeGreaterThan(1);
  });

  it("keeps a real 500 as a provider failure when the alternate is deferred locally", async () => {
    const h = harness([{ ok: false, error: "provider HTTP 500", status: 500 }]);
    deferSecondRoute(h);
    const provider = new RoutedProvider(
      routes.profile,
      routes.routes,
      false,
      h.buildProvider,
      h.hooks,
    );
    const result = await provider.decide(input);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.deferred).toBe(false);
    expect(result.error).toContain("500");
  });

  it("stays a harmless defer when every attempt was capacity (429 then local defer)", async () => {
    const h = harness([
      {
        ok: false,
        error: "provider HTTP 429",
        status: 429,
        retryAfterMs: 8_000,
      },
    ]);
    deferSecondRoute(h);
    const provider = new RoutedProvider(
      routes.profile,
      routes.routes,
      false,
      h.buildProvider,
      h.hooks,
    );
    const result = await provider.decide(input);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.deferred).toBe(true);
    expect(
      result.route.attempts.every((a) => a.failureClass === "capacity"),
    ).toBe(true);
  });

  it("stays a harmless defer when no route could be acquired at all", async () => {
    const h = harness([]);
    h.hooks.acquire = vi.fn(async () => ({
      ok: false,
      scope: "key" as const,
      retryAfterMs: 4_000,
      error: "local budget exhausted",
      admissionReasons: ["token_budget", "concurrency"],
    }));
    const provider = new RoutedProvider(
      routes.profile,
      routes.routes,
      false,
      h.buildProvider,
      h.hooks,
    );
    const result = await provider.decide(input);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.deferred).toBe(true);
    expect(h.buildProvider).not.toHaveBeenCalled();
    expect(result.route.attempts[0]).toMatchObject({
      outcome: "deferred",
      latencyMs: 0,
      admissionReasons: ["token_budget", "concurrency"],
    });
  });

  it("a failure followed by a successful alternate is a success", async () => {
    const h = harness([
      { ok: false, error: "provider HTTP 503", status: 503 },
      ok("alternate"),
    ]);
    const provider = new RoutedProvider(
      routes.profile,
      routes.routes,
      false,
      h.buildProvider,
      h.hooks,
    );
    const result = await provider.decide(input);
    expect(result.ok).toBe(true);
    expect(result.route.attempts.map((a) => a.outcome)).toEqual([
      "failed",
      "success",
    ]);
  });

  it("classifies permanent model retirement separately", () => {
    expect(classifyFailure({ ok: false, error: "gone", status: 410 })).toBe(
      "permanent",
    );
  });

  describe("NVIDIA's two meanings for HTTP 503", () => {
    // Verbatim production body, 84% of all model failures in the 6h to
    // 2026-09-03T10:20Z. A full worker pool is per-model backpressure, so it
    // must block only the saturated route; classifying it transient retired
    // every sibling NIM model behind a provider-wide block.
    const EXHAUSTED =
      'provider HTTP 503: {"error":{"message":"ResourceExhausted: Worker local total request limit reached (16/16)","type":"Service Unavailable","code":503}}';

    it("treats a full worker pool as capacity, like a 429", () => {
      expect(
        classifyFailure({ ok: false, error: EXHAUSTED, status: 503 }),
      ).toBe("capacity");
    });

    it("still treats a generic 503 as a real provider failure", () => {
      // Codex 50894: a real 503/500 must not be erased as a harmless defer.
      expect(
        classifyFailure({
          ok: false,
          error:
            'provider HTTP 503: {"error":{"message":"Service Unavailable"}}',
          status: 503,
        }),
      ).toBe("transient");
    });

    it("does not read capacity into a 503 with no body at all", () => {
      expect(classifyFailure({ ok: false, status: 503 })).toBe("transient");
    });

    it("keeps 500 transient even when the body mentions a limit", () => {
      // Only 503 carries this meaning; a 500 is an internal error whatever it
      // says, and provider-wide fallback is the right response to it.
      expect(
        classifyFailure({
          ok: false,
          error: "provider HTTP 500: worker local total request limit",
          status: 500,
        }),
      ).toBe("transient");
    });
  });

  it("emits only the bounded sanitized audit schema", async () => {
    const seen: RouteAttempt[] = [];
    const hooks: RouteHooks = {
      availability: async () => ({ eligible: true }),
      acquire: async () => ({ ok: true }),
      release: async () => {},
      observe: async (_route, attempt) => seen.push(attempt),
    };
    const provider = new RoutedProvider(
      routes.profile,
      routes.routes,
      false,
      () => ({
        label: "test",
        decide: async () => ({
          ok: false,
          error: `Bearer secret-token-123 ${"x".repeat(500)}`,
          status: 503,
        }),
      }),
      hooks,
    );
    await provider.decide(input);
    expect(seen).toHaveLength(2);
    expect(seen[0]?.error).not.toContain("secret-token-123");
    expect(seen[0]?.error?.length).toBeLessThanOrEqual(200);
  });
});

describe("pinned model: one route, no failover", () => {
  // A fallback silently swaps the model mid-experiment. Measured on production
  // for one agent over 7 days: 125 of 852 cycles (16.2%) were served by a
  // LARGER model through circuit/provider/capacity/malformed fallbacks, so a
  // variant comparison over that window was never a single-model test.
  const configured = { provider: "nvidia" as const, model: NEMOTRON_NANO };

  it("collapses the chain to the configured model alone", () => {
    const pinned = resolveRouteChain({
      configured,
      byo: false,
      openAiBackup: true,
      pinnedModel: true,
    });
    expect(pinned.routes).toHaveLength(1);
    expect(pinned.routes[0]?.model).toBe(NEMOTRON_NANO);
    // The sibling Nemotron and the independent OpenAI backup are both dropped:
    // availability is traded for validity on purpose.
    expect(pinned.routes.map((r) => r.model)).not.toContain(NEMOTRON_SUPER);
    expect(pinned.routes.map((r) => r.provider)).not.toContain("openai");
  });

  it("still keeps the profile, so nothing else changes shape", () => {
    const pinned = resolveRouteChain({
      configured,
      byo: false,
      openAiBackup: true,
      pinnedModel: true,
    });
    expect(pinned.profile).toBe("fast");
  });

  it("leaves the fleet default alone when not pinned", () => {
    const normal = resolveRouteChain({
      configured,
      byo: false,
      openAiBackup: true,
    });
    expect(normal.routes.length).toBeGreaterThan(1);
    expect(normal.routes.map((r) => r.model)).toContain(NEMOTRON_SUPER);
  });
});

describe("shared route deadline", () => {
  it("gives the fallback only the remaining deadline without rebuilding the request", async () => {
    let clock = 0;
    const chain = resolveRouteChain({
      configured: { provider: "nvidia", model: NEMOTRON_NANO },
      byo: false,
      openAiBackup: false,
    });
    const h = harness([]);
    const inputs: Array<Record<string, unknown>> = [];
    const provider = new RoutedProvider(
      chain.profile,
      chain.routes,
      false,
      () => ({
        label: "deadline-test",
        decide: async (request) => {
          inputs.push({ ...request });
          if (inputs.length === 1) {
            clock += 240_000;
            return { ok: false, error: "connection reset" };
          }
          return ok();
        },
      }),
      h.hooks,
      () => clock,
    );
    const result = await provider.decide(input);
    expect(result.ok).toBe(true);
    expect(inputs).toEqual([
      { ...input, timeoutMs: 300_000 },
      { ...input, timeoutMs: 60_000 },
    ]);
  });

  it("carries the cycle's withheld action variants to every route attempt", async () => {
    const chain = resolveRouteChain({
      configured: { provider: "nvidia", model: NEMOTRON_NANO },
      byo: false,
      openAiBackup: false,
    });
    const h = harness([]);
    const seen: unknown[] = [];
    const provider = new RoutedProvider(
      chain.profile,
      chain.routes,
      false,
      () => ({
        label: "exclusion-test",
        decide: async (request) => {
          seen.push(request.excludeActionTypes);
          return seen.length === 1
            ? { ok: false, error: "connection reset" }
            : ok();
        },
      }),
      h.hooks,
    );
    const result = await provider.decide({
      ...input,
      excludeActionTypes: ["futures_open"],
    });
    expect(result.ok).toBe(true);
    expect(seen).toEqual([["futures_open"], ["futures_open"]]);
  });

  it("does not start a fallback after the deadline or hide the primary failure", async () => {
    let clock = 0;
    const chain = resolveRouteChain({
      configured: { provider: "nvidia", model: NEMOTRON_NANO },
      byo: false,
      openAiBackup: false,
    });
    const h = harness([]);
    const decide = vi.fn(async (): Promise<DecideResult> => {
      clock += 300_000;
      return { ok: false, error: "model call timed out after 300000ms" };
    });
    const provider = new RoutedProvider(
      chain.profile,
      chain.routes,
      false,
      () => ({ label: "test", decide }),
      h.hooks,
      () => clock,
    );
    const result = await provider.decide(input);
    expect(decide).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      ok: false,
      deferred: false,
      error: "model call timed out after 300000ms",
    });
    expect(result.route.attempts).toHaveLength(1);
    expect(h.release).toHaveBeenCalledTimes(1);
  });
});
