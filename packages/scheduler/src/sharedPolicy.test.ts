import { describe, expect, it } from "vitest";
import {
  OWNER_WAITER_TTL_SECONDS,
  ownerWaiterKey,
  sharedOwnerLimit,
} from "./sharedPolicy.js";
import { WAITER_RETRY_SLACK_SECONDS } from "./capacity.js";
import { loadConfig } from "./config.js";
import type { AgentRow } from "./db.js";

const config = loadConfig({
  DATABASE_URL: "postgres://fixture",
  ENCRYPTION_KEY: Buffer.alloc(32, 1).toString("hex"),
  NVIDIA_API_KEYS: "key0,key1",
});
describe("shared owner token allocation", () => {
  it("groups an owner's agents across both keys, while isolating another owner", () => {
    const first = sharedOwnerLimit(
      { id: 2, ownerUserId: 10 } as AgentRow,
      config,
      40000,
    );
    const second = sharedOwnerLimit(
      { id: 3, ownerUserId: 10 } as AgentRow,
      config,
      10000,
    );
    const other = sharedOwnerLimit(
      { id: 4, ownerUserId: 11 } as AgentRow,
      config,
      10000,
    );
    expect(first.routeKey).toBe(second.routeKey);
    expect(other.routeKey).not.toBe(first.routeKey);
    expect(first).toMatchObject({
      tokensPerMinute: 25000,
      tokenBurst: 40000,
      maxConcurrent: 1,
    });
    expect(second.tokensPerMinute).toBe(first.tokensPerMinute);
  });
  it("groups house agents and isolates legacy ownerless records", () => {
    expect(
      sharedOwnerLimit(
        { id: 1, isHouse: true, ownerUserId: 10 } as AgentRow,
        config,
        1000,
      ).routeKey,
    ).toBe(
      sharedOwnerLimit(
        { id: 2, isHouse: true, ownerUserId: 11 } as AgentRow,
        config,
        1000,
      ).routeKey,
    );
    expect(
      sharedOwnerLimit({ id: 1, ownerUserId: null } as AgentRow, config, 1000)
        .routeKey,
    ).not.toBe(
      sharedOwnerLimit({ id: 2, ownerUserId: null } as AgentRow, config, 1000)
        .routeKey,
    );
  });
});

describe("owner bucket waiter", () => {
  it("bounds the claim by the 60 s in-cycle refill wait plus slack", () => {
    expect(OWNER_WAITER_TTL_SECONDS).toBe(60 + WAITER_RETRY_SLACK_SECONDS);
  });

  it("names the requesting agent, never the owner", () => {
    const limit = sharedOwnerLimit(
      { id: 7, isHouse: true, cadenceSeconds: 180 } as AgentRow,
      config,
      24000,
    );
    expect(limit.waiter).toEqual({
      key: "agent:7",
      ttlSeconds: OWNER_WAITER_TTL_SECONDS,
    });
    expect(ownerWaiterKey({ id: 7 })).toBe("agent:7");
    expect(
      sharedOwnerLimit({ id: 0, cadenceSeconds: 180 } as AgentRow, config, 1)
        .waiter,
    ).toBeUndefined();
  });
});
