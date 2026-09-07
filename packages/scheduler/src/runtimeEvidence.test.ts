import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Pool } from "pg";
import * as engine from "@coinrithm/mcp-trading/dist/agent/engine.js";
import { parseSkill } from "@coinrithm/mcp-trading/dist/agent/skill.js";
import { renderFolderOfOne } from "@coinrithm/mcp-trading/dist/agent/templates.js";
import { runAgentOnce } from "./runtime.js";
import { encrypt } from "./crypto.js";
import type { AgentRow } from "./db.js";
import type { Config } from "./config.js";

const ok = (data: unknown) => ({ ok: true, status: 200, data });
const testKey = Buffer.alloc(32, 7);

function fixtureAgent(): AgentRow {
  const spec = parseSkill(renderFolderOfOne("test", "conservative")).spec;
  spec.triggerPolicy = {
    mode: "always",
    skipLlmWhenNoTrigger: false,
    alwaysManageOpenPositions: true,
    maxLlmCallsPerHour: 0,
    debounceMinutes: 0,
    pmEvalCooldownMinutes: 0,
  };
  spec.limits.maxTradesPerDay = 3;
  return {
    id: 42,
    handle: "fixture",
    displayName: "Fixture",
    live: false,
    cadenceSeconds: 600,
    modelProvider: "nvidia",
    modelName: "test-model",
    modelBaseUrl: null,
    spec,
    prose: "PRIVATE_USER_STRATEGY",
    coinrithmKeyEnc: encrypt("fake-test-api-key", testKey),
    brainKeyEnc: null,
  };
}

function fixtureClient() {
  return {
    me: vi.fn(async () => ok({ scopes: ["read", "trade:futures"] })),
    portfolio: async () =>
      ok({ equity: { totalUsd: 50000, availableUsd: 1000 } }),
    wallet: async () => ok({ usdt: { available: 1000 } }),
    futuresPositions: async () => ok({ positions: [] }),
    trades: async () => ok({ asOf: "2026-09-07T00:00:00.000Z", trades: [] }),
    resolve: async () => ok({ match: { coinId: "1", name: "Bitcoin" } }),
    market: async () =>
      ok({
        price: { usd: 67000, change1h: 1, change24h: 2 },
        observation: { freshness: { status: "fresh", ageSeconds: 2 } },
      }),
    openOrders: async () => ok({ orders: [] }),
  };
}

function database(
  options: { loadFailure?: boolean; cycleFailure?: boolean } = {},
) {
  const state = engine.newState("run-fixture");
  state.riskIncreasesToday = 2;
  const query = vi.fn(async (sql: string) => {
    if (sql.startsWith("SELECT state")) {
      if (options.loadFailure) throw new Error("load fixture failure");
      return { rows: [{ state }] };
    }
    if (
      sql.includes("INSERT INTO agent_runtime.agent_cycles") &&
      options.cycleFailure
    ) {
      options.cycleFailure = false;
      throw new Error("transaction fixture failure");
    }
    return { rows: [] };
  });
  const release = vi.fn();
  const pool = {
    query,
    connect: vi.fn().mockResolvedValue({ query, release }),
  } as unknown as Pool;
  const inserts = () =>
    query.mock.calls.filter((c) =>
      String(c[0]).includes("INSERT INTO agent_runtime.agent_cycles"),
    );
  return { pool, query, release, inserts };
}

