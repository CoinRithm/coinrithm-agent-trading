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
  runAgentOnce,
} from "./runtime.js";
import { parsePaidBrain, type PaidBrain } from "./paidBrain.js";
import { NEMOTRON_SUPER } from "./route.js";

const key = Buffer.alloc(32, 9);
const pool = {} as Pool;
const input = {
  system: "fixture system",
  user: "fixture user",
  timeoutMs: 1000,
};
const answered = {
  ok: true as const,
  text: '{"decision":"skip","actions":[]}',
  usage: { promptTokens: 20_000, completionTokens: 400 },
};
// The runner's chars/4 estimate when the provider reports no usage.
const ESTIMATED_IN = 5_000;
const ESTIMATED_OUT = 100;
const fallback = { provider: "nvidia", name: NEMOTRON_SUPER };

function paidFixture(
  paidBrain: Record<string, unknown> = {
    modelId: "claude-sonnet-5-5",
    monthlyCapUsd: 25,
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
  const entry = parsePaidBrain({ paidBrain })?.entry;
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

const errorLines = () =>
  vi.mocked(console.error).mock.calls.map((call) => String(call[0]));
const logLines = () =>
  vi.mocked(console.log).mock.calls.map((call) => String(call[0]));

describe("paid brain runtime wiring", () => {
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
    vi.spyOn(db, "readCreditPosition").mockResolvedValue({
      balanceMicro: 10_000_000,
      monthSpendMicro: 0,
    });
    vi.spyOn(db, "insertDebit").mockResolvedValue(true);
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
    // Mirrors the runner's metering: provider-reported usage when present,
    // else its chars/4 estimate; a deferred attempt made no call.
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
        tokensIn: made ? (res.usage?.promptTokens ?? ESTIMATED_IN) : 0,
        tokensOut: made ? (res.usage?.completionTokens ?? ESTIMATED_OUT) : 0,
        effectiveProvider: made
          ? (res.route?.effectiveProvider ?? deps.spec.model?.provider)
          : undefined,
        effectiveModel: made
          ? (res.route?.effectiveModel ?? deps.spec.model?.name)
          : undefined,
      };
    });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("admits a funded agent, calls the paid model with the platform key and debits once", async () => {
    const { agent, config } = paidFixture();
    await runAgentOnce(pool, agent, config);

    const [, since] = vi.mocked(db.readCreditPosition).mock.calls[0]!.slice(2);
    expect(vi.mocked(db.readCreditPosition).mock.calls[0]!.slice(0, 3)).toEqual(
      [pool, 19, 42],
    );
    expect((since as Date).getUTCDate()).toBe(1);
    expect((since as Date).getUTCHours()).toBe(0);

    expect(engine.selectProvider).toHaveBeenCalledOnce();
    const [spec, env] = vi.mocked(engine.selectProvider).mock.calls[0]!;
    expect(spec.model).toEqual({
      provider: "anthropic",
      name: "claude-sonnet-5-5",
    });
    // ONLY the platform key: no shared NVIDIA key, no BYO key.
    expect(env).toEqual({ ANTHROPIC_API_KEY: "fixture-paid-anthropic" });
    // Never through the shared router.
    expect(engine.providerForRoute).not.toHaveBeenCalled();
    expect(capacity.reserveProviderCapacity).not.toHaveBeenCalled();
    expect(decide).toHaveBeenCalledOnce();

    expect(db.persistCycleResult).toHaveBeenCalledWith(
      pool,
      42,
      expect.objectContaining({
        model: { provider: "anthropic", name: "claude-sonnet-5-5" },
      }),
    );
    expect(db.insertDebit).toHaveBeenCalledOnce();
    // 20k x $2/M + 400 x $10/M = 44,000 micro; +20% margin = 52,800.
    expect(db.insertDebit).toHaveBeenCalledWith(pool, {
      userId: 19,
      agentId: 42,
      cycleId: 4242,
      modelId: "claude-sonnet-5-5",
      tokensIn: 20_000,
      tokensOut: 400,
      providerCostMicro: 44_000,
      marginMicro: 8_800,
      totalMicro: 52_800,
      idempotencyKey: "debit:4242",
      note: undefined,
    });
    expect(logLines().some((line) => line.includes("paid_brain_debited"))).toBe(
      true,
    );
    expect(errorLines()).toEqual([]);
    expect(db.recordCycle).not.toHaveBeenCalled();
    expect(db.pauseAgent).not.toHaveBeenCalled();
  });

  it("debits at the runner's estimate, flagged in the note, when usage is missing", async () => {
    const { agent, config } = paidFixture();
    config.paidBrainMarginPct = 0;
    decide.mockResolvedValue({ ok: true, text: answered.text });
    await runAgentOnce(pool, agent, config);
    expect(db.insertDebit).toHaveBeenCalledWith(
      pool,
      expect.objectContaining({
        tokensIn: ESTIMATED_IN,
        tokensOut: ESTIMATED_OUT,
        // (5000 x 2000 + 100 x 10000) / 1000 = 11,000; margin 0.
        providerCostMicro: 11_000,
        marginMicro: 0,
        totalMicro: 11_000,
        note: "usage estimated",
      }),
    );
  });

  it("uses the Gemini platform key for a Gemini paid brain", async () => {
    const { agent, config } = paidFixture({
      modelId: "gemini-2.5-flash",
      monthlyCapUsd: 5,
      fallback,
    });
    await runAgentOnce(pool, agent, config);
    const [spec, env] = vi.mocked(engine.selectProvider).mock.calls[0]!;
    expect(spec.model).toEqual({
      provider: "gemini",
      name: "gemini-2.5-flash",
    });
    expect(env).toEqual({ GEMINI_API_KEY: "fixture-paid-gemini" });
    expect(db.insertDebit).toHaveBeenCalledWith(
      pool,
      expect.objectContaining({ modelId: "gemini-2.5-flash", cycleId: 4242 }),
    );
  });

  it.each([
    ["the balance is short", { balanceMicro: 0, monthSpendMicro: 0 }],
    [
      "the monthly cap is reached",
      { balanceMicro: 10_000_000, monthSpendMicro: 25_000_000 },
    ],
  ])(
    "runs the free fallback, without a debit, when %s (onExhausted free)",
    async (_label, position) => {
      const { agent, config } = paidFixture();
      vi.mocked(db.readCreditPosition).mockResolvedValue(position);
      await runAgentOnce(pool, agent, config);
      // The shared hosted router on the fallback model with the shared key.
      expect(engine.providerForRoute).toHaveBeenCalled();
      const [route, routeKey] = vi.mocked(engine.providerForRoute).mock
        .calls[0]!;
      expect(route).toMatchObject({
        provider: "nvidia",
        model: NEMOTRON_SUPER,
      });
      expect(routeKey).toBe("fixture-nvidia");
      for (const call of vi.mocked(engine.selectProvider).mock.calls) {
        expect(call[1]).not.toHaveProperty("ANTHROPIC_API_KEY");
      }
      expect(db.insertDebit).not.toHaveBeenCalled();
      expect(db.pauseAgent).not.toHaveBeenCalled();
      expect(db.persistCycleResult).toHaveBeenCalledOnce();
      const persisted = vi.mocked(db.persistCycleResult).mock.calls[0]![2];
      expect(persisted.cycle.log).toContain("running on the free brain");
      expect(
        logLines().some((line) => line.includes("paid_brain_exhausted")),
      ).toBe(true);
    },
  );

  it("pauses an exhausted 'pause' agent without any provider call or debit", async () => {
    const { agent, config } = paidFixture({
      modelId: "claude-opus-5-5",
      monthlyCapUsd: 25,
      onExhausted: "pause",
      fallback,
    });
    vi.mocked(db.readCreditPosition).mockResolvedValue({
      balanceMicro: 1,
      monthSpendMicro: 0,
    });
    await runAgentOnce(pool, agent, config);
    expect(db.pauseAgent).toHaveBeenCalledWith(
      pool,
      42,
      PAID_BRAIN_PAUSE_REASON,
    );
    expect(PAID_BRAIN_PAUSE_REASON).toBe("paid brain credit exhausted");
    expect(db.recordCycle).toHaveBeenCalledWith(
      pool,
      42,
      expect.objectContaining({
        decision: "skip",
        skipReason: PAID_BRAIN_PAUSE_REASON,
        llmCallMade: false,
      }),
    );
    expect(engine.runCycle).not.toHaveBeenCalled();
    expect(engine.selectProvider).not.toHaveBeenCalled();
    expect(decide).not.toHaveBeenCalled();
    expect(db.insertDebit).not.toHaveBeenCalled();
    expect(db.disableAgent).not.toHaveBeenCalled();
  });

  it("still skips (never runs paid) when the pause write itself fails", async () => {
    const { agent, config } = paidFixture({
      modelId: "claude-sonnet-5-5",
      monthlyCapUsd: 25,
      onExhausted: "pause",
      fallback,
    });
    vi.mocked(db.readCreditPosition).mockResolvedValue({
      balanceMicro: 0,
      monthSpendMicro: 0,
    });
    vi.mocked(db.pauseAgent).mockRejectedValue(new Error("db blip"));
    await runAgentOnce(pool, agent, config);
    expect(decide).not.toHaveBeenCalled();
    expect(
      errorLines().some((line) => line.includes("paid_brain_pause_failed")),
    ).toBe(true);
  });

  it("treats an unreadable ledger as no credit: free agents fall back, pause agents skip", async () => {
    const free = paidFixture();
    vi.mocked(db.readCreditPosition).mockRejectedValue(new Error("db blip"));
    await runAgentOnce(pool, free.agent, free.config);
    expect(engine.providerForRoute).toHaveBeenCalled();
    expect(db.insertDebit).not.toHaveBeenCalled();
    expect(
      errorLines().some((line) => line.includes("paid_brain_admission_failed")),
    ).toBe(true);

    vi.mocked(engine.providerForRoute).mockClear();
    decide.mockClear();
    const paused = paidFixture({
      modelId: "claude-sonnet-5-5",
      monthlyCapUsd: 25,
      onExhausted: "pause",
      fallback,
    });
    await runAgentOnce(pool, paused.agent, paused.config);
    expect(decide).not.toHaveBeenCalled();
    expect(db.pauseAgent).not.toHaveBeenCalled();
    expect(db.rescheduleToCadence).toHaveBeenCalledWith(pool, 42);
    expect(db.recordCycle).toHaveBeenCalledWith(
      pool,
      42,
      expect.objectContaining({
        decision: "skip",
        skipReason: "paid brain credit check unavailable",
      }),
    );
  });

  it("skips as recoverable infrastructure, never debits, when the platform key is missing", async () => {
    const { agent, config } = paidFixture();
    config.paidAnthropicApiKey = undefined;
    await runAgentOnce(pool, agent, config);
    expect(engine.selectProvider).not.toHaveBeenCalled();
    expect(engine.runCycle).not.toHaveBeenCalled();
    expect(db.insertDebit).not.toHaveBeenCalled();
    expect(db.disableAgent).not.toHaveBeenCalled();
    expect(db.rescheduleToCadence).toHaveBeenCalledWith(pool, 42);
    expect(db.recordCycle).toHaveBeenCalledWith(
      pool,
      42,
      expect.objectContaining({
        decision: "skip",
        skipReason: "hosted provider temporarily unavailable",
        llmCallMade: false,
      }),
    );
    expect(
      errorLines().some((line) =>
        line.includes("paid_brain_platform_key_missing"),
      ),
    ).toBe(true);
    expect(errorLines().join("\n")).not.toContain("fixture-paid");
  });

  it.each([
    [
      "a failed provider call",
      { ok: false, error: "anthropic HTTP 500: upstream", status: 500 },
    ],
    [
      "a provider rate limit",
      { ok: false, error: "anthropic HTTP 429: slow down", status: 429 },
    ],
    [
      "a malformed (incomplete) response",
      {
        ok: false,
        failureClass: "malformed",
        error: "provider returned incomplete decision (output token limit)",
        usage: { promptTokens: 20_000, completionTokens: 1_024 },
      },
    ],
    ["a deferred attempt", { ok: false, error: "deferred", deferred: true }],
  ])("never debits %s", async (_label, response) => {
    const { agent, config } = paidFixture();
    decide.mockResolvedValue(response);
    await runAgentOnce(pool, agent, config);
    expect(db.persistCycleResult).toHaveBeenCalledOnce();
    expect(db.insertDebit).not.toHaveBeenCalled();
    expect(errorLines()).toEqual([]);
  });

  it("completes the cycle and alerts when the debit insert throws", async () => {
    const { agent, config } = paidFixture();
    vi.mocked(db.insertDebit).mockRejectedValue(new Error("ledger down"));
    await runAgentOnce(pool, agent, config);
    expect(db.persistCycleResult).toHaveBeenCalledOnce();
    expect(db.recordCycle).not.toHaveBeenCalled();
    expect(db.disableAgent).not.toHaveBeenCalled();
    expect(
      errorLines().some(
        (line) =>
          line.includes("paid_brain_debit_failed") &&
          line.includes("ledger down") &&
          line.includes('"cycleId":4242'),
      ),
    ).toBe(true);
  });

  it("does not debit, and alerts, when the cycle id is unavailable", async () => {
    const { agent, config } = paidFixture();
    vi.mocked(db.persistCycleResult).mockResolvedValue(undefined);
    await runAgentOnce(pool, agent, config);
    expect(db.insertDebit).not.toHaveBeenCalled();
    expect(
      errorLines().some(
        (line) =>
          line.includes("paid_brain_debit_failed") &&
          line.includes("cycle id unavailable"),
      ),
    ).toBe(true);
  });

  it("alerts on an answered call whose cycle could not be persisted, and charges nothing", async () => {
    const { agent, config } = paidFixture();
    vi.mocked(db.persistCycleResult).mockRejectedValue(new Error("db down"));
    await runAgentOnce(pool, agent, config);
    expect(db.insertDebit).not.toHaveBeenCalled();
    expect(db.recordCycle).toHaveBeenCalledWith(
      pool,
      42,
      expect.objectContaining({ decision: "error", error: "db down" }),
    );
    expect(
      errorLines().some(
        (line) =>
          line.includes("paid_brain_debit_failed") &&
          line.includes("cycle not persisted"),
      ),
    ).toBe(true);
  });

  it("alerts on an answered call it cannot price (served by another route)", async () => {
    const { agent, config } = paidFixture();
    vi.mocked(engine.runCycle).mockImplementation(async (deps) => {
      await deps.provider.decide(input);
      return {
        decision: "skip",
        planned: [],
        live: false,
        llmCallMade: true,
        tokensIn: 10,
        tokensOut: 10,
        effectiveProvider: "nvidia",
        effectiveModel: NEMOTRON_SUPER,
      };
    });
    await runAgentOnce(pool, agent, config);
    expect(db.insertDebit).not.toHaveBeenCalled();
    expect(
      errorLines().some(
        (line) =>
          line.includes("paid_brain_debit_failed") &&
          line.includes("served by a different route"),
      ),
    ).toBe(true);
  });

  it("charges nothing for an answered call that reported zero tokens", async () => {
    const { agent, config } = paidFixture();
    decide.mockResolvedValue({
      ...answered,
      usage: { promptTokens: 0, completionTokens: 0 },
    });
    await runAgentOnce(pool, agent, config);
    expect(db.insertDebit).not.toHaveBeenCalled();
    expect(errorLines()).toEqual([]);
  });

  it("never uses the platform key for a malformed paid spec", async () => {
    const { agent, config } = paidFixture({
      modelId: "claude-sonnet-5-5",
      monthlyCapUsd: -1,
      fallback,
    });
    await runAgentOnce(pool, agent, config);
    expect(db.readCreditPosition).not.toHaveBeenCalled();
    expect(db.insertDebit).not.toHaveBeenCalled();
    for (const call of vi.mocked(engine.selectProvider).mock.calls) {
      expect(call[1]).toEqual({ ANTHROPIC_API_KEY: undefined });
    }
    expect(
      errorLines().some((line) => line.includes("paid_brain_spec_invalid")),
    ).toBe(true);
  });

  it("leaves free agents untouched: no ledger read, no debit", async () => {
    const { agent, config } = paidFixture();
    agent.spec = parseSkill(renderFolderOfOne("fixture", "conservative")).spec;
    agent.modelProvider = "nvidia";
    agent.modelName = NEMOTRON_SUPER;
    await runAgentOnce(pool, agent, config);
    expect(db.readCreditPosition).not.toHaveBeenCalled();
    expect(db.insertDebit).not.toHaveBeenCalled();
    expect(errorLines()).toEqual([]);
  });
});

describe("paidBrainFor and fallbackAgentFor", () => {
  it("accepts a row on its paid route with no BYO key and a billable owner", () => {
    const { agent } = paidFixture();
    expect(paidBrainFor(agent).kind).toBe("paid");
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
    const { agent } = paidFixture();
    expect(paidBrainFor({ ...agent, ...change }).kind).toBe("invalid");
  });
  it("passes absent specs through", () => {
    const { agent } = paidFixture();
    expect(paidBrainFor({ ...agent, spec: {} }).kind).toBe("absent");
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
});
