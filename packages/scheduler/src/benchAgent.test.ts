import { describe, expect, it } from "vitest";
import type { Config } from "./config.js";
import { NEMOTRON_LIGHTNING, NEMOTRON_SUPER } from "./route.js";
import { BENCH_MODELS, benchAgentRow, benchKeyRef } from "./runtime.js";

// The operator bench compares only the approved NVIDIA pair and must report
// the exact key bucket its calls use (root 57088).
describe("bench agent row", () => {
  it("accepts only the approved Super / Lightning pair", () => {
    expect(BENCH_MODELS).toEqual([NEMOTRON_SUPER, NEMOTRON_LIGHTNING]);
    for (const model of BENCH_MODELS) {
      expect(benchAgentRow(model)).toMatchObject({
        id: 0,
        modelProvider: "nvidia",
        modelName: model,
        modelBaseUrl: null,
        spec: { pinnedModel: true },
        capacityTenant: "bench",
        isHouse: false,
        ownerUserId: null,
      });
    }
    for (const model of ["", "openai/gpt-4o", "nvidia/nemotron-nano-9b-v2"])
      expect(() => benchAgentRow(model)).toThrow(/bench model must be one of/);
  });

  it("names the key bucket the bench actually selects", () => {
    expect(
      benchKeyRef({ nvidiaApiKeys: ["a", "b"] } as unknown as Config),
    ).toBe("nvidia:shared:0");
    expect(() =>
      benchKeyRef({ nvidiaApiKeys: [] } as unknown as Config),
    ).toThrow(/no shared NVIDIA key/);
  });
});
