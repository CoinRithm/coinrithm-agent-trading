import type { AgentRow } from "./db.js";
import type { Config } from "./config.js";
import {
  WAITER_RETRY_SLACK_SECONDS,
  type ProviderCapacityLimit,
} from "./capacity.js";
import { MAX_OWNER_REFILL_WAIT_MS } from "./route.js";

/** The runtime's owner-admission error; the reschedule rule keys on it. */
export const OWNER_BUDGET_DEFERRED_ERROR =
  "shared pool owner budget unavailable";
/**
 * An owner-bucket claim never outlives the bounded in-cycle refill wait it
 * protects (route.ts): the 120 s wait ceiling plus slack. A cycle that cannot
 * wait releases its claim at once (RouteHooks.abandonOwnerWait).
 */
export const OWNER_WAITER_TTL_SECONDS =
  MAX_OWNER_REFILL_WAIT_MS / 1000 + WAITER_RETRY_SLACK_SECONDS;

export function sharedOwnerLimit(
  agent: AgentRow,
  config: Config,
  reserveTokens: number,
): ProviderCapacityLimit {
  const tenant = agent.capacityTenant
    ? agent.capacityTenant
    : agent.isHouse
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
      ? {
          waiter: {
            key: ownerWaiterKey(agent),
            ttlSeconds: OWNER_WAITER_TTL_SECONDS,
          },
        }
      : {}),
  };
}

/** The claim key of an agent in its owner bucket. */
export function ownerWaiterKey(agent: Pick<AgentRow, "id">): string {
  return `agent:${agent.id}`;
}
