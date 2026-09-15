import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Pool } from "pg";
import * as engine from "@coinrithm/mcp-trading/dist/agent/engine.js";
import { parseSkill } from "@coinrithm/mcp-trading/dist/agent/skill.js";
import { renderFolderOfOne } from "@coinrithm/mcp-trading/dist/agent/templates.js";
import * as db from "./db.js";
import * as capacity from "./capacity.js";
import { loadConfig } from "./config.js";
import { encrypt } from "./crypto.js";
import { runAgentOnce } from "./runtime.js";
import { NEMOTRON_NANO } from "./route.js";

const key = Buffer.alloc(32, 9);
const pool = {} as Pool;
const input = {
  system: "fixture system",
  user: "fixture user",
  timeoutMs: 1000,
};
const good = {
  ok: true as const,
  text: '{"decision":"skip","actions":[]}',
  usage: { promptTokens: 7, completionTokens: 3 },
};

function fixture() {
  const config = loadConfig({
    DATABASE_URL: "postgresql://localhost/unused",
    ENCRYPTION_KEY: key.toString("hex"),
    NVIDIA_API_KEY: "fixture-nvidia",
    SCHEDULER_OPENAI_BACKUP_KEY: "fixture-openai",
  });
  config.encryptionKey = key;
  config.openAiBackupKey = "fixture-openai";
  config.openAiBackupEligible = true;
  const agent: db.AgentRow = {
    id: 42,
    handle: "fixture",
    displayName: "Fixture",
    live: false,
    cadenceSeconds: 600,
    modelProvider: "nvidia",
    modelName: NEMOTRON_NANO,
    modelBaseUrl: null,
    spec: parseSkill(renderFolderOfOne("fixture", "conservative")).spec,
    prose: "fixture",
    coinrithmKeyEnc: encrypt("fixture-account", key),
    brainKeyEnc: null,
  };
  return { agent, config };
}

