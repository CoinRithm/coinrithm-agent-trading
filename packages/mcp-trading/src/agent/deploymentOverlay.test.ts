import { describe, it, expect } from "vitest";
import {
  applyDeploymentOverlay,
  effectiveCadenceSeconds,
  effectivePolicyView,
  TIER_LIMITS,
} from "./deploymentOverlay.js";
import { DEFAULT_TRIGGER_POLICY, TriggerPolicy } from "./types.js";

const pol = (p: Partial<TriggerPolicy> = {}): TriggerPolicy => ({
  ...DEFAULT_TRIGGER_POLICY,
  ...p,
});

describe("applyDeploymentOverlay", () => {
  it("caps an OKF asking for more calls than the tier allows (free_demo)", () => {
    const out = applyDeploymentOverlay(
      pol({ maxLlmCallsPerHour: 999 }),
      "free_demo",
    );
    expect(out.maxLlmCallsPerHour).toBe(
      TIER_LIMITS.free_demo.maxLlmCallsPerHour,
    );
  });

  it("caps an OKF asking for UNLIMITED (0) to the tier cap", () => {
    const out = applyDeploymentOverlay(
      pol({ maxLlmCallsPerHour: 0 }),
      "builder",
    );
    expect(out.maxLlmCallsPerHour).toBe(TIER_LIMITS.builder.maxLlmCallsPerHour);
  });

  it("never WIDENS — an OKF asking for less than the tier keeps the lower value", () => {
    const out = applyDeploymentOverlay(pol({ maxLlmCallsPerHour: 2 }), "pro");
    expect(out.maxLlmCallsPerHour).toBe(2);
  });

  it("house + byok are uncapped (honor the request)", () => {
    expect(
      applyDeploymentOverlay(pol({ maxLlmCallsPerHour: 999 }), "house")
        .maxLlmCallsPerHour,
    ).toBe(999);
    expect(
      applyDeploymentOverlay(pol({ maxLlmCallsPerHour: 0 }), "byok")
        .maxLlmCallsPerHour,
    ).toBe(0);
  });
});

describe("effectiveCadenceSeconds", () => {
  it("floors a fast free agent to the tier minimum", () => {
    expect(effectiveCadenceSeconds(60, "free_demo")).toBe(3600);
  });
  it("keeps a slow agent that already exceeds the floor", () => {
    expect(effectiveCadenceSeconds(7200, "free_demo")).toBe(7200);
  });
  it("lets pro run fast", () => {
    expect(effectiveCadenceSeconds(60, "pro")).toBe(60);
  });
});

describe("effectivePolicyView (transparency)", () => {
  it("shows requested vs enforced side by side", () => {
    const v = effectivePolicyView(
      pol({ maxLlmCallsPerHour: 999 }),
      60,
      "free_demo",
    );
    expect(v.requested).toEqual({
      maxLlmCallsPerHour: 999,
      cadenceSeconds: 60,
    });
    expect(v.effective).toEqual({
      maxLlmCallsPerHour: 4,
      cadenceSeconds: 3600,
    });
  });
});
