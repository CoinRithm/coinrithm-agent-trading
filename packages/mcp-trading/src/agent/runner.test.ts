import { describe, it, expect, vi, afterEach } from "vitest";
import {
  runCycle,
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
import { Provider } from "./providers.js";

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
              { externalMarketId: "yes-1", name: "Yes", probability: 0.5 },
            ],
          },
        ],
      }),
    pmQuote: vi.fn(async () =>
      okData({
        eligible: true,
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

describe("runCycle", () => {
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

  // baseClient's discover surfaces one market (kalshi/btc-up/yes-1) at prob 0.5,
  // so the market's integer probability is 50%.
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

  it("anti-echo: an exact-match forecast is still submitted, with an observable log line", async () => {
    delete process.env.HOUSE_AGENT_FORECAST_ENABLED;
    const client = baseClient();
    const logs: string[] = [];
    // forecast 50 == market prob 50% (echo) -> submitted as-is + logged.
    const d = deps(
      { live: true, log: (l: string) => logs.push(l) },
      client,
      provider(pmDecision(50)),
    );
    d.spec.venues = ["spot", "futures", "pm"];
    await runCycle(d);
    expect(client.openPmPosition.mock.calls[0][0].forecastProbability).toBe(50);
    expect(logs.some((l) => /echo/i.test(l))).toBe(true);
  });

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
