import { describe, expect, it, vi } from "vitest";
import { runPmPaperCycle } from "./pmPaperCycle.js";
import {
  readPmHousePolicies,
  selectPmHousePolicy,
  type PmHousePolicy,
} from "./pmPaperPolicy.js";
import { parseDecisionForContract } from "./decision.js";
import { buildChatBody, chatShapeFor } from "./providerCapabilities.js";
import { newState } from "./state.js";
import type { RunnerDeps } from "./runner.js";
const scope = { userId: 1, apiKeyId: 2, walletId: 3, houseAgentId: 4 };
const policy: PmHousePolicy = {
  ...scope,
  version: "pm_paper_house_v2",
  entryEnabled: true,
  maxCashBudgetPerEntry: "25",
  maxOpenPositions: 3,
  maxEntriesPerDay: 4,
  maxModelCallsPerHour: 12,
  maxDailyLoss: "50",
  discoveryQuery: "Bitcoin",
};
const action = {
  type: "pm_v2_open" as const,
  source: "kalshi" as const,
  slug: "fixture",
  outcomeExternalMarketId: "native-YES",
  side: "no" as const,
  maxCashBudget: "10.01",
};
const read = () => ({
  executionModel: "pm_paper_v2",
  configuredHouse: { ...scope } as typeof scope & { maxEndDays?: number },
  entryEnabled: true,
  risk: {
    asOf: new Date().toISOString(),
    dayKey: new Date().toISOString().slice(0, 10),
    totalOpen: 0,
    openReservedCashQuanta6: "0",
    openedToday: 0,
    closedToday: 0,
    realizedPnlTodayQuanta6: "0",
    accountingComplete: true,
    legacyExposurePresent: false,
  },
  positions: [] as Record<string, unknown>[],
});
function setup() {
  const context = read();
  const client = {
    discoverPmMarkets: vi
      .fn()
      .mockRejectedValue(new Error("legacy discovery forbidden in v2")),
    pmPaperV2Positions: vi.fn().mockImplementation(async () => ({
      ok: true,
      status: 200,
      data: context,
    })),
    discoverPmPaperV2: vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        executionModel: "pm_paper_v2",
        data: [
          {
            source: "kalshi",
            slug: "fixture",
            title: "Fixture market",
            outcomes: [
              {
                externalMarketId: "native-YES",
                probability: 60,
                nativeMarket: { venue: "kalshi", key: "kalshi:NATIVE" },
                nativeEndAt: new Date(Date.now() + 3600000).toISOString(),
                nativeEndBasis: "kalshi_market_close_time",
                settlementTimeKnown: false,
              },
            ],
          },
        ],
      },
    }),
    openPmPaperV2: vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        executionModel: "pm_paper_v2",
        accepted: true,
        executed: true,
        positionId: 10,
        replayed: false,
      },
    }),
    replayPmPaperV2Open: vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        executionModel: "pm_paper_v2",
        accepted: true,
        executed: true,
        positionId: 10,
        replayed: true,
      },
    }),
    closePmPaperV2: vi.fn().mockResolvedValue({
      ok: true,
      status: 202,
      data: {
        executionModel: "pm_paper_v2",
        accepted: true,
        executed: false,
        positionId: 10,
        intent: { id: "i", status: "pending" },
        replayed: false,
      },
    }),
  };
  const provider = {
    label: "fixture",
    decide: vi.fn().mockResolvedValue({
      ok: true,
      text: JSON.stringify({ decision: "act", actions: [action] }),
    }),
  };
  const deps = {
    client,
    provider,
    spec: { venues: ["pm"] },
    state: newState("fixture"),
    mergedProse: "explicit new house strategy",
    live: true,
  } as unknown as RunnerDeps;
  return {
    client,
    provider,
    deps,
    context,
    checkpoint: vi.fn().mockResolvedValue(undefined),
  };
}
describe("dedicated PM v2 house cycle", () => {
  it("default and nonhouse identity retain no enrollment", () => {
    expect(readPmHousePolicies(undefined)).toEqual([]);
    expect(
      selectPmHousePolicy({ id: 4, ownerUserId: 1, isHouse: false }, [policy]),
    ).toBeUndefined();
    expect(
      selectPmHousePolicy({ id: 4, ownerUserId: 9, isHouse: true }, [policy]),
    ).toBeUndefined();
    expect(
      selectPmHousePolicy({ id: 4, ownerUserId: 1, isHouse: true }, [policy]),
    ).toEqual(policy);
    expect(() =>
      readPmHousePolicies(JSON.stringify([policy, policy])),
    ).toThrow();
  });
  it("v2 actions are accepted only by the explicit versioned contract", () => {
    const text = JSON.stringify({ decision: "act", actions: [action] });
    expect(parseDecisionForContract(text).ok).toBe(false);
    expect(parseDecisionForContract(text, "pm_paper_v2").ok).toBe(true);
    expect(
      parseDecisionForContract(
        JSON.stringify({
          decision: "act",
          actions: [{ type: "pm_open", stakeMusd: 10 }],
        }),
        "pm_paper_v2",
      ).ok,
    ).toBe(false);
  });
  it("schema-enforcing provider receives the v2 vocabulary only when opted in", () => {
    const shape = chatShapeFor(
      "nvidia",
      "nvidia/nemotron-3-super-120b-a12b",
      "https://integrate.api.nvidia.com/v1",
    );
    const args = {
      model: "fixture",
      system: "system",
      user: "user",
      maxTokens: 100,
    };
    const legacy = JSON.stringify(buildChatBody(shape, args));
    const current = JSON.stringify(
      buildChatBody(shape, { ...args, decisionContract: "pm_paper_v2" }),
    );
    expect(legacy).not.toContain("pm_v2_open");
    expect(current).toContain("pm_v2_open");
    expect(current).not.toContain('"stakeMusd"');
  });
  it("checks server tuple, rechecks risk and checkpoints exact request before send", async () => {
    const f = setup();
    let durable: unknown;
    f.checkpoint.mockImplementation(async (state) => {
      durable = structuredClone(state.pmPaperV2Pending);
    });
    f.client.openPmPaperV2.mockImplementation(async (body) => {
      expect(durable).toMatchObject({ scope, body });
      return {
        ok: true,
        status: 200,
        data: {
          executionModel: "pm_paper_v2",
          accepted: true,
          executed: true,
          positionId: 10,
          replayed: false,
        },
      };
    });
    const result = await runPmPaperCycle(f.deps, policy, f.checkpoint);
    expect(result.planned[0]).toMatchObject({ accepted: true, executed: true });
    expect(f.client.pmPaperV2Positions).toHaveBeenCalledTimes(2);
    expect(f.client.openPmPaperV2.mock.calls[0][0]).toMatchObject({
      maxCashBudget: "10.01",
      side: "no",
      idempotencyKey: expect.stringMatching(/^pm-entry:/),
    });
    expect(f.deps.state.pmPaperV2Pending).toBeUndefined();
    expect(f.client.discoverPmMarkets).not.toHaveBeenCalled();
  });
  it("checkpoint failure prevents any write", async () => {
    const f = setup();
    f.checkpoint.mockRejectedValue(new Error("database unavailable"));
    await expect(runPmPaperCycle(f.deps, policy, f.checkpoint)).rejects.toThrow(
      "database unavailable",
    );
    expect(f.client.openPmPaperV2).not.toHaveBeenCalled();
  });
  it("uncertain delivery persists and replays exact body with entry disabled and no model", async () => {
    const f = setup();
    f.client.openPmPaperV2.mockResolvedValueOnce({
      ok: false,
      status: 0,
      data: {},
    });
    const first = await runPmPaperCycle(f.deps, policy, f.checkpoint);
    expect(first.planned[0]).toMatchObject({
      accepted: false,
      executed: false,
      code: "delivery_unconfirmed",
    });
    const original = f.client.openPmPaperV2.mock.calls[0][0];
    f.context.entryEnabled = false;
    f.provider.decide.mockClear();
    f.client.discoverPmPaperV2.mockClear();
    const replay = await runPmPaperCycle(
      f.deps,
      { ...policy, entryEnabled: false },
      f.checkpoint,
    );
    expect(f.client.replayPmPaperV2Open.mock.calls[0][0]).toEqual(original);
    expect(f.client.openPmPaperV2).toHaveBeenCalledTimes(1);
    expect(f.provider.decide).not.toHaveBeenCalled();
    expect(f.client.discoverPmPaperV2).not.toHaveBeenCalled();
    expect(replay.planned[0].executed).toBe(true);
  });
  it.each([
    "identity",
    "legacy",
    "loss",
    "cap",
    "daily",
    "accounting",
    "stale",
  ])("refuses new entry for %s evidence", async (kind) => {
    const f = setup();
    if (kind === "identity")
      f.context.configuredHouse = { ...scope, apiKeyId: 8 };
    if (kind === "legacy") f.context.risk.legacyExposurePresent = true;
    if (kind === "loss") f.context.risk.realizedPnlTodayQuanta6 = "-50000000";
    if (kind === "cap") f.context.risk.totalOpen = 3;
    if (kind === "daily") f.context.risk.openedToday = 4;
    if (kind === "accounting") f.context.risk.accountingComplete = false;
    if (kind === "stale")
      f.context.risk.asOf = new Date(Date.now() - 60000).toISOString();
    await runPmPaperCycle(f.deps, policy, f.checkpoint);
    expect(f.client.openPmPaperV2).not.toHaveBeenCalled();
    expect(f.provider.decide).not.toHaveBeenCalled();
  });
  it("changed admission during model call refuses without checkpoint", async () => {
    const f = setup();
    f.provider.decide.mockImplementation(async () => {
      f.context.entryEnabled = false;
      return {
        ok: true,
        text: JSON.stringify({ decision: "act", actions: [action] }),
      };
    });
    expect(
      (await runPmPaperCycle(f.deps, policy, f.checkpoint)).skipReason,
    ).toBe("pm_v2_entry_policy_changed");
    expect(f.checkpoint).not.toHaveBeenCalled();
  });
  it("close remains available when entry disabled and 202 stays unexecuted", async () => {
    const f = setup();
    f.context.entryEnabled = false;
    f.context.positions = [
      {
        id: 10,
        source: "kalshi",
        slug: "fixture",
        outcomeExternalMarketId: "native-YES",
        side: "no",
        status: "open",
        accountingStatus: "open",
        quantityUnits2: "100",
        reservedCashQuanta6: "500000",
        exit: null,
        pnlQuanta6: null,
        payoutQuanta6: null,
      },
    ];
    f.provider.decide.mockResolvedValue({
      ok: true,
      text: JSON.stringify({
        decision: "act",
        actions: [{ type: "pm_v2_close", positionId: 10 }],
      }),
    });
    const result = await runPmPaperCycle(
      f.deps,
      { ...policy, entryEnabled: false },
      f.checkpoint,
    );
    expect(result.planned[0]).toMatchObject({
      accepted: true,
      executed: false,
      executionPending: true,
    });
    expect(f.client.discoverPmPaperV2).not.toHaveBeenCalled();
    expect(f.client.openPmPaperV2).not.toHaveBeenCalled();
  });
  it("dry run never checkpoints or mutates", async () => {
    const f = setup();
    f.deps.live = false;
    await runPmPaperCycle(f.deps, policy, f.checkpoint);
    expect(f.checkpoint).not.toHaveBeenCalled();
    expect(f.client.openPmPaperV2).not.toHaveBeenCalled();
  });
});

