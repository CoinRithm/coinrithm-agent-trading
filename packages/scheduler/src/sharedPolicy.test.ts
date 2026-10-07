import { describe, expect, it } from "vitest";
import {
  ownerWaiterTtlSeconds,
  sharedOwnerLimit,
  WAITER_GRACE_SECONDS,
} from "./sharedPolicy.js";
import { MAX_WAITER_TTL_SECONDS } from "./capacity.js";
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
  it("holds until just past the next due slot, the shared floor when slower", () => {
    // House agents: 180 s configured, ~330 s on the shared floor (prod 07 Oct).
    expect(ownerWaiterTtlSeconds(180, 330)).toBe(330 + WAITER_GRACE_SECONDS);
    expect(ownerWaiterTtlSeconds(600, 330)).toBe(600 + WAITER_GRACE_SECONDS);
    expect(ownerWaiterTtlSeconds(10, 0)).toBe(60 + WAITER_GRACE_SECONDS);
    expect(ownerWaiterTtlSeconds(NaN, NaN)).toBe(60 + WAITER_GRACE_SECONDS);
    // A 4 h cadence never holds the bucket past the hard bound.
    expect(ownerWaiterTtlSeconds(14_400, 0)).toBe(MAX_WAITER_TTL_SECONDS);
  });

  it("names the requesting agent, never the owner", () => {
    const limit = sharedOwnerLimit(
      { id: 7, isHouse: true, cadenceSeconds: 180 } as AgentRow,
      config,
      24000,
      420,
    );
    expect(limit.waiter).toEqual({ key: "agent:7", ttlSeconds: 420 });
    expect(
      sharedOwnerLimit(
        { id: 8, isHouse: true, cadenceSeconds: 180 } as AgentRow,
        config,
        24000,
      ).waiter,
    ).toEqual({ key: "agent:8", ttlSeconds: 180 + WAITER_GRACE_SECONDS });
    expect(
      sharedOwnerLimit({ id: 0, cadenceSeconds: 180 } as AgentRow, config, 1)
        .waiter,
    ).toBeUndefined();
  });
});
