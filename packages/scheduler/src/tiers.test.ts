import { describe, it, expect } from "vitest";
import {
  TIER_LIMITS,
  limitsForPlan,
  evaluateDeploy,
  isOverBudget,
  tierStatus,
} from "./tiers.js";

describe("limitsForPlan", () => {
  it("maps known plans and falls back to free for unknown/empty", () => {
    expect(limitsForPlan("pro").plan).toBe("pro");
    expect(limitsForPlan("house").plan).toBe("house");
    expect(limitsForPlan("free").plan).toBe("free");
    expect(limitsForPlan("garbage").plan).toBe("free");
    expect(limitsForPlan(null).plan).toBe("free");
    expect(limitsForPlan(undefined).plan).toBe("free");
  });

  it("orders the tiers sensibly (free < pro < house on capacity)", () => {
    expect(TIER_LIMITS.free.maxAgentsPerOwner).toBeLessThan(
      TIER_LIMITS.pro.maxAgentsPerOwner,
    );
    expect(TIER_LIMITS.pro.maxAgentsPerOwner).toBeLessThan(
      TIER_LIMITS.house.maxAgentsPerOwner,
    );
    // Higher tiers run at least as fast.
    expect(TIER_LIMITS.pro.minCadenceSeconds).toBeLessThanOrEqual(
      TIER_LIMITS.free.minCadenceSeconds,
    );
    expect(TIER_LIMITS.free.minCadenceSeconds).toBeGreaterThanOrEqual(60);
  });
});

describe("evaluateDeploy", () => {
  it("allows a first free agent and clamps cadence up to the free floor", () => {
    const r = evaluateDeploy({
      plan: "free",
      currentAgentCount: 0,
      cadenceSeconds: 60,
    });
    expect(r.allowed).toBe(true);
    expect(r.reasons).toEqual([]);
    expect(r.effectiveCadenceSeconds).toBe(TIER_LIMITS.free.minCadenceSeconds);
  });

  it("rejects a 2nd free agent (agent cap) with a machine-readable reason", () => {
    const r = evaluateDeploy({
      plan: "free",
      currentAgentCount: 1,
      cadenceSeconds: 1800,
    });
    expect(r.allowed).toBe(false);
    expect(r.reasons).toContain(
      `agent_cap_reached:${TIER_LIMITS.free.maxAgentsPerOwner}`,
    );
  });

  it("lets pro run more agents at a faster cadence", () => {
    const r = evaluateDeploy({
      plan: "pro",
      currentAgentCount: 3,
      cadenceSeconds: 60,
    });
    expect(r.allowed).toBe(true);
    expect(r.effectiveCadenceSeconds).toBe(TIER_LIMITS.pro.minCadenceSeconds);
  });

  it("does not slow a request already above the floor", () => {
    const r = evaluateDeploy({
      plan: "pro",
      currentAgentCount: 0,
      cadenceSeconds: 3600,
    });
    expect(r.effectiveCadenceSeconds).toBe(3600);
  });

  it("treats house agents as exempt regardless of count/cadence", () => {
    const r = evaluateDeploy({
      plan: "free",
      currentAgentCount: 999,
      cadenceSeconds: 60,
      isHouse: true,
    });
    expect(r.allowed).toBe(true);
    expect(r.limits.plan).toBe("house");
  });
});

describe("isOverBudget", () => {
  it("trips when metered cost reaches the tier budget", () => {
    expect(
      isOverBudget({
        plan: "free",
        costThisPeriodUsd: TIER_LIMITS.free.monthlyComputeBudgetUsd,
      }),
    ).toBe(true);
    expect(isOverBudget({ plan: "free", costThisPeriodUsd: 0 })).toBe(false);
    expect(
      isOverBudget({
        plan: "pro",
        costThisPeriodUsd: TIER_LIMITS.free.monthlyComputeBudgetUsd,
      }),
    ).toBe(false);
  });

  it("never trips for house (infinite budget)", () => {
    expect(
      isOverBudget({ plan: "free", costThisPeriodUsd: 1e9, isHouse: true }),
    ).toBe(false);
  });
});

describe("tierStatus", () => {
  it("reports cap, budget and used-fraction for a free owner mid-usage", () => {
    const s = tierStatus({ plan: "free", agentCount: 1, costThisPeriodUsd: 1 });
    expect(s.plan).toBe("free");
    expect(s.atAgentCap).toBe(true);
    expect(s.overBudget).toBe(false);
    expect(s.budgetUsedFraction).toBeCloseTo(
      1 / TIER_LIMITS.free.monthlyComputeBudgetUsd,
      6,
    );
  });

  it("clamps the used-fraction to 1 and reports house as 0 (unlimited)", () => {
    const over = tierStatus({
      plan: "free",
      agentCount: 0,
      costThisPeriodUsd: 9999,
    });
    expect(over.budgetUsedFraction).toBe(1);
    expect(over.overBudget).toBe(true);
    const house = tierStatus({
      plan: "house",
      isHouse: true,
      agentCount: 50,
      costThisPeriodUsd: 9999,
    });
    expect(house.budgetUsedFraction).toBe(0);
    expect(house.atAgentCap).toBe(false);
  });
});
