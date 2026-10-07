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
  PAID_BRAIN_PAUSE_REASON,
  fallbackAgentFor,
  paidBrainFor,
  paidBrainRefusalReason,
  recoverPaidCalls,
  runAgentOnce,
} from "./runtime.js";
import {
  paidBrainModel,
  parsePaidBrain,
  priceRowAt,
  type PaidBrain,
} from "./paidBrain.js";
import { NEMOTRON_SUPER } from "./route.js";

const key = Buffer.alloc(32, 9);
const pool = {} as Pool;
const input = {
  system: "fixture system",
  user: "fixture user",
  timeoutMs: 1000,
};
const usage = { promptTokens: 20_000, completionTokens: 400 };
const answered = {
  ok: true as const,
  text: '{"decision":"skip","actions":[]}',
  usage,
};
const fallback = { provider: "nvidia", name: NEMOTRON_SUPER };
const RESERVE_KEY = /^reserve:42:[0-9a-f-]{36}$/;

function paidFixture(
  paidBrain: Record<string, unknown> = {
    modelId: "claude-sonnet-5-5",
    monthlyCapUsd: 25,
    onExhausted: "free",
    fallback,
  },
) {
  const config = loadConfig({
    DATABASE_URL: "postgresql://localhost/unused",
    ENCRYPTION_KEY: key.toString("hex"),
    NVIDIA_API_KEY: "fixture-nvidia",
    PAID_ANTHROPIC_API_KEY: "fixture-paid-anthropic",
    PAID_GEMINI_API_KEY: "fixture-paid-gemini",
  });
  config.encryptionKey = key;
  const entry = paidBrainModel(String(paidBrain.modelId));
  const agent: db.AgentRow = {
    id: 42,
    handle: "a7-paid-fixture",
    displayName: "Paid fixture",
    live: false,
    cadenceSeconds: 600,
    modelProvider: entry?.provider ?? "anthropic",
    modelName: entry?.model ?? "claude-sonnet-5-5",
    modelBaseUrl: null,
    spec: {
      ...parseSkill(renderFolderOfOne("fixture", "conservative")).spec,
      paidBrain,
    },
    prose: "fixture",
    coinrithmKeyEnc: encrypt("fixture-account", key),
    brainKeyEnc: null,
    ownerUserId: 19,
    isHouse: false,
  };
  return { agent, config };
}

const pausePaidBrain = {
  modelId: "claude-opus-5-5",
  monthlyCapUsd: 25,
  onExhausted: "pause",
  fallback,
};

const errorLines = () =>
  vi.mocked(console.error).mock.calls.map((call) => String(call[0]));
const logLines = () =>
  vi.mocked(console.log).mock.calls.map((call) => String(call[0]));
const reservedKey = () =>
  vi.mocked(db.reservePaidCall).mock.calls[0]![1].reserveKey;