describe("hosted private input evidence integration", () => {
  let decide: ReturnType<typeof vi.fn>;
  let client: ReturnType<typeof fixtureClient>;
  const config = {
    encryptionKey: testKey,
    nvidiaApiKeys: ["fake-provider-key"],
    routerEnabled: false,
    coinrithmApiUrl: "https://test.invalid",
  } as Config;

  beforeEach(() => {
    client = fixtureClient();
    decide = vi.fn().mockResolvedValue({
      ok: true,
      text: '{"decision":"skip","actions":[]}',
    });
    vi.spyOn(engine, "selectProvider").mockImplementation(() => ({
      label: "fixture",
      decide,
    }));
    vi.spyOn(engine, "CoinRithmClient").mockImplementation(function () {
      return client;
    } as unknown as typeof engine.CoinRithmClient);
    // Fail loudly if any fixture accidentally tries to use a real network call.
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network forbidden in receipt integration");
      }),
    );
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("persists the real runner's non-enumerable receipt with state in one normal transaction", async () => {
    const db = database();
    await runAgentOnce(db.pool, fixtureAgent(), config);
    expect(decide).toHaveBeenCalledOnce();
    expect(db.inserts()).toHaveLength(1);
    const params = db.inserts()[0]![1] as unknown[];
    const receipt = JSON.parse(
      String(params[25]),
    ) as engine.DecisionInputRecord;
    expect(receipt).toMatchObject({
      phase: "decision_input",
      outcome: "returned",
      runId: "run-fixture",
      dailyRiskBudget: { limit: 3, used: 2, remaining: 1 },
      account: { cashAvailableMusd: 1000 },
    });
    expect(receipt.observationFingerprint).toBe(params[19]);
    expect(params[12]).toBe(true);
    expect(params[16]).toBe("skip");
    expect(params[23]).toBe("configured_direct");
    expect(params[8]).toBe("[]");
    expect(String(params[9])).not.toContain("decision-input");
    expect(String(params[9])).not.toContain("PRIVATE_USER_STRATEGY");
    expect(JSON.stringify(receipt)).not.toContain("PRIVATE_USER_STRATEGY");
    const sqls = db.query.mock.calls.map((c) => String(c[0]));
    const begin = sqls.indexOf("BEGIN");
    expect(begin).toBeGreaterThanOrEqual(0);
    expect(sqls[begin + 1]).toContain("INSERT INTO agent_runtime.agent_state");
    expect(sqls[begin + 2]).toContain("INSERT INTO agent_runtime.agent_cycles");
    expect(sqls.at(-1)).toBe("COMMIT");
    expect(db.release).toHaveBeenCalledOnce();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("persists a thrown-run callback receipt without inventing call or model attribution", async () => {
    decide.mockRejectedValue(new Error("fixture provider threw"));
    const db = database();
    await expect(
      runAgentOnce(db.pool, fixtureAgent(), config),
    ).resolves.toBeUndefined();
    expect(db.inserts()).toHaveLength(1);
    const params = db.inserts()[0]![1] as unknown[];
    const receipt = JSON.parse(
      String(params[25]),
    ) as engine.DecisionInputRecord;
    expect(receipt).toMatchObject({
      phase: "decision_input",
      outcome: "runtime_error",
    });
    expect(receipt.omissions).toContain("runtime_exception_after_snapshot");
    expect(JSON.stringify(receipt)).not.toContain("fixture provider threw");
    expect(params[1]).toBe("error");
    expect(params[12]).toBeNull();
    expect(params.slice(21, 24)).toEqual([null, null, null]);
    expect(params[8]).toBeNull();
    expect(String(params[9])).not.toContain("decision-input");
    // Preserve the existing run-error boundary: no partial mutable state is
    // written when the engine throws. Error evidence has its own cycle row.
    expect(
      db.query.mock.calls.some((c) =>
        String(c[0]).includes("INSERT INTO agent_runtime.agent_state"),
      ),
    ).toBe(false);
  });

  it("records a pre-observation exception as no-input evidence", async () => {
    client.me.mockRejectedValue(new Error("fixture observation threw"));
    const db = database();
    await runAgentOnce(db.pool, fixtureAgent(), config);
    expect(decide).not.toHaveBeenCalled();
    const params = db.inserts()[0]![1] as unknown[];
    const receipt = JSON.parse(
      String(params[25]),
    ) as engine.DecisionInputRecord;
    expect(receipt).toMatchObject({
      phase: "before_observation",
      outcome: "runtime_error",
      account: null,
    });
    expect(receipt.omissions).toContain("observation_not_available");
  });

  it("rolls back a normal-cycle persistence failure and retains callback evidence in the error row", async () => {
    const db = database({ cycleFailure: true });
    await runAgentOnce(db.pool, fixtureAgent(), config);
    expect(db.inserts()).toHaveLength(2);
    const params = db.inserts()[1]![1] as unknown[];
    const receipt = JSON.parse(
      String(params[25]),
    ) as engine.DecisionInputRecord;
    expect(receipt.outcome).toBe("returned");
    expect(params[1]).toBe("error");
    expect(params[10]).toBe("transaction fixture failure");
    const sqls = db.query.mock.calls.map((c) => String(c[0]));
    expect(sqls).toContain("ROLLBACK");
    expect(sqls).not.toContain("COMMIT");
    expect(db.release).toHaveBeenCalledOnce();
  });

  it.each(["load", "setup", "shared_setup"])(
    "marks %s failure as explicitly no-call with no fabricated input",
    async (kind) => {
      const db = database({ loadFailure: kind === "load" });
      const agent = fixtureAgent();
      if (kind === "setup")
        agent.coinrithmKeyEnc = "malformed encrypted fixture";
      const cfg =
        kind === "shared_setup"
          ? { ...config, routerEnabled: true, nvidiaApiKeys: [] }
          : config;
      await runAgentOnce(db.pool, agent, cfg);
      expect(decide).not.toHaveBeenCalled();
      const params = db.inserts()[0]![1] as unknown[];
      expect(params[12]).toBe(false);
      expect(params.slice(21, 24)).toEqual([null, null, null]);
      expect(params[25]).toBeNull();
    },
  );
});
