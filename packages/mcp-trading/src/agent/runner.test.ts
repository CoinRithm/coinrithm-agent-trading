import { describe, it, expect, vi, afterEach } from "vitest";
import {
  runCycle,
  runLoop,
  RunnerDeps,
  repairFuturesTakeProfit,
  rationaleForAction,
  sanitizeForecastProbability,
  houseAgentForecastEnabled,
} from "./runner.js";
import type { ProposedAction, QuoteEvidence } from "./types.js";
import { parseSkill } from "./skill.js";
import { renderFolderOfOne } from "./templates.js";
import { newState } from "./state.js";
import { CoinRithmClient } from "./client.js";
import { Provider, selectProvider } from "./providers.js";
import {
  DECISION_INPUT_MAX_BYTES,
  type DecisionInputRecord,
} from "./decisionReceipt.js";
import * as privateEvidence from "./decisionReceipt.js";
import { CAPITAL_VALUATION_BASIS } from "./capitalSizing.js";

const okData = (data: unknown) => ({ ok: true, status: 200, data });

function baseClient(over: Record<string, unknown> = {}) {
  return {
    me: async () => okData({ scopes: ["read", "trade:futures"] }),
    portfolio: async () =>
      okData({ equity: { totalUsd: 50000, availableUsd: 1000 } }),
    wallet: async () => okData({ usdt: { available: 1000 } }),
    futuresPositions: async () => okData({ positions: [] }),
    trades: async () => okData({ asOf: "T1", trades: [] }),
    resolve: async (q: string) => okData({ match: { coinId: "1", name: q } }),
    market: async () =>
      okData({
        price: { usd: 67000, change1h: 1, change24h: 2 },
        observation: { freshness: { status: "fresh" } },
      }),
    futuresQuote: vi.fn(async () =>
      okData({
        eligible: true,
        entryPrice: 67000,
        liquidationPrice: 60000,
        observation: { freshness: { status: "fresh" } },
      }),
    ),
    openFutures: vi.fn(async () =>
      okData({ position: { id: 99, status: "open" } }),
    ),
    closeFutures: vi.fn(async () => okData({ position: { id: 99 } })),
    setFuturesSlTp: vi.fn(async () => okData({})),
    // spot — REAL quote shape: executionPrice + estimatedCostMusd (= price*qty),
    // never entryPrice. estimatedCostMusd tracks the requested quantity.
    openOrders: async () => okData({ orders: [] }),
    spotQuote: vi.fn(async (a: { quantity: number }) =>
      okData({
        eligible: true,
        executionPrice: 67000,
        estimatedCostMusd: 67000 * a.quantity,
        observation: { freshness: { status: "fresh" } },
      }),
    ),
    placeSpotOrder: vi.fn(async () =>
      okData({ order: { id: 1, status: "open" } }),
    ),
    cancelSpotOrder: vi.fn(async () => okData({ ok: true })),
    // pm — REAL discover shape: { data: [event] }, id nested at outcomes[].externalMarketId.
    pmPositions: async () => okData({ positions: [] }),
    discoverPmMarkets: async () =>
      okData({
        data: [
          {
            source: "kalshi",
            slug: "btc-up",
            title: "BTC up?",
            freshness: { status: "fresh" },
            outcomes: [
              { externalMarketId: "yes-1", name: "Yes", probability: 50 },
            ],
          },
        ],
      }),
    pmQuote: vi.fn(async (body: { stakeMusd: number }) =>
      okData({
        eligible: true,
        entryProbability: 50,
        stakeMusd: body.stakeMusd,
        sharesEstimate: body.stakeMusd / 0.51,
        observation: { freshness: { status: "fresh" } },
      }),
    ),
    openPmPosition: vi.fn(async () => okData({ position: { id: 9 } })),
    exportRunEvidence: vi.fn(async () => okData({})),
    ...over,
  };
}

function provider(decision: unknown): Provider {
  return {
    label: "fake",
    decide: async () => ({ ok: true, text: JSON.stringify(decision) }),
  };
}

const VALID_OPEN = {
  decision: "act",
  confidence: 0.8,
  actions: [
    {
      type: "futures_open",
      symbol: "BTC",
      side: "long",
      leverage: 2,
      marginMusd: 50,
      stopLossPrice: 60000,
      confidence: 0.8,
    },
  ],
};
const OVER_LEVERAGE = {
  decision: "act",
  actions: [
    {
      type: "futures_open",
      symbol: "BTC",
      side: "long",
      leverage: 10,
      marginMusd: 50,
      stopLossPrice: 60000,
      confidence: 0.9,
    },
  ],
};

function deps(
  over: Partial<RunnerDeps>,
  client = baseClient(),
  prov = provider(VALID_OPEN),
): RunnerDeps {
  const spec = parseSkill(renderFolderOfOne("a", "conservative")).spec;
  // These tests exercise the post-gate decide/validate/act flow; the preflight
  // gate has its own coverage (gate.test.ts), so run always-on here so a flat
  // fixture (no flagged setup) still reaches DECIDE.
  spec.triggerPolicy = {
    mode: "always",
    skipLlmWhenNoTrigger: false,
    alwaysManageOpenPositions: true,
    maxLlmCallsPerHour: 0,
    debounceMinutes: 0,
    pmEvalCooldownMinutes: 0,
  };
  return {
    client: client as unknown as CoinRithmClient,
    provider: prov,
    spec,
    mergedProse: "strategy",
    state: newState("run-1"),
    live: false,
    ...over,
  };
}

describe("runner lifecycle and failure boundaries", () => {
  it("does not send an otherwise valid opening when the explicit entry predicate fails", async () => {
    const client = baseClient({
      trades: async () =>
        okData({ asOf: new Date().toISOString(), trades: [] }),
      market: async () =>
        okData({
          price: { usd: 67000, change1h: 1 },
          observation: { freshness: { status: "fresh", ageSeconds: 0 } },
        }),
    });
    const d = deps({ live: true }, client);
    d.spec.risk.entryPredicates = [
      {
        side: "long",
        metric: "change1h",
        operator: "gte",
        threshold: 2,
        maxAgeSeconds: 60,
      },
    ];
    const result = await runCycle(d);
    expect(result.planned[0].code).toBe("entry_predicate_false");
    expect(client.openFutures).not.toHaveBeenCalled();
    expect(d.state.writesToday).toBe(0);
  });
  afterEach(() => {
    vi.useRealTimers();
  });
  const held = (unrealizedPnlMusd = 10) => ({
    id: 7,
    status: "open",
    side: "long",
    marginMusd: 50,
    leverage: 2,
    coin: { symbol: "BTC", ucid: "1" },
    entryPrice: 66000,
    markPrice: 67000,
    stopLossPrice: 65000,
    unrealizedPnlMusd,
  });
  it.each(["futures", "pm"])(
    "stops on observed %s drawdown before calling a model",
    async (venue) => {
      const decide = vi.fn();
      const client = baseClient({
        futuresPositions: async () =>
          okData({ positions: venue === "futures" ? [held(-101)] : [] }),
        pmPositions: async () =>
          okData({
            positions:
              venue === "pm"
                ? [
                    {
                      id: 1,
                      status: "open",
                      source: "kalshi",
                      slug: "fixture",
                      stakeMusd: 200,
                      unrealizedPnl: -101,
                    },
                  ]
                : [],
          }),
      });
      const d = deps({ live: true }, client, { label: "fixture", decide });
      d.spec.venues = ["futures", "pm"];
      d.spec.killSwitch.maxDrawdownMusd = 100;
      expect(await runCycle(d)).toMatchObject({
        disabled: true,
        disabledReason: "equity drawdown >= 100",
        planned: [],
      });
      expect(d.state.disabled).toBe(true);
      expect(decide).not.toHaveBeenCalled();
      expect(client.openFutures).not.toHaveBeenCalled();
      expect(client.openPmPosition).not.toHaveBeenCalled();
    },
  );
  it("disables repeated invalid credentials and retains the failure streak", async () => {
    const decide = vi.fn();
    const d = deps(
      { live: true },
      baseClient({ me: async () => ({ ok: false, status: 401, data: {} }) }),
      { label: "fixture", decide },
    );
    d.state.consecutiveAuthFailures = 9;
    expect(await runCycle(d)).toMatchObject({
      disabled: true,
      disabledReason: expect.stringContaining("key_invalid:"),
    });
    expect(d.state.consecutiveAuthFailures).toBe(10);
    expect(decide).not.toHaveBeenCalled();
  });
  it("skips a first authentication failure without disabling or calling a model", async () => {
    const decide = vi.fn();
    const client = baseClient({
      me: async () => ({ ok: false, status: 401, data: {} }),
    });
    const d = deps({ live: true }, client, { label: "fixture", decide });
    delete d.state.consecutiveAuthFailures;
    expect(await runCycle(d)).toMatchObject({ decision: "skip", planned: [] });
    expect(d.state.consecutiveAuthFailures).toBe(1);
    expect(d.state.disabled).toBe(false);
    expect(decide).not.toHaveBeenCalled();
    expect(client.openFutures).not.toHaveBeenCalled();
  });
  it("does not invent a position identity from an incomplete successful open response", async () => {
    const client = baseClient({
      openFutures: vi.fn(async () => okData({ position: {} })),
    });
    const d = deps({ live: true }, client);
    const result = await runCycle(d);
    expect(result.planned[0]).toMatchObject({ accepted: true, executed: true });
    expect(client.openFutures).toHaveBeenCalledOnce();
    expect(Object.keys(d.state.theses ?? {})).toHaveLength(0);
  });
  it("clears a transient authentication streak after a complete observation", async () => {
    const d = deps({}, baseClient(), provider({ decision: "skip" }));
    d.state.consecutiveAuthFailures = 9;
    await runCycle(d);
    expect(d.state.consecutiveAuthFailures).toBe(0);
    expect(d.state.disabled).toBe(false);
  });
  it("journals legacy trade outcomes without inventing missing identities or PnL", async () => {
    const trades = [
      { id: "legacy-id", coinSymbol: "SOL", pnlMusd: -7 },
      { id: 2, venue: "spot", coinId: "ETH", realizedPnl: 3 },
      { id: 3, venue: "pm", pnl: 0 },
      { id: 4, venue: "futures", symbol: "BTC", side: "long" },
      { id: 5, venue: "pm" },
    ];
    const d = deps(
      {},
      baseClient({ trades: async () => okData({ asOf: "T2", trades }) }),
      provider({ decision: "skip" }),
    );
    await runCycle(d);
    const journal = d.state.journal!.map((row) => row.did).join("\n");
    expect(journal).toContain("SOL: -7mUSD LOSS");
    expect(journal).toContain("ETH: +3mUSD WIN");
    expect(journal).toContain("position: +0mUSD WIN");
    expect(journal).toContain("closed long BTC");
    expect(d.state.journal).toHaveLength(4);
    expect(d.state.seen).toContain("futures:legacy-id");
    expect(d.state.cursor).toBe("T2");
  });
  it("executes a full close and records only the confirmed action", async () => {
    const client = baseClient({
      futuresPositions: async () => okData({ positions: [held()] }),
    });
    const d = deps(
      { live: true },
      client,
      provider({
        decision: "act",
        confidence: 0.8,
        actions: [{ type: "futures_close", positionId: 7 }],
      }),
    );
    const result = await runCycle(d);
    expect(result.planned[0]).toMatchObject({ accepted: true, executed: true });
    expect(client.closeFutures).toHaveBeenCalledOnce();
    expect(d.state.journal!.at(-1)!.did).toContain("closed pos#7");
    expect(d.state.writesToday).toBe(1);
  });
  it("cancels one open spot order and rejects a duplicate target in the same decision", async () => {
    const client = baseClient({
      openOrders: async () =>
        okData({
          orders: [
            {
              id: 9,
              status: "open",
              side: "buy",
              coin: { symbol: "BTC", ucid: "1" },
            },
          ],
        }),
    });
    const action = { type: "spot_cancel", orderId: 9 };
    const d = deps(
      { live: true },
      client,
      provider({ decision: "act", confidence: 0.8, actions: [action, action] }),
    );
    d.spec.venues = ["spot"];
    const result = await runCycle(d);
    expect(result.planned[0]).toMatchObject({ accepted: true, executed: true });
    expect(result.planned[1].accepted).toBe(false);
    expect(client.cancelSpotOrder).toHaveBeenCalledOnce();
    expect(d.state.journal!.at(-1)!.did).toContain("cancelled order#9");
  });
  it("rejects an invented PM reference before quoting or writing", async () => {
    const client = baseClient();
    const d = deps(
      { live: true },
      client,
      provider({
        decision: "act",
        actions: [{ type: "pm_open", ref: "pm99", stakeMusd: 20 }],
      }),
    );
    d.spec.venues = ["pm"];
    expect((await runCycle(d)).planned[0]).toMatchObject({
      accepted: false,
      code: "pm_ref_unknown",
    });
    expect(client.pmQuote).not.toHaveBeenCalled();
    expect(client.openPmPosition).not.toHaveBeenCalled();
  });
  it("keeps a PM quality block effective when the server supplies no reason list", async () => {
    const client = baseClient({
      pmQuote: vi.fn(async () => okData({ eligible: true, openBlocked: true })),
    });
    const d = deps(
      { live: true },
      client,
      provider({
        decision: "act",
        actions: [{ type: "pm_open", ref: "pm1", stakeMusd: 20 }],
      }),
    );
    d.spec.venues = ["pm"];
    expect((await runCycle(d)).planned[0]).toMatchObject({
      accepted: false,
      code: "pm_open_blocked",
    });
    expect(client.openPmPosition).not.toHaveBeenCalled();
  });
  it("refuses to add to a winning position when no margin room remains", async () => {
    const client = baseClient({
      futuresPositions: async () => okData({ positions: [held()] }),
    });
    const d = deps({ live: true }, client);
    d.spec.limits.maxOpenMarginMusd = 50;
    expect((await runCycle(d)).planned[0]).toMatchObject({
      accepted: false,
      code: "duplicate_intent",
      reason: expect.stringContaining("no margin room"),
    });
    expect(client.futuresQuote).not.toHaveBeenCalled();
  });
  it.each([
    ["1s", 1000],
    ["invalid", 3600000],
  ])(
    "stops a bounded loop after two cycles using cadence %s",
    async (cadence, delay) => {
      vi.useFakeTimers();
      const decide = vi.fn(async () => ({
        ok: true as const,
        text: '{"decision":"skip"}',
      }));
      const log = vi.fn();
      const d = deps({ log }, baseClient(), { label: "fixture", decide });
      d.spec.trigger.cadence = String(cadence);
      const loop = runLoop(d, { maxCycles: 2 });
      await vi.advanceTimersByTimeAsync(Number(delay));
      expect(await loop).toHaveLength(2);
      expect(decide).toHaveBeenCalledTimes(2);
      expect(log).toHaveBeenCalledWith(
        `sleeping ${Number(delay) / 1000}s until next cycle`,
      );
      expect(vi.getTimerCount()).toBe(0);
    },
  );
  it("runs only once when requested", async () => {
    const d = deps({}, baseClient(), provider({ decision: "skip" }));
    expect(await runLoop(d, { once: true })).toHaveLength(1);
    expect(d.state.cyclesRun).toBe(1);
  });
  it("stops an otherwise unbounded loop at a kill-switch without observing", async () => {
    const me = vi.fn();
    const d = deps({}, baseClient({ me }));
    d.state.consecutiveRejectCycles = 10;
    d.spec.killSwitch.maxConsecutiveRejects = 5;
    expect(await runLoop(d)).toMatchObject([{ disabled: true }]);
    expect(me).not.toHaveBeenCalled();
  });
});