it.each([false, true])(
  "checkpoint with no receipt only sends new entry when current risk admits: %s",
  async (admitted) => {
    const f = setup();
    f.client.openPmPaperV2.mockResolvedValueOnce({
      ok: false,
      status: 0,
      data: {},
    });
    await runPmPaperCycle(f.deps, policy, f.checkpoint);
    const original = f.client.openPmPaperV2.mock.calls[0][0];
    f.client.replayPmPaperV2Open.mockResolvedValue({
      ok: false,
      status: 404,
      data: {
        executionModel: "pm_paper_v2",
        accepted: false,
        executed: false,
        replayMissing: true,
      },
    });
    if (!admitted) f.context.risk.openedToday = 4;
    f.provider.decide.mockClear();
    const result = await runPmPaperCycle(f.deps, policy, f.checkpoint);
    expect(f.provider.decide).not.toHaveBeenCalled();
    expect(f.client.replayPmPaperV2Open).toHaveBeenCalledWith(original);
    if (admitted) {
      expect(f.client.openPmPaperV2.mock.calls[1][0]).toEqual(original);
      expect(result.planned[0].executed).toBe(true);
    } else {
      expect(f.client.openPmPaperV2).toHaveBeenCalledTimes(1);
      expect(result.skipReason).toBe("pm_v2_pending_entry_policy_hold");
      expect(f.deps.state.pmPaperV2Pending).toBeDefined();
    }
  },
);
it("caps model calls without changing pending replay", async () => {
  const f = setup();
  f.deps.state.llmCallTimestamps = Array(12).fill(Date.now());
  const result = await runPmPaperCycle(f.deps, policy, f.checkpoint);
  expect(result.skipReason).toBe("pm_v2_model_budget");
  expect(f.provider.decide).not.toHaveBeenCalled();
});

