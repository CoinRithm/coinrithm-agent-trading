import { describe, expect, it } from "vitest";
import { loadConfig } from "./config.js";

const baseEnv = (): NodeJS.ProcessEnv => ({
  DATABASE_URL: "postgres://test:test@localhost/test",
  ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64"),
});

describe("provider capacity config", () => {
  it("enables durable routing with rollback flags and conservative shared limits", () => {
    const config = loadConfig(baseEnv());
    expect(config.capacityEnabled).toBe(true);
    expect(config.routerEnabled).toBe(true);
    expect(config.nvidiaRpm).toBe(15);
    expect(config.nvidiaTpm).toBe(100_000);
    expect(config.nvidiaMaxConcurrent).toBe(4);
    expect(config.capacityLeaseTtlSeconds).toBe(360);
    expect(config.openAiBackupEligible).toBe(false);
    expect(config.openAiBackupKey).toBeUndefined();
    expect(config.openAiRpm).toBe(30);
  });

  it("accepts a canary contract and rejects an ambiguous flag", () => {
    const config = loadConfig({
      ...baseEnv(),
      SCHEDULER_CAPACITY_ENABLED: "true",
      SCHEDULER_ROUTER_ENABLED: "false",
      SCHEDULER_NVIDIA_TPM: "175000",
      SCHEDULER_NVIDIA_MAX_CONCURRENT: "7",
      SCHEDULER_CAPACITY_LEASE_TTL_SECONDS: "420",
    });
    expect(config.capacityEnabled).toBe(true);
    expect(config.routerEnabled).toBe(false);
    expect(config.nvidiaTpm).toBe(175_000);
    expect(config.nvidiaMaxConcurrent).toBe(7);
    expect(config.capacityLeaseTtlSeconds).toBe(420);

    expect(() =>
      loadConfig({ ...baseEnv(), SCHEDULER_CAPACITY_ENABLED: "perhaps" }),
    ).toThrow("SCHEDULER_CAPACITY_ENABLED must be true or false");
  });
});