describe("take-profit repair boundaries", () => {
  const action: ProposedAction = {
    type: "futures_open",
    symbol: "BTC",
    side: "long",
    leverage: 2,
    marginMusd: 50,
    stopLossPrice: 60,
  };
  it.each([undefined, 0, NaN, Infinity])(
    "does not fabricate a target without a usable entry: %s",
    (entryPrice) => {
      expect(repairFuturesTakeProfit(action, { entryPrice })).toEqual({
        action,
        repaired: false,
      });
    },
  );
  it.each([undefined, 0, NaN, Infinity, 80])(
    "does not repair an absent/invalid or wrong-side stop: %s",
    (stopLossPrice) => {
      const a = { ...action, stopLossPrice } as ProposedAction;
      expect(repairFuturesTakeProfit(a, { entryPrice: 70 })).toEqual({
        action: a,
        repaired: false,
      });
    },
  );
  it("requires cost evidence before enforcing a capital reward/risk target", () => {
    expect(repairFuturesTakeProfit(action, { entryPrice: 70 }, 2)).toEqual({
      action,
      repaired: false,
    });
  });
  it("rejects a short reward/risk repair whose target would be nonpositive", () => {
    const a = { ...action, side: "short", stopLossPrice: 80 } as ProposedAction;
    expect(
      repairFuturesTakeProfit(
        a,
        { entryPrice: 70, futuresFeeBps: 5, estimatedEntryFeeMusd: 0.05 },
        100,
      ),
    ).toEqual({ action: a, repaired: false });
  });
});

describe("PM periodic budget gate", () => {
  it.each([1, 2])(
    "only calls the provider when the hourly budget of %i allows it",
    async (budget) => {
      const client = baseClient();
      const decide = vi.fn(async () => ({
        ok: true as const,
        text: '{"decision":"skip","actions":[]}',
      }));
      const d = deps({}, client, { label: "fixture", decide });
      d.spec.venues = ["pm"];
      d.spec.triggerPolicy = {
        mode: "event_driven",
        skipLlmWhenNoTrigger: true,
        alwaysManageOpenPositions: true,
        maxLlmCallsPerHour: budget,
        debounceMinutes: 0,
        pmEvalCooldownMinutes: 10,
      };
      const lastCall = Date.now() - 11 * 60_000;
      d.state.lastLlmCallAt = lastCall;
      d.state.llmCallTimestamps = [lastCall];

      const result = await runCycle(d);

      expect(result.triggerCodes).toEqual(["PM_PERIODIC"]);
      expect(result.llmCallMade).toBe(budget > 1);
      expect(decide).toHaveBeenCalledTimes(budget > 1 ? 1 : 0);
      expect(d.state.llmCallTimestamps).toHaveLength(budget > 1 ? 2 : 1);
      expect(client.openPmPosition).not.toHaveBeenCalled();
      if (budget === 1) {
        expect(result.decisionType).toBe("gate_skip");
        expect(result.skipReason).toBe("hourly LLM budget 1 reached");
        expect(d.state.lastLlmCallAt).toBe(lastCall);
      }
    },
  );
});

describe("confirmed action memory", () => {
  const sltp = (positionId: number) => ({
    type: "futures_set_sltp",
    positionId,
    stopLossPrice: 66000,
  });
  const positions = () =>
    okData({
      positions: [7, 8].map((id) => ({
        id,
        status: "open",
        side: "long",
        marginMusd: 50,
        coin: { symbol: "BTC", ucid: "1" },
        markPrice: 67000,
        stopLossPrice: 65000,
      })),
    });
  function captureMemory(decision: unknown) {
    const decide = vi
      .fn<Provider["decide"]>()
      .mockResolvedValue({ ok: true, text: JSON.stringify(decision) });
    return { decide, prov: { label: "fake", decide } satisfies Provider };
  }
  it.each([422, 503, 0])(
    "does not turn an unconfirmed SL/TP response (%s) into next-cycle completed memory",
    async (status) => {
      const c = captureMemory({
        decision: "act",
        actions: [sltp(7)],
        rationale: "failed-update-marker",
      });
      const client = baseClient({
        futuresPositions: positions,
        setFuturesSlTp: vi.fn(async () => ({
          ok: false,
          status,
          data: {
            error: status === 0 ? "network_error" : "sl_tp_invalid",
            blockReasons: ["stop_loss_not_below_mark"],
          },
        })),
      });
      const d = deps({ live: true }, client, c.prov);
      d.state.journal = [
        { at: "2026-09-01T00:00:00Z", did: "confirmed earlier action" },
      ];
      const before = structuredClone(d.state.journal);
      const result = await runCycle(d);
      expect(result.planned[0]).toMatchObject({
        accepted: true,
        executed: false,
      });
      expect(client.setFuturesSlTp).toHaveBeenCalledTimes(1);
      expect(d.state.journal).toEqual(before);
      c.decide.mockResolvedValue({
        ok: true,
        text: JSON.stringify({ decision: "skip" }),
      });
      await runCycle(d);
      expect(c.decide.mock.calls[1][0].user).not.toContain(
        "trailed stop on pos#7",
      );
      expect(c.decide.mock.calls[1][0].user).not.toContain(
        "failed-update-marker",
      );
      expect(c.decide.mock.calls[1][0].user).toContain(
        "confirmed earlier action",
      );
    },
  );
  it("keeps only confirmed moves and omits the whole-cycle rationale on partial success", async () => {
    const c = captureMemory({
      decision: "act",
      actions: [sltp(7), sltp(8)],
      rationale: "both-stops-completed-marker",
    });
    const client = baseClient({
      futuresPositions: positions,
      setFuturesSlTp: vi
        .fn()
        .mockResolvedValueOnce(okData({ position: { id: 7 } }))
        .mockResolvedValueOnce({
          ok: false,
          status: 422,
          data: { error: "sl_tp_invalid" },
        }),
    });
    const d = deps({ live: true }, client, c.prov);
    d.spec.limits.maxWritesPerCycle = 2;
    const result = await runCycle(d);
    expect(result.planned.map((p) => p.executed)).toEqual([true, false]);
    expect(d.state.journal).toEqual([
      { at: expect.any(String), did: "trailed stop on pos#7" },
    ]);
    c.decide.mockResolvedValue({
      ok: true,
      text: JSON.stringify({ decision: "skip" }),
    });
    await runCycle(d);
    expect(c.decide.mock.calls[1][0].user).toContain("trailed stop on pos#7");
    expect(c.decide.mock.calls[1][0].user).not.toContain(
      "trailed stop on pos#8",
    );
    expect(c.decide.mock.calls[1][0].user).not.toContain(
      "both-stops-completed-marker",
    );
  });
  it("does not journal a dry-run accepted plan as completed", async () => {
    const client = baseClient();
    const d = deps({ live: false }, client);
    const result = await runCycle(d);
    expect(result.planned[0]).toMatchObject({
      accepted: true,
      executed: false,
    });
    expect(client.openFutures).not.toHaveBeenCalled();
    expect(d.state.journal ?? []).toEqual([]);
  });
  it("retains confirmed live execution and rationale in the next prompt", async () => {
    const c = captureMemory({
      ...VALID_OPEN,
      rationale: "confirmed-open-marker",
    });
    const d = deps({ live: true }, baseClient(), c.prov);
    const result = await runCycle(d);
    expect(result.planned[0].executed).toBe(true);
    expect(d.state.journal?.[0].did).toContain("opened long BTC");
    c.decide.mockResolvedValue({
      ok: true,
      text: JSON.stringify({ decision: "skip" }),
    });
    await runCycle(d);
    expect(c.decide.mock.calls[1][0].user).toContain("opened long BTC");
    expect(c.decide.mock.calls[1][0].user).toContain("confirmed-open-marker");
  });
});