const heldPosition = (
  native: unknown = { venue: "kalshi", requestedTicker: "NATIVE", side: "yes" },
) => ({
  id: 10,
  source: "kalshi",
  slug: "other-alias",
  outcomeExternalMarketId: "other-NO",
  side: "yes",
  status: "open",
  accountingStatus: "open",
  quantityUnits2: "100",
  reservedCashQuanta6: "500000",
  exit: { status: "pending" },
  pnlQuanta6: null,
  payoutQuanta6: null,
  entry: { nativeIdentity: native },
});

it.each([0, 31, 1.5, null, "1"])(
  "strict policy rejects maxEndDays=%s",
  (maxEndDays) => {
    expect(() =>
      readPmHousePolicies(JSON.stringify([{ ...policy, maxEndDays }])),
    ).toThrow();
  },
);
it("accepts optional/one/thirty-day policy without changing four-ID scope", () => {
  expect(
    readPmHousePolicies(JSON.stringify([policy]))[0]?.maxEndDays,
  ).toBeUndefined();
  for (const maxEndDays of [1, 30])
    expect(
      readPmHousePolicies(JSON.stringify([{ ...policy, maxEndDays }]))[0]
        ?.maxEndDays,
    ).toBe(maxEndDays);
});
it.each([
  [undefined, 1],
  [1, undefined],
  [1, 2],
])(
  "requires exact scheduler/server horizon parity %s/%s",
  async (local, server) => {
    const f = setup();
    f.context.configuredHouse.maxEndDays = server;
    const result = await runPmPaperCycle(
      f.deps,
      { ...policy, maxEndDays: local },
      f.checkpoint,
    );
    expect(result.skipReason).toBe("pm_v2_no_available_action");
    expect(f.client.discoverPmPaperV2).not.toHaveBeenCalled();
    expect(f.client.openPmPaperV2).not.toHaveBeenCalled();
  },
);
it("passes explicit horizon to model and checkpoints only canonical four IDs", async () => {
  const f = setup();
  f.context.configuredHouse.maxEndDays = 1;
  let checkpointScope: unknown;
  f.checkpoint.mockImplementation(async (state) => {
    checkpointScope = state.pmPaperV2Pending.scope;
  });
  await runPmPaperCycle(f.deps, { ...policy, maxEndDays: 1 }, f.checkpoint);
  expect(checkpointScope).toEqual(scope);
  const prompt = JSON.parse(f.provider.decide.mock.calls[0]?.[0].user);
  expect(prompt.policy.maxEndDays).toBe(1);
  expect(prompt.markets[0]).toMatchObject({
    nativeMarketKey: "kalshi:NATIVE",
    settlementTimeKnown: false,
  });
});
it.each(["held", "unknown"])(
  "does not discover/open an existing or uncertain native exposure: %s",
  async (kind) => {
    const f = setup();
    f.context.positions = [heldPosition(kind === "unknown" ? {} : undefined)];
    f.context.risk.totalOpen = 1;
    await runPmPaperCycle(f.deps, policy, f.checkpoint);
    expect(f.provider.decide).not.toHaveBeenCalled();
    expect(f.client.openPmPaperV2).not.toHaveBeenCalled();
    expect(f.client.discoverPmMarkets).not.toHaveBeenCalled();
  },
);
it("held alias appearing during model decision prevents checkpoint/send", async () => {
  const f = setup();
  f.provider.decide.mockImplementation(async () => {
    f.context.positions = [heldPosition()];
    f.context.risk.totalOpen = 1;
    return {
      ok: true,
      text: JSON.stringify({ decision: "act", actions: [action] }),
    };
  });
  expect((await runPmPaperCycle(f.deps, policy, f.checkpoint)).skipReason).toBe(
    "pm_v2_entry_policy_changed",
  );
  expect(f.checkpoint).not.toHaveBeenCalled();
  expect(f.client.openPmPaperV2).not.toHaveBeenCalled();
});
it("native maturity expiring during model decision refuses before send", async () => {
  const f = setup();
  f.context.configuredHouse.maxEndDays = 1;
  const now = Date.now();
  const clock = vi.spyOn(Date, "now").mockReturnValue(now);
  const near = {
    executionModel: "pm_paper_v2",
    data: [
      {
        source: "kalshi",
        slug: "fixture",
        outcomes: [
          {
            externalMarketId: "native-YES",
            probability: 60,
            nativeMarket: { venue: "kalshi", key: "kalshi:NATIVE" },
            nativeEndAt: new Date(now + 1).toISOString(),
            nativeEndBasis: "kalshi_market_close_time",
          },
        ],
      },
    ],
  };
  f.client.discoverPmPaperV2.mockResolvedValue({
    ok: true,
    status: 200,
    data: near,
  });
  f.provider.decide.mockImplementation(async () => {
    clock.mockReturnValue(now + 1);
    return {
      ok: true,
      text: JSON.stringify({ decision: "act", actions: [action] }),
    };
  });
  try {
    expect(
      (
        await runPmPaperCycle(
          f.deps,
          { ...policy, maxEndDays: 1 },
          f.checkpoint,
        )
      ).skipReason,
    ).toBe("pm_v2_entry_policy_changed");
    expect(f.checkpoint).not.toHaveBeenCalled();
  } finally {
    clock.mockRestore();
  }
});
it("native discovery refusal never falls back to legacy discovery", async () => {
  const f = setup();
  f.client.discoverPmPaperV2.mockResolvedValue({
    ok: false,
    status: 503,
    data: {},
  });
  expect((await runPmPaperCycle(f.deps, policy, f.checkpoint)).skipReason).toBe(
    "pm_v2_no_available_action",
  );
  expect(f.client.discoverPmMarkets).not.toHaveBeenCalled();
  expect(f.provider.decide).not.toHaveBeenCalled();
});
it("horizon mismatch does not block a protective close", async () => {
  const f = setup();
  f.context.configuredHouse.maxEndDays = 1;
  f.context.positions = [{ ...heldPosition(), exit: null }];
  f.provider.decide.mockResolvedValue({
    ok: true,
    text: JSON.stringify({
      decision: "act",
      actions: [{ type: "pm_v2_close", positionId: 10 }],
    }),
  });
  const result = await runPmPaperCycle(f.deps, policy, f.checkpoint);
  expect(result.planned[0]).toMatchObject({
    accepted: true,
    executed: false,
    executionPending: true,
  });
  expect(f.client.discoverPmPaperV2).not.toHaveBeenCalled();
});
it("confirmed replay survives changed horizon and reuses exact prior receipt", async () => {
  const f = setup();
  f.client.openPmPaperV2.mockResolvedValueOnce({
    ok: false,
    status: 0,
    data: {},
  });
  await runPmPaperCycle(f.deps, policy, f.checkpoint);
  const original = f.client.openPmPaperV2.mock.calls[0]?.[0];
  f.context.configuredHouse.maxEndDays = 1;
  f.provider.decide.mockClear();
  const result = await runPmPaperCycle(f.deps, policy, f.checkpoint);
  expect(f.client.replayPmPaperV2Open).toHaveBeenCalledWith(original);
  expect(f.client.openPmPaperV2).toHaveBeenCalledTimes(1);
  expect(f.provider.decide).not.toHaveBeenCalled();
  expect(result.planned[0]?.executed).toBe(true);
});
