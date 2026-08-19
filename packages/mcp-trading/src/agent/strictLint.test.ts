import { describe, it, expect } from "vitest";
import { strictLint } from "./strictLint.js";

describe("triggerPolicy reachability (audit rank 10)", () => {
  it("accepts a root triggerPolicy block with its known keys", () => {
    const issues = strictLint({
      spec: "coinrithm.agent.v1",
      name: "t",
      description: "d",
      trigger: { cadence: "1h" },
      model: { provider: "anthropic", name: "m" },
      venues: ["futures"],
      risk: {
        maxLeverage: 2,
        perTradeMarginMusd: 100,
        maxConcurrentPositions: 2,
        requireStopLoss: true,
        watchlist: ["BTC"],
      },
      // Load-bearing since OKF v2 — used to lint as unknown_key, making the
      // knob unreachable from bundles.
      triggerPolicy: {
        mode: "always",
        skipLlmWhenNoTrigger: false,
        maxLlmCallsPerHour: 30,
      },
    });
    expect(issues.filter((i) => i.code === "unknown_key")).toEqual([]);
  });

  it("still flags an unknown key INSIDE triggerPolicy", () => {
    const issues = strictLint({
      spec: "coinrithm.agent.v1",
      name: "t",
      description: "d",
      trigger: { cadence: "1h" },
      model: { provider: "anthropic", name: "m" },
      venues: ["futures"],
      risk: {
        maxLeverage: 2,
        perTradeMarginMusd: 100,
        maxConcurrentPositions: 2,
        requireStopLoss: true,
        watchlist: ["BTC"],
      },
      triggerPolicy: { mode: "always", tirggerTypo: true },
    });
    expect(issues.some((i) => i.code === "unknown_key")).toBe(true);
  });
});
