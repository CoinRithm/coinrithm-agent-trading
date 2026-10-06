import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Pool } from "pg";
import * as engine from "@coinrithm/mcp-trading/engine";
import { parseSkill } from "@coinrithm/mcp-trading/dist/agent/skill.js";
import { renderFolderOfOne } from "@coinrithm/mcp-trading/dist/agent/templates.js";
import * as db from "./db.js";
import * as capacity from "./capacity.js";
import { loadConfig } from "./config.js";
import { encrypt } from "./crypto.js";
import {
  runAgentOnce,
  usesHouseSuperJsonContent,
  usesCustomerSuperJsonContent,
  usesCustomerByoSuperJsonContent,
} from "./runtime.js";
import { NEMOTRON_NANO, NEMOTRON_LIGHTNING, NEMOTRON_SUPER } from "./route.js";

const key = Buffer.alloc(32, 9);
const FUTURE = Date.now() + 3_600_000;
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

function customerFixture() {
  const { agent, config } = fixture();
  agent.isHouse = false;
  agent.ownerUserId = 19;
  agent.modelName = NEMOTRON_SUPER;
  config.customerSuperJsonContentEnabled = true;
  config.customerSuperJsonContentUntilMs = FUTURE;
  config.customerSuperJsonContentAllowlist = [{ ownerUserId: 19, agentId: 42 }];
  return { agent, config };
}

describe("customer content eligibility", () => {
  const route = {
    provider: "nvidia" as const,
    model: NEMOTRON_SUPER,
    keyRef: "nvidia:shared:0",
  };
  it("requires the exact owner AND agent, not their siblings or previous owner", () => {
    const { agent, config } = customerFixture();
    expect(usesCustomerSuperJsonContent(agent, config, route, FUTURE - 1)).toBe(
      true,
    );
    for (const changes of [
      { id: 43 },
      { ownerUserId: 20 },
      { ownerUserId: undefined },
      { ownerUserId: null },
      { ownerUserId: NaN },
      { id: NaN },
    ]) {
      expect(
        usesCustomerSuperJsonContent(
          { ...agent, ...changes },
          config,
          route,
          FUTURE - 1,
        ),
      ).toBe(false);
    }
  });
  it("fails closed at expiry, on nonfinite clocks and without a finite expiry", () => {
    const { agent, config } = customerFixture();
    for (const now of [FUTURE, FUTURE + 1, NaN, Infinity, -Infinity]) {
      expect(usesCustomerSuperJsonContent(agent, config, route, now)).toBe(
        false,
      );
    }
    for (const until of [undefined, NaN, Infinity, FUTURE - 2]) {
      expect(
        usesCustomerSuperJsonContent(
          agent,
          { ...config, customerSuperJsonContentUntilMs: until },
          route,
          FUTURE - 1,
        ),
      ).toBe(false);
    }
  });
  it("excludes BYO, unknown classification, other primaries and unexpected endpoints", () => {
    const { agent, config } = customerFixture();
    for (const changes of [
      { isHouse: true },
      { isHouse: undefined },
      { brainKeyEnc: "fixture-byo" },
      { brainKeyEnc: "" },
      { modelProvider: "openai-compatible" },
      { modelName: NEMOTRON_NANO },
      { modelName: NEMOTRON_LIGHTNING },
      { modelBaseUrl: "https://custom.example/v1" },
      { modelBaseUrl: "" },
    ]) {
      expect(
        usesCustomerSuperJsonContent(
          { ...agent, ...changes },
          config,
          route,
          FUTURE - 1,
        ),
      ).toBe(false);
    }
    for (const changes of [
      { provider: "openai" as const },
      { model: NEMOTRON_NANO },
      { model: NEMOTRON_LIGHTNING },
      { baseUrl: "https://custom.example/v1" },
    ]) {
      expect(
        usesCustomerSuperJsonContent(
          agent,
          config,
          { ...route, ...changes },
          FUTURE - 1,
        ),
      ).toBe(false);
    }
    const endpoint = "https://integrate.api.nvidia.com/v1";
    expect(
      usesCustomerSuperJsonContent(
        { ...agent, modelBaseUrl: endpoint },
        config,
        { ...route, baseUrl: endpoint },
        FUTURE - 1,
      ),
    ).toBe(true);
    for (const changes of [
      { routerEnabled: false },
      { customerSuperJsonContentEnabled: false },
      { customerSuperJsonContentAllowlist: [] },
    ]) {
      expect(
        usesCustomerSuperJsonContent(
          agent,
          { ...config, ...changes },
          route,
          FUTURE - 1,
        ),
      ).toBe(false);
    }
  });
});

