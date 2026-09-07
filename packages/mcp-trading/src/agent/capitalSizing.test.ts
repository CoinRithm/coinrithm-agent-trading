import { describe, expect, it } from "vitest";
import {
  deriveCapitalBook,
  prepareCapitalAction,
  validateCapitalAction,
  CAPITAL_VALUATION_BASIS,
  capitalCashCost,
  capitalSpotBuyCost,
} from "./capitalSizing.js";
import type {
  CapitalSizingPolicy,
  Observation,
  ProposedAction,
  QuoteEvidence,
} from "./types.js";
import { parseSkill } from "./skill.js";
import { renderFolderOfOne } from "./templates.js";
import { spotBuyCost } from "./types.js";

const policy: CapitalSizingPolicy = {
  version: "equity_fraction_v1",
  futuresRiskPct: 0.75,
  pmMaxLossPct: 2,
  perTicketCapitalPct: 6,
  totalCapitalPct: 40,
  cashReservePct: 20,
  minRewardRisk: 1.5,
};
const spec = () => ({
  ...parseSkill(renderFolderOfOne("test", "conservative")).spec,
  capitalSizing: policy,
  risk: {
    ...parseSkill(renderFolderOfOne("test", "conservative")).spec.risk,
    perTradeMarginMusd: 10_000,
  },
  limits: {
    maxTradesPerDay: 100,
    maxWritesPerCycle: 10,
    maxDailyLossMusd: 10_000,
    maxOpenMarginMusd: 20_000,
  },
});
const cash = {
  available: 40_000,
  frozen: 500,
  frozenPm: 1_000,
  frozenFutures: 2_000,
};
const portfolio = (over = {}) => ({
  walletId: 42,
  bookScope: "api_key",
  equity: {
    ...cash,
    totalUsd: 50_000,
    valuationBasis: CAPITAL_VALUATION_BASIS,
    spotValuationComplete: true,
  },
  ...over,
});
const wallet = (over = {}) => ({ walletId: 42, usdt: cash, ...over });
const futures = {
  positions: [{ status: "open", marginMusd: 2_000, unrealizedPnlMusd: -200 }],
};
const pm = {
  positions: [{ status: "open", stakeMusd: 1_000, unrealizedPnl: 400 }],
};
const emptyBook = () =>
  deriveCapitalBook(
    {
      walletId: 42,
      bookScope: "api_key",
      equity: {
        available: 50_000,
        frozen: 0,
        frozenPm: 0,
        frozenFutures: 0,
        totalUsd: 50_000,
        valuationBasis: CAPITAL_VALUATION_BASIS,
        spotValuationComplete: true,
      },
    },
    {
      walletId: 42,
      usdt: { available: 50_000, frozen: 0, frozenPm: 0, frozenFutures: 0 },
    },
    { positions: [] },
    { positions: [] },
  );
const observation = (): Observation => ({
  asOf: "2026-09-07T12:00:00Z",
  scopes: [],
  cashAvailableMusd: 50_000,
  equityMusd: 50_000,
  capitalBook: emptyBook(),
  openPositions: [],
  openOrders: [],
  pmPositions: [],
  pmResolutions: [],
  pmMarkets: [],
  watch: [{ symbol: "BTC", coinId: "1", priceUsd: 100 }],
  setups: [],
  syncCursor: null,
  newClosedTrades: [],
  polledBeforeWrite: true,
});
const budget = {
  cashAvailableMusd: 50_000,
  committedCapitalMusd: 0,
  openMarginMusd: 0,
};
const future: ProposedAction = {
  type: "futures_open",
  symbol: "BTC",
  side: "long",
  leverage: 2,
  marginMusd: 10,
  stopLossPrice: 90,
  takeProfitPrice: 120,
};
const bet: ProposedAction = { type: "pm_open", ref: "pm1", stakeMusd: 10 };
const quote = (margin: number, bps = 5): QuoteEvidence => ({
  eligible: true,
  entryPrice: 100,
  futuresFeeBps: bps,
  estimatedEntryFeeMusd: (margin * 2 * bps) / 10_000,
  cashRequiredMusd: margin + (margin * 2 * bps) / 10_000,
});

