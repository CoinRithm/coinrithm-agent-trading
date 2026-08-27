import { describe, expect, it } from "vitest";
import type { AgentRow } from "./db.js";
import type { Config } from "./config.js";
import { shouldUseHostedRouter } from "./runtime.js";

const agent = {
  id: 1,
  modelProvider: "nvidia",
  brainKeyEnc: null,
} as AgentRow;

describe("hosted router boundary", () => {
  it("routes only shared hosted NVIDIA agents", () => {
    const config = { routerEnabled: true } as Config;
    expect(shouldUseHostedRouter(agent, config)).toBe(true);
    expect(
      shouldUseHostedRouter({ ...agent, brainKeyEnc: "owner-key" }, config),
    ).toBe(false);
    expect(
      shouldUseHostedRouter({ ...agent, modelProvider: "openai" }, config),
    ).toBe(false);
    expect(
      shouldUseHostedRouter(agent, { routerEnabled: false } as Config),
    ).toBe(false);
  });
});