function byoFixture() {
  const { agent, config } = customerFixture();
  agent.brainKeyEnc = encrypt("fixture-byo", key);
  config.customerByoSuperJsonContentEnabled = true;
  return { agent, config };
}

describe("customer BYO content eligibility", () => {
  it("admits only an enrolled NVIDIA Super BYO pair on the official endpoint", () => {
    const { agent, config } = byoFixture();
    expect(usesCustomerByoSuperJsonContent(agent, config, FUTURE - 1)).toBe(
      true,
    );
    expect(
      usesCustomerByoSuperJsonContent(
        { ...agent, modelBaseUrl: "https://integrate.api.nvidia.com/v1" },
        config,
        FUTURE - 1,
      ),
    ).toBe(true);
  });
  it("needs its own BYO switch on top of every customer trial setting", () => {
    const { agent, config } = byoFixture();
    for (const changes of [
      { customerByoSuperJsonContentEnabled: false },
      { customerSuperJsonContentEnabled: false },
      { customerSuperJsonContentAllowlist: [] },
      { customerSuperJsonContentUntilMs: undefined },
    ]) {
      expect(
        usesCustomerByoSuperJsonContent(
          agent,
          { ...config, ...changes },
          FUTURE - 1,
        ),
      ).toBe(false);
    }
  });
  it("fails closed at expiry and on nonfinite clocks", () => {
    const { agent, config } = byoFixture();
    for (const now of [FUTURE, FUTURE + 1, NaN, Infinity]) {
      expect(usesCustomerByoSuperJsonContent(agent, config, now)).toBe(false);
    }
    expect(
      usesCustomerByoSuperJsonContent(
        agent,
        { ...config, customerSuperJsonContentUntilMs: NaN },
        FUTURE - 1,
      ),
    ).toBe(false);
  });
  it("excludes unlisted pairs, hosted/house agents, other providers, models and custom endpoints", () => {
    const { agent, config } = byoFixture();
    for (const changes of [
      { id: 43 },
      { ownerUserId: 20 },
      { ownerUserId: undefined },
      { brainKeyEnc: null },
      { brainKeyEnc: "" },
      { isHouse: true },
      { isHouse: undefined },
      { modelProvider: "groq" },
      { modelProvider: "openai-compatible" },
      { modelName: NEMOTRON_NANO },
      { modelName: NEMOTRON_LIGHTNING },
      { modelBaseUrl: "https://custom.example/v1" },
      { modelBaseUrl: "" },
    ]) {
      expect(
        usesCustomerByoSuperJsonContent(
          { ...agent, ...changes },
          config,
          FUTURE - 1,
        ),
      ).toBe(false);
    }
  });
  it("leaves the hosted customer gate unchanged: it still excludes BYO", () => {
    const { agent, config } = byoFixture();
    expect(
      usesCustomerSuperJsonContent(
        agent,
        config,
        {
          provider: "nvidia",
          model: NEMOTRON_SUPER,
          keyRef: "nvidia:shared:0",
        },
        FUTURE - 1,
      ),
    ).toBe(false);
  });
});

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
    vi.spyOn(capacity, "clearProviderCapacityBackoff").mockResolvedValue(
      undefined,
    );
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
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("passes owner refill hints through and releases both first leases before waiting", async () => {
    vi.useFakeTimers();
    const { agent, config } = fixture();
    agent.modelName = NEMOTRON_SUPER;
    agent.isHouse = false;
    agent.ownerUserId = 19;
    config.sharedPoolPolicyEnabled = true;
    decide
      .mockResolvedValueOnce({
        ok: true,
        text: '{"decision":"act","actions":"[]"}',
        responseSource: "tool_call",
        usage: { promptTokens: 20000, completionTokens: 100 },
      })
      .mockResolvedValueOnce({ ...good, responseSource: "content" });
    let reservations = 0;
    vi.mocked(capacity.reserveProviderCapacity).mockImplementation(
      async (_pool, limit) => {
        reservations += 1;
        return reservations === 3
          ? { ok: false, reasons: ["token_budget"], retryAfterMs: 48000 }
          : {
              ok: true,
              lease: {
                leaseId: `lease-${reservations}`,
                routeKey: limit.routeKey,
                reservedTokens: limit.reserveTokens,
              },
            };
      },
    );
    vi.mocked(engine.runCycle).mockImplementation(async (deps) => {
      result = await deps.provider.decide({ ...input, timeoutMs: 90000 });
      return {
        decision: "skip",
        planned: [],
        executed: [],
        modelFailed: !result.ok,
      };
    });
    const pending = runAgentOnce(pool, agent, config);
    await vi.advanceTimersByTimeAsync(47999);
    expect(capacity.reserveProviderCapacity).toHaveBeenCalledTimes(3);
    expect(capacity.releaseProviderCapacity).toHaveBeenCalledTimes(2);
    expect(decide).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(1);
    await pending;
    expect(result.ok).toBe(true);
    expect(capacity.reserveProviderCapacity).toHaveBeenCalledTimes(5);
    expect(capacity.releaseProviderCapacity).toHaveBeenCalledTimes(4);
    expect(decide).toHaveBeenCalledTimes(2);
  });

  it("refunds unused provider and owner reservations when admission exhausts the deadline", async () => {
    const { agent, config } = fixture();
    agent.ownerUserId = 19;
    config.sharedPoolPolicyEnabled = true;
    let now = 0,
      calls = 0;
    vi.spyOn(Date, "now").mockImplementation(() => now);
    vi.mocked(capacity.reserveProviderCapacity).mockImplementation(
      async (_pool, limit) => {
        calls += 1;
        if (calls === 2) now = 1000;
        return {
          ok: true,
          lease: {
            leaseId: `lease-${calls}`,
            routeKey: limit.routeKey,
            reservedTokens: limit.reserveTokens,
          },
        };
      },
    );
    await runAgentOnce(pool, agent, config);
    expect(decide).not.toHaveBeenCalled();
    expect(capacity.releaseProviderCapacity).toHaveBeenCalledTimes(2);
    for (const call of vi.mocked(capacity.releaseProviderCapacity).mock.calls) {
      expect(call.slice(2)).toEqual([0, true]);
    }
  });

  it("re-admits a malformed Super tool retry with identical model/key and cumulative usage", async () => {
    const { agent, config } = fixture();
    agent.modelName = NEMOTRON_SUPER;
    agent.isHouse = false;
    agent.ownerUserId = 19;
    config.sharedPoolPolicyEnabled = true;
    const before = JSON.stringify(agent);
    decide
      .mockResolvedValueOnce({
        ok: true,
        text: '{"decision":"act","actions":"[]"}',
        responseSource: "tool_call",
        usage: { promptTokens: 100, completionTokens: 10 },
      })
      .mockResolvedValueOnce({ ...good, responseSource: "content" });
    await runAgentOnce(pool, agent, config);
    const calls = vi.mocked(engine.providerForRoute).mock.calls;
    expect(calls).toHaveLength(2);
    expect(calls[0]).toHaveLength(3);
    expect(calls[1]).toEqual([...calls[0], { nemotronJsonContent: true }]);
    expect(result).toMatchObject({
      ok: true,
      usage: { promptTokens: 107, completionTokens: 13 },
      route: { effectiveModel: NEMOTRON_SUPER },
    });
    // Every physical call reserves/releases both the owner and provider lease.
    expect(capacity.reserveProviderCapacity).toHaveBeenCalledTimes(4);
    expect(capacity.releaseProviderCapacity).toHaveBeenCalledTimes(4);
    expect(JSON.stringify(agent)).toBe(before);
  });

  it("changes only the enrolled customer's primary transport and preserves identity/settings", async () => {
    const { agent, config } = customerFixture();
    const before = JSON.stringify(agent);
    config.compactPromptTablesEnabled = true;
    await runAgentOnce(pool, agent, config);
    expect(engine.providerForRoute).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "nvidia",
        model: NEMOTRON_SUPER,
        keyRef: "nvidia:shared:0",
      }),
      "fixture-nvidia",
      fetch,
      { nemotronJsonContent: true },
    );
    expect(engine.runCycle).toHaveBeenCalledWith(
      expect.objectContaining({
        compactPromptTables: false,
        mergedProse: agent.prose,
        live: agent.live,
        spec: expect.objectContaining({
          model: {
            provider: "nvidia",
            name: NEMOTRON_SUPER,
            baseUrl: undefined,
          },
        }),
      }),
    );
    expect(decide).toHaveBeenCalledWith(
      expect.objectContaining({ system: input.system, user: input.user }),
    );
    expect(decide.mock.calls[0]![0].timeoutMs).toBeGreaterThan(0);
    expect(decide.mock.calls[0]![0].timeoutMs).toBeLessThanOrEqual(
      input.timeoutMs,
    );
    expect(JSON.stringify(agent)).toBe(before);
  });

  it("rechecks expiry after asynchronous capacity admission, before sending", async () => {
    const { agent, config } = customerFixture();
    let now = FUTURE - 1;
    vi.spyOn(Date, "now").mockImplementation(() => now);
    vi.mocked(capacity.reserveProviderCapacity).mockImplementationOnce(
      async () => {
        now = FUTURE;
        return { ok: true };
      },
    );
    await runAgentOnce(pool, agent, config);
    expect(engine.providerForRoute).toHaveBeenCalledWith(
      expect.objectContaining({ model: NEMOTRON_SUPER }),
      "fixture-nvidia",
      fetch,
    );
  });

  it("never applies customer content to BYO or a disabled hosted router", async () => {
    for (const byo of [true, false]) {
      const { agent, config } = customerFixture();
      if (byo) agent.brainKeyEnc = encrypt("fixture-byo", key);
      else config.routerEnabled = false;
      await runAgentOnce(pool, agent, config);
    }
    expect(engine.providerForRoute).not.toHaveBeenCalled();
    expect(engine.selectProvider).toHaveBeenCalledTimes(2);
  });

  it("passes a per-attempt content selector only to an enrolled BYO Super agent", async () => {
    const { agent, config } = byoFixture();
    await runAgentOnce(pool, agent, config);
    expect(engine.providerForRoute).not.toHaveBeenCalled();
    const call = vi.mocked(engine.selectProvider).mock.calls[0]!;
    expect(call[0]).toMatchObject({
      model: { provider: "nvidia", name: NEMOTRON_SUPER },
    });
    expect(call[1]).toEqual({ NVIDIA_API_KEY: "fixture-byo" });
    const selector = call[3]?.nemotronJsonContent;
    expect(typeof selector).toBe("function");
    expect((selector as () => boolean)()).toBe(true);
    // The selector re-reads the trial expiry each time it is asked.
    config.customerSuperJsonContentUntilMs = Date.now() - 1;
    expect((selector as () => boolean)()).toBe(false);
  });

  it.each([
    ["not enrolled", { customerSuperJsonContentAllowlist: [] }],
    ["BYO switch off", { customerByoSuperJsonContentEnabled: false }],
    ["expired", { customerSuperJsonContentUntilMs: Date.now() - 1 }],
  ])(
    "keeps the identical 3-argument BYO call when %s",
    async (_label, changes) => {
      const { agent, config } = byoFixture();
      Object.assign(config, changes);
      await runAgentOnce(pool, agent, config);
      expect(vi.mocked(engine.selectProvider).mock.calls[0]).toHaveLength(3);
    },
  );

  it("retains strict malformed rejection and the same two-attempt fallback chain", async () => {
    const { agent, config } = customerFixture();
    config.lightningFallbackEnabled = true; // remains house-only
    decide
      .mockResolvedValueOnce({
        ok: true,
        text: '{"decision":"act","actions":"[]"}',
        responseSource: "content",
      })
      .mockResolvedValueOnce({ ...good, responseSource: "tool_call" });
    await runAgentOnce(pool, agent, config);
    const calls = vi.mocked(engine.providerForRoute).mock.calls;
    expect(calls.map((call) => call[0].model)).toEqual([
      NEMOTRON_SUPER,
      NEMOTRON_NANO,
    ]);
    expect(calls.map((call) => call[3])).toEqual([
      { nemotronJsonContent: true },
      undefined,
    ]);
    expect(result).toMatchObject({
      ok: true,
      route: {
        attempts: [
          {
            outcome: "failed",
            failureClass: "malformed",
            responseSource: "content",
          },
          { outcome: "success", responseSource: "tool_call" },
        ],
      },
    });
    expect(capacity.releaseProviderCapacity).toHaveBeenCalledTimes(2);
  });

  it("keeps pinned customer models single-route when content is malformed", async () => {
    const { agent, config } = customerFixture();
    agent.spec = { ...(agent.spec as object), pinnedModel: true };
    decide.mockResolvedValueOnce({
      ok: true,
      text: '{"decision":"act","actions":"[]"}',
    });
    await runAgentOnce(pool, agent, config);
    expect(result.ok).toBe(false);
    expect(engine.providerForRoute).toHaveBeenCalledOnce();
    expect(vi.mocked(engine.providerForRoute).mock.calls[0]![3]).toEqual({
      nemotronJsonContent: true,
    });
  });

  it.each([false, true])(
    "keeps customer fallback Super default while preserving house scope: house=%s",
    async (isHouse) => {
      const { agent, config } = customerFixture();
      agent.modelName = NEMOTRON_NANO;
      agent.isHouse = isHouse;
      config.houseSuperJsonContentEnabled = true;
      config.houseSuperJsonContentUntilMs = FUTURE;
      decide.mockResolvedValueOnce({
        ok: true,
        text: '{"decision":"act","actions":"[]"}',
      });
      await runAgentOnce(pool, agent, config);
      const calls = vi.mocked(engine.providerForRoute).mock.calls;
      expect(calls.map((call) => call[0].model)).toEqual([
        NEMOTRON_NANO,
        NEMOTRON_SUPER,
      ]);
      expect(calls[0]![3]).toBeUndefined();
      expect(calls[1]![3]).toEqual(
        isHouse ? { nemotronJsonContent: true } : undefined,
      );
    },
  );

  it("retains owner admission and usage reconciliation for an enrolled customer", async () => {
    const { agent, config } = customerFixture();
    config.sharedPoolPolicyEnabled = true;
    const owner = {
      leaseId: "owner",
      routeKey: "shared-owner:user:19",
      reservedTokens: 1031,
    };
    const provider = {
      leaseId: "provider",
      routeKey: "nvidia:shared:0",
      reservedTokens: 1031,
    };
    vi.mocked(capacity.reserveProviderCapacity)
      .mockResolvedValueOnce({ ok: true, lease: owner })
      .mockResolvedValueOnce({ ok: true, lease: provider });
    await runAgentOnce(pool, agent, config);
    expect(capacity.reserveProviderCapacity).toHaveBeenNthCalledWith(
      1,
      pool,
      expect.objectContaining({
        routeKey: owner.routeKey,
        tokensPerMinute: 25000,
        maxConcurrent: 1,
        reserveTokens: 1031,
      }),
    );
    expect(capacity.reserveProviderCapacity).toHaveBeenNthCalledWith(
      2,
      pool,
      expect.objectContaining({
        routeKey: provider.routeKey,
        model: NEMOTRON_SUPER,
        reserveTokens: 1031,
      }),
    );
    expect(capacity.releaseProviderCapacity).toHaveBeenCalledWith(
      pool,
      owner,
      10,
    );
    expect(capacity.releaseProviderCapacity).toHaveBeenCalledWith(
      pool,
      { ...provider, ownerLease: owner },
      10,
    );
    expect(engine.runCycle).toHaveBeenCalledWith(
      expect.objectContaining({ minModelIntervalSeconds: 180 }),
    );
  });

  it("does not bypass an enrolled customer's owner capacity denial", async () => {
    const { agent, config } = customerFixture();
    config.sharedPoolPolicyEnabled = true;
    vi.mocked(capacity.reserveProviderCapacity).mockResolvedValueOnce({
      ok: false,
      reasons: ["token_budget"],
    });
    await runAgentOnce(pool, agent, config);
    expect(result).toMatchObject({ ok: false, deferred: true });
    expect(capacity.reserveProviderCapacity).toHaveBeenCalledOnce();
    expect(engine.providerForRoute).not.toHaveBeenCalled();
    expect(decide).not.toHaveBeenCalled();
  });

  it.each([true, false])(
    "limits Lightning fallback to opted-in house routes: %s",
    async (isHouse) => {
      const { agent, config } = fixture();
      config.lightningFallbackEnabled = true;
      agent.isHouse = isHouse;
      decide
        .mockResolvedValueOnce({ ok: false, error: "capacity", status: 429 })
        .mockResolvedValueOnce(good);
      await runAgentOnce(pool, agent, config);
      const models = vi
        .mocked(engine.providerForRoute)
        .mock.calls.map((c) => c[0].model);
      expect(models.includes(NEMOTRON_LIGHTNING)).toBe(isHouse);
      expect(models).toHaveLength(2);
    },
  );

  it.each([
    // flag, isHouse, model -> JSON content on the first route
    [true, true, NEMOTRON_SUPER, true],
    [false, true, NEMOTRON_SUPER, false],
    [true, false, NEMOTRON_SUPER, false],
    [true, true, NEMOTRON_NANO, false],
  ])(
    "asks for JSON content only on a flagged house Super route (%s/%s/%s)",
    async (flag, isHouse, model, expected) => {
      const { agent, config } = fixture();
      config.houseSuperJsonContentEnabled = flag;
      config.houseSuperJsonContentUntilMs = FUTURE;
      agent.isHouse = isHouse;
      agent.modelName = model;
      await runAgentOnce(pool, agent, config);
      const first = vi.mocked(engine.providerForRoute).mock.calls[0]!;
      expect(first[0].model).toBe(model);
      expect(first[3]).toEqual(
        expected ? { nemotronJsonContent: true } : undefined,
      );
    },
  );

  it.each([
    ["missing", undefined, false],
    ["expired", Date.now() - 60_000, false],
  ])(
    "keeps the default transport when the trial expiry is %s",
    async (_label, untilMs, expected) => {
      const { agent, config } = fixture();
      config.houseSuperJsonContentEnabled = true;
      config.houseSuperJsonContentUntilMs = untilMs;
      agent.isHouse = true;
      agent.modelName = NEMOTRON_SUPER;
      await runAgentOnce(pool, agent, config);
      const first = vi.mocked(engine.providerForRoute).mock.calls[0]!;
      expect(first[3] !== undefined).toBe(expected);
    },
  );

  it("ends the trial exactly at its expiry and never applies to customers or BYO", () => {
    const { agent, config } = fixture();
    const until = Date.UTC(2026, 9, 5, 21, 0, 0);
    config.houseSuperJsonContentEnabled = true;
    config.houseSuperJsonContentUntilMs = until;
    agent.isHouse = true;
    const route = {
      provider: "nvidia" as const,
      model: NEMOTRON_SUPER,
      keyRef: "nvidia:shared:0",
    };
    expect(usesHouseSuperJsonContent(agent, config, route, until - 1)).toBe(
      true,
    );
    expect(usesHouseSuperJsonContent(agent, config, route, until)).toBe(false);
    expect(usesHouseSuperJsonContent(agent, config, route, until + 1)).toBe(
      false,
    );
    expect(
      usesHouseSuperJsonContent(
        { ...agent, isHouse: false },
        config,
        route,
        until - 1,
      ),
    ).toBe(false);
    expect(
      usesHouseSuperJsonContent(
        { ...agent, brainKeyEnc: encrypt("fixture-byo", key) },
        config,
        route,
        until - 1,
      ),
    ).toBe(false);
  });

  it("keeps the default transport on every fallback after a house Super attempt", async () => {
    const { agent, config } = fixture();
    config.houseSuperJsonContentEnabled = true;
    config.houseSuperJsonContentUntilMs = FUTURE;
    config.lightningFallbackEnabled = true;
    agent.isHouse = true;
    agent.modelName = NEMOTRON_SUPER;
    decide
      .mockResolvedValueOnce({ ok: false, error: "capacity", status: 429 })
      .mockResolvedValueOnce(good);
    await runAgentOnce(pool, agent, config);
    const calls = vi.mocked(engine.providerForRoute).mock.calls;
    expect(calls).toHaveLength(2);
    expect(calls[0]![3]).toEqual({ nemotronJsonContent: true });
    expect(calls[1]![0].model).not.toBe(NEMOTRON_SUPER);
    expect(calls[1]![3]).toBeUndefined();
  });

  it("never reaches a BYO house agent, which bypasses the hosted router", async () => {
    const { agent, config } = fixture();
    config.houseSuperJsonContentEnabled = true;
    config.houseSuperJsonContentUntilMs = FUTURE;
    agent.isHouse = true;
    agent.modelName = NEMOTRON_SUPER;
    agent.brainKeyEnc = encrypt("fixture-byo", key);
    await runAgentOnce(pool, agent, config);
    expect(engine.providerForRoute).not.toHaveBeenCalled();
    expect(engine.selectProvider).toHaveBeenCalled();
  });

  it.each([
    [true, false, true],
    [false, false, false],
    [true, true, false],
  ])(
    "limits prompt tables to eligible house shared routes (%s/%s)",
    async (isHouse, byo, enabled) => {
      const { agent, config } = fixture();
      config.compactPromptTablesEnabled = true;
      agent.isHouse = isHouse;
      if (byo) agent.brainKeyEnc = encrypt("fixture-byo", key);
      await runAgentOnce(pool, agent, config);
      expect(engine.runCycle).toHaveBeenCalledWith(
        expect.objectContaining({ compactPromptTables: enabled }),
      );
    },
  );

  it("reserves one owner quota across keys and reconciles both leases to actual usage", async () => {
    const { agent, config } = fixture();
    config.sharedPoolPolicyEnabled = true;
    agent.ownerUserId = 19;
    const ownerLease = {
      leaseId: "owner",
      routeKey: "shared-owner:user:19",
      reservedTokens: 1031,
      tokenBurst: 25000,
    };
    const providerLease = {
      leaseId: "provider",
      routeKey: "nvidia:shared:0",
      reservedTokens: 1031,
    };
    vi.mocked(capacity.reserveProviderCapacity)
      .mockResolvedValueOnce({ ok: true, lease: ownerLease })
      .mockResolvedValueOnce({ ok: true, lease: providerLease });
    await runAgentOnce(pool, agent, config);
    expect(result.ok).toBe(true);
    expect(capacity.reserveProviderCapacity).toHaveBeenNthCalledWith(
      1,
      pool,
      expect.objectContaining({
        routeKey: ownerLease.routeKey,
        tokensPerMinute: 25000,
        maxConcurrent: 1,
      }),
    );
    expect(capacity.releaseProviderCapacity).toHaveBeenCalledWith(
      pool,
      ownerLease,
      10,
    );
    expect(engine.runCycle).toHaveBeenCalledWith(
      expect.objectContaining({ minModelIntervalSeconds: 180 }),
    );
  });

  it.each([
    {
      name: "worker-limit 503",
      failure: {
        ok: false as const,
        status: 503,
        error:
          'provider HTTP 503: {"error":{"message":"ResourceExhausted: Worker local total request limit reached (16/16)"}}',
      },
    },
    {
      name: "429",
      failure: {
        ok: false as const,
        status: 429,
        error: "provider HTTP 429: Too Many Requests",
      },
    },
  ])(
    "refunds the tokens of a $name rejected before inference but keeps the request debit",
    async ({ failure }) => {
      const { agent, config } = fixture();
      config.sharedPoolPolicyEnabled = true;
      agent.ownerUserId = 19;
      let reservations = 0;
      vi.mocked(capacity.reserveProviderCapacity).mockImplementation(
        async (_pool, limit) => {
          reservations += 1;
          return {
            ok: true,
            lease: {
              leaseId: `lease-${reservations}`,
              routeKey: limit.routeKey,
              reservedTokens: limit.reserveTokens,
            },
          };
        },
      );
      decide.mockResolvedValueOnce(failure).mockResolvedValueOnce(good);
      await runAgentOnce(pool, agent, config);
      expect(result).toMatchObject({
        ok: true,
        route: { effectiveModel: NEMOTRON_SUPER },
      });
      const releases = vi.mocked(capacity.releaseProviderCapacity).mock.calls;
      expect(releases).toHaveLength(4);
      // First physical call: provider then owner lease, 0 tokens, not unused.
      expect(releases[0]!.slice(1)).toEqual([
        expect.objectContaining({ leaseId: "lease-2" }),
        0,
      ]);
      expect(releases[1]!.slice(1)).toEqual([
        expect.objectContaining({ leaseId: "lease-1" }),
        0,
      ]);
      // The fallback is reconciled to its reported usage as before.
      expect(releases[2]![2]).toBe(10);
      expect(releases[3]![2]).toBe(10);
    },
  );

  it.each([
    {
      name: "a ResourceExhausted 503 without the worker admission phrase",
      baseUrl: undefined as string | undefined,
      failure: {
        ok: false as const,
        status: 503,
        error:
          'provider HTTP 503: {"error":{"message":"ResourceExhausted: queue full"}}',
      },
      expected: undefined,
    },
    {
      name: "a 429 that reports usage",
      baseUrl: undefined,
      failure: {
        ok: false as const,
        status: 429,
        error: "provider HTTP 429: Too Many Requests",
        usage: { promptTokens: 50, completionTokens: 0 },
      },
      expected: 50,
    },
    {
      name: "a 429 from a custom endpoint",
      baseUrl: "https://nim.example.com/v1",
      failure: {
        ok: false as const,
        status: 429,
        error: "provider HTTP 429: Too Many Requests",
      },
      expected: undefined,
    },
  ])("does not refund $name", async ({ failure, baseUrl, expected }) => {
    const { agent, config } = fixture();
    config.sharedPoolPolicyEnabled = true;
    agent.ownerUserId = 19;
    if (baseUrl) agent.modelBaseUrl = baseUrl;
    decide.mockResolvedValueOnce(failure).mockResolvedValueOnce(good);
    await runAgentOnce(pool, agent, config);
    const releases = vi.mocked(capacity.releaseProviderCapacity).mock.calls;
    expect(releases).toHaveLength(4);
    expect(releases[0]!.slice(2)).toEqual([expected]);
    expect(releases[1]!.slice(2)).toEqual([expected]);
  });

  it("keeps the full charge for failures that may have consumed tokens", async () => {
    const { agent, config } = fixture();
    config.sharedPoolPolicyEnabled = true;
    agent.ownerUserId = 19;
    config.openAiBackupEligible = false;
    decide
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        error: "provider HTTP 500: internal error",
      })
      .mockResolvedValueOnce({
        ok: false,
        error: "model call timed out after 1000ms",
      });
    await runAgentOnce(pool, agent, config);
    const releases = vi.mocked(capacity.releaseProviderCapacity).mock.calls;
    expect(releases.length).toBeGreaterThan(0);
    for (const call of releases) expect(call[2]).toBeUndefined();
  });

  it("defers owner quota exhaustion once without spending a fallback or a model call", async () => {
    const { agent, config } = fixture();
    config.sharedPoolPolicyEnabled = true;
    agent.ownerUserId = 19;
    vi.mocked(capacity.reserveProviderCapacity).mockResolvedValueOnce({
      ok: false,
      reasons: ["token_budget"],
    });
    await runAgentOnce(pool, agent, config);
    expect(result).toMatchObject({
      ok: false,
      deferred: true,
      error: "shared pool owner budget unavailable",
      route: { attempts: [{ outcome: "deferred" }] },
    });
    expect(capacity.reserveProviderCapacity).toHaveBeenCalledOnce();
    expect(decide).not.toHaveBeenCalled();
    expect(db.recordProviderStrike).not.toHaveBeenCalled();
  });

  it("refunds owner tokens when provider admission fails before a call", async () => {
    const { agent, config } = fixture();
    config.sharedPoolPolicyEnabled = true;
    agent.ownerUserId = 19;
    config.openAiBackupEligible = false;
    const ownerLease = {
      leaseId: "owner",
      routeKey: "shared-owner:user:19",
      reservedTokens: 1031,
      tokenBurst: 25000,
    };
    vi.mocked(capacity.reserveProviderCapacity)
      .mockResolvedValueOnce({ ok: true, lease: ownerLease })
      .mockResolvedValueOnce({ ok: false, reasons: ["token_budget"] });
    await runAgentOnce(pool, agent, config);
    expect(capacity.releaseProviderCapacity).toHaveBeenCalledWith(
      pool,
      ownerLease,
      0,
      true,
    );
    expect(decide).not.toHaveBeenCalled();
  });

  it("keeps BYO agents outside the owner quota and minimum interval", async () => {
    const { agent, config } = fixture();
    config.sharedPoolPolicyEnabled = true;
    agent.brainKeyEnc = encrypt("byo", key);
    await runAgentOnce(pool, agent, config);
    expect(capacity.reserveProviderCapacity).not.toHaveBeenCalled();
    expect(engine.runCycle).toHaveBeenCalledWith(
      expect.objectContaining({ minModelIntervalSeconds: undefined }),
    );
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

  it("accounts incomplete response usage and takes only the existing malformed fallback", async () => {
    decide.mockResolvedValueOnce({
      ok: false,
      failureClass: "malformed",
      error: "provider returned incomplete decision (output token limit)",
      usage: { promptTokens: 4810, completionTokens: 1024 },
    });
    const { agent, config } = fixture();
    await runAgentOnce(pool, agent, config);
    expect(result).toMatchObject({
      ok: true,
      route: {
        reason: "malformed_fallback",
        attempts: [
          { outcome: "failed", failureClass: "malformed" },
          { outcome: "success" },
        ],
      },
    });
    expect(decide).toHaveBeenCalledTimes(2);
    expect(capacity.releaseProviderCapacity).toHaveBeenNthCalledWith(
      1,
      pool,
      expect.any(Object),
      5834,
    );
    expect(capacity.releaseProviderCapacity).toHaveBeenNthCalledWith(
      2,
      pool,
      expect.any(Object),
      10,
    );
    expect(capacity.coolDownProviderCapacity).not.toHaveBeenCalled();
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
        retryAfterMs,
        "rate_limit",
      );
      expect(db.recordProviderStrike).not.toHaveBeenCalled();
      expect(result.ok).toBe(true);
    },
  );

  it("can roll back adaptive cooldown without ignoring explicit Retry-After", async () => {
    const { agent, config } = fixture();
    config.adaptiveCooldownEnabled = false;
    decide.mockResolvedValueOnce({
      ok: false,
      status: 429,
      error: "rate limit",
    });
    await runAgentOnce(pool, agent, config);
    expect(capacity.coolDownProviderCapacity).toHaveBeenCalledWith(
      pool,
      "nvidia:shared:0",
      "nvidia",
      NEMOTRON_NANO,
      60000,
      "rate_limit",
    );
    expect(capacity.clearProviderCapacityBackoff).not.toHaveBeenCalled();
  });

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