describe("paid brain runtime wiring (contract v2)", () => {
  let decide: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => {
        throw new Error("network forbidden");
      }),
    );
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(db, "loadStateJson").mockResolvedValue(undefined);
    vi.spyOn(db, "persistCycleResult").mockResolvedValue(4242);
    vi.spyOn(db, "recordCycle").mockResolvedValue(undefined);
    vi.spyOn(db, "disableAgent").mockResolvedValue(undefined);
    vi.spyOn(db, "pauseAgent").mockResolvedValue(undefined);
    vi.spyOn(db, "rescheduleToCadence").mockResolvedValue(undefined);
    vi.spyOn(db, "reservePaidCall").mockResolvedValue({ kind: "reserved" });
    vi.spyOn(db, "markPaidCallDispatched").mockResolvedValue(true);
    vi.spyOn(db, "recordPaidCallResult").mockResolvedValue(true);
    vi.spyOn(db, "finalizePaidCall").mockResolvedValue("debited");
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
    decide = vi.fn().mockResolvedValue(answered);
    vi.spyOn(engine, "providerForRoute").mockImplementation(() => ({
      label: "fixture-routed",
      decide,
    }));
    vi.spyOn(engine, "selectProvider").mockImplementation(() => ({
      label: "fixture-direct",
      decide,
    }));
    vi.spyOn(engine, "runCycle").mockImplementation(async (deps) => {
      const res = await deps.provider.decide(input);
      const made = res.route
        ? res.route.attempts.some((attempt) => attempt.outcome !== "deferred")
        : res.ok || !res.deferred;
      return {
        decision: "skip",
        planned: [],
        disabled: false,
        live: false,
        modelFailed: !res.ok,
        llmCallMade: made,
        providerUsage: made ? res.usage : undefined,
      };
    });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("reserves, commits dispatch, calls with the platform key and cap, records usage and finalises", async () => {
    const { agent, config } = paidFixture();
    await runAgentOnce(pool, agent, config);

    expect(db.reservePaidCall).toHaveBeenCalledOnce();
    const request = vi.mocked(db.reservePaidCall).mock.calls[0]![1];
    expect(request).toMatchObject({
      userId: 19,
      agentId: 42,
      modelId: "claude-sonnet-5-5",
      price: priceRowAt(paidBrainModel("claude-sonnet-5-5")!, Date.now()),
      marginPct: 20,
      worstCaseMicro: 434_381,
      capMicro: 25_000_000,
    });
    expect(request.reserveKey).toMatch(RESERVE_KEY);
    expect(request.monthStart).toMatch(/^\d{4}-\d{2}-01$/);

    const [spec, env] = vi.mocked(engine.selectProvider).mock.calls[0]!;
    expect(spec.model).toEqual({
      provider: "anthropic",
      name: "claude-sonnet-5-5",
    });
    // ONLY the platform key; never the shared router.
    expect(env).toEqual({ ANTHROPIC_API_KEY: "fixture-paid-anthropic" });
    expect(engine.providerForRoute).not.toHaveBeenCalled();
    expect(capacity.reserveProviderCapacity).not.toHaveBeenCalled();

    // Dispatch is committed BEFORE the provider is called.
    expect(db.markPaidCallDispatched).toHaveBeenCalledWith(
      pool,
      request.reserveKey,
    );
    expect(
      vi.mocked(db.markPaidCallDispatched).mock.invocationCallOrder[0],
    ).toBeLessThan(decide.mock.invocationCallOrder[0]!);
    // Hard output cap, thinking included.
    expect(decide.mock.calls[0]![0].maxTokens).toBe(4096);
    expect(db.recordPaidCallResult).toHaveBeenCalledWith(
      pool,
      request.reserveKey,
      { status: "answered", usage },
    );
    expect(db.finalizePaidCall).toHaveBeenCalledWith(pool, request.reserveKey, {
      mode: "cycle_end",
      cycleId: 4242,
    });
    expect(
      vi.mocked(db.persistCycleResult).mock.invocationCallOrder[0],
    ).toBeLessThan(vi.mocked(db.finalizePaidCall).mock.invocationCallOrder[0]!);
    expect(errorLines()).toEqual([]);
    expect(
      logLines().some((line) => line.includes("paid_brain_finalized")),
    ).toBe(true);
  });

  it("never sends a prompt over the paid input bound (no truncation) and releases", async () => {
    const { agent, config } = paidFixture();
    agent.prose = "x".repeat(170_000);
    vi.mocked(db.finalizePaidCall).mockResolvedValue("released");
    await runAgentOnce(pool, agent, config);
    expect(db.markPaidCallDispatched).not.toHaveBeenCalled();
    expect(decide).not.toHaveBeenCalled();
    expect(db.finalizePaidCall).toHaveBeenCalledWith(pool, reservedKey(), {
      mode: "cycle_end",
      cycleId: 4242,
    });
    expect(
      errorLines().some((line) => line.includes("paid_brain_input_over_bound")),
    ).toBe(true);
  });

  it.each([
    ["the dispatch was not committed", false],
    ["the dispatch write failed", new Error("db blip")],
  ])(
    "never calls the provider when %s, and releases",
    async (_label, outcome) => {
      const { agent, config } = paidFixture();
      if (outcome instanceof Error)
        vi.mocked(db.markPaidCallDispatched).mockRejectedValue(outcome);
      else vi.mocked(db.markPaidCallDispatched).mockResolvedValue(outcome);
      vi.mocked(db.finalizePaidCall).mockResolvedValue("released");
      await runAgentOnce(pool, agent, config);
      expect(decide).not.toHaveBeenCalled();
      expect(db.recordPaidCallResult).not.toHaveBeenCalled();
      expect(db.finalizePaidCall).toHaveBeenCalledWith(pool, reservedKey(), {
        mode: "cycle_end",
        cycleId: 4242,
      });
      expect(
        errorLines().some((line) =>
          line.includes("paid_brain_dispatch_unrecorded"),
        ),
      ).toBe(outcome instanceof Error);
    },
  );

  it("never estimates: an answer without usage is recorded uncertain and alerted", async () => {
    const { agent, config } = paidFixture();
    decide.mockResolvedValue({ ok: true, text: answered.text });
    vi.mocked(db.finalizePaidCall).mockResolvedValue("closed");
    await runAgentOnce(pool, agent, config);
    expect(db.recordPaidCallResult).toHaveBeenCalledWith(pool, reservedKey(), {
      status: "uncertain",
      reason: "answered without usage",
    });
    expect(
      errorLines().some((line) =>
        line.includes("paid_brain_metering_uncertain"),
      ),
    ).toBe(true);
  });

  it.each([
    [
      "a known pre-processing rejection",
      { ok: false, error: "anthropic HTTP 429: rate_limit_error", status: 429 },
      { status: "rejected", providerStatus: 429 },
    ],
    [
      "an overload without usage (possibly billed)",
      { ok: false, error: "anthropic HTTP 529: overloaded", status: 529 },
      { status: "uncertain", reason: "HTTP 529 without usage" },
    ],
    [
      "a timeout without a response",
      { ok: false, error: "timeout" },
      { status: "uncertain", reason: "no provider response" },
    ],
    [
      "an incomplete answer the provider billed",
      {
        ok: false,
        failureClass: "malformed",
        error: "provider returned incomplete decision (output token limit)",
        usage: { promptTokens: 20_000, completionTokens: 4_096 },
      },
      {
        status: "answered",
        usage: { promptTokens: 20_000, completionTokens: 4_096 },
      },
    ],
  ])("records %s", async (_label, response, recorded) => {
    const { agent, config } = paidFixture();
    decide.mockResolvedValue(response);
    await runAgentOnce(pool, agent, config);
    expect(db.recordPaidCallResult).toHaveBeenCalledWith(
      pool,
      reservedKey(),
      recorded,
    );
    expect(db.finalizePaidCall).toHaveBeenCalledOnce();
  });

  it("completes the cycle and alerts when recording the result fails (finalisation then marks it uncertain)", async () => {
    const { agent, config } = paidFixture();
    vi.mocked(db.recordPaidCallResult).mockRejectedValue(new Error("db blip"));
    await runAgentOnce(pool, agent, config);
    expect(db.persistCycleResult).toHaveBeenCalledOnce();
    expect(db.finalizePaidCall).toHaveBeenCalledOnce();
    expect(db.recordCycle).not.toHaveBeenCalled();
    expect(
      errorLines().some((line) =>
        line.includes("paid_brain_result_unrecorded"),
      ),
    ).toBe(true);
  });

  it("completes the cycle and alerts when finalisation throws (the reservation stays open)", async () => {
    const { agent, config } = paidFixture();
    vi.mocked(db.finalizePaidCall).mockRejectedValue(new Error("ledger down"));
    await runAgentOnce(pool, agent, config);
    expect(db.persistCycleResult).toHaveBeenCalledOnce();
    expect(db.recordCycle).not.toHaveBeenCalled();
    expect(db.disableAgent).not.toHaveBeenCalled();
    expect(
      errorLines().some(
        (line) =>
          line.includes("paid_brain_finalize_failed") &&
          line.includes("ledger down") &&
          line.includes('"cycleId":4242'),
      ),
    ).toBe(true);
  });

  it("still finalises from durable state when the cycle row cannot be persisted", async () => {
    const { agent, config } = paidFixture();
    vi.mocked(db.persistCycleResult).mockRejectedValue(new Error("db down"));
    await runAgentOnce(pool, agent, config);
    expect(db.recordCycle).toHaveBeenCalledWith(
      pool,
      42,
      expect.objectContaining({ decision: "error", error: "db down" }),
    );
    expect(db.finalizePaidCall).toHaveBeenCalledWith(pool, reservedKey(), {
      mode: "cycle_end",
      cycleId: undefined,
    });
  });

  it("releases the reservation when setup fails before any call", async () => {
    const { agent, config } = paidFixture();
    vi.mocked(engine.selectProvider).mockImplementation(() => {
      throw new Error("fixture setup failure");
    });
    vi.mocked(db.finalizePaidCall).mockResolvedValue("released");
    await runAgentOnce(pool, agent, config);
    expect(decide).not.toHaveBeenCalled();
    expect(db.finalizePaidCall).toHaveBeenCalledWith(pool, reservedKey(), {
      mode: "cycle_end",
      cycleId: undefined,
    });
  });

  it.each(["balance_short", "cap_reached", "metering_uncertain"] as const)(
    "runs the explicit free fallback, never the paid model, when refused for %s",
    async (reason) => {
      const { agent, config } = paidFixture();
      vi.mocked(db.reservePaidCall).mockResolvedValue({
        kind: "refused",
        reason,
      });
      await runAgentOnce(pool, agent, config);
      const [route, routeKey] = vi.mocked(engine.providerForRoute).mock
        .calls[0]!;
      expect(route).toMatchObject({
        provider: "nvidia",
        model: NEMOTRON_SUPER,
      });
      expect(routeKey).toBe("fixture-nvidia");
      expect(db.markPaidCallDispatched).not.toHaveBeenCalled();
      expect(db.finalizePaidCall).not.toHaveBeenCalled();
      expect(db.pauseAgent).not.toHaveBeenCalled();
      const persisted = vi.mocked(db.persistCycleResult).mock.calls[0]![2];
      expect(persisted.cycle.log).toContain(
        `${paidBrainRefusalReason(reason)}: running on the free brain`,
      );
      expect(
        logLines().some((line) => line.includes("paid_brain_exhausted")),
      ).toBe(true);
    },
  );

  it.each([
    ["balance_short", PAID_BRAIN_PAUSE_REASON],
    ["cap_reached", "paid brain credit exhausted"],
    ["metering_uncertain", "paid brain metering uncertain"],
  ] as const)(
    "pauses an explicit 'pause' agent refused for %s, with no call",
    async (reason, pauseReason) => {
      const { agent, config } = paidFixture(pausePaidBrain);
      vi.mocked(db.reservePaidCall).mockResolvedValue({
        kind: "refused",
        reason,
      });
      await runAgentOnce(pool, agent, config);
      expect(db.pauseAgent).toHaveBeenCalledWith(pool, 42, pauseReason);
      expect(db.recordCycle).toHaveBeenCalledWith(
        pool,
        42,
        expect.objectContaining({ decision: "skip", skipReason: pauseReason }),
      );
      expect(engine.runCycle).not.toHaveBeenCalled();
      expect(decide).not.toHaveBeenCalled();
    },
  );

  it("treats an unavailable ledger as no credit: free agents fall back, pause agents skip", async () => {
    const free = paidFixture();
    vi.mocked(db.reservePaidCall).mockRejectedValue(new Error("db blip"));
    await runAgentOnce(pool, free.agent, free.config);
    expect(engine.providerForRoute).toHaveBeenCalled();
    expect(db.markPaidCallDispatched).not.toHaveBeenCalled();
    expect(
      errorLines().some((line) => line.includes("paid_brain_admission_failed")),
    ).toBe(true);

    decide.mockClear();
    const paused = paidFixture(pausePaidBrain);
    await runAgentOnce(pool, paused.agent, paused.config);
    expect(decide).not.toHaveBeenCalled();
    expect(db.pauseAgent).not.toHaveBeenCalled();
    expect(db.rescheduleToCadence).toHaveBeenCalledWith(pool, 42);
    expect(db.recordCycle).toHaveBeenCalledWith(
      pool,
      42,
      expect.objectContaining({
        skipReason: "paid brain credit check unavailable",
      }),
    );
  });

  it("never admits a disabled (Gemini) brain: it follows the exhaustion choice without reserving", async () => {
    const { agent, config } = paidFixture({
      modelId: "gemini-2.5-flash",
      monthlyCapUsd: 5,
      onExhausted: "free",
      fallback,
    });
    await runAgentOnce(pool, agent, config);
    expect(db.reservePaidCall).not.toHaveBeenCalled();
    expect(engine.providerForRoute).toHaveBeenCalled();
    for (const call of vi.mocked(engine.selectProvider).mock.calls) {
      expect(call[1]).not.toHaveProperty("GEMINI_API_KEY");
    }
  });

  it("skips as recoverable infrastructure, with no reservation, when the platform key is missing", async () => {
    const { agent, config } = paidFixture();
    config.paidAnthropicApiKey = undefined;
    await runAgentOnce(pool, agent, config);
    expect(db.reservePaidCall).not.toHaveBeenCalled();
    expect(engine.runCycle).not.toHaveBeenCalled();
    expect(db.disableAgent).not.toHaveBeenCalled();
    expect(db.rescheduleToCadence).toHaveBeenCalledWith(pool, 42);
    expect(db.recordCycle).toHaveBeenCalledWith(
      pool,
      42,
      expect.objectContaining({
        skipReason: "hosted provider temporarily unavailable",
      }),
    );
    expect(
      errorLines().some((line) =>
        line.includes("paid_brain_platform_key_missing"),
      ),
    ).toBe(true);
    expect(errorLines().join("\n")).not.toContain("fixture-paid");
  });

  it("treats a spec without an explicit onExhausted as NOT paid and never uses the platform key", async () => {
    const { agent, config } = paidFixture({
      modelId: "claude-sonnet-5-5",
      monthlyCapUsd: 25,
      fallback,
    });
    await runAgentOnce(pool, agent, config);
    expect(db.reservePaidCall).not.toHaveBeenCalled();
    for (const call of vi.mocked(engine.selectProvider).mock.calls) {
      expect(call[1]).toEqual({ ANTHROPIC_API_KEY: undefined });
    }
    expect(
      errorLines().some(
        (line) =>
          line.includes("paid_brain_spec_invalid") &&
          line.includes("onExhausted"),
      ),
    ).toBe(true);
  });

  it("leaves free agents untouched", async () => {
    const { agent, config } = paidFixture();
    agent.spec = parseSkill(renderFolderOfOne("fixture", "conservative")).spec;
    agent.modelProvider = "nvidia";
    agent.modelName = NEMOTRON_SUPER;
    await runAgentOnce(pool, agent, config);
    expect(db.reservePaidCall).not.toHaveBeenCalled();
    expect(db.finalizePaidCall).not.toHaveBeenCalled();
    expect(errorLines()).toEqual([]);
  });
});

