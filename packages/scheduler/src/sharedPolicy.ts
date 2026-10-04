import type { AgentRow } from "./db.js";
import type { Config } from "./config.js";
import type { ProviderCapacityLimit } from "./capacity.js";

export function sharedOwnerLimit(
  agent: AgentRow,
  config: Config,
  reserveTokens: number,
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
  };
}
