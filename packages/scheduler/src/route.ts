import {
  parseDecision,
  type DecideInput,
  type DecideResult,
  type Provider,
  type ProviderName,
} from "@coinrithm/mcp-trading/dist/agent/engine.js";

export const ROUTE_POLICY_VERSION = "2026-08-27.2";
// nemotron-3-nano-30b-a3b went 410 (end of life) on 2026-09-01; the omni
// variant is the live-probe-verified fast tier (200 + strict JSON, ~2.6s,
// probe 2026-09-02 06:5xZ from the scheduler key).
export const NEMOTRON_NANO = "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning";
export const NEMOTRON_SUPER = "nvidia/nemotron-3-super-120b-a12b";
export const OPENAI_BACKUP_MODEL = "gpt-5-nano";

export type RouteProfile = "fast" | "strong" | "configured";
export type RouteReason =
  | "configured"
  | "circuit_fallback"
  | "capacity_fallback"
  | "provider_fallback"
  | "malformed_fallback"
  | "byo";
export type RouteFailureClass =
  "capacity" | "permanent" | "transient" | "malformed";

export interface ModelRoute {
  provider: ProviderName;
  model: string;
  baseUrl?: string | null;
  /** Opaque capacity/credential-pool id. Never a raw key. */
  keyRef: string;
}

export interface RouteAttempt {
  provider: string;
  model: string;
  outcome: "success" | "failed" | "deferred";
  failureClass?: RouteFailureClass;
  status?: number;
  retryAfterMs?: number;
  latencyMs: number;
  error?: string;
}

export interface RouteMetadata {
  policyVersion: string;
  profile: RouteProfile;
  effectiveProvider?: string;
  effectiveModel?: string;
  reason: RouteReason;
  attempts: RouteAttempt[];
}

export type RoutedDecideResult = DecideResult & { route: RouteMetadata };

export interface RouteAvailability {
  eligible: boolean;
  reason?: "circuit" | "probe" | "missing_key";
}

export type CapacityDecision<Lease> =
  | { ok: true; lease?: Lease }
  | {
      ok: false;
      scope?: "key" | "route";
      retryAfterMs?: number;
      error?: string;
    };

export interface RouteHooks<Lease = unknown> {
  sanitizeError?(value: string): string;
  availability(route: ModelRoute): Promise<RouteAvailability>;
  acquire(
    route: ModelRoute,
    input: DecideInput,
  ): Promise<CapacityDecision<Lease>>;
  release(
    route: ModelRoute,
    lease: Lease | undefined,
    result: DecideResult,
  ): Promise<void>;
  observe(route: ModelRoute, attempt: RouteAttempt): Promise<void>;
}

const MAX_ROUTE_ATTEMPTS = 2;

function cleanError(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return value
    .replace(/Bearer\s+[A-Za-z0-9._-]{8,}/gi, "Bearer ***")
    .slice(0, 200);
}

/**
 * NVIDIA NIM answers two very different conditions with HTTP 503.
 *
 * A generic 503 is a real provider failure and stays `transient` (Codex 50894:
 * a real 503/500 must not be erased as a harmless defer). But a 503 whose body
 * reads `ResourceExhausted: Worker local total request limit reached (16/16)`
 * is backpressure from ONE model's worker pool, which is exactly what 429
 * means on other providers.
 *
 * The distinction matters because of what the routing loop does with each
 * class: `capacity` blocks only the saturated route, while `transient` blocks
 * the whole provider whenever an independent one exists. NIM limits are
 * per-model, so treating a full worker pool as a provider-wide outage retires
 * healthy sibling models for no reason, and counts a capacity defer as a model
 * failure on top.
 *
 * Measured on production over the 6h to 2026-09-03T10:20Z: 142 of 169 model
 * failures (84%) carried exactly this body, with nano-omni at 23.3% failed
 * calls against super-120b's 4.7%.
 */
const CAPACITY_503_BODY = /resourceexhausted|worker local total request limit/i;

export function classifyFailure(
  result: Extract<DecideResult, { ok: false }>,
): RouteFailureClass {
  if (result.status === 429) return "capacity";
  if (result.status === 503 && CAPACITY_503_BODY.test(result.error ?? ""))
    return "capacity";
  if (result.status === 404 || result.status === 410) return "permanent";
  return "transient";
}