describe("recoverPaidCalls", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it("finalises idle calls by the durable rules, counts outcomes and alerts each uncertain call once", async () => {
    vi.spyOn(db, "listPaidRecoveryCandidates").mockResolvedValue({
      stale: ["reserve:1:a", "reserve:1:b", "reserve:1:c", "reserve:1:d"],
      uncertain: [{ reserveKey: "reserve:2:u", userId: 19, agentId: 2 }],
    });
    vi.spyOn(db, "finalizePaidCall")
      .mockResolvedValueOnce("released")
      .mockResolvedValueOnce("debited")
      .mockResolvedValueOnce("uncertain")
      .mockRejectedValueOnce(new Error("db blip"))
      .mockResolvedValue("closed");
    const alerted = new Set<string>();
    expect(await recoverPaidCalls(pool, alerted)).toEqual({
      released: 1,
      debited: 1,
      uncertain: 1,
      failed: 1,
    });
    for (const call of vi.mocked(db.finalizePaidCall).mock.calls) {
      expect(call[2]).toEqual({ mode: "recovery" });
    }
    expect(
      errorLines().some((line) => line.includes("paid_brain_recovery_failed")),
    ).toBe(true);
    const uncertainAlerts = () =>
      errorLines().filter(
        (line) =>
          line.includes("paid_brain_metering_uncertain") &&
          line.includes("reserve:2:u"),
      ).length;
    expect(uncertainAlerts()).toBe(1);
    await recoverPaidCalls(pool, alerted);
    expect(uncertainAlerts()).toBe(1);
  });
});

