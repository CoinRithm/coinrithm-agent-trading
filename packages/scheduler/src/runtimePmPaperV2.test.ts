import { afterEach, describe, expect, it, vi } from "vitest";
import type { Pool } from "pg";
import * as engine from "@coinrithm/mcp-trading/engine";
import { parseSkill } from "@coinrithm/mcp-trading/dist/agent/skill.js";
import { renderFolderOfOne } from "@coinrithm/mcp-trading/dist/agent/templates.js";
import { runAgentOnce, hydrateState } from "./runtime.js";
import { encrypt } from "./crypto.js";
import { loadConfig, type Config } from "./config.js";
import type { AgentRow } from "./db.js";
const key = Buffer.alloc(32, 7);
const scope = { userId: 1, apiKeyId: 2, walletId: 3, houseAgentId: 4 };
const policy = {
  ...scope,
  version: "pm_paper_house_v2" as const,
  entryEnabled: true,
  maxCashBudgetPerEntry: "25",
  maxOpenPositions: 3,
  maxEntriesPerDay: 4,
  maxModelCallsPerHour: 12,
  maxDailyLoss: "50",
  discoveryQuery: "Bitcoin",
};
function fixture() {
  const spec = parseSkill(renderFolderOfOne("test", "conservative")).spec;
  spec.venues = ["pm"];
  const agent: AgentRow = {
    id: 4,
    handle: "fixture",
    displayName: "Fixture",
    live: true,
    cadenceSeconds: 600,
    modelProvider: "nvidia",
    modelName: "fixture",
    modelBaseUrl: null,
    spec,
    prose: "fixture",
    coinrithmKeyEnc: encrypt("fixture-api-key", key),
    brainKeyEnc: null,
    ownerUserId: 1,
    isHouse: true,
  };
  const config = {
    encryptionKey: key,
    nvidiaApiKeys: ["fixture-provider-key"],
    routerEnabled: false,
    coinrithmApiUrl: "https://test.invalid",
    pmPaperV2Houses: [policy],
  } as Config;
  let stored: unknown = undefined;
  const query = vi.fn(async (sql: string, args?: unknown[]) => {
    if (sql.startsWith("SELECT state"))
      return { rows: stored ? [{ state: structuredClone(stored) }] : [] };
    if (sql.includes("INSERT INTO agent_runtime.agent_state"))
      stored = JSON.parse(String(args?.[1]));
    return { rows: [] };
  });
  const pool = {
    query,
    connect: async () => ({ query, release: () => {} }),
  } as unknown as Pool;
  const context = {
    executionModel: "pm_paper_v2",
    configuredHouse: scope,
    entryEnabled: true,
    risk: {
      asOf: new Date().toISOString(),
      dayKey: new Date().toISOString().slice(0, 10),
      totalOpen: 1,
      openReservedCashQuanta6: "10000000",
      openedToday: 1,
      closedToday: 0,
      realizedPnlTodayQuanta6: "0",
      accountingComplete: true,
      legacyExposurePresent: false,
    },
    positions: [
      {
        id: 10,
        source: "kalshi",
        slug: "fixture",
        outcomeExternalMarketId: "native",
        side: "no",
        status: "open",
        accountingStatus: "open",
        quantityUnits2: "100",
        reservedCashQuanta6: "10000000",
        pnlQuanta6: null,
        payoutQuanta6: null,
        exit: null,
      },
    ],
  };
  const close = vi.fn(async (body: unknown) => {
    expect(stored).toMatchObject({
      pmPaperV2Pending: { kind: "close", scope, body },
    });
    return { ok: false, status: 0, data: {} };
  });
  const client = {
    pmPaperV2Positions: async () => ({ ok: true, status: 200, data: context }),
    discoverPmMarkets: async () => ({
      ok: true,
      status: 200,
      data: { data: [] },
    }),
    closePmPaperV2: close,
  };
  const decide = vi.fn(async () => ({
    ok: true as const,
    text: JSON.stringify({
      decision: "act",
      actions: [{ type: "pm_v2_close", positionId: 10 }],
    }),
  }));
  vi.spyOn(engine, "selectProvider").mockReturnValue({
    label: "fixture",
    decide,
  });
  vi.spyOn(engine, "CoinRithmClient").mockImplementation(function () {
    return client;
  } as unknown as typeof engine.CoinRithmClient);
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      throw new Error("network forbidden");
    }),
  );
  return {
    agent,
    config,
    pool,
    query,
    close,
    decide,
    context,
    stored: () => stored,
  };
}
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
describe("hosted PM v2 dispatch and durable recovery", () => {
  it("default config enrolls nobody and configured JSON pins independent entry switch", () => {
    const env = {
      DATABASE_URL: "postgresql://fixture/unused",
      ENCRYPTION_KEY: key.toString("hex"),
    };
    expect(loadConfig(env).pmPaperV2Houses).toEqual([]);
    expect(
      loadConfig({
        ...env,
        SCHEDULER_PM_PAPER_V2_HOUSES_JSON: JSON.stringify([
          { ...policy, entryEnabled: undefined },
        ]),
      }).pmPaperV2Houses?.[0].entryEnabled,
    ).toBe(false);
  });
  it.each(["missing", "customer", "owner"])(
    "retains generic cycle for %s enrollment",
    async (mode) => {
      const f = fixture();
      if (mode === "missing") f.config.pmPaperV2Houses = [];
      if (mode === "customer") f.agent.isHouse = false;
      if (mode === "owner") f.agent.ownerUserId = 9;
      const legacy = vi
        .spyOn(engine, "runCycle")
        .mockResolvedValue({ decision: "skip", planned: [], live: true });
      await runAgentOnce(f.pool, f.agent, f.config);
      expect(legacy).toHaveBeenCalledTimes(1);
      expect(f.close).not.toHaveBeenCalled();
    },
  );
  it("actual runtime checkpoints before API then resumes exact request through JSON state with entries disabled", async () => {
    const f = fixture();
    const legacy = vi.spyOn(engine, "runCycle");
    await runAgentOnce(f.pool, f.agent, f.config);
    expect(legacy).not.toHaveBeenCalled();
    expect(f.close).toHaveBeenCalledTimes(1);
    const original = f.close.mock.calls[0][0];
    expect(f.stored()).toHaveProperty("pmPaperV2Pending");
    expect(hydrateState(f.stored(), "new-run").pmPaperV2Pending).toMatchObject({
      body: original,
    });
    f.context.entryEnabled = false;
    f.config.pmPaperV2Houses = [{ ...policy, entryEnabled: false }];
    f.decide.mockClear();
    f.close.mockImplementation(async () => ({
      ok: true,
      status: 202,
      data: {
        executionModel: "pm_paper_v2",
        accepted: true,
        executed: false,
        positionId: 10,
        intent: { id: "i", status: "pending" },
        replayed: true,
      },
    }));
    await runAgentOnce(f.pool, f.agent, f.config);
    expect(f.close.mock.calls[1][0]).toEqual(original);
    expect(f.decide).not.toHaveBeenCalled();
    expect(f.stored()).not.toHaveProperty("pmPaperV2Pending");
    const cycles = f.query.mock.calls.filter(([sql]) =>
      sql.includes("INSERT INTO agent_runtime.agent_cycles"),
    );
    const last = JSON.parse(String(cycles.at(-1)?.[1]?.[8]));
    expect(last[0]).toMatchObject({
      accepted: true,
      executed: false,
      executionPending: true,
      executionReplayed: true,
    });
  });
});
