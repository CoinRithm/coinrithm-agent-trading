import {
  parseDecision,
  classifyProviderFailure,
  canRetrySuperToolOutput,
  type DecideInput,
  type DecideResult,
  type Provider,
  type ProviderName,
  type ProviderRouteOptions,
  type ActionsStringDiagnostic,
} from "@coinrithm/mcp-trading/engine";
import type { ProviderCapacityDenialReason } from "./capacity.js";

type AdmissionReason = ProviderCapacityDenialReason | "model_cooldown";

export const ROUTE_POLICY_VERSION = "2026-10-06.1";
// nemotron-3-nano-30b-a3b went 410 (end of life) on 2026-09-01; the omni
// variant is the live-probe-verified fast tier (200 + strict JSON, ~2.6s,
// probe 2026-09-02 06:5xZ from the scheduler key).
export const NEMOTRON_NANO = "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning";
export const NEMOTRON_SUPER = "nvidia/nemotron-3-super-120b-a12b";
export const NEMOTRON_LIGHTNING = "nvidia/nemotron-3.5-lightning-30b-a3b";
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
  /** Local admission only; all blocking conditions, never provider health. */
  admissionReasons?: AdmissionReason[];
  actionsStringDiagnostic?: ActionsStringDiagnostic;
  responseSource?: "content" | "tool_call" | "content_fallback";
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
      scope?: "key" | "route" | "owner";
      retryAfterMs?: number;
      error?: string;
      admissionReasons?: AdmissionReason[];
      /** Owner scope: another live claimant owns the bucket's turn. */
      claimedByOther?: boolean;
    };

/** Why an owner-budget denial did not wait in-cycle. */
export type OwnerWaitSkipReason =
  | "no_hint"
  | "hint_over_ceiling"
  | "deadline"
  | "claimed_by_other"
  | "wait_cap";

/** Structured owner-wait diagnostics: no prompt, credential or identity. */
export type OwnerWaitEvent =
  | {
      event: "owner_wait_start";
      path: "first_call" | "recovery";
      model: string;
      hintMs: number;
      waitsInFlight: number;
    }
  | {
      event: "owner_wait_skip";
      path: "first_call" | "recovery";
      model: string;
      hintMs?: number;
      reason: OwnerWaitSkipReason;
      waitsInFlight: number;
    }
  | {
      event: "owner_wait_outcome";
      path: "first_call" | "recovery";
      model: string;
      waitedMs: number;
      outcome: "admitted" | "denied" | "route_changed" | "route_unusable";
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
    unused?: boolean,
  ): Promise<void>;
  observe(
    route: ModelRoute,
    attempt: RouteAttempt,
    callStartedAt?: number,
  ): Promise<void>;
  /** After an owner-refill wait: may this agent still dispatch on route? */
  stillEligible?(route: ModelRoute): Promise<boolean>;
  /** This cycle will not (or no longer) wait: end its owner-bucket claim. */
  abandonOwnerWait?(route: ModelRoute): Promise<void>;
  /** Diagnostics for owner-refill waits; failures never affect routing. */
  onOwnerWait?(event: OwnerWaitEvent): void;
}

/** Attempts per decision, a same-model malformed-output recovery included.
 *  The bench guard reserves this many provider calls per decision. */
export const MAX_ROUTE_ATTEMPTS = 2;
/**
 * Longest in-cycle wait for an owner-bucket refill (sharedPolicy TTL). 120 s
 * (root 57001): at 60 s, a41-mon-olivia, whose grid slot follows a sibling's
 * ~49k call by ~25 s in a seven-agent owner, got 71-89 s refill hints and
 * never waited (1 call in 6 cycles, 7 Oct 2026). The 300 s deadline still
 * keeps the 30 s response margin after a full wait.
 */
export const MAX_OWNER_REFILL_WAIT_MS = 120_000;
/** Malformed-tool recovery keeps its original 60 s refill ceiling. */
const MAX_RECOVERY_REFILL_WAIT_MS = 60_000;
/**
 * First-attempt owner-refill waits in flight per scheduler process. A waiting
 * cycle holds a scheduler slot (6 by default) for up to 120 s, so at most this
 * many may wait at once; beyond it a cycle defers and releases its claim, and
 * other owners' agents keep their slots.
 */
export const MAX_CONCURRENT_OWNER_WAITS = 2;
let ownerWaitsInFlight = 0;
/**
 * A first attempt whose agent was paused, deleted or re-routed during its
 * owner-refill wait: recorded as this, not as owner-budget starvation.
 */