describe("paidBrainFor, fallbackAgentFor and refusal reasons", () => {
  it("accepts a row on its paid route with no BYO key and a billable owner", () => {
    expect(paidBrainFor(paidFixture().agent).kind).toBe("paid");
  });
  it.each([
    ["a BYO key", { brainKeyEnc: "enc" }],
    ["other provider", { modelProvider: "nvidia" }],
    ["other model", { modelName: "claude-opus-5-5" }],
    ["no owner", { ownerUserId: null }],
    ["unknown owner", { ownerUserId: undefined }],
    ["zero owner", { ownerUserId: 0 }],
    ["fractional owner", { ownerUserId: 1.5 }],
  ])("treats a row with %s as NOT paid", (_label, change) => {
    expect(paidBrainFor({ ...paidFixture().agent, ...change }).kind).toBe(
      "invalid",
    );
  });
  it("routes the fallback as an ordinary shared NVIDIA row", () => {
    const { agent } = paidFixture();
    const brain = parsePaidBrain(agent.spec) as PaidBrain;
    expect(
      fallbackAgentFor({ ...agent, modelBaseUrl: "https://x.example" }, brain),
    ).toEqual({
      ...agent,
      modelProvider: "nvidia",
      modelName: NEMOTRON_SUPER,
      modelBaseUrl: null,
    });
  });
  it("names the refusal for the owner", () => {
    expect(paidBrainRefusalReason("balance_short")).toBe(
      "paid brain credit exhausted",
    );
    expect(paidBrainRefusalReason("cap_reached")).toBe(
      "paid brain credit exhausted",
    );
    expect(paidBrainRefusalReason("metering_uncertain")).toBe(
      "paid brain metering uncertain",
    );
    expect(paidBrainRefusalReason("model_disabled")).toBe(
      "paid brain model unavailable",
    );
  });
});