describe("hosted provider lifecycle", () => {
  let decide: ReturnType<typeof vi.fn>;
  let result: Awaited<ReturnType<engine.Provider["decide"]>>;

  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => {
        throw new Error("network forbidden");
      }),
    );
    vi.spyOn(db, "loadStateJson").mockResolvedValue(undefined);
    vi.spyOn(db, "persistCycleResult").mockResolvedValue(undefined);
    vi.spyOn(db, "recordCycle").mockResolvedValue(undefined);
    vi.spyOn(db, "disableAgent").mockResolvedValue(undefined);
    vi.spyOn(db, "rescheduleToCadence").mockResolvedValue(undefined);
    vi.spyOn(db, "isProviderRouteAvailable").mockResolvedValue(true);
    vi.spyOn(db, "clearProviderCircuit").mockResolvedValue(undefined);
    vi.spyOn(db, "recordProviderStrike").mockResolvedValue(undefined);
    vi.spyOn(capacity, "isProviderRouteCoolingDown").mockResolvedValue(false);
    vi.spyOn(capacity, "reserveProviderCapacity").mockResolvedValue({
      ok: true,
      lease: {
        leaseId: "fixture-lease",
        routeKey: "nvidia:shared:0",
        reservedTokens: 1024,
      },
    });
    vi.spyOn(capacity, "releaseProviderCapacity").mockResolvedValue(undefined);
    vi.spyOn(capacity, "coolDownProviderCapacity").mockResolvedValue(undefined);
    decide = vi.fn().mockResolvedValue(good);
    vi.spyOn(engine, "providerForRoute").mockImplementation(() => ({
      label: "fixture",
      decide,
    }));
    vi.spyOn(engine, "selectProvider").mockImplementation(() => ({
      label: "fixture",
      decide,
    }));
    vi.spyOn(engine, "runCycle").mockImplementation(async (deps) => {
      result = await deps.provider.decide(input);
      return {
        decision: "skip",
        planned: [],
        executed: [],
        disabled: false,
        modelFailed: !result.ok,
      };
    });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("reserves estimated tokens and releases actual usage after a valid decision", async () => {
    const { agent, config } = fixture();
    await runAgentOnce(pool, agent, config);
    expect(result.ok).toBe(true);
    expect(capacity.reserveProviderCapacity).toHaveBeenCalledWith(
      pool,
      expect.objectContaining({
        routeKey: "nvidia:shared:0",
        model: NEMOTRON_NANO,
        reserveTokens: 1031,
        requestsPerMinute: config.nvidiaRpm,
      }),
    );
    expect(capacity.releaseProviderCapacity).toHaveBeenCalledWith(
      pool,
      expect.any(Object),
      10,
    );
    expect(db.clearProviderCircuit).toHaveBeenCalledWith(
      pool,
      "nvidia",
      NEMOTRON_NANO,
    );
    expect(db.persistCycleResult).toHaveBeenCalledWith(
      pool,
      agent.id,
      expect.objectContaining({ model: undefined, providerHold: undefined }),
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it("uses the independent backup after a transient fault and redacts both credentials", async () => {
    decide.mockResolvedValueOnce({
      ok: false,
      status: 503,
      error: "fixture-nvidia fixture-openai unavailable",
    });
    const { agent, config } = fixture();
    await runAgentOnce(pool, agent, config);
    expect(result).toMatchObject({
      ok: true,
      route: {
        effectiveProvider: "openai",
        attempts: [{ error: "*** *** unavailable" }, { outcome: "success" }],
      },
    });
    expect(engine.providerForRoute).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ provider: "openai" }),
      "fixture-openai",
      fetch,
    );
    expect(capacity.reserveProviderCapacity).toHaveBeenLastCalledWith(
      pool,
      expect.objectContaining({
        requestsPerMinute: config.openAiRpm,
        tokensPerMinute: config.openAiTpm,
        maxConcurrent: config.openAiMaxConcurrent,
      }),
    );
    expect(db.recordProviderStrike).toHaveBeenCalledWith(
      pool,
      "nvidia",
      NEMOTRON_NANO,
      "*** *** unavailable",
      1,
    );
    expect(capacity.releaseProviderCapacity).toHaveBeenNthCalledWith(
      1,
      pool,
      expect.any(Object),
      undefined,
    );
  });

  it.each([undefined, 2500])(
    "records model-specific capacity cooldown with delay %s",
    async (retryAfterMs) => {
      decide.mockResolvedValueOnce({
        ok: false,
        status: 429,
        error: "rate limit",
        retryAfterMs,
      });
      const { agent, config } = fixture();
      await runAgentOnce(pool, agent, config);
      expect(capacity.coolDownProviderCapacity).toHaveBeenCalledWith(
        pool,
        "nvidia:shared:0",
        "nvidia",
        NEMOTRON_NANO,
        retryAfterMs ?? 60000,
        "rate_limit",
      );
      expect(db.recordProviderStrike).not.toHaveBeenCalled();
      expect(result.ok).toBe(true);
    },
  );

  it("records permanent faults with three strikes", async () => {
    decide.mockResolvedValueOnce({
      ok: false,
      status: 404,
      error: "model missing",
    });
    const { agent, config } = fixture();
    await runAgentOnce(pool, agent, config);
    expect(db.recordProviderStrike).toHaveBeenCalledWith(
      pool,
      "nvidia",
      NEMOTRON_NANO,
      "model missing",
      3,
    );
  });

  it("keeps valid decisions when lease release and circuit bookkeeping fail", async () => {
    vi.mocked(capacity.releaseProviderCapacity).mockRejectedValue(
      new Error("lease store unavailable"),
    );
    vi.mocked(db.clearProviderCircuit).mockRejectedValue(
      "circuit store unavailable",
    );
    const { agent, config } = fixture();
    await runAgentOnce(pool, agent, config);
    expect(result.ok).toBe(true);
    expect(db.persistCycleResult).toHaveBeenCalledWith(
      pool,
      agent.id,
      expect.objectContaining({
        cycle: expect.objectContaining({
          log: expect.stringContaining(
            "capacity release: lease store unavailable\nroute observe: circuit store unavailable",
          ),
        }),
      }),
    );
  });

  it("does not invent usage when a successful provider omits it", async () => {
    decide.mockResolvedValue({ ok: true, text: good.text });
    const { agent, config } = fixture();
    await runAgentOnce(pool, agent, config);
    expect(capacity.releaseProviderCapacity).toHaveBeenCalledWith(
      pool,
      expect.any(Object),
      undefined,
    );
  });

  it("the legacy rollback flag does not create or release durable leases", async () => {
    const { agent, config } = fixture();
    config.capacityEnabled = false;
    await runAgentOnce(pool, agent, config);
    expect(result.ok).toBe(true);
    expect(capacity.reserveProviderCapacity).not.toHaveBeenCalled();
    expect(capacity.releaseProviderCapacity).not.toHaveBeenCalled();
  });

  it("avoids provider calls for open circuits", async () => {
    vi.mocked(db.isProviderRouteAvailable).mockResolvedValue(false);
    const { agent, config } = fixture();
    await runAgentOnce(pool, agent, config);
    expect(result).toMatchObject({ ok: false, deferred: true });
    expect(decide).not.toHaveBeenCalled();
    expect(capacity.reserveProviderCapacity).not.toHaveBeenCalled();
  });

  it.each(["nvidia", "anthropic", "openai", "groq", "compatible"])(
    "keeps %s BYO credentials isolated from shared routes",
    async (provider) => {
      const { agent, config } = fixture();
      agent.modelProvider = provider;
      agent.brainKeyEnc = encrypt("fixture-byo", key);
      config.internalWriteToken = "fixture-internal";
      await runAgentOnce(pool, agent, config);
      expect(engine.providerForRoute).not.toHaveBeenCalled();
      expect(engine.selectProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          model: expect.objectContaining({ provider }),
        }),
        {
          [{
            nvidia: "NVIDIA_API_KEY",
            anthropic: "ANTHROPIC_API_KEY",
            openai: "OPENAI_API_KEY",
            groq: "GROQ_API_KEY",
            compatible: "MODEL_API_KEY",
          }[provider]!]: "fixture-byo",
        },
        fetch,
      );
      expect(db.persistCycleResult).toHaveBeenCalledWith(
        pool,
        agent.id,
        expect.objectContaining({ model: undefined, providerHold: undefined }),
      );
    },
  );

  it.each(["load", "platform", "owner", "run"])(
    "contains %s failures even when error persistence fails",
    async (stage) => {
      const { agent, config } = fixture();
      vi.mocked(db.recordCycle).mockRejectedValue(
        new Error("audit unavailable"),
      );
      vi.mocked(db.disableAgent).mockRejectedValue(
        new Error("disable unavailable"),
      );
      vi.mocked(db.rescheduleToCadence).mockRejectedValue(
        new Error("schedule unavailable"),
      );
      if (stage === "load")
        vi.mocked(db.loadStateJson).mockRejectedValue("read unavailable");
      if (stage === "platform") config.nvidiaApiKeys = [];
      if (stage === "owner") agent.coinrithmKeyEnc = "corrupt";
      if (stage === "run")
        vi.mocked(engine.runCycle).mockRejectedValue("runner unavailable");
      await expect(runAgentOnce(pool, agent, config)).resolves.toBeUndefined();
      expect(db.recordCycle).toHaveBeenCalledOnce();
      if (stage === "platform") expect(db.disableAgent).not.toHaveBeenCalled();
      if (stage === "owner") expect(db.disableAgent).toHaveBeenCalledOnce();
      expect(db.persistCycleResult).not.toHaveBeenCalled();
    },
  );
});