describe("opt-in owned-book capital sizing", () => {
  const policy = {
    version: "equity_fraction_v1" as const,
    futuresRiskPct: 0.75,
    pmMaxLossPct: 2,
    perTicketCapitalPct: 6,
    totalCapitalPct: 40,
    cashReservePct: 20,
    minRewardRisk: 1.5,
  };
  function sizedClient(over: Record<string, unknown> = {}) {
    const partitions = {
      available: 50_000,
      frozen: 0,
      frozenPm: 0,
      frozenFutures: 0,
    };
    return baseClient({
      me: async () =>
        okData({ scopes: ["read", "trade:futures", "trade:pm", "trade:spot"] }),
      portfolio: async () =>
        okData({
          walletId: 42,
          bookScope: "api_key",
          equity: {
            totalUsd: 50_000,
            ...partitions,
            valuationBasis: CAPITAL_VALUATION_BASIS,
            spotValuationComplete: true,
          },
        }),
      wallet: async () => okData({ walletId: 42, usdt: partitions }),
      futuresQuote: vi.fn(
        async (a: { marginMusd: number; leverage: number }) => {
          const entryFee = a.marginMusd * a.leverage * 0.0005;
          return okData({
            eligible: true,
            entryPrice: 67_000,
            liquidationPrice: 40_000,
            executionModel: { feeBps: 5, estimatedEntryFeeMusd: entryFee },
            cashRequiredMusd: a.marginMusd + entryFee,
            observation: { freshness: { status: "fresh" } },
          });
        },
      ),
      discoverPmMarkets: async () =>
        okData({
          data: [1, 2, 3].map((id) => ({
            source: "kalshi",
            slug: `btc-up-${id}`,
            title: `BTC up ${id}?`,
            freshness: { status: "fresh" },
            outcomes: [
              { externalMarketId: `yes-${id}`, name: "Yes", probability: 50 },
            ],
          })),
        }),
      ...over,
    });
  }
  function sizedDeps(
    live: boolean,
    client: ReturnType<typeof baseClient>,
    decision: unknown,
  ) {
    const d = deps({ live }, client, provider(decision));
    d.spec.capitalSizing = { ...policy };
    d.spec.venues = ["pm", "futures", "spot"];
    d.spec.risk.perTradeMarginMusd = 10_000;
    d.spec.limits.maxOpenMarginMusd = 20_000;
    d.spec.limits.maxWritesPerCycle = 5;
    return d;
  }
  it.each([false, true])(
    "reserves successive PM tickets with identical bounds in dry/live=%s",
    async (live) => {
      const client = sizedClient();
      const d = sizedDeps(live, client, {
        decision: "act",
        confidence: 0.9,
        actions: [1, 2, 3].map((id) => ({
          type: "pm_open",
          ref: `pm${id}`,
          stakeMusd: 10,
          forecastProbability: 70,
        })),
      });
      d.spec.capitalSizing!.perTicketCapitalPct = 3;
      d.spec.capitalSizing!.totalCapitalPct = 3;
      const result = await runCycle(d);
      expect(
        result.planned.map((p) => [
          p.accepted,
          p.capitalSizing?.sizedAmountMusd,
        ]),
      ).toEqual([
        [true, 1_000],
        [true, 500],
        [false, undefined],
      ]);
      expect(client.pmQuote).toHaveBeenCalledTimes(2);
      expect(client.openPmPosition).toHaveBeenCalledTimes(live ? 2 : 0);
      expect(result.planned[0].capitalSizing?.proposedAmountMusd).toBe(10);
    },
  );
  it("sends resized futures amount to exactly one quote and execution, with net RR protection", async () => {
    const client = sizedClient();
    const result = await runCycle(sizedDeps(true, client, VALID_OPEN));
    const planned = result.planned[0];
    expect(planned.accepted).toBe(true);
    expect(planned.executed).toBe(true);
    expect(planned.capitalSizing?.sizedAmountMusd).toBeGreaterThan(50);
    expect(client.futuresQuote).toHaveBeenCalledTimes(1);
    expect(client.futuresQuote.mock.calls[0][0].marginMusd).toBe(
      planned.capitalSizing?.sizedAmountMusd,
    );
    expect(client.openFutures.mock.calls[0][0].marginMusd).toBe(
      planned.capitalSizing?.sizedAmountMusd,
    );
    expect(planned.quote?.cashRequiredMusd).toBeGreaterThan(
      planned.capitalSizing!.sizedAmountMusd!,
    );
  });

  it("keeps a known legacy-wallet position closeable while sizing this wallet's PM entry", async () => {
    const client = sizedClient({
      futuresPositions: async () =>
        okData({
          positions: [
            {
              id: 7,
              status: "open",
              walletId: 7,
              marginMusd: 50,
              unrealizedPnlMusd: -10,
            },
          ],
        }),
    });
    const d = sizedDeps(true, client, {
      decision: "act",
      confidence: 0.9,
      actions: [
        { type: "futures_close", positionId: 7, fraction: 1 },
        { type: "pm_open", ref: "pm1", stakeMusd: 10, forecastProbability: 70 },
      ],
    });
    const result = await runCycle(d);
    expect(result.planned.map((p) => p.executed)).toEqual([true, true]);
    expect(client.closeFutures).toHaveBeenCalledTimes(1);
    expect(result.planned[1].capitalSizing).toMatchObject({
      conservativeEquityMusd: 50_000,
      sizedAmountMusd: 1_000,
    });
  });

  it("keeps legacy-wallet positions in the existing absolute futures margin ceiling", async () => {
    const client = sizedClient({
      futuresPositions: async () =>
        okData({
          positions: [
            {
              id: 7,
              status: "open",
              walletId: 7,
              marginMusd: 50,
              unrealizedPnlMusd: -10,
            },
          ],
        }),
    });
    const d = sizedDeps(true, client, VALID_OPEN);
    d.spec.limits.maxOpenMarginMusd = 50;
    const result = await runCycle(d);
    expect(result.planned[0]).toMatchObject({
      accepted: false,
      reason: "capital_ticket_below_minimum",
    });
    expect(client.futuresQuote).not.toHaveBeenCalled();
    expect(client.openFutures).not.toHaveBeenCalled();
  });

  it.each([false, true])(
    "reserves spot fees across successive dry/live=%s entries",
    async (live) => {
      const client = sizedClient({
        spotQuote: vi.fn(async () =>
          okData({
            eligible: true,
            executionPrice: 185,
            estimatedCostMusd: 185,
            estimatedFeeMusd: 5,
            observation: { freshness: { status: "fresh" } },
          }),
        ),
      });
      const d = sizedDeps(live, client, {
        decision: "act",
        confidence: 0.9,
        actions: [1, 2].map(() => ({
          type: "spot_order",
          symbol: "BTC",
          side: "buy",
          orderType: "market",
          quantity: 1,
        })),
      });
      d.spec.capitalSizing!.perTicketCapitalPct = 0.75;
      d.spec.capitalSizing!.totalCapitalPct = 0.75;
      const result = await runCycle(d);
      expect(result.planned[0].accepted).toBe(true);
      expect(result.planned[0].quote?.estimatedFeeMusd).toBe(5);
      expect(result.planned[1].code).toBe(
        "capital_combined_allocation_exceeded",
      );
      expect(client.spotQuote).toHaveBeenCalledTimes(2);
      expect(client.placeSpotOrder).toHaveBeenCalledTimes(live ? 1 : 0);
    },
  );

  it("rejects opt-in spot without fee evidence using one quote and no write", async () => {
    const client = sizedClient();
    const result = await runCycle(
      sizedDeps(true, client, {
        decision: "act",
        confidence: 0.9,
        actions: [
          {
            type: "spot_order",
            symbol: "BTC",
            side: "buy",
            orderType: "market",
            quantity: 0.001,
          },
        ],
      }),
    );
    expect(result.planned[0].code).toBe("capital_quote_cost_evidence_missing");
    expect(client.spotQuote).toHaveBeenCalledTimes(1);
    expect(client.placeSpotOrder).not.toHaveBeenCalled();
  });

  it.each([null, false, {}, { ...policy, minRewardRisk: undefined }])(
    "persisted malformed policy blocks entries, never protection (%j)",
    async (capitalSizing) => {
      const client = sizedClient({
        futuresPositions: async () =>
          okData({ positions: [{ id: 7, status: "open", marginMusd: 50 }] }),
      });
      const d = sizedDeps(true, client, {
        decision: "act",
        confidence: 0.9,
        actions: [
          VALID_OPEN.actions[0],
          { type: "futures_close", positionId: 7, fraction: 1 },
        ],
      });
      d.spec.capitalSizing = capitalSizing as typeof policy;
      const result = await runCycle(d);
      expect(result.planned[0]).toMatchObject({
        accepted: false,
        reason: "capital_policy_invalid",
      });
      expect(result.planned[1].executed).toBe(true);
      expect(client.futuresQuote).not.toHaveBeenCalled();
      expect(client.closeFutures).toHaveBeenCalledTimes(1);
    },
  );

  it("reserves possibly-filled live entries after an ambiguous response", async () => {
    const client = sizedClient({
      openPmPosition: vi.fn(async () => ({ ok: false, status: 0, data: {} })),
    });
    const d = sizedDeps(true, client, {
      decision: "act",
      confidence: 0.9,
      actions: [1, 2, 3].map((id) => ({
        type: "pm_open",
        ref: `pm${id}`,
        stakeMusd: 10,
        forecastProbability: 70,
      })),
    });
    d.spec.capitalSizing!.perTicketCapitalPct = 3;
    d.spec.capitalSizing!.totalCapitalPct = 3;
    const result = await runCycle(d);
    expect(result.planned.map((p) => p.capitalSizing?.sizedAmountMusd)).toEqual(
      [1_000, 500, undefined],
    );
    expect(result.planned.slice(0, 2).every((p) => p.executed === false)).toBe(
      true,
    );
    expect(client.pmQuote).toHaveBeenCalledTimes(2);
    expect(d.state.riskIncreasesToday).toBe(0);
  });
  it("rejects missing actual quote fees, without a second quote or open", async () => {
    const client = sizedClient({
      futuresQuote: vi.fn(async () =>
        okData({
          eligible: true,
          entryPrice: 67_000,
          liquidationPrice: 40_000,
          observation: { freshness: { status: "fresh" } },
        }),
      ),
    });
    const decision = {
      ...VALID_OPEN,
      actions: [{ ...VALID_OPEN.actions[0], takeProfitPrice: 80_000 }],
    };
    const result = await runCycle(sizedDeps(true, client, decision));
    expect(result.planned[0].code).toBe("capital_quote_cost_evidence_missing");
    expect(client.futuresQuote).toHaveBeenCalledTimes(1);
    expect(client.openFutures).not.toHaveBeenCalled();
  });
  it("missing owned-book evidence blocks only entries, preserving closes", async () => {
    const client = sizedClient({
      portfolio: async () =>
        okData({ walletId: 999, equity: { totalUsd: 50_000 } }),
      futuresPositions: async () =>
        okData({ positions: [{ id: 7, status: "open", marginMusd: 50 }] }),
    });
    const result = await runCycle(
      sizedDeps(true, client, {
        decision: "act",
        confidence: 0.9,
        actions: [
          VALID_OPEN.actions[0],
          { type: "futures_close", positionId: 7, fraction: 1 },
        ],
      }),
    );
    expect(result.planned[0].code).toBe("capital_sizing_unavailable");
    expect(result.planned[1].accepted).toBe(true);
    expect(client.futuresQuote).not.toHaveBeenCalled();
    expect(client.closeFutures).toHaveBeenCalledTimes(1);
  });
});

