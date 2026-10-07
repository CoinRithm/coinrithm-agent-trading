import type { AgentRow } from "./db.js";
import type { Config } from "./config.js";
import {
  MAX_WAITER_TTL_SECONDS,
  type ProviderCapacityLimit,
} from "./capacity.js";

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
