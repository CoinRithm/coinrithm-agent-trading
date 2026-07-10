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
    writesThisCycle: 0,
    writesToday: 0,
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
      validateAction(goodOpen, ctx({ spec: capped, writesToday: 3 })).code,
    ).toBe("daily_trade_cap");
  });

  it("treats maxTradesPerDay <= 0 as UNLIMITED (house agents are never trade-count capped)", () => {
    const uncapped = {
      ...spec,
      limits: { ...spec.limits, maxTradesPerDay: 0 },
    };
    // far over any normal cap, but 0 means unlimited so the open still validates
    expect(
      validateAction(goodOpen, ctx({ spec: uncapped, writesToday: 999 })).valid,
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
    expect(validateAction(goodOpen, ctx({ writesThisCycle: 1 })).code).toBe(
      "write_budget_exceeded",
    );
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
        ctx({ spec: allSpec, observation: obs }),
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

  it("accepts a compliant pm_open on a discovered market", () => {
    expect(
      validateAction(goodPm, ctx({ spec: allSpec, observation: obsWithPm }))
        .valid,
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