describe("runCycle daily risk budget prompt", () => {
  afterEach(() => vi.useRealTimers());

  function capture(decision: unknown = { decision: "skip" }) {
    const decide = vi.fn<Provider["decide"]>().mockResolvedValue({
      ok: true,
      text: JSON.stringify(decision),
    });
    const prov: Provider = { label: "capture", decide };
    return {
      prov,
      decide,
      budget: (call = 0) =>
        JSON.parse(
          decide.mock.calls[call][0].user.match(/```json\n(.*)\n```/)![1],
        ).dailyRiskBudget,
    };
  }

  it("uses rolled UTC-day state before the model sees the budget", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-07T23:59:59.000Z"));
    const c = capture();
    const d = deps({}, baseClient(), c.prov);
    d.spec.limits.maxTradesPerDay = 3;
    d.state.riskIncreasesToday = 3;
    d.state.writesToday = 20;
    await runCycle(d);
    expect(c.budget()).toMatchObject({
      utcDay: "2026-09-07",
      used: 3,
      remaining: 0,
    });

    vi.setSystemTime(new Date("2026-09-08T00:00:00.000Z"));
    await runCycle(d);
    expect(c.budget(1)).toMatchObject({
      utcDay: "2026-09-08",
      used: 0,
      remaining: 3,
    });
    expect(d.state.writesToday).toBe(0);
    expect(d.state.riskIncreasesToday).toBe(0);
  });

  it.each(["futures_close", "futures_set_sltp"] as const)(
    "keeps %s executable at an exhausted budget without spending/restoring slots",
    async (type) => {
      const client = baseClient({
        futuresPositions: async () =>
          okData({ positions: [{ id: 7, status: "open", marginMusd: 50 }] }),
      });
      const c = capture({
        decision: "act",
        actions: [
          {
            type,
            positionId: 7,
            ...(type === "futures_set_sltp" ? { stopLossPrice: 60000 } : {}),
          },
        ],
      });
      const d = deps({ live: true }, client, c.prov);
      d.spec.limits.maxTradesPerDay = 1;
      d.state.riskIncreasesToday = 1;
      d.state.writesToday = 10;
      const result = await runCycle(d);
      expect(c.budget()).toMatchObject({ limit: 1, used: 1, remaining: 0 });
      expect(result.planned[0].executed).toBe(true);
      expect(d.state.writesToday).toBe(11);
      expect(d.state.riskIncreasesToday).toBe(1);
    },
  );

  it("shares one remaining slot across a multi-action decision and refreshes the next prompt", async () => {
    const c = capture({
      ...VALID_OPEN,
      actions: [
        VALID_OPEN.actions[0],
        { ...VALID_OPEN.actions[0], symbol: "ETH" },
      ],
    });
    const client = baseClient();
    const d = deps({ live: true }, client, c.prov);
    d.spec.limits.maxTradesPerDay = 3;
    d.spec.limits.maxWritesPerCycle = 2;
    d.state.riskIncreasesToday = 2;
    d.state.writesToday = 10;
    const result = await runCycle(d);
    expect(c.budget()).toMatchObject({ used: 2, remaining: 1 });
    expect(result.decisionInputRecord?.dailyRiskBudget).toMatchObject({
      used: 2,
      remaining: 1,
    });
    expect(result.planned[0].executed).toBe(true);
    expect(result.planned[1].code).toBe("daily_trade_cap");
    expect(client.openFutures).toHaveBeenCalledTimes(1);
    expect(d.state.riskIncreasesToday).toBe(3);
    c.decide.mockResolvedValue({
      ok: true,
      text: JSON.stringify({ decision: "skip" }),
    });
    await runCycle(d);
    expect(c.budget(1)).toMatchObject({ used: 3, remaining: 0 });
    // The first receipt must remain the PRE-decision state after execution and
    // subsequent cycles have advanced the mutable runner counters.
    expect(result.decisionInputRecord?.dailyRiskBudget).toMatchObject({
      used: 2,
      remaining: 1,
    });
  });

  it("counts successful adds to held futures positions as entry/add risk", async () => {
    const c = capture({
      ...VALID_OPEN,
      actions: [{ ...VALID_OPEN.actions[0], stopLossPrice: undefined }],
    });
    const client = baseClient({
      futuresPositions: async () =>
        okData({
          positions: [
            { id: 7, status: "open", marginMusd: 50, coin: { symbol: "BTC" } },
          ],
        }),
    });
    const d = deps({ live: true }, client, c.prov);
    // Existing add validation forbids SL/TP on adds; this fixture permits an
    // add without new triggers. No production policy is changed.
    d.spec.risk.requireStopLoss = false;
    d.spec.limits.maxTradesPerDay = 3;
    d.state.riskIncreasesToday = 1;
    const result = await runCycle(d);
    expect(result.planned[0].executed).toBe(true);
    expect(c.budget()).toMatchObject({ used: 1, remaining: 2 });
    expect(d.state.riskIncreasesToday).toBe(2);
    c.decide.mockResolvedValue({
      ok: true,
      text: JSON.stringify({ decision: "skip" }),
    });
    await runCycle(d);
    expect(c.budget(1)).toMatchObject({ used: 2, remaining: 1 });
  });

  it.each(["dry-run", "rejected", "failed"])(
    "does not spend a slot for a %s proposal or its model call",
    async (outcome) => {
      const c = capture(outcome === "rejected" ? OVER_LEVERAGE : VALID_OPEN);
      const client = baseClient({
        ...(outcome === "failed"
          ? {
              openFutures: vi.fn(async () => ({
                ok: false,
                status: 500,
                data: {},
              })),
            }
          : {}),
      });
      const d = deps({ live: outcome !== "dry-run" }, client, c.prov);
      d.spec.limits.maxTradesPerDay = 3;
      d.state.riskIncreasesToday = 1;
      d.state.writesToday = 20;
      await runCycle(d);
      expect(c.budget()).toMatchObject({ used: 1, remaining: 2 });
      expect(d.state.riskIncreasesToday).toBe(1);
      c.decide.mockResolvedValue({
        ok: true,
        text: JSON.stringify({ decision: "skip" }),
      });
      await runCycle(d);
      expect(c.budget(1)).toMatchObject({ used: 1, remaining: 2 });
    },
  );
});

