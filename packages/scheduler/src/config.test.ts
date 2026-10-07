import { describe, expect, it } from "vitest";
import { loadConfig } from "./config.js";

const baseEnv = (): NodeJS.ProcessEnv => ({
  DATABASE_URL: "postgres://test:test@localhost/test",
  ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64"),
});

describe("customer Super JSON-content enrollment", () => {
  const pair = { ownerUserId: 19, agentId: 42 };
  const setting = "SCHEDULER_CUSTOMER_SUPER_JSON_CONTENT_ALLOWLIST";
  it("defaults to disabled, no expiry and no enrolled identities", () => {
    expect(loadConfig(baseEnv())).toMatchObject({
      customerSuperJsonContentEnabled: false,
      customerSuperJsonContentUntilMs: undefined,
      customerSuperJsonContentAllowlist: [],
    });
  });
  it("keeps the BYO extension off unless its own switch is set", () => {
    expect(loadConfig(baseEnv()).customerByoSuperJsonContentEnabled).toBe(
      false,
    );
    expect(
      loadConfig({
        ...baseEnv(),
        SCHEDULER_CUSTOMER_SUPER_JSON_CONTENT_ENABLED: "true",
        SCHEDULER_CUSTOMER_SUPER_JSON_CONTENT_UNTIL: "2026-10-06T12:00:00Z",
        [setting]: JSON.stringify([pair]),
      }).customerByoSuperJsonContentEnabled,
    ).toBe(false);
    expect(
      loadConfig({
        ...baseEnv(),
        SCHEDULER_CUSTOMER_SUPER_JSON_CONTENT_BYO_ENABLED: "true",
      }).customerByoSuperJsonContentEnabled,
    ).toBe(true);
    expect(
      loadConfig({
        ...baseEnv(),
        SCHEDULER_CUSTOMER_SUPER_JSON_CONTENT_BYO_ENABLED: "false",
      }).customerByoSuperJsonContentEnabled,
    ).toBe(false);
  });
  it("turns the Super-fallback content transport on by default with an explicit rollback", () => {
    expect(loadConfig(baseEnv()).superFallbackJsonContentEnabled).toBe(true);
    expect(
      loadConfig({
        ...baseEnv(),
        SCHEDULER_SUPER_FALLBACK_JSON_CONTENT_ENABLED: "false",
      }).superFallbackJsonContentEnabled,
    ).toBe(false);
    expect(() =>
      loadConfig({
        ...baseEnv(),
        SCHEDULER_SUPER_FALLBACK_JSON_CONTENT_ENABLED: "maybe",
      }),
    ).toThrow();
  });
  it("reads exact numeric pairs independently of the house flag", () => {
    const config = loadConfig({
      ...baseEnv(),
      SCHEDULER_CUSTOMER_SUPER_JSON_CONTENT_ENABLED: "true",
      SCHEDULER_CUSTOMER_SUPER_JSON_CONTENT_UNTIL: "2026-10-06T12:00:00Z",
      [setting]: JSON.stringify([pair, { ownerUserId: 19, agentId: 43 }]),
    });
    expect(config.customerSuperJsonContentEnabled).toBe(true);
    expect(config.customerSuperJsonContentUntilMs).toBe(
      Date.UTC(2026, 9, 6, 12),
    );
    expect(config.customerSuperJsonContentAllowlist).toEqual([
      pair,
      { ownerUserId: 19, agentId: 43 },
    ]);
    expect(config.houseSuperJsonContentEnabled).toBe(false);
    expect(
      loadConfig({
        ...baseEnv(),
        SCHEDULER_HOUSE_SUPER_JSON_CONTENT_ENABLED: "true",
      }).customerSuperJsonContentEnabled,
    ).toBe(false);
  });
  it.each([
    "",
    "*",
    "19:42",
    "{}",
    "null",
    "true",
    "[null]",
    "[[]]",
    "[42]",
    '[{"ownerUserId":19,"agentId":42.0000000000000000001}]',
    '[{"ownerUserId":19,"agentId":9007199254740991.1}]',
    '[{"ownerUserId":19,"agentId":4.2e1}]',
    '[{"ownerUserId":19,"agentId":42,"agentId":43}]',
    '[{"ownerUserId":18,"ownerUserId":19,"agentId":42}]',
    JSON.stringify([{ ...pair, agentId: "42" }]),
    JSON.stringify([{ ...pair, ownerUserId: "19" }]),
    JSON.stringify([{ ...pair, agentId: 42.5 }]),
    JSON.stringify([{ ...pair, ownerUserId: 0 }]),
    JSON.stringify([{ ...pair, agentId: -1 }]),
    JSON.stringify([{ ...pair, agentId: Number.MAX_SAFE_INTEGER + 1 }]),
    JSON.stringify([{ ...pair, ownerUserId: Number.MAX_SAFE_INTEGER + 1 }]),
    JSON.stringify([{ ...pair, agentId: true }]),
    JSON.stringify([{ agentId: 42 }]),
    JSON.stringify([{ ...pair, extra: true }]),
    JSON.stringify([pair, { ownerUserId: 19 }]),
    JSON.stringify([pair, pair]),
    JSON.stringify(
      Array.from({ length: 17 }, (_, n) => ({
        ownerUserId: 19,
        agentId: n + 1,
      })),
    ),
    " ".repeat(4097),
  ])("enrolls nobody for a malformed or oversized list: %j", (raw) => {
    expect(
      loadConfig({ ...baseEnv(), [setting]: raw })
        .customerSuperJsonContentAllowlist,
    ).toEqual([]);
  });
  it.each([
    undefined,
    "",
    "tomorrow",
    "2026-10-06T12:00:00",
    "2026-10-06T12:00:00+01:00",
    "2026-02-30T00:00:00Z",
  ])("does not invent a customer expiry for %j", (raw) => {
    expect(
      loadConfig({
        ...baseEnv(),
        SCHEDULER_CUSTOMER_SUPER_JSON_CONTENT_UNTIL: raw,
      }).customerSuperJsonContentUntilMs,
    ).toBeUndefined();
  });
  it("supports disabling a populated gate without changing its identities", () => {
    const config = loadConfig({
      ...baseEnv(),
      [setting]: JSON.stringify([pair]),
      SCHEDULER_CUSTOMER_SUPER_JSON_CONTENT_ENABLED: "false",
    });
    expect(config.customerSuperJsonContentEnabled).toBe(false);
    expect(config.customerSuperJsonContentAllowlist).toEqual([pair]);
  });
  it("accepts either field order and the documented sixteen-pair boundary", () => {
    expect(
      loadConfig({
        ...baseEnv(),
        [setting]: '[ { "agentId": 42, "ownerUserId": 19 } ]',
      }).customerSuperJsonContentAllowlist,
    ).toEqual([pair]);
    const pairs = Array.from({ length: 16 }, (_, n) => ({
      ownerUserId: 19,
      agentId: n + 1,
    }));
    expect(
      loadConfig({ ...baseEnv(), [setting]: JSON.stringify(pairs) })
        .customerSuperJsonContentAllowlist,
    ).toEqual(pairs);
  });
});

