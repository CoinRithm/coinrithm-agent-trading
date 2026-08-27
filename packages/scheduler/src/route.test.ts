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

  it("classifies permanent model retirement separately", () => {
    expect(classifyFailure({ ok: false, error: "gone", status: 410 })).toBe(
      "permanent",
    );
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