describe("runCycle private input evidence", () => {
  it("keeps input evidence out of public trace, ordinary JSON, spreads and logs", async () => {
    const log = vi.fn();
    const onDecisionInputRecord = vi.fn();
    const client = baseClient();
    const result = await runCycle(
      deps({ live: true, log, onDecisionInputRecord }, client),
    );
    const record = result.decisionInputRecord!;
    expect(record).toMatchObject({
      visibility: "private",
      completeness: "partial",
      phase: "decision_input",
      outcome: "returned",
    });
    expect(record.runId).toBe("run-1");
    expect(record.decisionId).toMatch(/^cycle-1-/);
    expect(record.observationFingerprint).toBe(result.observationHash);
    expect(Buffer.byteLength(JSON.stringify(record))).toBeLessThanOrEqual(
      DECISION_INPUT_MAX_BYTES,
    );
    expect(onDecisionInputRecord).toHaveBeenCalledTimes(1);
    expect(onDecisionInputRecord.mock.calls[0][0]).not.toBe(record);
    expect(JSON.stringify(result)).not.toContain("decisionInputRecord");
    expect({ ...result }.decisionInputRecord).toBeUndefined();
    expect(JSON.stringify(client.openFutures.mock.calls)).not.toContain(
      "decisionInputRecord",
    );
    expect(JSON.stringify(log.mock.calls)).not.toContain(
      "coinrithm.decision-input",
    );
  });

  it.each(["hold", "capacity", "model_error", "malformed"])(
    "captures %s, not just acted cycles",
    async (kind) => {
      const prov: Provider = {
        label: "fixture",
        decide: async () =>
          kind === "capacity"
            ? { ok: false, deferred: true, error: "capacity" }
            : kind === "model_error"
              ? { ok: false, status: 503, error: "upstream unavailable" }
              : {
                  ok: true,
                  text:
                    kind === "malformed"
                      ? "not JSON"
                      : '{"decision":"skip","actions":[]}',
                },
      };
      const result = await runCycle(deps({}, baseClient(), prov));
      expect(result.decisionInputRecord).toMatchObject({
        phase: "decision_input",
        outcome: "returned",
        completeness: "partial",
      });
      expect(result.decisionInputRecord?.account?.cashAvailableMusd).toBe(1000);
      expect(result.planned).toEqual([]);
    },
  );

  it("records no-input kill-switch stops and observed no-trigger skips", async () => {
    const stopped = deps({});
    stopped.spec.killSwitch.maxConsecutiveRejects = 1;
    stopped.state.consecutiveRejectCycles = 1;
    const stopResult = await runCycle(stopped);
    expect(stopResult.decisionInputRecord).toMatchObject({
      phase: "before_observation",
      account: null,
    });
    expect(stopResult.decisionInputRecord?.omissions).toContain(
      "observation_not_available",
    );
    const gated = deps({});
    gated.spec.triggerPolicy!.mode = "event_driven";
    gated.spec.triggerPolicy!.skipLlmWhenNoTrigger = true;
    gated.spec.triggerPolicy!.pmEvalCooldownMinutes = 0;
    const gateResult = await runCycle(gated);
    expect(gateResult.llmCallMade).toBe(false);
    expect(gateResult.decisionInputRecord?.phase).toBe("decision_input");
  });

  it("preserves thrown errors while delivering only fixed failure metadata to private callback", async () => {
    const error = new Error("PRIVATE_UPSTREAM_EXCEPTION");
    const record = vi.fn();
    const prov: Provider = {
      label: "broken",
      decide: async () => {
        throw error;
      },
    };
    await expect(
      runCycle(deps({ onDecisionInputRecord: record }, baseClient(), prov)),
    ).rejects.toBe(error);
    const captured = record.mock.calls[0][0] as DecisionInputRecord;
    expect(captured).toMatchObject({
      phase: "decision_input",
      outcome: "runtime_error",
    });
    expect(captured.omissions).toContain("runtime_exception_after_snapshot");
    expect(JSON.stringify(captured)).not.toContain(
      "PRIVATE_UPSTREAM_EXCEPTION",
    );
  });

  it("evidence callback failure or mutation cannot change execution or the returned record", async () => {
    const client = baseClient();
    const result = await runCycle(
      deps(
        {
          live: true,
          onDecisionInputRecord: (r) => {
            r.dailyRiskBudget = null;
            throw new Error("PRIVATE_CALLBACK_ERROR");
          },
        },
        client,
      ),
    );
    expect(client.openFutures).toHaveBeenCalledTimes(1);
    expect(result.decisionInputRecord?.dailyRiskBudget).not.toBeNull();
    const asyncFailure = await runCycle(
      deps({
        onDecisionInputRecord: async () => {
          throw new Error("async callback failure");
        },
      }),
    );
    expect(asyncFailure.decision).toBe("act");
    await Promise.resolve();
  });

  it("an evidence helper failure produces fixed omission metadata without affecting execution", async () => {
    const spy = vi
      .spyOn(privateEvidence, "buildDecisionInputRecord")
      .mockImplementation(() => {
        throw new Error("PRIVATE_CAPTURE_ERROR");
      });
    try {
      const client = baseClient();
      const result = await runCycle(deps({ live: true }, client));
      expect(client.openFutures).toHaveBeenCalledTimes(1);
      expect(result.decisionInputRecord?.omissions).toContain(
        "evidence_capture_failed",
      );
      expect(result.decisionInputRecord?.dailyRiskBudget).toBeNull();
      expect(JSON.stringify(result.decisionInputRecord)).not.toContain(
        "PRIVATE_CAPTURE_ERROR",
      );
    } finally {
      spy.mockRestore();
    }
  });
});