export function routeProfileFor(model: string): RouteProfile {
  if (model === NEMOTRON_NANO) return "fast";
  if (model === NEMOTRON_SUPER) return "strong";
  return "configured";
}

function routeKey(route: ModelRoute): string {
  return `${route.provider}\0${route.model}\0${route.baseUrl ?? ""}\0${route.keyRef}`;
}

/**
 * Resolve a versioned route chain without mutating the configured agent model.
 * BYO is deliberately verbatim. Shared Nemotron profiles get the other
 * live-probed Nemotron model, then an optional independent OpenAI route.
 */
export function resolveRouteChain(args: {
  configured: Omit<ModelRoute, "keyRef"> & { keyRef?: string };
  byo: boolean;
  openAiBackup: boolean;
}): { profile: RouteProfile; routes: ModelRoute[] } {
  const configured: ModelRoute = {
    ...args.configured,
    keyRef:
      args.configured.keyRef ??
      (args.byo ? "byo" : `${args.configured.provider}:shared:0`),
  };
  const profile = routeProfileFor(configured.model);
  if (args.byo) return { profile, routes: [configured] };

  const routes: ModelRoute[] = [configured];
  if (profile === "fast") {
    routes.push({
      provider: "nvidia",
      model: NEMOTRON_SUPER,
      keyRef: configured.keyRef,
    });
  } else if (profile === "strong") {
    routes.push({
      provider: "nvidia",
      model: NEMOTRON_NANO,
      keyRef: configured.keyRef,
    });
  }
  if (args.openAiBackup) {
    routes.push({
      provider: "openai",
      model: OPENAI_BACKUP_MODEL,
      keyRef: "openai:shared:backup",
    });
  }
  return {
    profile,
    routes: routes.filter(
      (route, index, all) =>
        all.findIndex(
          (candidate) => routeKey(candidate) === routeKey(route),
        ) === index,
    ),
  };
}

function fallbackReason(attempt: RouteAttempt): RouteReason {
  if (attempt.failureClass === "capacity") return "capacity_fallback";
  if (attempt.failureClass === "malformed") return "malformed_fallback";
  return "provider_fallback";
}

/**
 * Provider wrapper with at most two audited attempts. A model's text must pass
 * the real decision parser here before it can be accepted, so malformed output
 * can fall back before runCycle reaches validation or any write path.
 */
export class RoutedProvider<Lease = unknown> implements Provider {
  readonly label: string;

  constructor(
    private readonly profile: RouteProfile,
    private readonly routes: ModelRoute[],
    private readonly byo: boolean,
    private readonly buildProvider: (route: ModelRoute) => Provider,
    private readonly hooks: RouteHooks<Lease>,
    private readonly now: () => number = () => Date.now(),
  ) {
    this.label = `router/${profile}/${ROUTE_POLICY_VERSION}`;
  }

  private clean(value: string | undefined): string | undefined {
    return cleanError(
      value === undefined
        ? undefined
        : (this.hooks.sanitizeError?.(value) ?? value),
    );
  }