export const ROUTE_CHANGED_ERROR =
  "route_changed: agent paused, removed or re-routed during owner refill wait";
/** Tests and diagnostics: first-attempt owner waits currently sleeping. */
export function ownerWaitsInFlightNow(): number {
  return ownerWaitsInFlight;
}
const MIN_RECOVERY_RESPONSE_MS = 30_000;

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
export function classifyFailure(
  result: Extract<DecideResult, { ok: false }>,
): RouteFailureClass {
  return classifyProviderFailure(result);
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
/**
 * PINNED MODE: one route, no failover, for controlled experiments.
 *
 * Routing exists so a live agent keeps trading when a model is saturated or
 * retired, and for the house fleet that is right. It is wrong when the point of
 * the run is to compare variants, because a fallback silently swaps the model
 * mid-experiment.
 *
 * Measured on production for one agent over 7 days: of 852 cycles, 587 ran the
 * since-retired configured model, ~136 the current one, and 125 (16.2%) were
 * served by a LARGER model through circuit, provider, capacity and malformed
 * fallbacks. A customer comparing variants over that window was not running a
 * single-model experiment, and no amount of after-the-fact reporting fixes a
 * result that already mixed two models.
 *
 * Pinning trades availability for validity: a pinned agent SKIPS a cycle rather
 * than substituting a model. That is the correct trade for an experiment and
 * the wrong one for a live desk, so it is opt-in per agent and off by default.
 * `manifest.modelAttribution.singleModelRange` in the audit export is how a run
 * is confirmed clean afterwards; this is how it is made clean in advance.
 */
export function resolveRouteChain(args: {
  configured: Omit<ModelRoute, "keyRef"> & { keyRef?: string };
  byo: boolean;
  openAiBackup: boolean;
  /** Opt-in: no failover, so the run cannot silently change model. */
  pinnedModel?: boolean;
  /** Optional house canary, still subject to the same two-attempt deadline. */
  lightningFallback?: boolean;
}): { profile: RouteProfile; routes: ModelRoute[] } {
  const configured: ModelRoute = {
    ...args.configured,
    keyRef:
      args.configured.keyRef ??
      (args.byo ? "byo" : `${args.configured.provider}:shared:0`),
  };
  const profile = routeProfileFor(configured.model);
  // BYO is already single-route: a user's own key has no house alternate to
  // fall back to. Pinning takes the same shape for a different reason.
  if (args.byo || args.pinnedModel) return { profile, routes: [configured] };

  const routes: ModelRoute[] = [configured];
  if (args.lightningFallback && (profile === "fast" || profile === "strong")) {
    routes.push({
      provider: "nvidia",
      model: NEMOTRON_LIGHTNING,
      keyRef: configured.keyRef,
    });
  }
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
    private readonly buildProvider: (
      route: ModelRoute,
      options?: ProviderRouteOptions,
    ) => Provider,
    private readonly hooks: RouteHooks<Lease>,
    private readonly now: () => number = () => Date.now(),
  ) {
    this.label = `router/${profile}/${ROUTE_POLICY_VERSION}`;
  }

  private ownerWaitEvent(event: OwnerWaitEvent): void {
    try {
      this.hooks.onOwnerWait?.(event);
    } catch {
      /* diagnostics never change routing */
    }
  }

  private async abandonOwnerWait(route: ModelRoute): Promise<void> {
    try {
      await this.hooks.abandonOwnerWait?.(route);
    } catch {
      // The claim still expires on its own (<= OWNER_WAITER_TTL_SECONDS,
      // 135 s); never fail the cycle.
    }
  }

  private clean(value: string | undefined): string | undefined {
    return cleanError(
      value === undefined
        ? undefined
        : (this.hooks.sanitizeError?.(value) ?? value),
    );
  }

  async decide(input: DecideInput): Promise<RoutedDecideResult> {
    // The entire chain must fit the scheduler's 360s run lock/heartbeat.
    // A fallback receives the remaining budget, never a second five minutes.
    const deadline = this.now() + Math.min(input.timeoutMs ?? 300_000, 300_000);
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
    let usage: DecideResult["usage"];
    const candidates: Array<{
      route: ModelRoute;
      options?: ProviderRouteOptions;
    }> = this.routes.map((route) => ({ route }));

    for (let index = 0; index < candidates.length; index += 1) {
      const { route, options } = candidates[index]!;
      if (attempts.length >= MAX_ROUTE_ATTEMPTS) break;
      if (this.now() >= deadline) break;
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

      // Preserve the original presentation for Nano and unverified models.
      // Paired live probes validated these two routes; Nano failed the table
      // contract. This remains a house-only runtime opt-in upstream.
      const { compactUser, ...originalInput } = input;
      const compactEligible =
        !this.byo &&
        route.provider === "nvidia" &&
        (!route.baseUrl ||
          route.baseUrl === "https://integrate.api.nvidia.com/v1") &&
        (route.model === NEMOTRON_SUPER || route.model === NEMOTRON_LIGHTNING);
      const routeInput =
        compactEligible && compactUser
          ? { ...originalInput, user: compactUser }
          : originalInput;
      let acquired = await this.hooks.acquire(route, routeInput);
      let waitedForOwner = false;
      const refillWaitMs = !acquired.ok ? acquired.retryAfterMs : undefined;
      // A first attempt denied by the owner budget may wait in-cycle for the
      // refill too (owner fairness, 009): otherwise its next try is a whole
      // grid interval later at the same offset, which is how one agent lost
      // every cycle. Same rules as the malformed retry: owner token/request
      // budget only, >= 30 s left for the response, re-admission; the ceiling
      // is MAX_OWNER_REFILL_WAIT_MS (120 s) here, 60 s for the recovery.
      // "First" = nothing has reached a provider yet this cycle. A local
      // deferral that made no call (a route cooldown on the configured model)
      // does not count: live 07:37 UTC, house Mia's Nano route was cooling down
      // on both keys, so her owner denial always landed on the fallback as the
      // second attempt and never got this wait. An owner denial ends the loop,
      // so at most one owner wait happens per cycle either way.
      const firstAttempt = attempts.every((a) => a.outcome === "deferred");
      let routeChanged = false;
      const fairnessWait =
        firstAttempt && options?.nemotronJsonContent !== true;
      const waitCeilingMs = fairnessWait
        ? MAX_OWNER_REFILL_WAIT_MS
        : MAX_RECOVERY_REFILL_WAIT_MS;
      const waitPath = fairnessWait ? "first_call" : "recovery";
      const ownerBudgetDenial =
        (options?.nemotronJsonContent === true || firstAttempt) &&
        !acquired.ok &&
        acquired.scope === "owner" &&
        !!acquired.admissionReasons?.length &&
        acquired.admissionReasons.every(
          (reason) => reason === "token_budget" || reason === "request_budget",
        );
      const hintMs =
        typeof refillWaitMs === "number" &&
        Number.isFinite(refillWaitMs) &&
        refillWaitMs > 0
          ? refillWaitMs
          : undefined;
      // A requester denied behind ANOTHER live claimant has no protected turn
      // (root 57023): holding one of the two first-call slots for it can
      // starve another owner's claimant, and its re-admission mostly fails
      // (live a44-oli 09:15 UTC: waited 62 s, still deferred). Recovery waits
      // do not use these slots and keep their behaviour.
      let skip: OwnerWaitSkipReason | undefined;
      if (ownerBudgetDenial) {
        if (hintMs === undefined) skip = "no_hint";
        else if (hintMs > waitCeilingMs) skip = "hint_over_ceiling";
        else if (this.now() + hintMs + MIN_RECOVERY_RESPONSE_MS > deadline)
          skip = "deadline";
        else if (fairnessWait && !acquired.ok && acquired.claimedByOther)
          skip = "claimed_by_other";
        else if (
          fairnessWait &&
          ownerWaitsInFlight >= MAX_CONCURRENT_OWNER_WAITS
        )
          skip = "wait_cap";
        if (skip)
          this.ownerWaitEvent({
            event: "owner_wait_skip",
            path: waitPath,
            model: route.model,
            ...(hintMs === undefined ? {} : { hintMs }),
            reason: skip,
            waitsInFlight: ownerWaitsInFlight,
          });
      }
      if (ownerBudgetDenial && skip === undefined && hintMs !== undefined) {
        const waitStarted = this.now();
        this.ownerWaitEvent({
          event: "owner_wait_start",
          path: waitPath,
          model: route.model,
          hintMs,
          waitsInFlight: ownerWaitsInFlight,
        });
        // No lease is held: a first denial creates none, and a malformed first
        // request was released. The hint comes from the locked SQL snapshot;
        // another agent can consume its credit, so re-admission is mandatory,
        // and so is re-checking that this agent may still use this route.
        waitedForOwner = true;
        if (fairnessWait) ownerWaitsInFlight += 1;
        try {
          await new Promise<void>((resolve) => setTimeout(resolve, hintMs));
        } finally {
          if (fairnessWait) ownerWaitsInFlight -= 1;
        }
        const routeUsable =
          this.now() + MIN_RECOVERY_RESPONSE_MS <= deadline &&
          (await this.hooks.availability(route)).eligible &&
          this.now() + MIN_RECOVERY_RESPONSE_MS <= deadline;
        const canDispatch =
          routeUsable &&
          (!this.hooks.stillEligible ||
            (await this.hooks.stillEligible(route)));
        // Paused, deleted or re-routed while waiting: not owner starvation.
        routeChanged = routeUsable && !canDispatch;
        if (canDispatch) acquired = await this.hooks.acquire(route, routeInput);
        this.ownerWaitEvent({
          event: "owner_wait_outcome",
          path: waitPath,
          model: route.model,
          waitedMs: Math.max(0, this.now() - waitStarted),
          outcome: !routeUsable
            ? "route_unusable"
            : routeChanged
              ? "route_changed"
              : acquired.ok
                ? "admitted"
                : "denied",
        });
        if (!canDispatch && !firstAttempt) {
          await this.abandonOwnerWait(route);
          break;
        }
      }
      if (!acquired.ok) {
        // This cycle will not wait again: release its claim now rather than
        // hold the owner's bucket until the claim expires.
        await this.abandonOwnerWait(route);
        const attempt: RouteAttempt = {
          provider: route.provider,
          model: route.model,
          outcome: "deferred",
          failureClass: "capacity",
          retryAfterMs: acquired.retryAfterMs,
          latencyMs: 0,
          error: routeChanged
            ? ROUTE_CHANGED_ERROR
            : this.clean(acquired.error ?? "provider capacity unavailable"),
          admissionReasons: routeChanged
            ? undefined
            : acquired.admissionReasons,
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
        if (acquired.scope === "owner") break;
        continue;
      }

      const started = this.now();
      const remainingMs = deadline - started;
      if (
        remainingMs <= 0 ||
        (waitedForOwner && remainingMs < MIN_RECOVERY_RESPONSE_MS)
      ) {
        await this.hooks.release(
          route,
          acquired.lease,
          { ok: false, error: "model route deadline exhausted" },
          true,
        );
        // The unused release keeps a claim; this cycle has ended, so end it.
        await this.abandonOwnerWait(route);
        break;
      }
      lastAttemptedRoute = route;
      let result: DecideResult;
      try {
        result = await this.buildProvider(route, options).decide({
          ...routeInput,
          timeoutMs: remainingMs,
        });
      } catch (error) {
        result = {
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
      const latencyMs = Math.max(0, this.now() - started);
      await this.hooks.release(route, acquired.lease, result);
      // Admission/release use each attempt's usage independently. The cycle
      // ledger must also retain the total reported tokens across all attempts,
      // including an invalid response followed by a local capacity defer.
      if (result.usage) {
        usage = {
          promptTokens: (usage?.promptTokens ?? 0) + result.usage.promptTokens,
          completionTokens:
            (usage?.completionTokens ?? 0) + result.usage.completionTokens,
        };
      }

      if (result.ok) {
        const parsed = parseDecision(result.text);
        if (parsed.ok) {
          const attempt: RouteAttempt = {
            provider: route.provider,
            model: route.model,
            outcome: "success",
            latencyMs,
            responseSource: result.responseSource,
          };
          attempts.push(attempt);
          await this.hooks.observe(route, attempt, started);
          return {
            ...result,
            ...(usage ? { usage } : {}),
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
          actionsStringDiagnostic: parsed.actionsStringDiagnostic,
          responseSource: result.responseSource,
        };
        attempts.push(attempt);
        await this.hooks.observe(route, attempt);
        lastFailure = {
          ok: false,
          error: attempt.error ?? "malformed decision",
        };
        attemptedFailure = lastFailure;
        reason = fallbackReason(attempt);
        if (
          !options?.nemotronJsonContent &&
          canRetrySuperToolOutput(
            route,
            result.responseSource,
            parsed.actionsStringDiagnostic,
          )
        ) {
          // This is the existing second attempt, not a hidden nested retry.
          // It must pass route availability and fresh owner/provider admission
          // again, and inherits the original deadline and configured model.
          candidates.splice(index + 1, 0, {
            route,
            options: { nemotronJsonContent: true },
          });
        }
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
      ...(usage ? { usage } : {}),
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