describe("runCycle", () => {
  it("does not consume debounce or model-failure state when every route is capacity-deferred", async () => {
    const deferred: Provider = {
      label: "router/test",
      decide: async () => ({
        ok: false,
        error: "shared provider capacity unavailable",
        deferred: true,
        route: {
          policyVersion: "test",
          profile: "fast",
          reason: "capacity_fallback",
          attempts: [
            {
              provider: "nvidia",
              model: "test-model",
              outcome: "deferred",
              failureClass: "capacity",
              latencyMs: 0,
            },
          ],
        },
      }),
    };
    const d = deps({ live: false }, baseClient(), deferred);
    const beforeFailures = d.state.consecutiveModelFailures;
    const result = await runCycle(d);
    expect(result.modelFailed).toBe(false);
    expect(result.llmCallMade).toBe(false);
    expect(result.decisionType).toBe("gate_skip");
    expect(result.effectiveProvider).toBeUndefined();
    expect(result.effectiveModel).toBeUndefined();
    expect(d.state.lastLlmCallAt).toBeUndefined();
    expect(d.state.llmCallTimestamps).toBeUndefined();
    expect(d.state.consecutiveModelFailures).toBe(beforeFailures);
  });

  it("keeps a routed agent active when its exact model returns 429", async () => {
    const rateLimited: Provider = {
      label: "router/byo",
      decide: async () => ({
        ok: false,
        error: "provider HTTP 429: quota exceeded",
        status: 429,
        retryAfterMs: 60_000,
        route: {
          policyVersion: "test",
          profile: "strong",
          reason: "capacity_fallback",
          effectiveProvider: "nvidia",
          effectiveModel: "nvidia/nemotron-3-super-120b-a12b",
          attempts: [
            {
              provider: "nvidia",
              model: "nvidia/nemotron-3-super-120b-a12b",
              outcome: "failed",
              failureClass: "capacity",
              status: 429,
              retryAfterMs: 60_000,
              latencyMs: 25,
            },
          ],
        },
      }),
    };
    const d = deps({ live: true }, baseClient(), rateLimited);
    d.spec.killSwitch.maxConsecutiveModelFailures = 15;
    d.state.consecutiveModelFailures = 14;

    const result = await runCycle(d);

    expect(result).toMatchObject({
      decision: "skip",
      skipReason: "provider rate-limited; retry next cycle",
      modelFailed: false,
      llmCallMade: true,
      effectiveProvider: "nvidia",
      effectiveModel: "nvidia/nemotron-3-super-120b-a12b",
      routeReason: "capacity_fallback",
      planned: [],
    });
    expect(d.state.consecutiveModelFailures).toBe(14);
    expect(d.state.disabled).toBe(false);
  });

  it.each([429, 503])(
    "keeps direct BYO capacity HTTP %i out of failure streaks while recording the attempted model",
    async (status) => {
      const fetchFn = vi.fn<typeof fetch>().mockImplementation(
        async () =>
          new Response(
            JSON.stringify({
              error:
                "ResourceExhausted: Worker local total request limit reached",
            }),
            {
              status,
              headers: { "Retry-After": "60" },
            },
          ),
      );
      const client = baseClient();
      const d = deps({ live: true }, client);
      d.spec.model = {
        provider: "nvidia",
        name: "nvidia/nemotron-3-super-120b-a12b",
      };
      // This is the actual direct OpenAiCompatProvider created for hosted BYO
      // agents, NOT a routed fixture that already adds capacity classification.
      d.provider = selectProvider(
        d.spec,
        { NVIDIA_API_KEY: "test-only" },
        fetchFn,
      );
      d.spec.killSwitch.maxConsecutiveModelFailures = 15;
      d.state.consecutiveModelFailures = 14;
      d.state.consecutivePermanentModelErrors = 2;

      for (let cycle = 0; cycle < 2; cycle++) {
        const result = await runCycle(d);
        expect(result).toMatchObject({
          decision: "skip",
          decisionType: "gate_skip",
          skipReason: "provider rate-limited; retry next cycle",
          modelFailed: false,
          llmCallMade: true,
          effectiveProvider: "nvidia",
          effectiveModel: d.spec.model.name,
          routeReason: "configured_direct",
          planned: [],
          writeAttempted: 0,
          writeAccepted: 0,
        });
        expect(result.routeAttempts).toBeUndefined();
        expect(result.providerHold).toBeUndefined();
        expect(d.state.consecutiveModelFailures).toBe(14);
        expect(d.state.consecutivePermanentModelErrors).toBe(2);
        expect(d.state.disabled).toBe(false);
      }
      expect(fetchFn).toHaveBeenCalledTimes(2);
      for (const [url, init] of fetchFn.mock.calls) {
        expect(url).toBe(
          "https://integrate.api.nvidia.com/v1/chat/completions",
        );
        expect(JSON.parse(String(init?.body)).model).toBe(d.spec.model.name);
      }
      expect(d.state.lastLlmCallAt).toBeDefined();
      expect(d.state.llmCallTimestamps).toHaveLength(2);
      expect(client.openFutures).not.toHaveBeenCalled();
    },
  );

  it("does not invent a provider call for a direct local capacity deferral", async () => {
    const d = deps({}, baseClient(), {
      label: "local-capacity",
      decide: async () => ({
        ok: false,
        deferred: true,
        error: "local capacity unavailable",
      }),
    });
    d.state.consecutiveModelFailures = 3;
    const result = await runCycle(d);
    expect(result).toMatchObject({
      skipReason: "provider capacity deferred",
      modelFailed: false,
      llmCallMade: false,
      tokensIn: 0,
      tokensOut: 0,
      estimatedCostUsd: 0,
    });
    expect(result.effectiveProvider).toBeUndefined();
    expect(result.effectiveModel).toBeUndefined();
    expect(result.routeReason).toBeUndefined();
    expect(d.state.consecutiveModelFailures).toBe(3);
    expect(d.state.lastLlmCallAt).toBeUndefined();
  });

  it.each([503, 410, 404])(
    "still classifies a real direct BYO HTTP %i as a model failure, not capacity",
    async (status) => {
      const fetchFn = vi.fn<typeof fetch>().mockImplementation(
        async () =>
          new Response(
            status === 410
              ? "model no longer available"
              : status === 404
                ? ""
                : "unavailable",
            {
              status,
            },
          ),
      );
      const d = deps({ live: true });
      d.spec.model = { provider: "nvidia", name: "test-retired-model" };
      d.provider = selectProvider(
        d.spec,
        { NVIDIA_API_KEY: "test-only" },
        fetchFn,
      );
      d.state.consecutivePermanentModelErrors = 2;
      const result = await runCycle(d);
      expect(result).toMatchObject({
        decision: "skip",
        decisionType: "model_error",
        modelFailed: true,
        llmCallMade: true,
        effectiveProvider: "nvidia",
        effectiveModel: "test-retired-model",
        routeReason: "configured_direct",
      });
      expect(d.state.consecutiveModelFailures).toBe(1);
      if (status === 410 || status === 404) {
        expect(result.providerHold).toMatchObject({
          provider: "nvidia",
          model: "test-retired-model",
        });
        expect(d.state.consecutivePermanentModelErrors).toBe(3);
        expect(result.routeAttempts).toBeUndefined();
      } else {
        expect(result.providerHold).toBeUndefined();
        expect(d.state.consecutivePermanentModelErrors).toBe(0);
        expect(result.routeAttempts).toMatchObject([
          {
            provider: "nvidia",
            model: "test-retired-model",
            status: 503,
            outcome: "failed",
            failureClass: "transient",
          },
          {
            provider: "nvidia",
            model: "test-retired-model",
            status: 503,
            outcome: "failed",
            failureClass: "transient",
          },
        ]);
      }
      // Retry failures count once per cycle, not once per HTTP attempt.
      expect(fetchFn).toHaveBeenCalledTimes(status === 503 ? 2 : 1);
      expect(d.state.llmCallTimestamps).toHaveLength(1);
      expect(result.writeAttempted).toBe(0);
      expect(result.writeAccepted).toBe(0);
    },
  );

  it("recovers a direct BYO 500 on the same model within one cycle and executes only once", async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: {
              message: "Internal server error",
              type: "Internal Server Error",
              code: 500,
            },
          }),
          { status: 500 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            choices: [{ message: { content: JSON.stringify(VALID_OPEN) } }],
            usage: { prompt_tokens: 700, completion_tokens: 80 },
          }),
        ),
      );
    const client = baseClient();
    const d = deps({ live: true }, client);
    const model = "nvidia/nemotron-3-super-120b-a12b";
    d.spec.model = { provider: "nvidia", name: model };
    d.provider = selectProvider(
      d.spec,
      { NVIDIA_API_KEY: "test-only" },
      fetchFn,
    );
    d.state.consecutiveModelFailures = 2;
    d.state.consecutivePermanentModelErrors = 2;
    const result = await runCycle(d);
    expect(result).toMatchObject({
      decision: "act",
      llmCallMade: true,
      effectiveProvider: "nvidia",
      effectiveModel: model,
      routeReason: "configured_direct",
      tokensIn: 700,
      tokensOut: 80,
      routeAttempts: [
        {
          provider: "nvidia",
          model,
          status: 500,
          outcome: "failed",
          failureClass: "transient",
        },
        { provider: "nvidia", model, outcome: "success" },
      ],
      writeAttempted: 1,
      writeAccepted: 1,
    });
    expect(result.modelFailed).not.toBe(true);
    expect(result.planned).toHaveLength(1);
    expect(result.planned[0].executed).toBe(true);
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(fetchFn.mock.calls[1][0]).toBe(fetchFn.mock.calls[0][0]);
    expect(fetchFn.mock.calls[1][1]?.body).toBe(fetchFn.mock.calls[0][1]?.body);
    expect(client.futuresQuote).toHaveBeenCalledTimes(1);
    expect(client.openFutures).toHaveBeenCalledTimes(1);
    expect(d.state.riskIncreasesToday).toBe(1);
    expect(d.state.llmCallTimestamps).toHaveLength(1);
    expect(d.state.consecutiveModelFailures).toBe(0);
    expect(d.state.consecutivePermanentModelErrors).toBe(0);
  });

  it("attributes successful real direct calls without claiming they were hosted BYO", async () => {
    const fetchFn = vi.fn<typeof fetch>().mockImplementation(
      async () =>
        new Response(
          JSON.stringify({
            choices: [
              { message: { content: '{"decision":"skip","actions":[]}' } },
            ],
          }),
        ),
    );
    const d = deps({ live: true });
    d.spec.model = { provider: "nvidia", name: "test-configured-model" };
    d.provider = selectProvider(
      d.spec,
      { NVIDIA_API_KEY: "test-only" },
      fetchFn,
    );
    const result = await runCycle(d);
    expect(result).toMatchObject({
      decision: "skip",
      llmCallMade: true,
      effectiveProvider: "nvidia",
      effectiveModel: "test-configured-model",
      routeReason: "configured_direct",
    });
    expect(result.routeAttempts).toBeUndefined();
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("--dry-run never writes (but plans the accepted action)", async () => {
    const client = baseClient();
    const r = await runCycle(deps({ live: false }, client));
    expect(r.decision).toBe("act");
    expect(r.planned[0].accepted).toBe(true);
    expect(r.planned[0].executed).toBe(false);
    expect(r.observationHash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(r.indicatorVersion).toBe("coinrithm.indicators.v1");
    expect(client.openFutures).not.toHaveBeenCalled();
  });

  it("--live writes only after fetching a quote + validating", async () => {
    const client = baseClient();
    const r = await runCycle(deps({ live: true }, client));
    expect(client.futuresQuote).toHaveBeenCalled();
    expect(client.openFutures).toHaveBeenCalledTimes(1);
    expect(client.openFutures).toHaveBeenCalledWith(
      expect.objectContaining({
        agentTrace: expect.objectContaining({
          observationHash: r.observationHash,
          indicatorVersion: r.indicatorVersion,
        }),
      }),
    );
    expect(r.planned[0].executed).toBe(true);
  });

  it("rejects over-leverage and never writes", async () => {
    const client = baseClient();
    const r = await runCycle(
      deps({ live: true }, client, provider(OVER_LEVERAGE)),
    );
    expect(r.planned[0].accepted).toBe(false);
    expect(r.planned[0].code).toBe("leverage_exceeds_cap");
    expect(client.openFutures).not.toHaveBeenCalled();
  });

  it("invalid model output is a model failure with no write", async () => {
    const client = baseClient();
    const bad: Provider = {
      label: "x",
      decide: async () => ({ ok: true, text: "not json" }),
    };
    const d = deps({ live: true }, client, bad);
    const r = await runCycle(d);
    expect(r.modelFailed).toBe(true);
    expect(d.state.consecutiveModelFailures).toBe(1);
    expect(client.openFutures).not.toHaveBeenCalled();
  });

  it("repeated rejects trip the kill-switch", async () => {
    const client = baseClient();
    const d = deps({ live: true }, client, provider(OVER_LEVERAGE));
    d.spec.killSwitch.maxConsecutiveRejects = 1;
    const c1 = await runCycle(d);
    expect(c1.disabled).toBeFalsy();
    const c2 = await runCycle(d);
    expect(c2.disabled).toBe(true);
    expect(d.state.disabled).toBe(true);
  });

  it("advances the cursor and dedupes closed trades", async () => {
    const client = baseClient({
      trades: async () =>
        okData({
          asOf: "T2",
          trades: [{ venue: "futures", id: 5, realizedPnlMusd: 10 }],
        }),
    });
    const d = deps({ live: false }, client, provider({ decision: "skip" }));
    await runCycle(d);
    expect(d.state.cursor).toBe("T2");
    expect(d.state.seen).toContain("futures:5");
    expect(d.state.realizedPnlMusd).toBe(10);
    await runCycle(d); // same trade again -> deduped, not double-counted
    expect(d.state.realizedPnlMusd).toBe(10);
  });

  it("running cash blocks a second open the stale snapshot would have allowed", async () => {
    const client = baseClient();
    const two = {
      decision: "act",
      actions: [
        {
          type: "futures_open",
          symbol: "BTC",
          side: "long",
          leverage: 2,
          marginMusd: 600,
          stopLossPrice: 60000,
          confidence: 0.9,
        },
        {
          type: "futures_open",
          symbol: "ETH",
          side: "long",
          leverage: 2,
          marginMusd: 600,
          stopLossPrice: 1000,
          confidence: 0.9,
        },
      ],
    };
    const d = deps({ live: true }, client, provider(two));
    d.spec.risk.perTradeMarginMusd = 600;
    d.spec.limits.maxWritesPerCycle = 2;
    d.spec.limits.maxOpenMarginMusd = 5000;
    const r = await runCycle(d);
    expect(r.planned[0].executed).toBe(true);
    expect(r.planned[1].accepted).toBe(false);
    expect(r.planned[1].code).toBe("insufficient_balance");
    expect(client.openFutures).toHaveBeenCalledTimes(1);
  });

  it("rejects a duplicate action on the same position within a cycle", async () => {
    const client = baseClient({
      futuresPositions: async () =>
        okData({ positions: [{ id: 7, status: "open", marginMusd: 50 }] }),
    });
    const two = {
      decision: "act",
      actions: [
        { type: "futures_close", positionId: 7 },
        { type: "futures_close", positionId: 7 },
      ],
    };
    const d = deps({ live: true }, client, provider(two));
    d.spec.limits.maxWritesPerCycle = 2;
    const r = await runCycle(d);
    expect(r.planned[0].accepted).toBe(true);
    expect(r.planned[1].code).toBe("position_already_targeted");
    expect(client.closeFutures).toHaveBeenCalledTimes(1);
  });

  it("uses a deterministic idempotency key that advances only on success", async () => {
    const keys: string[] = [];
    const client = baseClient({
      openFutures: vi.fn(async (body: { idempotencyKey: string }) => {
        keys.push(body.idempotencyKey);
        return okData({ position: { id: 1 } });
      }),
    });
    const d = deps({ live: true }, client, provider(VALID_OPEN));
    d.spec.risk.maxConcurrentPositions = 5;
    await runCycle(d);
    await runCycle(d); // same intent, prior succeeded -> seq advances
    expect(keys).toHaveLength(2);
    expect(keys[0].endsWith(":0")).toBe(true);
    expect(keys[1].endsWith(":1")).toBe(true);
  });

  it("SPOT: dry-run plans a buy without writing; live writes after a quote", async () => {
    const buy = {
      decision: "act",
      confidence: 0.8,
      actions: [
        {
          type: "spot_order",
          symbol: "BTC",
          side: "buy",
          orderType: "market",
          quantity: 0.0005,
          confidence: 0.8,
        },
      ],
    };
    const dryC = baseClient();
    const dry = deps({ live: false }, dryC, provider(buy));
    dry.spec.venues = ["spot", "futures", "pm"];
    const rDry = await runCycle(dry);
    expect(rDry.planned[0].accepted).toBe(true);
    expect(dryC.placeSpotOrder).not.toHaveBeenCalled();

    const liveC = baseClient();
    const live = deps({ live: true }, liveC, provider(buy));
    live.spec.venues = ["spot", "futures", "pm"];
    const rLive = await runCycle(live);
    expect(liveC.spotQuote).toHaveBeenCalled();
    expect(liveC.placeSpotOrder).toHaveBeenCalledTimes(1);
    expect(rLive.planned[0].executed).toBe(true);
  });

  it("SPOT: running cash blocks a second market buy after the first consumes it", async () => {
    // Regression for the field-drift double-spend: a market buy must decrement
    // running cash (via the same spotBuyCost the validator gates on), so a second
    // same-cycle buy the stale snapshot would allow is rejected.
    const client = baseClient({
      spotQuote: vi.fn(async () =>
        okData({
          eligible: true,
          executionPrice: 600,
          estimatedCostMusd: 600,
          observation: { freshness: { status: "fresh" } },
        }),
      ),
    });
    const two = {
      decision: "act",
      actions: [
        {
          type: "spot_order",
          symbol: "BTC",
          side: "buy",
          orderType: "market",
          quantity: 1,
          confidence: 0.9,
        },
        {
          type: "spot_order",
          symbol: "BTC",
          side: "buy",
          orderType: "market",
          quantity: 1,
          confidence: 0.9,
        },
      ],
    };
    const d = deps({ live: true }, client, provider(two));
    d.spec.venues = ["spot", "futures", "pm"];
    d.spec.risk.perTradeMarginMusd = 600; // each buy is within the per-trade cap
    d.spec.limits.maxWritesPerCycle = 2;
    const r = await runCycle(d); // cash starts at 1000
    expect(r.planned[0].executed).toBe(true); // 600 spent, cash -> 400
    expect(r.planned[1].accepted).toBe(false);
    expect(r.planned[1].code).toBe("insufficient_balance"); // 600 > 400
    expect(client.placeSpotOrder).toHaveBeenCalledTimes(1);
  });

  it("PM: opens only a discovered market (live)", async () => {
    const client = baseClient();
    const pm = {
      decision: "act",
      confidence: 0.8,
      actions: [
        {
          type: "pm_open",
          source: "kalshi",
          slug: "btc-up",
          outcomeExternalMarketId: "yes-1",
          stakeMusd: 20,
          confidence: 0.8,
        },
      ],
    };
    const d = deps({ live: true }, client, provider(pm));
    d.spec.venues = ["spot", "futures", "pm"];
    const r = await runCycle(d);
    expect(client.pmQuote).toHaveBeenCalled();
    expect(client.openPmPosition).toHaveBeenCalledTimes(1);
    expect(r.planned[0].executed).toBe(true);
  });

  it("PM: rejects a hallucinated (undiscovered) market", async () => {
    const client = baseClient();
    const pm = {
      decision: "act",
      actions: [
        {
          type: "pm_open",
          source: "kalshi",
          slug: "not-real",
          outcomeExternalMarketId: "z",
          stakeMusd: 20,
          confidence: 0.9,
        },
      ],
    };
    const d = deps({ live: true }, client, provider(pm));
    d.spec.venues = ["spot", "futures", "pm"];
    const r = await runCycle(d);
    expect(r.planned[0].code).toBe("pm_market_not_discovered");
    expect(client.openPmPosition).not.toHaveBeenCalled();
  });

  it("PM: rejects re-betting a market+outcome already held (anti-churn)", async () => {
    const client = baseClient({
      // REAL /api/agent/positions/pm shape: eventSlug + nested outcome.externalMarketId
      // (probed 2026-06-25). The guard must read these, not slug/outcomeExternalMarketId.
      pmPositions: async () =>
        okData({
          positions: [
            {
              id: 1,
              source: "kalshi",
              eventSlug: "btc-up",
              outcome: { externalMarketId: "yes-1", label: "Yes" },
              stakeMusd: 20,
              status: "open",
            },
          ],
        }),
    });
    const pm = {
      decision: "act",
      confidence: 0.8,
      actions: [
        {
          type: "pm_open",
          source: "kalshi",
          slug: "btc-up",
          outcomeExternalMarketId: "yes-1",
          stakeMusd: 20,
          confidence: 0.8,
        },
      ],
    };
    const d = deps({ live: true }, client, provider(pm));
    d.spec.venues = ["spot", "futures", "pm"];
    const r = await runCycle(d);
    expect(r.planned[0].code).toBe("duplicate_intent");
    expect(client.openPmPosition).not.toHaveBeenCalled();
  });
});

describe("repairFuturesTakeProfit (runner auto-clamps weak-model triggers)", () => {
  const quote: QuoteEvidence = { eligible: true, entryPrice: 67000 };
  const longOpen: ProposedAction = {
    type: "futures_open",
    symbol: "BTC",
    side: "long",
    leverage: 2,
    marginMusd: 50,
    stopLossPrice: 66000, // risk = 1000
  };

  it("repairs a MISSING take-profit to a valid R:R target above entry (long)", () => {
    const r = repairFuturesTakeProfit(longOpen, quote);
    expect(r.repaired).toBe(true);
    // entry 67000 + 1.5 * risk(1000) = 68500
    expect((r.action as { takeProfitPrice?: number }).takeProfitPrice).toBe(
      68500,
    );
  });

  it("repairs a WRONG-SIDE take-profit (long TP below entry) to the correct side", () => {
    const r = repairFuturesTakeProfit(
      { ...longOpen, takeProfitPrice: 65000 },
      quote,
    );
    expect(r.repaired).toBe(true);
    expect((r.action as { takeProfitPrice?: number }).takeProfitPrice).toBe(
      68500,
    );
  });

  it("repairs a short's wrong-side TP to below entry", () => {
    const shortOpen: ProposedAction = {
      ...longOpen,
      side: "short",
      stopLossPrice: 68000, // risk = 1000
      takeProfitPrice: 69000, // above entry -> wrong for a short
    };
    const r = repairFuturesTakeProfit(shortOpen, quote);
    expect(r.repaired).toBe(true);
    // entry 67000 - 1.5 * 1000 = 65500
    expect((r.action as { takeProfitPrice?: number }).takeProfitPrice).toBe(
      65500,
    );
  });

  it("leaves a correctly-oriented take-profit untouched", () => {
    const r = repairFuturesTakeProfit(
      { ...longOpen, takeProfitPrice: 70000 },
      quote,
    );
    expect(r.repaired).toBe(false);
    expect((r.action as { takeProfitPrice?: number }).takeProfitPrice).toBe(
      70000,
    );
  });

  it("does not fabricate a TP when no usable stop is present", () => {
    const noStop = { ...longOpen };
    delete (noStop as { stopLossPrice?: number }).stopLossPrice;
    expect(repairFuturesTakeProfit(noStop, quote).repaired).toBe(false);
  });

  it("is a no-op for non-futures_open actions", () => {
    const pm: ProposedAction = {
      type: "pm_open",
      ref: "pm1",
      stakeMusd: 10,
    } as ProposedAction;
    expect(repairFuturesTakeProfit(pm, quote).repaired).toBe(false);
  });
});

describe("rationaleForAction (per-trade reasoning stays honest about the market)", () => {
  const solOpen: ProposedAction = {
    type: "futures_open",
    symbol: "SOL",
    side: "long",
    leverage: 2,
    marginMusd: 50,
  };
  const pmBtc: ProposedAction = {
    type: "pm_open",
    source: "kalshi",
    slug: "bitcoin-up-or-down",
    outcomeExternalMarketId: "yes-1",
    stakeMusd: 10,
  } as ProposedAction;

  it("keeps a single-action decision's rationale even if it does not name the market", () => {
    expect(
      rationaleForAction(solOpen, "ETH is ripping, going long", undefined, 1),
    ).toBe("ETH is ripping, going long");
  });

  it("keeps a multi-action rationale that NAMES this action's market", () => {
    expect(
      rationaleForAction(solOpen, "SOL broke its range, long it", undefined, 2),
    ).toBe("SOL broke its range, long it");
  });

  it("replaces a multi-action rationale about a DIFFERENT market with a faithful summary", () => {
    expect(
      rationaleForAction(solOpen, "ETH broke its range, long it", undefined, 2),
    ).toBe("opened long SOL (x2, 50mUSD)");
  });

  it("replaces a mismatched multi-action PM rationale with a faithful summary", () => {
    expect(
      rationaleForAction(pmBtc, "ETH is the play today", undefined, 2),
    ).toBe("bet PM bitcoin-up-or-down 10mUSD");
  });

  it("keeps a multi-action PM rationale that names the market subject", () => {
    expect(
      rationaleForAction(
        pmBtc,
        "bitcoin pinned, fading the upside",
        undefined,
        2,
      ),
    ).toBe("bitcoin pinned, fading the upside");
  });

  it("always prefers an explicit per-action summary", () => {
    expect(
      rationaleForAction(solOpen, "ETH is ripping", "SOL momentum entry", 2),
    ).toBe("SOL momentum entry");
  });
});

describe("sanitizeForecastProbability (rails: clamp [1,99], omit garbage)", () => {
  it("passes an in-range value through, rounded to one decimal", () => {
    expect(sanitizeForecastProbability(62)).toBe(62);
    expect(sanitizeForecastProbability(62.37)).toBe(62.4);
  });
  it("clamps above 99 down to 99 and at/below 0 up to 1", () => {
    expect(sanitizeForecastProbability(150)).toBe(99);
    expect(sanitizeForecastProbability(99.9)).toBe(99);
    expect(sanitizeForecastProbability(0)).toBe(1);
    expect(sanitizeForecastProbability(-5)).toBe(1);
    expect(sanitizeForecastProbability(0.4)).toBe(1);
  });
  it("returns undefined for missing / non-finite / non-numeric input (never fakes a value)", () => {
    expect(sanitizeForecastProbability(undefined)).toBeUndefined();
    expect(sanitizeForecastProbability(null)).toBeUndefined();
    expect(sanitizeForecastProbability(NaN)).toBeUndefined();
    expect(sanitizeForecastProbability(Infinity)).toBeUndefined();
    expect(sanitizeForecastProbability("55")).toBeUndefined(); // parser coerces; this helper is number-only
  });
});

describe("houseAgentForecastEnabled (default ON, false/0 kill-switch)", () => {
  const prev = process.env.HOUSE_AGENT_FORECAST_ENABLED;
  afterEach(() => {
    if (prev === undefined) delete process.env.HOUSE_AGENT_FORECAST_ENABLED;
    else process.env.HOUSE_AGENT_FORECAST_ENABLED = prev;
  });
  it("is ON when unset", () => {
    delete process.env.HOUSE_AGENT_FORECAST_ENABLED;
    expect(houseAgentForecastEnabled()).toBe(true);
  });
  it("is OFF for false / 0 / no / off", () => {
    for (const v of ["false", "0", "no", "off", "FALSE", " Off "]) {
      process.env.HOUSE_AGENT_FORECAST_ENABLED = v;
      expect(houseAgentForecastEnabled()).toBe(false);
    }
  });
});

describe("runCycle — PM independent forecast submission", () => {
  const prevFlag = process.env.HOUSE_AGENT_FORECAST_ENABLED;
  afterEach(() => {
    if (prevFlag === undefined) delete process.env.HOUSE_AGENT_FORECAST_ENABLED;
    else process.env.HOUSE_AGENT_FORECAST_ENABLED = prevFlag;
  });

  // The real discovery API uses 0..100 points; the observation uses 0..1.
  const pmDecision = (forecastProbability?: number) => ({
    decision: "act",
    confidence: 0.8,
    actions: [
      {
        type: "pm_open",
        source: "kalshi",
        slug: "btc-up",
        outcomeExternalMarketId: "yes-1",
        stakeMusd: 20,
        confidence: 0.8,
        ...(forecastProbability != null ? { forecastProbability } : {}),
      },
    ],
  });

  it("parse-success: submits the clamped forecastProbability on the open", async () => {
    delete process.env.HOUSE_AGENT_FORECAST_ENABLED; // default ON
    const client = baseClient();
    const d = deps({ live: true }, client, provider(pmDecision(55)));
    d.spec.venues = ["spot", "futures", "pm"];
    const r = await runCycle(d);
    expect(r.planned[0].executed).toBe(true);
    expect(client.openPmPosition).toHaveBeenCalledTimes(1);
    expect(client.openPmPosition.mock.calls[0][0]).toMatchObject({
      forecastProbability: 55,
    });
  });

  it("clamps an out-of-range model forecast before submitting (150 -> 99)", async () => {
    delete process.env.HOUSE_AGENT_FORECAST_ENABLED;
    const client = baseClient();
    const d = deps({ live: true }, client, provider(pmDecision(150)));
    d.spec.venues = ["spot", "futures", "pm"];
    await runCycle(d);
    expect(client.openPmPosition.mock.calls[0][0].forecastProbability).toBe(99);
  });

  it("parse-failure / omitted forecast: trade STILL proceeds with NO forecast field", async () => {
    delete process.env.HOUSE_AGENT_FORECAST_ENABLED;
    const client = baseClient();
    // Model emits a non-numeric forecast — the parser drops it to undefined; the
    // trade must still open, just without the field.
    const d = deps(
      { live: true },
      client,
      provider(pmDecision("garbage" as unknown as number)),
    );
    d.spec.venues = ["spot", "futures", "pm"];
    const r = await runCycle(d);
    expect(r.planned[0].executed).toBe(true);
    expect(client.openPmPosition).toHaveBeenCalledTimes(1);
    const body = client.openPmPosition.mock.calls[0][0];
    expect(body).not.toHaveProperty("forecastProbability");
  });

  it("anti-echo: an exact-match forecast is logged and no longer bought", async () => {
    delete process.env.HOUSE_AGENT_FORECAST_ENABLED;
    const client = baseClient();
    const logs: string[] = [];
    // forecast 50 == market prob 50%: the echo stays observable, but buying
    // an outcome at exactly the price you give it is a zero-edge trade, so
    // the forecast-edge gate rejects the open (live 2026-09-02 P0).
    const d = deps(
      { live: true, log: (l: string) => logs.push(l) },
      client,
      provider(pmDecision(50)),
    );
    d.spec.venues = ["spot", "futures", "pm"];
    const r = await runCycle(d);
    expect(logs.some((l) => /echo/i.test(l))).toBe(true);
    expect(client.openPmPosition).not.toHaveBeenCalled();
    expect(r.planned.some((p) => p.code === "forecast_no_positive_edge")).toBe(
      true,
    );
  });

  it("rejects a forecast above the raw mid but below the fee-inclusive quoted cost", async () => {
    delete process.env.HOUSE_AGENT_FORECAST_ENABLED;
    const client = baseClient({
      pmQuote: vi.fn(async () =>
        okData({
          eligible: true,
          entryProbability: 60,
          stakeMusd: 20,
          sharesEstimate: 20 / 0.7107812966754956,
          executionModel: { effectiveProbability: 70.0035 },
          observation: { freshness: { status: "fresh", ageMinutes: 10 } },
        }),
      ),
    });
    const d = deps({ live: true }, client, provider(pmDecision(66)));
    d.spec.venues = ["spot", "futures", "pm"];
    const result = await runCycle(d);
    expect(client.pmQuote).toHaveBeenCalledTimes(1);
    expect(result.planned[0]).toMatchObject({
      accepted: false,
      code: "forecast_no_positive_edge",
    });
    expect(client.openPmPosition).not.toHaveBeenCalled();
  });

  it.each([{ stakeMusd: 20 }, { stakeMusd: 10, sharesEstimate: 40 }])(
    "rejects unavailable or differently-sized cost evidence without using the raw mid: %j",
    async (cost) => {
      delete process.env.HOUSE_AGENT_FORECAST_ENABLED;
      const client = baseClient({
        pmQuote: vi.fn(async () =>
          okData({
            eligible: true,
            entryProbability: 50,
            ...cost,
            observation: { freshness: { status: "fresh" } },
          }),
        ),
      });
      const d = deps({ live: true }, client, provider(pmDecision(80)));
      d.spec.venues = ["spot", "futures", "pm"];
      const result = await runCycle(d);
      expect(result.planned[0]).toMatchObject({
        accepted: false,
        code: "pm_quote_cost_unavailable",
      });
      expect(client.openPmPosition).not.toHaveBeenCalled();
    },
  );

  it("kill-switch OFF: request is byte-identical (no forecastProbability) even when the model forecasts", async () => {
    process.env.HOUSE_AGENT_FORECAST_ENABLED = "false";
    const client = baseClient();
    const d = deps({ live: true }, client, provider(pmDecision(55)));
    d.spec.venues = ["spot", "futures", "pm"];
    const r = await runCycle(d);
    expect(r.planned[0].executed).toBe(true);
    const body = client.openPmPosition.mock.calls[0][0];
    expect(body).not.toHaveProperty("forecastProbability");
    // Strong byte-level check: the serialized request never mentions the field.
    expect(JSON.stringify(body)).not.toContain("forecastProbability");
  });

  it("openBlocked: skips the candidate early (pm_open_blocked) instead of a guaranteed 422", async () => {
    delete process.env.HOUSE_AGENT_FORECAST_ENABLED;
    const client = baseClient({
      pmQuote: vi.fn(async () =>
        okData({
          eligible: true,
          openBlocked: true,
          openBlockReasons: ["quality_state_stale"],
          observation: { freshness: { status: "fresh" } },
        }),
      ),
    });
    const d = deps({ live: true }, client, provider(pmDecision(55)));
    d.spec.venues = ["spot", "futures", "pm"];
    const r = await runCycle(d);
    expect(r.planned[0].accepted).toBe(false);
    expect(r.planned[0].code).toBe("pm_open_blocked");
    expect(client.openPmPosition).not.toHaveBeenCalled();
  });
});

describe("runCycle — mechanical BENCHMARK agents (no LLM call)", () => {
  const prevFlag = process.env.HOUSE_AGENT_FORECAST_ENABLED;
  afterEach(() => {
    if (prevFlag === undefined) delete process.env.HOUSE_AGENT_FORECAST_ENABLED;
    else process.env.HOUSE_AGENT_FORECAST_ENABLED = prevFlag;
  });

  // A provider whose decide() MUST NOT be called for a mechanical agent.
  function neverProvider(): Provider {
    return {
      label: "should-not-be-called",
      decide: vi.fn(async () => ({
        ok: false as const,
        error: "must not be called",
      })),
    };
  }

  function mechanicalDeps(strategy: string) {
    const prov = neverProvider();
    const d = deps({ live: true }, baseClient(), prov);
    d.spec.venues = ["pm"];
    d.spec.model = { provider: "mechanical", name: strategy };
    d.spec.abstention.minConfidence = 0;
    return {
      d,
      prov,
      client: d.client as unknown as ReturnType<typeof baseClient>,
    };
  }

  it("market-implied: short-circuits the LLM and submits a forecast == market probability", async () => {
    delete process.env.HOUSE_AGENT_FORECAST_ENABLED; // default ON
    const { d, prov, client } = mechanicalDeps("market-implied");
    const r = await runCycle(d);
    // the model was never consulted
    expect(prov.decide as ReturnType<typeof vi.fn>).not.toHaveBeenCalled();
    // a benchmark bet was executed on the discovered market (kalshi/btc-up @ 0.5)
    expect(r.decision).toBe("act");
    expect(r.planned[0].executed).toBe(true);
    expect(client.openPmPosition).toHaveBeenCalledTimes(1);
    // echo BY DESIGN: forecast 50 == market prob 50%
    expect(client.openPmPosition.mock.calls[0][0].forecastProbability).toBe(50);
    expect(client.openPmPosition.mock.calls[0][0].stakeMusd).toBe(10);
    // zero-cost cycle: no LLM call, no tokens
    expect(r.llmCallMade).toBe(false);
    expect(r.tokensIn).toBe(0);
    expect(r.tokensOut).toBe(0);
    expect(r.estimatedCostUsd).toBe(0);
  });

  it("base-rate: submits the uninformative 50 without calling the model", async () => {
    delete process.env.HOUSE_AGENT_FORECAST_ENABLED;
    const { d, prov, client } = mechanicalDeps("base-rate");
    await runCycle(d);
    expect(prov.decide as ReturnType<typeof vi.fn>).not.toHaveBeenCalled();
    expect(client.openPmPosition.mock.calls[0][0].forecastProbability).toBe(50);
  });

  it("random: submits a seeded [20,80] forecast without calling the model", async () => {
    delete process.env.HOUSE_AGENT_FORECAST_ENABLED;
    const { d, prov, client } = mechanicalDeps("random");
    await runCycle(d);
    expect(prov.decide as ReturnType<typeof vi.fn>).not.toHaveBeenCalled();
    const fc = client.openPmPosition.mock.calls[0][0].forecastProbability;
    expect(fc).toBeGreaterThanOrEqual(20);
    expect(fc).toBeLessThanOrEqual(80);
  });

  it("an unknown strategy skips (no throw, no model call, no write)", async () => {
    const { d, prov, client } = mechanicalDeps("not-a-strategy");
    const r = await runCycle(d);
    expect(prov.decide as ReturnType<typeof vi.fn>).not.toHaveBeenCalled();
    expect(r.decision).toBe("skip");
    expect(client.openPmPosition).not.toHaveBeenCalled();
  });
});