describe("owned conservative capital basis", () => {
  it("counts marked noncash holdings and ALL frozen allocations; ignores positive position gains", () => {
    expect(deriveCapitalBook(portfolio(), wallet(), futures, pm)).toEqual({
      status: "ready",
      walletId: 42,
      conservativeEquityMusd: 49_800,
      cashAvailableMusd: 40_000,
      committedCapitalMusd: 10_000,
    });
  });
  it("applies negative PM marks as well without relabeling them realized", () => {
    expect(
      deriveCapitalBook(portfolio(), wallet(), futures, {
        positions: [{ status: "open", stakeMusd: 1_000, unrealizedPnl: -300 }],
      }),
    ).toMatchObject({ conservativeEquityMusd: 49_500 });
  });
  it.each([false, undefined, null, "true"])(
    "requires proven held spot valuation (%s)",
    (spotValuationComplete) => {
      expect(
        deriveCapitalBook(
          portfolio({
            equity: { ...portfolio().equity, spotValuationComplete },
          }),
          wallet(),
          futures,
          pm,
        ),
      ).toEqual({
        status: "unavailable",
        reason: "held_spot_valuation_unproven",
      });
    },
  );
  it.each([
    [portfolio({ bookScope: "shared_user" }), wallet(), futures, pm],
    [portfolio({ bookScope: undefined }), wallet(), futures, pm],
    [portfolio({ bookScope: "API_KEY" }), wallet(), futures, pm],
    [portfolio({ walletId: 43 }), wallet(), futures, pm],
    [
      portfolio({ equity: { ...cash, totalUsd: 50_000 } }),
      wallet(),
      futures,
      pm,
    ],
    [
      portfolio(),
      wallet({ usdt: { ...cash, frozenPm: undefined } }),
      futures,
      pm,
    ],
    [portfolio(), wallet({ usdt: { ...cash, frozenPm: "1000" } }), futures, pm],
    [
      portfolio(),
      wallet({ usdt: { ...cash, available: 39_000 } }),
      futures,
      pm,
    ],
    [portfolio(), wallet(), { positions: [] }, pm],
    [portfolio(), wallet(), futures, undefined],
    [
      portfolio(),
      wallet(),
      futures,
      {
        positions: [{ status: "open", stakeMusd: 1_000, unrealizedPnl: null }],
      },
    ],
    [
      portfolio(),
      wallet(),
      { positions: [{ marginMusd: 2_000, unrealizedPnlMusd: 0 }] },
      pm,
    ],
    [
      portfolio(),
      wallet(),
      {
        positions: [
          { status: "open", marginMusd: 2_000, unrealizedPnlMusd: -50_000 },
        ],
      },
      pm,
    ],
  ])(
    "fails closed on mismatched, incomplete, or insolvent evidence %#",
    (p, w, f, m) => {
      expect(deriveCapitalBook(p, w, f, m).status).toBe("unavailable");
    },
  );
  it("does not assume a bounded position page covers frozen collateral", () => {
    const rows = Array.from({ length: 200 }, () => ({ status: "closed" }));
    expect(
      deriveCapitalBook(portfolio(), wallet(), { positions: rows }, pm),
    ).toMatchObject({
      status: "unavailable",
      reason: "held_collateral_coverage_mismatch",
    });
  });
});