  async decide(input: DecideInput): Promise<RoutedDecideResult> {
    const attempts: RouteAttempt[] = [];
    const blockedKeyRefs = new Set<string>();
    const blockedRoutes = new Set<string>();
    const blockedProviders = new Set<string>();
    let reason: RouteReason = this.byo ? "byo" : "configured";
    let lastAttemptedRoute: ModelRoute | undefined;
    let lastFailure: Extract<DecideResult, { ok: false }> = {
      ok: false,
      error: "no healthy model route available",
      deferred: true,
    };
    // Aggregate result contract (Codex 50894, live 2026-09-02): a later LOCAL
    // capacity defer must not erase an earlier ATTEMPTED upstream failure.
    // Four prod rows carried skip_reason "provider rate-limited" and
    // model_failed=false after a real HTTP 503/500 because the alternate's
    // bucket happened to be empty. The last non-capacity provider failure is
    // kept here and wins over any subsequent defer; only an attempt set made
    // entirely of capacity outcomes (local defers and upstream 429s) is a
    // harmless deferred result.
    let attemptedFailure: Extract<DecideResult, { ok: false }> | null = null;

    for (const route of this.routes) {
      if (attempts.length >= MAX_ROUTE_ATTEMPTS) break;
      // Local budget exhaustion is credential-key scoped; an upstream 429 is
      // route/model scoped (live NIM evidence). Track both without conflating
      // them so a healthy alternate can absorb a model-specific limit.
      if (
        blockedKeyRefs.has(route.keyRef) ||
        blockedRoutes.has(routeKey(route)) ||
        blockedProviders.has(route.provider)
      )
        continue;
      const availability = await this.hooks.availability(route);
      if (!availability.eligible) {
        if (attempts.length === 0 && availability.reason === "circuit") {
          reason = "circuit_fallback";
        }
        continue;
      }

      const acquired = await this.hooks.acquire(route, input);
      if (!acquired.ok) {
        const attempt: RouteAttempt = {
          provider: route.provider,
          model: route.model,
          outcome: "deferred",
          failureClass: "capacity",
          retryAfterMs: acquired.retryAfterMs,
          latencyMs: 0,
          error: this.clean(acquired.error ?? "provider capacity unavailable"),
        };
        attempts.push(attempt);
        if (acquired.scope === "route") blockedRoutes.add(routeKey(route));
        else blockedKeyRefs.add(route.keyRef);
        await this.hooks.observe(route, attempt);
        lastFailure = {
          ok: false,
          error: attempt.error ?? "capacity unavailable",
          deferred: true,
        };
        reason = "capacity_fallback";
        continue;
      }

      const started = this.now();
      lastAttemptedRoute = route;
      let result: DecideResult;
      try {
        result = await this.buildProvider(route).decide(input);
      } catch (error) {
        result = {
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
      const latencyMs = Math.max(0, this.now() - started);
      await this.hooks.release(route, acquired.lease, result);

      if (result.ok) {
        const parsed = parseDecision(result.text);
        if (parsed.ok) {
          const attempt: RouteAttempt = {
            provider: route.provider,
            model: route.model,
            outcome: "success",
            latencyMs,
          };
          attempts.push(attempt);
          await this.hooks.observe(route, attempt);
          return {
            ...result,
            route: {
              policyVersion: ROUTE_POLICY_VERSION,
              profile: this.profile,
              effectiveProvider: route.provider,
              effectiveModel: route.model,
              reason,
              attempts,
            },
          };
        }
        const attempt: RouteAttempt = {
          provider: route.provider,
          model: route.model,
          outcome: "failed",
          failureClass: "malformed",
          latencyMs,
          error: this.clean(parsed.error),
        };
        attempts.push(attempt);
        await this.hooks.observe(route, attempt);
        lastFailure = {
          ok: false,
          error: attempt.error ?? "malformed decision",
        };
        attemptedFailure = lastFailure;
        reason = fallbackReason(attempt);
        continue;
      }

      const attempt: RouteAttempt = {
        provider: route.provider,
        model: route.model,
        outcome: "failed",
        failureClass: classifyFailure(result),
        status: result.status,
        retryAfterMs: result.retryAfterMs,
        latencyMs,
        error: this.clean(result.error),
      };
      attempts.push(attempt);
      if (attempt.failureClass === "capacity")
        blockedRoutes.add(routeKey(route));
      // A 5xx/transport failure is normally provider-wide. When an independent
      // provider remains in the chain, spend the bounded second attempt there
      // instead of predictably failing another model behind the same outage.
      // If there is no independent route, keep the same-provider alternate as
      // the only useful recovery option.
      if (
        attempt.failureClass === "transient" &&
        this.routes.some(
          (candidate) =>
            candidate.provider !== route.provider &&
            !blockedKeyRefs.has(candidate.keyRef),
        )
      ) {
        blockedProviders.add(route.provider);
      }
      await this.hooks.observe(route, attempt);
      lastFailure = { ...result, error: attempt.error ?? result.error };
      if (attempt.failureClass !== "capacity") attemptedFailure = lastFailure;
      reason = fallbackReason(attempt);
    }

    const finalFailure: Extract<DecideResult, { ok: false }> = attemptedFailure
      ? { ...attemptedFailure, deferred: false }
      : lastFailure;
    return {
      ...finalFailure,
      route: {
        policyVersion: ROUTE_POLICY_VERSION,
        profile: this.profile,
        effectiveProvider: lastAttemptedRoute?.provider,
        effectiveModel: lastAttemptedRoute?.model,
        reason,
        attempts,
      },
    };
  }
}
