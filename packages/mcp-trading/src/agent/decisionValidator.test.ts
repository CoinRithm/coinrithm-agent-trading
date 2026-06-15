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
  watch: [{ symbol: "BTC", coinId: "1", freshness: { status: "fresh" } }],
  syncCursor: null,
  newClosedTrades: [],
  polledBeforeWrite: true,
};

const freshQuote: QuoteEvidence = {
  eligible: true,
  freshness: { status: "fresh" },
  entryPrice: 67000,
  liquidationPrice: 60000,
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
    expect(validateAction({ ...goodOpen, leverage: 5 }, ctx()).code).toBe("leverage_exceeds_cap");
  });

  it("rejects over-margin", () => {
    expect(validateAction({ ...goodOpen, marginMusd: 9999 }, ctx()).code).toBe("margin_exceeds_cap");
  });

  it("rejects a missing stop-loss", () => {
    const noSl = { ...goodOpen };
    delete (noSl as { stopLossPrice?: number }).stopLossPrice;
    expect(validateAction(noSl, ctx()).code).toBe("missing_stop_loss");
  });

  it("rejects too many writes this cycle", () => {
    expect(validateAction(goodOpen, ctx({ writesThisCycle: 1 })).code).toBe("write_budget_exceeded");
  });

  it("rejects low confidence", () => {
    expect(validateAction({ ...goodOpen, confidence: 0.3 }, ctx()).code).toBe("below_min_confidence");
  });

  it("rejects insufficient balance", () => {
    expect(validateAction(goodOpen, ctx({ cashAvailableMusd: 10 })).code).toBe("insufficient_balance");
  });

  it("rejects an ineligible quote with block reasons", () => {
    expect(
      validateAction(goodOpen, ctx({ quote: { eligible: false, blockReasons: ["market_closed"] } })).code,
    ).toBe("quote_ineligible");
  });

  it("rejects a stale quote", () => {
    expect(
      validateAction(goodOpen, ctx({ quote: { eligible: true, freshness: { status: "stale" } } })).code,
    ).toBe("stale_quote");
  });

  it("rejects when poll-before-write did not happen", () => {
    expect(
      validateAction(goodOpen, ctx({ observation: { ...observation, polledBeforeWrite: false } })).code,
    ).toBe("no_poll_before_write");
  });

  it("rejects max concurrent positions", () => {
    expect(validateAction(goodOpen, ctx({ openCount: 2 })).code).toBe("max_positions");
  });

  it("rejects a symbol off the watchlist", () => {
    expect(validateAction({ ...goodOpen, symbol: "DOGE" }, ctx()).code).toBe("unknown_symbol");
  });

  it("rejects spot and pm actions as out of v1 scope", () => {
    expect(validateAction({ type: "spot_order", symbol: "BTC", side: "buy", orderType: "market", quantity: 1 }, ctx()).code).toBe("out_of_scope_v1");
    expect(validateAction({ type: "pm_open", source: "kalshi", slug: "x", outcomeExternalMarketId: "y", stakeMusd: 10 }, ctx()).code).toBe("out_of_scope_v1");
  });

  it("rejects when aggregate open margin would exceed maxOpenMarginMusd", () => {
    // conservative maxOpenMarginMusd = 600; 600 already open + 50 more.
    expect(validateAction(goodOpen, ctx({ openMarginMusd: 600 })).code).toBe("open_margin_exceeds_cap");
  });

  it("rejects new opens once today's loss hits the daily cap", () => {
    // conservative maxDailyLossMusd = 300.
    expect(validateAction(goodOpen, ctx({ realizedLossTodayMusd: 300 })).code).toBe("daily_loss_cap");
  });

  it("rejects a dead/zero stop-loss", () => {
    expect(validateAction({ ...goodOpen, stopLossPrice: 0 }, ctx()).code).toBe("missing_stop_loss");
  });

  it("rejects a wrong-side stop-loss (long stop above entry)", () => {
    expect(validateAction({ ...goodOpen, stopLossPrice: 70000 }, ctx()).code).toBe("stop_loss_wrong_side");
  });

  it("fails closed when the quote has no freshness block", () => {
    expect(validateAction(goodOpen, ctx({ quote: { eligible: true } })).code).toBe("stale_quote");
  });

  it("rejects a no-op set-sltp (no triggers)", () => {
    expect(
      validateAction({ type: "futures_set_sltp", positionId: 7 }, ctx({ observation: obsWithPos })).code,
    ).toBe("sltp_no_op");
  });

  it("rejects acting on the same position twice in one cycle", () => {
    expect(
      validateAction({ type: "futures_close", positionId: 7 }, ctx({ observation: obsWithPos, targetedPositionIds: [7] })).code,
    ).toBe("position_already_targeted");
  });
});
