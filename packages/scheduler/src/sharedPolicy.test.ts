import { describe, expect, it } from "vitest";
import {
  CONCURRENCY_RETRY_SECONDS,
  MIN_DEFERRAL_RETRY_SECONDS,
  OWNER_BUDGET_DEFERRED_ERROR,
  ownerDeferralRetrySeconds,
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

describe("owner deferral retry (no model call)", () => {
  const deferred = (reasons: string[], retryAfterMs?: number) => ({
    outcome: "deferred",
    error: OWNER_BUDGET_DEFERRED_ERROR,
    admissionReasons: reasons,
    ...(retryAfterMs === undefined ? {} : { retryAfterMs }),
  });

  it("retries after the refill hint instead of a full grid interval", () => {
    // Mia at 06:48 UTC: owner token budget, refill hint 6,133 ms.
    const cycle = {
      llmCallMade: false,
      routeAttempts: [deferred(["token_budget"], 6133)],
    };
    expect(ownerDeferralRetrySeconds(cycle, 330, 0)).toBe(7);
    expect(ownerDeferralRetrySeconds(cycle, 330, 1)).toBe(12);
    expect(
      ownerDeferralRetrySeconds(
        {
          llmCallMade: false,
          routeAttempts: [deferred(["token_budget"], 100)],
        },
        330,
        0,
      ),
    ).toBe(MIN_DEFERRAL_RETRY_SECONDS);
    // Never later than the effective interval.
    expect(
      ownerDeferralRetrySeconds(
        {
          llmCallMade: false,
          routeAttempts: [deferred(["request_budget"], 900_000)],
        },
        330,
        0,
      ),
    ).toBe(330);
  });

  it("backs off a busy single call slot without a hot loop", () => {
    const busy = {
      llmCallMade: false,
      routeAttempts: [deferred(["concurrency"])],
    };
    expect(ownerDeferralRetrySeconds(busy, 330, 0)).toBe(
      CONCURRENCY_RETRY_SECONDS,
    );
    expect(ownerDeferralRetrySeconds(busy, 330, 1)).toBe(
      CONCURRENCY_RETRY_SECONDS + 10,
    );
    expect(
      ownerDeferralRetrySeconds(
        {
          llmCallMade: false,
          routeAttempts: [deferred(["token_budget", "concurrency"], 2000)],
        },
        330,
        0,
      ),
    ).toBe(CONCURRENCY_RETRY_SECONDS);
  });

  it("keeps normal phase scheduling for everything else", () => {
    const keep = (cycle: Parameters<typeof ownerDeferralRetrySeconds>[0]) =>
      ownerDeferralRetrySeconds(cycle, 330, 0.5);
    expect(
      keep({
        llmCallMade: true,
        routeAttempts: [deferred(["token_budget"], 1)],
      }),
    ).toBeUndefined();
    expect(keep({ llmCallMade: false })).toBeUndefined();
    expect(keep({ llmCallMade: false, routeAttempts: [] })).toBeUndefined();
    expect(
      keep({
        llmCallMade: false,
        routeAttempts: [
          {
            outcome: "deferred",
            error: "shared provider capacity unavailable",
            admissionReasons: ["token_budget"],
          },
        ],
      }),
    ).toBeUndefined();
    expect(
      keep({
        llmCallMade: false,
        routeAttempts: [deferred(["shared_key_cooldown"])],
      }),
    ).toBeUndefined();
    expect(
      keep({ llmCallMade: false, routeAttempts: [deferred([])] }),
    ).toBeUndefined();
    expect(
      keep({
        llmCallMade: false,
        routeAttempts: [
          deferred(["token_budget"], 1000),
          { outcome: "failed", error: "boom" },
        ],
      }),
    ).toBeUndefined();
    expect(
      ownerDeferralRetrySeconds(
        {
          llmCallMade: false,
          routeAttempts: [deferred(["token_budget"], NaN)],
        },
        NaN,
        NaN,
      ),
    ).toBe(MIN_DEFERRAL_RETRY_SECONDS);
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
