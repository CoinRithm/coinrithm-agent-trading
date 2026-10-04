import { describe, expect, it } from "vitest";
import { loadConfig } from "./config.js";

const baseEnv = (): NodeJS.ProcessEnv => ({
  DATABASE_URL: "postgres://test:test@localhost/test",
  ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64"),
});

describe("provider capacity config", () => {
  it("requires opt-in for Lightning and supports rollback", () => {
    expect(loadConfig(baseEnv()).lightningFallbackEnabled).toBe(false);
    expect(
      loadConfig({ ...baseEnv(), SCHEDULER_LIGHTNING_FALLBACK_ENABLED: "true" })
        .lightningFallbackEnabled,
    ).toBe(true);
    expect(
      loadConfig({
        ...baseEnv(),
        SCHEDULER_LIGHTNING_FALLBACK_ENABLED: "false",
      }).lightningFallbackEnabled,
    ).toBe(false);
  });
  it("keeps shared owner policy opt-in with explicit rollback and validated limits", () => {
    expect(loadConfig(baseEnv())).toMatchObject({
      sharedPoolPolicyEnabled: false,
      sharedOwnerTpm: 25000,
      sharedMinModelIntervalSeconds: 180,
    });
    expect(
      loadConfig({
        ...baseEnv(),
        SCHEDULER_SHARED_POOL_POLICY_ENABLED: "true",
        SCHEDULER_SHARED_OWNER_TPM: "30000",
        SCHEDULER_SHARED_MIN_MODEL_INTERVAL_SECONDS: "240",
      }),
    ).toMatchObject({
      sharedPoolPolicyEnabled: true,
      sharedOwnerTpm: 30000,
      sharedMinModelIntervalSeconds: 240,
    });
    expect(
      loadConfig({
        ...baseEnv(),
        SCHEDULER_SHARED_POOL_POLICY_ENABLED: "false",
        SCHEDULER_SHARED_OWNER_TPM: "0",
        SCHEDULER_SHARED_MIN_MODEL_INTERVAL_SECONDS: "NaN",
      }),
    ).toMatchObject({
      sharedPoolPolicyEnabled: false,
      sharedOwnerTpm: 25000,
      sharedMinModelIntervalSeconds: 180,
    });
    expect(() =>
      loadConfig({
        ...baseEnv(),
        SCHEDULER_SHARED_POOL_POLICY_ENABLED: "maybe",
      }),
    ).toThrow("SCHEDULER_SHARED_POOL_POLICY_ENABLED must be true or false");
  });

  it.each([undefined, "", "  "])(
    "rejects an absent database URL (%s)",
    (value) => {
      expect(() => loadConfig({ ...baseEnv(), DATABASE_URL: value })).toThrow(
        "missing required env DATABASE_URL",
      );
    },
  );

  it("normalizes key pools, private endpoints, optional secrets and integer settings", () => {
    const cfg = loadConfig({
      ...baseEnv(),
      NVIDIA_API_KEYS: " a, b,a, , ",
      NVIDIA_API_KEY: "ignored",
      COINRITHM_API_URL: " http://api:4000 ",
      GROQ_API_KEY: " fixture-groq ",
      COINRITHM_INTERNAL_WRITE_TOKEN: " fixture-internal ",
      COINRITHM_OPENAI_BACKUP_KEY: " fixture-backup ",
      HEALTH_PORT: "9000",
      SCHEDULER_POLL_MS: "500.9",
    });
    expect(cfg.nvidiaApiKeys).toEqual(["a", "b"]);
    expect(cfg.coinrithmApiUrl).toBe("http://api:4000");
    expect(cfg.groqApiKey).toBe("fixture-groq");
    expect(cfg.internalWriteToken).toBe("fixture-internal");
    expect(cfg.openAiBackupKey).toBe("fixture-backup");
    expect(cfg.openAiBackupEligible).toBe(false);
    expect(cfg.healthPort).toBe(9000);
    expect(cfg.pollIntervalMs).toBe(500);
    expect(
      loadConfig({ ...baseEnv(), NVIDIA_API_KEY: " single " }).nvidiaApiKeys,
    ).toEqual(["single"]);
  });

  it.each(["NaN", "Infinity", "0", "249"])(
    "falls back for invalid poll interval %s",
    (value) => {
      expect(
        loadConfig({ ...baseEnv(), SCHEDULER_POLL_MS: value }).pollIntervalMs,
      ).toBe(5000);
    },
  );

  it("rejects a malformed explicit API URL", () => {
    expect(() =>
      loadConfig({ ...baseEnv(), COINRITHM_API_URL: "not a url" }),
    ).toThrow("COINRITHM_API_URL is not a valid URL");
  });
  it("enables durable routing with rollback flags and conservative shared limits", () => {
    const config = loadConfig(baseEnv());
    expect(config.capacityEnabled).toBe(true);
    expect(config.adaptiveCooldownEnabled).toBe(true);
    expect(
      loadConfig({ ...baseEnv(), SCHEDULER_ADAPTIVE_COOLDOWN_ENABLED: "false" })
        .adaptiveCooldownEnabled,
    ).toBe(false);
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
