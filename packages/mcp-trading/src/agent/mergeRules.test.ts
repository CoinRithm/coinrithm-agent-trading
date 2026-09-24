import { describe, it, expect } from "vitest";
import {
  mostRestrictive,
  isAtLeastAsRestrictive,
  mergeCapPatch,
  RISK_CAPS,
  LIMIT_CAPS,
} from "./mergeRules.js";

describe("mostRestrictive", () => {
  it("lower wins for numeric caps", () => {
    expect(mostRestrictive("lower", 5, 3)).toBe(3);
    expect(mostRestrictive("lower", 3, 5)).toBe(3);
  });
  it("higher wins for a floor (minConfidence-style)", () => {
    expect(mostRestrictive("higher", 0.5, 0.7)).toBe(0.7);
  });
  it("true is the most restrictive boolean", () => {
    expect(mostRestrictive("true", false, true)).toBe(true);
    expect(mostRestrictive("true", false, false)).toBe(false);
  });
});

describe("isAtLeastAsRestrictive", () => {
  it("a lower number is a legal tightening", () => {
    expect(isAtLeastAsRestrictive("lower", 3, 5)).toBe(true);
    expect(isAtLeastAsRestrictive("lower", 5, 3)).toBe(false);
  });
  it("requireStopLoss can go false->true but not true->false", () => {
    expect(isAtLeastAsRestrictive("true", true, false)).toBe(true);
    expect(isAtLeastAsRestrictive("true", false, true)).toBe(false);
  });
});

describe("mergeCapPatch (tighten-only, most-restrictive-wins)", () => {
  it("accepts a tightening patch and takes the tighter value", () => {
    const { merged, issues } = mergeCapPatch(
      { maxLeverage: 5 },
      { maxLeverage: 3 },
      RISK_CAPS,
      "momentum",
    );
    expect(issues).toHaveLength(0);
    expect(merged.maxLeverage).toBe(3);
  });
  it("rejects a widening patch", () => {
    const { issues } = mergeCapPatch(
      { maxLeverage: 3 },
      { maxLeverage: 10 },
      RISK_CAPS,
      "momentum",
    );
    expect(issues.map((i) => i.code)).toContain("skill_patch_widens_cap");
  });
  it("rejects an unknown cap key in a tactic patch", () => {
    const { issues } = mergeCapPatch(
      { maxLeverage: 3 },
      { venues: ["pm"] } as Record<string, unknown>,
      RISK_CAPS,
      "momentum",
    );
    expect(issues.map((i) => i.code)).toContain("skill_patch_unknown_cap");
  });
  it("rejects loosening requireStopLoss", () => {
    const { issues } = mergeCapPatch(
      { requireStopLoss: true },
      { requireStopLoss: false },
      RISK_CAPS,
      "x",
    );
    expect(issues.map((i) => i.code)).toContain("skill_patch_widens_cap");
  });
  it("tightens a limit cap", () => {
    const { merged, issues } = mergeCapPatch(
      { maxTradesPerDay: 20 },
      { maxTradesPerDay: 5 },
      LIMIT_CAPS,
      "x",
    );
    expect(issues).toHaveLength(0);
    expect(merged.maxTradesPerDay).toBe(5);
  });
});

// maxTradesPerDay and maxDailyLossMusd use 0 as "no cap" in the runner, so the
// tighten-only rule must treat 0 as unlimited, not as the tightest value.
describe("off-sentinel caps (0 = unlimited)", () => {
  const offCaps = ["maxTradesPerDay", "maxDailyLossMusd"] as const;

  it("marks only the two sentinel caps as lower_zero_off", () => {
    for (const key of offCaps) expect(LIMIT_CAPS[key]).toBe("lower_zero_off");
    expect(LIMIT_CAPS.maxWritesPerCycle).toBe("lower");
    expect(LIMIT_CAPS.maxOpenMarginMusd).toBe("lower");
  });

  it.each(offCaps)("%s: 0 -> 100 tightens, 100 -> 0 widens", (key) => {
    const tightened = mergeCapPatch(
      { [key]: 0 },
      { [key]: 100 },
      LIMIT_CAPS,
      "t",
    );
    expect(tightened.issues).toEqual([]);
    expect(tightened.merged[key]).toBe(100);

    const widened = mergeCapPatch(
      { [key]: 100 },
      { [key]: 0 },
      LIMIT_CAPS,
      "t",
    );
    expect(widened.issues.map((i) => i.code)).toEqual([
      "skill_patch_widens_cap",
    ]);
    expect(widened.merged[key]).toBe(100);
  });

  it.each(offCaps)(
    "%s: keeps ordinary tightening between positive values",
    (key) => {
      const { merged, issues } = mergeCapPatch(
        { [key]: 100 },
        { [key]: 50 },
        LIMIT_CAPS,
        "t",
      );
      expect(issues).toEqual([]);
      expect(merged[key]).toBe(50);
      expect(
        mergeCapPatch({ [key]: 0 }, { [key]: 0 }, LIMIT_CAPS, "t").merged[key],
      ).toBe(0);
    },
  );

  it("never accepts a negative or non-finite value as a tightening", () => {
    for (const bad of [-1, Number.NaN, Infinity, "5"]) {
      expect(isAtLeastAsRestrictive("lower_zero_off", bad, 0)).toBe(false);
      expect(isAtLeastAsRestrictive("lower_zero_off", bad, 100)).toBe(false);
    }
    expect(mostRestrictive("lower_zero_off", 0, 100)).toBe(100);
    expect(mostRestrictive("lower_zero_off", 100, 0)).toBe(100);
    expect(mostRestrictive("lower_zero_off", -5, 100)).toBe(100);
  });

  it("writes and margins stay ordinary: 0 is the tightest value there", () => {
    const writes = mergeCapPatch(
      { maxWritesPerCycle: 2 },
      { maxWritesPerCycle: 0 },
      LIMIT_CAPS,
      "t",
    );
    expect(writes.issues).toEqual([]);
    expect(writes.merged.maxWritesPerCycle).toBe(0);
    expect(
      mergeCapPatch(
        { maxOpenMarginMusd: 0 },
        { maxOpenMarginMusd: 100 },
        LIMIT_CAPS,
        "t",
      ).issues.map((i) => i.code),
    ).toEqual(["skill_patch_widens_cap"]);
  });
});
