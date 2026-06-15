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
