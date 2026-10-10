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
    configuredHouse: { ...scope } as typeof scope & { maxEndDays?: number },
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
    ] as Record<string, unknown>[],
  };
  const close = vi.fn(async (body: unknown) => {
    expect(stored).toMatchObject({
      pmPaperV2Pending: { kind: "close", scope, body },
    });
    return { ok: false, status: 0, data: {} };
  });
  const client = {
    pmPaperV2Positions: async () => ({ ok: true, status: 200, data: context }),
    discoverPmPaperV2: vi.fn(async () => ({
      ok: true,
      status: 200,
      data: {
        executionModel: "pm_paper_v2",
        data: [] as Record<string, unknown>[],
      },
    })),
    discoverPmMarkets: vi.fn(async () => {
      throw new Error("legacy discovery forbidden in v2");
    }),
    openPmPaperV2: vi.fn(async (body: unknown) => {
      expect(stored).toMatchObject({
        pmPaperV2Pending: { kind: "open", scope, body },
      });
      return {
        ok: true,
        status: 200,
        data: {
          executionModel: "pm_paper_v2",
          accepted: true,
          executed: true,
          positionId: 11,
          replayed: false,
        },
      };
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
    client,
    stored: () => stored,
  };
}
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
describe("hosted PM v2 dispatch and durable recovery", () => {
  it("actual hosted cycle filters native aliases and maturity before model cap", async () => {
    const f = fixture();
    f.context.positions = [];
    f.context.risk.totalOpen = 0;
    f.context.configuredHouse.maxEndDays = 1;
    f.config.pmPaperV2Houses = [{ ...policy, maxEndDays: 1 }];
    const now = Date.now(),
      day = 86_400_000;
    const native = (id: string, end: number) => ({
      externalMarketId: id,
      probability: 60,
      nativeMarket: { venue: "kalshi", key: `kalshi:${id}` },
      nativeEndAt: new Date(end).toISOString(),
      nativeEndBasis: "kalshi_market_close_time",
      settlementTimeKnown: false,
    });
    f.client.discoverPmPaperV2.mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        executionModel: "pm_paper_v2",
        data: [
          {
            source: "kalshi",
            slug: "fixture",
            outcomes: [
              ...Array.from({ length: 15 }, (_, i) =>
                native(`ANNUAL-${i}`, now + 365 * day),
              ),
              ...Array.from({ length: 15 }, (_, i) =>
                native(`NEAR-${i}`, now + 3600000),
              ),
            ],
          },
        ],
      },
    });
    f.decide.mockImplementation(async () => ({
      ok: true,
      text: JSON.stringify({
        decision: "act",
        actions: [
          {
            type: "pm_v2_open",
            source: "kalshi",
            slug: "fixture",
            outcomeExternalMarketId: "NEAR-11",
            side: "yes",
            maxCashBudget: "10",
          },
        ],
      }),
    }));
    const legacy = vi.spyOn(engine, "runCycle");
    await runAgentOnce(f.pool, f.agent, f.config);
    expect(legacy).not.toHaveBeenCalled();
    expect(f.client.discoverPmMarkets).not.toHaveBeenCalled();
    expect(f.client.discoverPmPaperV2).toHaveBeenCalledWith({
      q: "Bitcoin",
      limit: 20,
    });
    const prompt = JSON.parse(f.decide.mock.calls[0]?.[0].user);
    expect(prompt.markets).toHaveLength(12);
    expect(
      prompt.markets.map(
        (m: { outcomeExternalMarketId: string }) => m.outcomeExternalMarketId,
      ),
    ).toEqual(Array.from({ length: 12 }, (_, i) => `NEAR-${i}`));
    expect(prompt.policy.maxEndDays).toBe(1);
    expect(f.client.openPmPaperV2).toHaveBeenCalledOnce();
    expect(f.stored()).not.toHaveProperty("pmPaperV2Pending");
  });
  it("actual hosted cycle holds entries on server horizon mismatch without legacy fallback", async () => {
    const f = fixture();
    f.context.positions = [];
    f.context.risk.totalOpen = 0;
    f.config.pmPaperV2Houses = [{ ...policy, maxEndDays: 1 }];
    const legacy = vi.spyOn(engine, "runCycle");
    await runAgentOnce(f.pool, f.agent, f.config);
    expect(legacy).not.toHaveBeenCalled();
    expect(f.decide).not.toHaveBeenCalled();
    expect(f.client.discoverPmPaperV2).not.toHaveBeenCalled();
    expect(f.client.openPmPaperV2).not.toHaveBeenCalled();
  });
  it.each(["missing", "owner", "key", "wallet", "plan", "malformed"])(
    "never falls back for a persisted PM house with %s enrollment",
    async (mode) => {
      const f = fixture();
      f.agent.persistedPmPaperHouse = {
        plan: "house",
        identity: {
          version: "pm_paper_house_identity_v1",
          planHash: "a".repeat(64),
          ...scope,
        },
      };
      if (mode === "missing") f.config.pmPaperV2Houses = [];
      if (mode === "owner") f.agent.ownerUserId = 9;
      if (mode === "key")
        f.config.pmPaperV2Houses = [{ ...policy, apiKeyId: 99 }];
      if (mode === "wallet")
        f.config.pmPaperV2Houses = [{ ...policy, walletId: 99 }];
      if (mode === "plan") f.agent.persistedPmPaperHouse.plan = "customer";
      if (mode === "malformed") f.agent.persistedPmPaperHouse.identity = null;
      const legacy = vi.spyOn(engine, "runCycle");
      const v2 = vi.spyOn(engine, "runPmPaperCycle");
      await runAgentOnce(f.pool, f.agent, f.config);
      expect(legacy).not.toHaveBeenCalled();
      expect(v2).not.toHaveBeenCalled();
      expect(engine.selectProvider).not.toHaveBeenCalled();
      expect(engine.CoinRithmClient).not.toHaveBeenCalled();
      expect(f.decide).not.toHaveBeenCalled();
      expect(f.close).not.toHaveBeenCalled();
      expect(
        f.query.mock.calls.some(([sql]) => sql.startsWith("SELECT state")),
      ).toBe(false);
      const cycle = f.query.mock.calls.find(([sql]) =>
        sql.includes("INSERT INTO agent_runtime.agent_cycles"),
      );
      expect(cycle?.[1]).toContain(
        "PM paper house enrollment unavailable or mismatched",
      );
      expect(
        f.query.mock.calls.some(([sql]) =>
          sql.includes("UPDATE agent_runtime.agents"),
        ),
      ).toBe(true);
    },
  );
  it("ignores marker-like customer skill input and preserves legacy dispatch", async () => {
    const f = fixture();
    f.agent.isHouse = false;
    f.agent.spec = {
      ...(f.agent.spec as object),
      manifest: { pmPaperHouseIdentity: { ...scope } },
    };
    const legacy = vi
      .spyOn(engine, "runCycle")
      .mockResolvedValue({ decision: "skip", planned: [], live: true });
    await runAgentOnce(f.pool, f.agent, f.config);
    expect(legacy).toHaveBeenCalledTimes(1);
    expect(f.close).not.toHaveBeenCalled();
  });

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
    f.agent.persistedPmPaperHouse = {
      plan: "house",
      identity: {
        version: "pm_paper_house_identity_v1",
        planHash: "a".repeat(64),
        ...scope,
      },
    };
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
