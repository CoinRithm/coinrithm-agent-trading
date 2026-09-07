import { describe, it, expect } from "vitest";
import { validateAction, DecisionContext } from "./decisionValidator.js";
import { parseSkill } from "./skill.js";
import { renderFolderOfOne } from "./templates.js";
import { Observation, ProposedAction, QuoteEvidence } from "./types.js";

// conservative: maxLeverage 2, perTradeMarginMusd 50, maxConcurrent 2,
// requireStopLoss true, minConfidence 0.6, maxWritesPerCycle 1.
const spec = parseSkill(renderFolderOfOne("a", "conservative")).spec;

const observation: Observation = {
  asOf: "t",
  scopes: ["trade:futures"],
  cashAvailableMusd: 1000,
  equityMusd: 50000,
  openPositions: [],
  openOrders: [],
  pmPositions: [],
  pmMarkets: [],
  watch: [{ symbol: "BTC", coinId: "1", freshness: { status: "fresh" } }],
  syncCursor: null,
  newClosedTrades: [],
  polledBeforeWrite: true,
};

// A spec that allows all three venues (for the spot/PM branch tests).
const allSpec = {
  ...spec,
  venues: ["spot", "futures", "pm"] as ("spot" | "futures" | "pm")[],
};

const freshQuote: QuoteEvidence = {
  eligible: true,
  freshness: { status: "fresh" },
  entryPrice: 67000,
  liquidationPrice: 60000,
};

// Spot quote shape from the REAL backend: executionPrice + estimatedCostMusd and
// NO entryPrice (entryPrice is futures-only). estimatedCostMusd is omitted here
// so a market buy sizes from executionPrice * quantity — matching the notional
// test that varies quantity; a dedicated test below covers estimatedCostMusd.
const freshSpotQuote: QuoteEvidence = {
  eligible: true,
  freshness: { status: "fresh" },
  executionPrice: 67000,
};

const goodOpen: ProposedAction = {
  type: "futures_open",
  symbol: "BTC",
  side: "long",
  leverage: 2,
  marginMusd: 50,
  stopLossPrice: 60000,
  confidence: 0.7,
};

function ctx(over: Partial<DecisionContext> = {}): DecisionContext {
  return {
    spec,
    observation,
    quote: freshQuote,
    riskIncreasesThisCycle: 0,
    riskIncreasesToday: 0,
    openCount: 0,
    cashAvailableMusd: 1000,
    openMarginMusd: 0,
    realizedLossTodayMusd: 0,
    targetedPositionIds: [],
    targetedOrderIds: [],
    ...over,
  };
}

const obsWithPos: Observation = {
  ...observation,
  openPositions: [{ venue: "futures", id: 7, status: "open", marginMusd: 50 }],
};