describe("deterministic equity fraction tickets", () => {
  it.each([
    null,
    false,
    0,
    "equity_fraction_v1",
    [],
    {},
    { ...policy, version: "equity_fraction_v2" },
    { ...policy, minRewardRisk: undefined },
    { ...policy, minRewardRisk: NaN },
    { ...policy, minRewardRisk: Infinity },
    { ...policy, futuresRiskPct: "0.75" },
    { ...policy, totalCapitalPct: 101 },
    { ...policy, perTicketCapitalPct: 41 },
    { ...policy, totalCapitalPct: 81 },
    { ...policy, surprise: 1 },
  ])(
    "fails closed for malformed persisted policy without blocking protection %#",
    (value) => {
      const config = { ...spec(), capitalSizing: value as CapitalSizingPolicy };
      for (const action of [bet, future]) {
        expect(
          prepareCapitalAction(action, config, observation(), budget).rejection,
        ).toBe("capital_policy_invalid");
        expect(
          validateCapitalAction(
            action,
            config,
            observation(),
            budget,
            quote(10),
          ),
        ).toBe("capital_policy_invalid");
      }
      const close: ProposedAction = {
        type: "futures_close",
        positionId: 1,
        fraction: 1,
      };
      expect(
        prepareCapitalAction(close, config, observation(), budget),
      ).toEqual({ action: close });
      expect(
        validateCapitalAction(close, config, observation(), budget),
      ).toBeUndefined();
    },
  );
  it("raises a opted-in PM proposal to a bounded 2% maximum-loss ticket", () => {
    const sized = prepareCapitalAction(bet, spec(), observation(), budget);
    expect(sized.action).toMatchObject({ stakeMusd: 1_000 });
    expect(sized.adjustment).toMatchObject({
      proposedAmountMusd: 10,
      sizedAmountMusd: 1_000,
      riskBudgetMusd: 1_000,
    });
  });
  it("uses stop-distance and leverage plus disclosed roundtrip fee buffer, not margin as risk", () => {
    const sized = prepareCapitalAction(future, spec(), observation(), budget);
    const expected =
      Math.floor((375 / (2 * (0.1 + 0.001 * (1 + 0.9)))) * 100) / 100;
    expect(sized.action).toMatchObject({ marginMusd: expected });
    expect(sized.adjustment?.feeBufferBps).toBe(10);
    expect(
      validateCapitalAction(
        sized.action,
        spec(),
        observation(),
        budget,
        quote(expected),
      ),
    ).toBeUndefined();
  });
  it("sizes short stops symmetrically with exit fee at the stop's larger notional", () => {
    const sized = prepareCapitalAction(
      { ...future, side: "short", stopLossPrice: 110, takeProfitPrice: 80 },
      spec(),
      observation(),
      budget,
    );
    expect(sized.adjustment?.sizedAmountMusd).toBe(
      Math.floor((375 / (2 * (0.1 + 0.001 * 2.1))) * 100) / 100,
    );
  });
  it("retains legacy absolute ceilings and never rounds a subminimum budget up", () => {
    const config = spec();
    config.risk.perTradeMarginMusd = 25;
    expect(
      prepareCapitalAction(bet, config, observation(), budget).action,
    ).toMatchObject({ stakeMusd: 25 });
    expect(
      prepareCapitalAction(bet, config, observation(), {
        ...budget,
        committedCapitalMusd: 19_995,
      }).rejection,
    ).toBe("capital_ticket_below_minimum");
  });
  it("omitted policy and mechanical agents preserve their original proposed objects", () => {
    const legacy = spec();
    delete legacy.capitalSizing;
    expect(
      prepareCapitalAction(bet, legacy, observation(), budget).action,
    ).toBe(bet);
    const baseline = spec();
    baseline.model = { provider: "mechanical", name: "market-implied" };
    expect(
      prepareCapitalAction(bet, baseline, observation(), budget).action,
    ).toBe(bet);
  });
  it.each<ProposedAction>([
    { type: "futures_close", positionId: 1, fraction: 1 },
    { type: "futures_set_sltp", positionId: 1, stopLossPrice: 90 },
    { type: "spot_cancel", orderId: 1 },
    {
      type: "spot_order",
      symbol: "BTC",
      side: "sell",
      orderType: "market",
      quantity: 1,
    },
  ])("missing capital evidence never blocks protection $type", (action) => {
    const obs = observation();
    delete obs.capitalBook;
    expect(prepareCapitalAction(action, spec(), obs, budget)).toEqual({
      action,
    });
    expect(validateCapitalAction(action, spec(), obs, budget)).toBeUndefined();
  });
  it("rejects entry without owned valuation or a usable adverse stop", () => {
    const obs = observation();
    delete obs.capitalBook;
    expect(prepareCapitalAction(bet, spec(), obs, budget).rejection).toBe(
      "capital_book_unavailable",
    );
    expect(
      prepareCapitalAction(
        { ...future, stopLossPrice: 101 },
        spec(),
        observation(),
        budget,
      ).rejection,
    ).toBe("capital_stop_or_mark_unavailable");
  });
  it("rejects absent/corrupt quote fees, adverse price drift and inadequate net reward-risk", () => {
    const sized = prepareCapitalAction(future, spec(), observation(), budget);
    const margin = sized.adjustment!.sizedAmountMusd!;
    expect(
      validateCapitalAction(sized.action, spec(), observation(), budget, {
        eligible: true,
        entryPrice: 100,
      }),
    ).toBe("capital_quote_cost_evidence_missing");
    expect(
      validateCapitalAction(sized.action, spec(), observation(), budget, {
        ...quote(margin),
        cashRequiredMusd: margin,
      }),
    ).toBe("capital_quote_cost_mismatch");
    expect(
      validateCapitalAction(sized.action, spec(), observation(), budget, {
        ...quote(margin),
        entryPrice: 105,
      }),
    ).toBe("capital_quote_stop_risk_exceeded");
    expect(
      validateCapitalAction(
        { ...sized.action, takeProfitPrice: 110 } as ProposedAction,
        spec(),
        observation(),
        budget,
        quote(margin),
      ),
    ).toBe("capital_quote_reward_risk_too_low");
  });
  it("reserves actual fee-inclusive futures cash; spot buys retain quantity but share risk/allocation ceilings", () => {
    expect(capitalCashCost({ ...future, marginMusd: 100 }, quote(100))).toBe(
      100.1,
    );
    const buy: ProposedAction = {
      type: "spot_order",
      symbol: "BTC",
      side: "buy",
      orderType: "market",
      quantity: 4,
    };
    expect(
      prepareCapitalAction(buy, spec(), observation(), budget).action,
    ).toBe(buy);
    expect(
      validateCapitalAction(buy, spec(), observation(), budget, {
        eligible: true,
        estimatedCostMusd: 400,
        estimatedFeeMusd: 0.4,
      }),
    ).toBe("capital_spot_risk_exceeded");
  });
});

