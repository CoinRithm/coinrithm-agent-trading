import { describe, expect, it, vi } from "vitest";
import type {
  DecideResult,
  Provider,
} from "@coinrithm/mcp-trading/dist/agent/engine.js";
import {
  NEMOTRON_NANO,
  NEMOTRON_SUPER,
  RoutedProvider,
  classifyFailure,
  resolveRouteChain,
  type ModelRoute,
  type RouteAttempt,
  type RouteHooks,
} from "./route.js";

const input = { system: "system", user: "observation" };
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
