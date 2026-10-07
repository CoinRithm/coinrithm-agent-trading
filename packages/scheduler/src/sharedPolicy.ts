import type { AgentRow } from "./db.js";
import type { Config } from "./config.js";
import {
  MAX_WAITER_TTL_SECONDS,
  type ProviderCapacityLimit,
} from "./capacity.js";

/** The runtime's owner-admission error; the reschedule rule keys on it. */
export const OWNER_BUDGET_DEFERRED_ERROR =
  "shared pool owner budget unavailable";
/** Earliest retry after an owner token/request-budget deferral. */
export const MIN_DEFERRAL_RETRY_SECONDS = 5;
/** Backoff when only the owner's single call slot was busy (no hot loop). */
export const CONCURRENCY_RETRY_SECONDS = 20;

type DeferredAttempt = {
  outcome?: string;
  error?: string;
  retryAfterMs?: number;
  admissionReasons?: readonly string[];
};

/**
 * A cycle that made NO model call because its owner bucket deferred it retries
 * after the refill, not at its next phase-grid slot (one full interval later at
 * the same offset, which is how one agent lost every cycle). Budget deferrals
 * use the locked-snapshot refill hint (at least 5 s, up to 5 s jitter); a
 * busy-slot-only deferral backs off 20-30 s. Never later than the agent's
 * effective interval, and the caller keeps the grid slot when that is sooner.
 * Anything else (a model call, a provider or key deferral, a cooldown, the
 * 180 s model interval gate) returns undefined: normal phase scheduling.
 */
export function ownerDeferralRetrySeconds(
  cycle: { llmCallMade?: boolean; routeAttempts?: readonly DeferredAttempt[] },
  intervalSeconds: number,
  jitter: number,
): number | undefined {
  if (cycle.llmCallMade) return undefined;
  const attempts = cycle.routeAttempts ?? [];
  if (
    attempts.length === 0 ||
    !attempts.every(
      (a) =>
        a.outcome === "deferred" && a.error === OWNER_BUDGET_DEFERRED_ERROR,
    )
  )
    return undefined;
  const reasons = new Set(attempts.flatMap((a) => a.admissionReasons ?? []));
  if (
    reasons.size === 0 ||
    Array.from(reasons).some(
      (r) =>
        r !== "token_budget" && r !== "request_budget" && r !== "concurrency",
    )
  )
    return undefined;
  const j = Number.isFinite(jitter) ? Math.min(1, Math.max(0, jitter)) : 0;
  let seconds: number;
  if (reasons.has("token_budget") || reasons.has("request_budget")) {
    const waitMs = Math.max(
      0,
      ...attempts.map((a) =>
        typeof a.retryAfterMs === "number" && Number.isFinite(a.retryAfterMs)
          ? a.retryAfterMs
          : 0,
      ),
    );
    seconds =
      Math.max(MIN_DEFERRAL_RETRY_SECONDS, Math.ceil(waitMs / 1000)) +
      Math.round(j * 5);
    if (reasons.has("concurrency"))
      seconds = Math.max(seconds, CONCURRENCY_RETRY_SECONDS);
  } else {
    seconds = CONCURRENCY_RETRY_SECONDS + Math.round(j * 10);
  }
  const cap = Math.max(
    MIN_DEFERRAL_RETRY_SECONDS,
    Math.floor(Number.isFinite(intervalSeconds) ? intervalSeconds : 0),
  );
  return Math.min(seconds, cap);
}

/** Slack past the agent's next due slot before its owner-bucket claim lapses. */
export const WAITER_GRACE_SECONDS = 90;

/**
 * How long a token-starved agent holds its owner bucket: until just past its
 * next due slot (the configured cadence, or the shared-pool floor when that is
 * slower), so that attempt finds the refill. Bounded by MAX_WAITER_TTL_SECONDS,
 * so a paused, disabled or deleted agent releases the bucket on its own.
 */
export function ownerWaiterTtlSeconds(
  cadenceSeconds: number,
  sharedFloorSeconds: number,
): number {
  const interval = Math.max(
    60,
    Number.isFinite(cadenceSeconds) ? cadenceSeconds : 0,
    Number.isFinite(sharedFloorSeconds) ? sharedFloorSeconds : 0,
  );
  return Math.min(
    MAX_WAITER_TTL_SECONDS,
    Math.ceil(interval) + WAITER_GRACE_SECONDS,
  );
}

export function sharedOwnerLimit(
  agent: AgentRow,
  config: Config,
  reserveTokens: number,
  waiterTtlSeconds = ownerWaiterTtlSeconds(agent.cadenceSeconds, 0),
): ProviderCapacityLimit {
  const tenant = agent.isHouse
    ? "house"
    : Number.isSafeInteger(agent.ownerUserId) && (agent.ownerUserId ?? 0) > 0
      ? `user:${agent.ownerUserId}`
      : `agent:${agent.id}`;
  return {
    routeKey: `shared-owner:${tenant}`,
    provider: "shared_pool",
    model: "all-shared-models",
    requestsPerMinute:
      config.nvidiaRpm * Math.max(1, config.nvidiaApiKeys.length),
    tokensPerMinute: config.sharedOwnerTpm,
    // A large, valid prompt may accumulate one request's worth of credit;
    // unlike provider admission, this does not raise its long-run refill rate.
    tokenBurst: reserveTokens,
    maxConcurrent: 1,
    reserveTokens,
    leaseTtlSeconds: config.capacityLeaseTtlSeconds,
    ...(Number.isSafeInteger(agent.id) && agent.id > 0
      ? { waiter: { key: `agent:${agent.id}`, ttlSeconds: waiterTtlSeconds } }
      : {}),
  };
}