describe("opt-in spot fee-inclusive capital", () => {
  const buy: Extract<ProposedAction, { type: "spot_order" }> = {
    type: "spot_order",
    symbol: "BTC",
    side: "buy",
    orderType: "market",
    quantity: 1,
  };
  const spotQuote = (gross = 375, fee = 1): QuoteEvidence => ({
    eligible: true,
    estimatedCostMusd: gross,
    estimatedFeeMusd: fee,
  });
  it("keeps legacy gross semantics while accounting for spot fees in risk and reservation", () => {
    expect(spotBuyCost(buy, spotQuote())).toBe(375);
    expect(capitalSpotBuyCost(buy, spotQuote())).toBe(376);
    expect(capitalCashCost(buy, spotQuote())).toBe(376);
    expect(
      validateCapitalAction(buy, spec(), observation(), budget, spotQuote()),
    ).toBe("capital_spot_risk_exceeded");
    expect(
      validateCapitalAction(
        buy,
        spec(),
        observation(),
        budget,
        spotQuote(374, 1),
      ),
    ).toBeUndefined();
    expect(
      validateCapitalAction(
        buy,
        spec(),
        observation(),
        budget,
        spotQuote(375, 0),
      ),
    ).toBeUndefined();
  });
  it.each([undefined, null, "1", -1, NaN, Infinity])(
    "rejects missing or invalid spot fee evidence %s",
    (estimatedFeeMusd) => {
      const q = { ...spotQuote(), estimatedFeeMusd } as QuoteEvidence;
      expect(capitalSpotBuyCost(buy, q)).toBeUndefined();
      expect(capitalCashCost(buy, q)).toBeNaN();
      expect(validateCapitalAction(buy, spec(), observation(), budget, q)).toBe(
        "capital_quote_cost_evidence_missing",
      );
    },
  );
  it("uses fees at ticket, combined-allocation and cash-reserve boundaries", () => {
    const config = spec();
    config.capitalSizing = { ...policy, futuresRiskPct: 1 };
    const q = spotQuote(375, 1);
    config.risk.perTradeMarginMusd = 375;
    expect(validateCapitalAction(buy, config, observation(), budget, q)).toBe(
      "capital_ticket_cap_exceeded",
    );
    config.risk.perTradeMarginMusd = 10000;
    expect(
      validateCapitalAction(
        buy,
        config,
        observation(),
        { ...budget, committedCapitalMusd: 19625 },
        q,
      ),
    ).toBe("capital_combined_allocation_exceeded");
    expect(
      validateCapitalAction(
        buy,
        config,
        observation(),
        { ...budget, cashAvailableMusd: 10375 },
        q,
      ),
    ).toBe("capital_cash_reserve_exceeded");
  });
  it("conservatively scales captured market fees for pending-price notional without extra quotes", () => {
    expect(
      capitalSpotBuyCost(
        { ...buy, orderType: "limit", limitPrice: 200 },
        spotQuote(100, 1),
      ),
    ).toBe(202);
    expect(
      capitalSpotBuyCost(
        { ...buy, orderType: "stop", stopPrice: 50 },
        spotQuote(100, 1),
      ),
    ).toBe(51);
    expect(
      capitalSpotBuyCost(buy, {
        ...spotQuote(),
        estimatedCostMusd: undefined,
        executionPrice: 100,
      }),
    ).toBeUndefined();
  });
});