describe("paid brain config", () => {
  it("defaults the margin to 20 percent and leaves both platform keys unset", () => {
    const config = loadConfig(baseEnv());
    expect(config.paidBrainMarginPct).toBe(20);
    expect(config.paidAnthropicApiKey).toBeUndefined();
    expect(config.paidGeminiApiKey).toBeUndefined();
  });
  it("reads an explicit margin and trimmed platform keys", () => {
    const config = loadConfig({
      ...baseEnv(),
      PAID_BRAIN_MARGIN_PCT: "35",
      PAID_ANTHROPIC_API_KEY: " fixture-anthropic ",
      PAID_GEMINI_API_KEY: " fixture-gemini ",
    });
    expect(config.paidBrainMarginPct).toBe(35);
    expect(config.paidAnthropicApiKey).toBe("fixture-anthropic");
    expect(config.paidGeminiApiKey).toBe("fixture-gemini");
    expect(
      loadConfig({ ...baseEnv(), PAID_BRAIN_MARGIN_PCT: "0" })
        .paidBrainMarginPct,
    ).toBe(0);
  });
  it.each(["-5", "NaN", "Infinity", "abc"])(
    "falls back to the default margin for %s, never to zero",
    (value) => {
      expect(
        loadConfig({ ...baseEnv(), PAID_BRAIN_MARGIN_PCT: value })
          .paidBrainMarginPct,
      ).toBe(20);
    },
  );
  it.each(["", "   "])("treats a blank platform key %j as unset", (value) => {
    const config = loadConfig({
      ...baseEnv(),
      PAID_ANTHROPIC_API_KEY: value,
      PAID_GEMINI_API_KEY: value,
    });
    expect(config.paidAnthropicApiKey).toBeUndefined();
    expect(config.paidGeminiApiKey).toBeUndefined();
  });
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
  it("keeps the house Super JSON-content transport opt-in with a rollback", () => {
    expect(loadConfig(baseEnv()).houseSuperJsonContentEnabled).toBe(false);
    expect(
      loadConfig({
        ...baseEnv(),
        SCHEDULER_HOUSE_SUPER_JSON_CONTENT_ENABLED: "true",
      }).houseSuperJsonContentEnabled,
    ).toBe(true);
    expect(
      loadConfig({
        ...baseEnv(),
        SCHEDULER_HOUSE_SUPER_JSON_CONTENT_ENABLED: "false",
      }).houseSuperJsonContentEnabled,
    ).toBe(false);
  });
  it.each([
    [undefined, undefined],
    ["", undefined],
    ["tomorrow", undefined],
    ["2026-10-05 21:00:00", undefined],
    ["2026-10-05T21:00:00", undefined],
    ["2026-10-05T21:00:00+01:00", undefined],
    ["2026-02-30T00:00:00Z", undefined],
    ["2026-10-05T21:00:00Z", Date.UTC(2026, 9, 5, 21, 0, 0)],
    ["2026-10-05T21:00:00.250Z", Date.UTC(2026, 9, 5, 21, 0, 0, 250)],
  ])(
    "reads the house Super trial expiry %j as an absolute UTC instant only",
    (raw, expected) => {
      const env = baseEnv();
      if (raw !== undefined) env.SCHEDULER_HOUSE_SUPER_JSON_CONTENT_UNTIL = raw;
      expect(loadConfig(env).houseSuperJsonContentUntilMs).toBe(expected);
    },
  );
  it("keeps prompt compaction opt-in with an explicit rollback", () => {
    expect(loadConfig(baseEnv()).compactPromptTablesEnabled).toBe(false);
    expect(
      loadConfig({
        ...baseEnv(),
        SCHEDULER_COMPACT_PROMPT_TABLES_ENABLED: "true",
      }).compactPromptTablesEnabled,
    ).toBe(true);
    expect(
      loadConfig({
        ...baseEnv(),
        SCHEDULER_COMPACT_PROMPT_TABLES_ENABLED: "false",
      }).compactPromptTablesEnabled,
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