describe("validateAction", () => {
  it("accepts a compliant futures_open", () => {
    expect(validateAction(goodOpen, ctx()).valid).toBe(true);
  });

  it("rejects over-leverage", () => {
    expect(validateAction({ ...goodOpen, leverage: 5 }, ctx()).code).toBe(
      "leverage_exceeds_cap",
    );
  });

  it("blocks at a positive daily trade cap", () => {
    const capped = { ...spec, limits: { ...spec.limits, maxTradesPerDay: 3 } };
    expect(
      validateAction(goodOpen, ctx({ spec: capped, riskIncreasesToday: 3 }))
        .code,
    ).toBe("daily_trade_cap");
  });

  it("treats maxTradesPerDay <= 0 as UNLIMITED (house agents are never trade-count capped)", () => {
    const uncapped = {
      ...spec,
      limits: { ...spec.limits, maxTradesPerDay: 0 },
    };
    // far over any normal cap, but 0 means unlimited so the open still validates
    expect(
      validateAction(goodOpen, ctx({ spec: uncapped, riskIncreasesToday: 999 }))
        .valid,
    ).toBe(true);
  });

  it("keeps close and protection actions available after entry caps", () => {
    const capped = {
      ...spec,
      limits: { ...spec.limits, maxTradesPerDay: 1, maxWritesPerCycle: 1 },
    };
    const atCap = ctx({
      spec: capped,
      observation: obsWithPos,
      quote: undefined,
      riskIncreasesThisCycle: 1,
      riskIncreasesToday: 1,
    });

    expect(
      validateAction(
        { type: "futures_close", positionId: 7, fraction: 1 },
        atCap,
      ).valid,
    ).toBe(true);
    expect(
      validateAction(
        { type: "futures_set_sltp", positionId: 7, stopLossPrice: 60000 },
        atCap,
      ).valid,
    ).toBe(true);
  });

  it("rejects an open on a deny-listed symbol (deny wins over watchlist)", () => {
    const blockedSpec = {
      ...spec,
      risk: { ...spec.risk, blocklist: ["BTC"] },
    };
    expect(validateAction(goodOpen, ctx({ spec: blockedSpec })).code).toBe(
      "blocked_symbol",
    );
  });

  it("allows a non-deny-listed open when a blocklist is set", () => {
    const blockedSpec = {
      ...spec,
      risk: { ...spec.risk, blocklist: ["ETH"] },
    };
    expect(validateAction(goodOpen, ctx({ spec: blockedSpec })).valid).toBe(
      true,
    );
  });

  // Direction constraint (2026-08-24): a short-only fade agent opened two
  // momentum LONGS when its restriction lived only in prose — the flagged-
  // setups act-pressure outweighed it. The restriction is now a hard cap.
  describe("direction constraint", () => {
    const shortOnly = {
      ...spec,
      risk: { ...spec.risk, direction: "short_only" as const },
    };
    const longOnly = {
      ...spec,
      risk: { ...spec.risk, direction: "long_only" as const },
    };
    // A compliant SHORT: stop ABOVE entry (67000), TP below.
    const goodShort: ProposedAction = {
      ...goodOpen,
      side: "short",
      stopLossPrice: 70000,
    };

    it("short_only rejects a futures long before any API write", () => {
      expect(validateAction(goodOpen, ctx({ spec: shortOnly })).code).toBe(
        "direction_constraint",
      );
    });

    it("short_only accepts a compliant short", () => {
      expect(validateAction(goodShort, ctx({ spec: shortOnly })).valid).toBe(
        true,
      );
    });

    it("long_only rejects a futures short", () => {
      expect(validateAction(goodShort, ctx({ spec: longOnly })).code).toBe(
        "direction_constraint",
      );
    });

    it("short_only rejects a spot BUY (long exposure) but allows a sell", () => {
      const spotShortOnly = {
        ...allSpec,
        risk: { ...allSpec.risk, direction: "short_only" as const },
      };
      const buy: ProposedAction = {
        type: "spot_order",
        symbol: "BTC",
        side: "buy",
        orderType: "market",
        quantity: 0.0001,
        confidence: 0.7,
      };
      expect(
        validateAction(buy, ctx({ spec: spotShortOnly, quote: freshSpotQuote }))
          .code,
      ).toBe("direction_constraint");
      const sell: ProposedAction = { ...buy, side: "sell" };
      const sellResult = validateAction(
        sell,
        ctx({ spec: spotShortOnly, quote: freshSpotQuote }),
      );
      // A sell must never fail on the DIRECTION gate (reducing a holding is
      // not a directional bet) — later gates (holdings, quote) may still
      // apply, so assert only that this code is not the failure.
      expect(sellResult.code).not.toBe("direction_constraint");
    });

    it("closes and SL/TP adjustments are never direction-gated", () => {
      const close: ProposedAction = {
        type: "futures_close",
        positionId: 7,
        fraction: 1,
        confidence: 0.7,
      };
      const result = validateAction(
        close,
        ctx({ spec: shortOnly, observation: obsWithPos }),
      );
      expect(result.code).not.toBe("direction_constraint");
    });

    it("no direction set = both sides allowed (every pre-existing agent)", () => {
      expect(validateAction(goodOpen, ctx()).valid).toBe(true);
      expect(validateAction(goodShort, ctx()).valid).toBe(true);
    });
  });

  it("rejects over-margin", () => {
    expect(validateAction({ ...goodOpen, marginMusd: 9999 }, ctx()).code).toBe(
      "margin_exceeds_cap",
    );
  });

  it("rejects a missing stop-loss", () => {
    const noSl = { ...goodOpen };
    delete (noSl as { stopLossPrice?: number }).stopLossPrice;
    expect(validateAction(noSl, ctx()).code).toBe("missing_stop_loss");
  });

  it("rejects a long take-profit below entry (take_profit_wrong_side)", () => {
    // entry 67000; long TP must be ABOVE it. Server would reject the whole open.
    expect(
      validateAction({ ...goodOpen, takeProfitPrice: 65000 }, ctx()).code,
    ).toBe("take_profit_wrong_side");
  });

  it("rejects a short take-profit above entry (take_profit_wrong_side)", () => {
    const shortOpen: ProposedAction = {
      ...goodOpen,
      side: "short",
      stopLossPrice: 70000, // short SL must be above entry to clear the SL check
      takeProfitPrice: 68000, // above entry -> wrong side for a short
    };
    expect(validateAction(shortOpen, ctx()).code).toBe(
      "take_profit_wrong_side",
    );
  });

  it("accepts a correctly-oriented long take-profit (above entry)", () => {
    expect(
      validateAction({ ...goodOpen, takeProfitPrice: 71000 }, ctx()).valid,
    ).toBe(true);
  });

  it("rejects SL/TP on a futures_open for a symbol already held (add_cannot_carry_sltp)", () => {
    const obsHeld: Observation = {
      ...observation,
      openPositions: [
        {
          venue: "futures",
          id: 9,
          status: "open",
          symbol: "BTC",
          marginMusd: 50,
        },
      ],
    };
    // goodOpen targets BTC and carries stopLossPrice -> the server treats it as an
    // ADD and rejects (sl_tp_not_supported_on_add); the client guard pre-empts it.
    expect(validateAction(goodOpen, ctx({ observation: obsHeld })).code).toBe(
      "add_cannot_carry_sltp",
    );
  });

  it("does NOT add-guard an open for a symbol not already held", () => {
    const obsHeldOther: Observation = {
      ...observation,
      openPositions: [
        {
          venue: "futures",
          id: 9,
          status: "open",
          symbol: "ETH",
          marginMusd: 50,
        },
      ],
    };
    expect(
      validateAction(goodOpen, ctx({ observation: obsHeldOther })).valid,
    ).toBe(true);
  });

  it("rejects too many writes this cycle", () => {
    expect(
      validateAction(goodOpen, ctx({ riskIncreasesThisCycle: 1 })).code,
    ).toBe("write_budget_exceeded");
  });

  it("rejects low confidence", () => {
    expect(validateAction({ ...goodOpen, confidence: 0.3 }, ctx()).code).toBe(
      "below_min_confidence",
    );
  });

  it("rejects insufficient balance", () => {
    expect(validateAction(goodOpen, ctx({ cashAvailableMusd: 10 })).code).toBe(
      "insufficient_balance",
    );
  });

  it("rejects an ineligible quote with block reasons", () => {
    expect(
      validateAction(
        goodOpen,
        ctx({ quote: { eligible: false, blockReasons: ["market_closed"] } }),
      ).code,
    ).toBe("quote_ineligible");
  });

  it("rejects a stale quote", () => {
    expect(
      validateAction(
        goodOpen,
        ctx({ quote: { eligible: true, freshness: { status: "stale" } } }),
      ).code,
    ).toBe("stale_quote");
  });

  it("rejects when poll-before-write did not happen", () => {
    expect(
      validateAction(
        goodOpen,
        ctx({ observation: { ...observation, polledBeforeWrite: false } }),
      ).code,
    ).toBe("no_poll_before_write");
  });

  it("rejects max concurrent positions", () => {
    expect(validateAction(goodOpen, ctx({ openCount: 2 })).code).toBe(
      "max_positions",
    );
  });

  it("rejects a symbol off the watchlist", () => {
    expect(validateAction({ ...goodOpen, symbol: "DOGE" }, ctx()).code).toBe(
      "unknown_symbol",
    );
  });

  it("rejects when aggregate open margin would exceed maxOpenMarginMusd", () => {
    // conservative maxOpenMarginMusd = 600; 600 already open + 50 more.
    expect(validateAction(goodOpen, ctx({ openMarginMusd: 600 })).code).toBe(
      "open_margin_exceeds_cap",
    );
  });

  it("rejects new opens once today's loss hits the daily cap", () => {
    // conservative maxDailyLossMusd = 300.
    expect(
      validateAction(goodOpen, ctx({ realizedLossTodayMusd: 300 })).code,
    ).toBe("daily_loss_cap");
  });

  it("rejects a dead/zero stop-loss", () => {
    expect(validateAction({ ...goodOpen, stopLossPrice: 0 }, ctx()).code).toBe(
      "missing_stop_loss",
    );
  });

  it("rejects a wrong-side stop-loss (long stop above entry)", () => {
    expect(
      validateAction({ ...goodOpen, stopLossPrice: 70000 }, ctx()).code,
    ).toBe("stop_loss_wrong_side");
  });

  it("fails closed when the quote has no freshness block", () => {
    expect(
      validateAction(goodOpen, ctx({ quote: { eligible: true } })).code,
    ).toBe("stale_quote");
  });

  it("rejects a no-op set-sltp (no triggers)", () => {
    expect(
      validateAction(
        { type: "futures_set_sltp", positionId: 7 },
        ctx({ observation: obsWithPos }),
      ).code,
    ).toBe("sltp_no_op");
  });

  it("rejects acting on the same position twice in one cycle", () => {
    expect(
      validateAction(
        { type: "futures_close", positionId: 7 },
        ctx({ observation: obsWithPos, targetedPositionIds: [7] }),
      ).code,
    ).toBe("position_already_targeted");
  });

  // ── spot ──────────────────────────────────────────────────────────────────
  const spotBuy: ProposedAction = {
    type: "spot_order",
    symbol: "BTC",
    side: "buy",
    orderType: "market",
    quantity: 0.0005,
    confidence: 0.7,
  };

  it("accepts a compliant spot buy (venue enabled)", () => {
    // 0.0005 * 67000 = 33.5 < perTradeMargin 50
    expect(
      validateAction(spotBuy, ctx({ spec: allSpec, quote: freshSpotQuote }))
        .valid,
    ).toBe(true);
  });

  it("rejects a spot action when spot is not an allowed venue", () => {
    expect(validateAction(spotBuy, ctx()).code).toBe("venue_not_allowed"); // default spec is futures-only
  });

  it("rejects a limit order with no limitPrice", () => {
    expect(
      validateAction({ ...spotBuy, orderType: "limit" }, ctx({ spec: allSpec }))
        .code,
    ).toBe("missing_limit_price");
  });

  it("rejects a spot buy whose notional exceeds the per-trade cap", () => {
    // 0.01 * 67000 = 670 > perTradeMargin 50
    expect(
      validateAction(
        { ...spotBuy, quantity: 0.01 },
        ctx({ spec: allSpec, quote: freshSpotQuote }),
      ).code,
    ).toBe("notional_exceeds_cap");
  });

  it("FAILS CLOSED on a market buy whose quote has no price (notional unbounded)", () => {
    // eligible + fresh but no executionPrice/estimatedCostMusd — the old code
    // silently SKIPPED the cap here; now it must reject, not fall through.
    expect(
      validateAction(
        spotBuy,
        ctx({
          spec: allSpec,
          quote: { eligible: true, freshness: { status: "fresh" } },
        }),
      ).code,
    ).toBe("missing_quote_price");
  });

  it("sizes a market buy from the server estimatedCostMusd, not executionPrice*qty", () => {
    // estimatedCostMusd 60 (> cap 50) must bind even though executionPrice*qty
    // would be tiny (1 * 0.0005). Proves the server's gross notional wins.
    expect(
      validateAction(
        spotBuy,
        ctx({
          spec: allSpec,
          quote: {
            eligible: true,
            freshness: { status: "fresh" },
            executionPrice: 1,
            estimatedCostMusd: 60,
          },
        }),
      ).code,
    ).toBe("notional_exceeds_cap");
  });

  it("sizes a stop buy from stopPrice", () => {
    // stopPrice 200000 * 0.0005 = 100 > cap 50
    expect(
      validateAction(
        { ...spotBuy, orderType: "stop", stopPrice: 200000 },
        ctx({ spec: allSpec, quote: freshSpotQuote }),
      ).code,
    ).toBe("notional_exceeds_cap");
  });

  it("rejects cancelling an unknown order; accepts a known resting order", () => {
    expect(
      validateAction(
        { type: "spot_cancel", orderId: 999 },
        ctx({ spec: allSpec }),
      ).code,
    ).toBe("unknown_order");
    const obs: Observation = {
      ...observation,
      openOrders: [{ id: 42, status: "open" }],
    };
    expect(
      validateAction(
        { type: "spot_cancel", orderId: 42 },
        ctx({
          spec: allSpec,
          observation: obs,
          quote: undefined,
          riskIncreasesThisCycle: 99,
          riskIncreasesToday: 99,
        }),
      ).valid,
    ).toBe(true);
  });

  it("does not apply entry caps to a risk-reducing spot sell", () => {
    const capped = {
      ...allSpec,
      limits: { ...allSpec.limits, maxTradesPerDay: 1, maxWritesPerCycle: 1 },
    };
    expect(
      validateAction(
        { ...spotBuy, side: "sell" },
        ctx({
          spec: capped,
          quote: freshSpotQuote,
          riskIncreasesThisCycle: 1,
          riskIncreasesToday: 1,
        }),
      ).valid,
    ).toBe(true);
  });

  // ── prediction markets ──────────────────────────────────────────────────
  const obsWithPm: Observation = {
    ...observation,
    pmMarkets: [
      {
        source: "kalshi",
        slug: "btc-up",
        outcomeExternalMarketId: "yes-1",
        freshness: { status: "fresh" },
      },
    ],
  };
  const goodPm: ProposedAction = {
    type: "pm_open",
    source: "kalshi",
    slug: "btc-up",
    outcomeExternalMarketId: "yes-1",
    stakeMusd: 20,
    confidence: 0.7,
  };

  // The API echoes the stake and returns shares net of execution fees. The raw
  // entryProbability remains the gate mid, not the all-in break-even cost.
  const pmQuoteForCost = (costPoints: number): QuoteEvidence => ({
    eligible: true,
    freshness: { status: "fresh" },
    entryProbability: 60,
    stakeMusd: 20,
    sharesEstimate: (100 * 20) / costPoints,
  });

  it("accepts a compliant pm_open on a discovered market", () => {
    expect(
      validateAction(goodPm, ctx({ spec: allSpec, observation: obsWithPm }))
        .valid,
    ).toBe(true);
  });

  // Forecast consistency: live 2026-09-02, 3 of the first 7 executed pm_opens
  // backed an outcome their own forecast priced at or below the market.
  const pricedPm = (probability: number, outcomeName = "Up"): Observation => ({
    ...observation,
    pmMarkets: [
      {
        source: "kalshi",
        slug: "btc-up",
        outcomeExternalMarketId: "yes-1",
        freshness: { status: "fresh" },
        outcomeName,
        probability,
      },
    ],
  });

  it("rejects buying an outcome the model prices below the market", () => {
    // cycle 863728: bought Polymarket Up at 65 while forecasting 45.
    const leo = { ...goodPm, forecastProbability: 45 };
    const r = validateAction(
      leo,
      ctx({
        spec: allSpec,
        observation: pricedPm(0.65),
        quote: pmQuoteForCost(65),
      }),
    );
    expect(r.code).toBe("forecast_no_positive_edge");
    expect(r.reason).toContain("45");

    // cycle 863746: bought Kalshi Yes at 82 while forecasting 55.
    const sam = { ...goodPm, forecastProbability: 55 };
    expect(
      validateAction(
        sam,
        ctx({
          spec: allSpec,
          observation: pricedPm(0.82, "Yes"),
          quote: pmQuoteForCost(82),
        }),
      ).code,
    ).toBe("forecast_no_positive_edge");
  });

  it("accepts a genuine edge and enforces the minimum at the boundary", () => {
    expect(
      validateAction(
        { ...goodPm, forecastProbability: 70 },
        ctx({
          spec: allSpec,
          observation: pricedPm(0.6),
          quote: pmQuoteForCost(60),
        }),
      ).valid,
    ).toBe(true);
    // 2 points is the floor: 62 vs 60 passes, 61.9 vs 60 does not.
    expect(
      validateAction(
        { ...goodPm, forecastProbability: 62 },
        ctx({
          spec: allSpec,
          observation: pricedPm(0.6),
          quote: pmQuoteForCost(60),
        }),
      ).valid,
    ).toBe(true);
    expect(
      validateAction(
        { ...goodPm, forecastProbability: 61.9 },
        ctx({
          spec: allSpec,
          observation: pricedPm(0.6),
          quote: pmQuoteForCost(60),
        }),
      ).code,
    ).toBe("forecast_no_positive_edge");
  });

  it("measures edge against fee-inclusive share cost, not the quoted or discovery mid", () => {
    // API-shaped example: mid 60, ask/slippage price 70.0035, fee-inclusive
    // break-even cost 71.07812967. The raw quote entryProbability stays 60.
    const quoted = pmQuoteForCost(71.07812967);
    expect(quoted.entryProbability).toBe(60);
    expect(
      validateAction(
        { ...goodPm, forecastProbability: 66 },
        ctx({
          spec: allSpec,
          observation: pricedPm(0.6),
          quote: quoted,
        }),
      ).code,
    ).toBe("forecast_no_positive_edge");
    // 72.5 clears the ask/slippage price by more than two points, but the fee
    // consumes that margin. Omitting fees would incorrectly accept this bet.
    expect(72.5 - 70.0035).toBeGreaterThan(2);
    expect(
      validateAction(
        { ...goodPm, forecastProbability: 72.5 },
        ctx({ spec: allSpec, observation: pricedPm(0.6), quote: quoted }),
      ).code,
    ).toBe("forecast_no_positive_edge");
    expect(
      validateAction(
        { ...goodPm, forecastProbability: 80 },
        ctx({ spec: allSpec, observation: pricedPm(0.6), quote: quoted }),
      ).valid,
    ).toBe(true);
  });

  it.each([0.5, 1])(
    "treats an all-in cost of %s as points without magnitude guessing",
    (cost) => {
      expect(
        validateAction(
          { ...goodPm, forecastProbability: cost + 2 },
          ctx({
            spec: allSpec,
            observation: pricedPm(0.005),
            quote: pmQuoteForCost(cost),
          }),
        ).valid,
      ).toBe(true);
    },
  );

  it("accepts a two-point edge despite floating-point noise but not a genuinely smaller edge", () => {
    const quote = pmQuoteForCost(60 + Number.EPSILON * 64);
    const context = ctx({ spec: allSpec, observation: pricedPm(0.6), quote });
    expect(
      validateAction({ ...goodPm, forecastProbability: 62 }, context).valid,
    ).toBe(true);
    expect(
      validateAction({ ...goodPm, forecastProbability: 61.999999 }, context)
        .code,
    ).toBe("forecast_no_positive_edge");
  });

  it.each([
    ["missing stake", { stakeMusd: undefined }],
    ["missing shares", { sharesEstimate: undefined }],
    ["null stake", { stakeMusd: null }],
    ["null shares", { sharesEstimate: null }],
    ["NaN stake", { stakeMusd: Number.NaN }],
    ["NaN shares", { sharesEstimate: Number.NaN }],
    ["infinite stake", { stakeMusd: Number.POSITIVE_INFINITY }],
    ["infinite shares", { sharesEstimate: Number.POSITIVE_INFINITY }],
    ["numeric-string stake", { stakeMusd: "20" }],
    ["numeric-string shares", { sharesEstimate: "30" }],
    ["boolean stake", { stakeMusd: true }],
    ["boolean shares", { sharesEstimate: true }],
    ["zero stake", { stakeMusd: 0 }],
    ["zero shares", { sharesEstimate: 0 }],
    ["negative shares", { sharesEstimate: -1 }],
    ["mismatched stake", { stakeMusd: 21 }],
    ["overflowing cost", { sharesEstimate: Number.MIN_VALUE }],
  ] as const)(
    "fails closed for %s without falling back to either mid",
    (_name, override) => {
      const quote = {
        ...pmQuoteForCost(60),
        ...override,
        entryProbability: 1,
      } as unknown as QuoteEvidence;
      expect(
        validateAction(
          { ...goodPm, forecastProbability: 99 },
          ctx({ spec: allSpec, observation: pricedPm(0.01), quote }),
        ).code,
      ).toBe("pm_quote_cost_unavailable");
    },
  );

  it("rejects an older quote with no cost evidence despite an apparently favorable mid", () => {
    expect(
      validateAction(
        { ...goodPm, forecastProbability: 99 },
        ctx({ spec: allSpec, observation: pricedPm(0.01), quote: freshQuote }),
      ).code,
    ).toBe("pm_quote_cost_unavailable");
  });

  it("allows cost above 100 points to fail the edge gate instead of clamping it", () => {
    expect(
      validateAction(
        { ...goodPm, forecastProbability: 99 },
        ctx({
          spec: allSpec,
          observation: pricedPm(0.6),
          quote: pmQuoteForCost(101),
        }),
      ).code,
    ).toBe("forecast_no_positive_edge");
  });

  it("exempts the mechanical benchmarks, whose forecast is a baseline", () => {
    // market-implied submits exactly the market probability, base-rate a flat
    // 50: both are calibration baselines, not edge claims.
    expect(
      validateAction(
        { ...goodPm, forecastProbability: 65 },
        ctx({ spec: allSpec, observation: pricedPm(0.65), mechanical: true }),
      ).valid,
    ).toBe(true);
    expect(
      validateAction(
        { ...goodPm, forecastProbability: 50 },
        ctx({ spec: allSpec, observation: pricedPm(0.82), mechanical: true }),
      ).valid,
    ).toBe(true);
  });

  it("never blocks a bet that states no forecast, as the prompt promises", () => {
    expect(
      validateAction(
        goodPm,
        ctx({ spec: allSpec, observation: pricedPm(0.65) }),
      ).valid,
    ).toBe(true);
  });

  it("rejects a thesis that bets against the outcome being bought", () => {
    const conflicted = {
      ...goodPm,
      forecastProbability: 70,
      thesis: {
        summary: "Momentum has stalled, so I am betting against the Up outcome",
        invalidation: {},
      },
    };
    expect(
      validateAction(
        conflicted,
        ctx({
          spec: allSpec,
          observation: pricedPm(0.6),
          quote: pmQuoteForCost(60),
        }),
      ).code,
    ).toBe("thesis_action_conflict");
    // A thesis that backs the same outcome is untouched.
    const aligned = {
      ...conflicted,
      thesis: {
        summary: "Flows favour the Up outcome into the close",
        invalidation: {},
      },
    };
    expect(
      validateAction(
        aligned,
        ctx({
          spec: allSpec,
          observation: pricedPm(0.6),
          quote: pmQuoteForCost(60),
        }),
      ).valid,
    ).toBe(true);
  });

  it("rejects a pm_open on a market discovery did not surface", () => {
    expect(
      validateAction(
        { ...goodPm, slug: "hallucinated" },
        ctx({ spec: allSpec, observation: obsWithPm }),
      ).code,
    ).toBe("pm_market_not_discovered");
  });

  it("rejects a pm stake below the $10 minimum", () => {
    expect(
      validateAction(
        { ...goodPm, stakeMusd: 5 },
        ctx({ spec: allSpec, observation: obsWithPm }),
      ).code,
    ).toBe("pm_stake_below_min");
  });

  it("rejects a pm stake above the per-trade cap", () => {
    expect(
      validateAction(
        { ...goodPm, stakeMusd: 60 },
        ctx({ spec: allSpec, observation: obsWithPm }),
      ).code,
    ).toBe("pm_stake_exceeds_cap");
  });

  // ── confidence inheritance (decision-level -> action) ───────────────────────
  const openNoConf: ProposedAction = {
    type: "futures_open",
    symbol: "BTC",
    side: "long",
    leverage: 2,
    marginMusd: 50,
    stopLossPrice: 60000,
  };

  it("inherits the decision-level confidence when an action omits its own", () => {
    // conservative minConfidence = 0.6
    expect(
      validateAction(openNoConf, ctx({ decisionConfidence: 0.7 })).valid,
    ).toBe(true);
    expect(
      validateAction(openNoConf, ctx({ decisionConfidence: 0.3 })).code,
    ).toBe("below_min_confidence");
    expect(validateAction(openNoConf, ctx()).code).toBe("below_min_confidence"); // neither -> 0
  });

  it("lets per-action confidence override the decision-level fallback", () => {
    expect(
      validateAction(
        { ...openNoConf, confidence: 0.9 },
        ctx({ decisionConfidence: 0.1 }),
      ).valid,
    ).toBe(true);
    expect(
      validateAction(
        { ...openNoConf, confidence: 0.1 },
        ctx({ decisionConfidence: 0.9 }),
      ).code,
    ).toBe("below_min_confidence");
  });
});
