import { describe, it, expect } from "vitest";
import {
  validateAction,
  requiredGapEdgePoints,
  pmEventKey,
  pmCoinHorizonOf,
  DecisionContext,
} from "./decisionValidator.js";
import { buildSystemPrompt } from "./prompt.js";
import { coinsField } from "./observe.js";
import { parseSkill } from "./skill.js";
import { validateSkill } from "./skillValidator.js";
import { renderFolderOfOne } from "./templates.js";
import {
  AgentSpec,
  Observation,
  PmMarket,
  ProposedAction,
  QuoteEvidence,
} from "./types.js";

// Granular PM dials (2026-10-07): the house prose rules "beat the price by 16%
// of the gap to 100", "at most two bets per coin and close date" and "skip the
// last 10 minutes" were never enforced. Each is now an optional risk field;
// absent keeps the exact previous behaviour.

const base = parseSkill(renderFolderOfOne("a", "conservative")).spec;
const pmSpec = (risk: Partial<AgentSpec["risk"]> = {}): AgentSpec => ({
  ...base,
  venues: ["pm"],
  risk: { ...base.risk, ...risk },
});

const ASOF = "2026-10-07T12:00:00.000Z";
const market = (over: Partial<PmMarket> = {}): PmMarket => ({
  source: "kalshi",
  slug: "btc-above-oct-8",
  outcomeExternalMarketId: "band-1",
  outcomeName: "Yes",
  probability: 0.5,
  freshness: { status: "fresh" },
  endDate: "2026-10-08T21:00:00.000Z",
  ...over,
});

const obs = (over: Partial<Observation> = {}): Observation => ({
  asOf: ASOF,
  scopes: ["trade:pm"],
  cashAvailableMusd: 10_000,
  equityMusd: 50_000,
  openPositions: [],
  openOrders: [],
  pmPositions: [],
  pmResolutions: [],
  pmMarkets: [market(), market({ outcomeExternalMarketId: "band-2" })],
  watch: [],
  syncCursor: null,
  newClosedTrades: [],
  polledBeforeWrite: true,
  ...over,
});

const open = (over: Partial<ProposedAction> = {}): ProposedAction =>
  ({
    type: "pm_open",
    source: "kalshi",
    slug: "btc-above-oct-8",
    outcomeExternalMarketId: "band-1",
    stakeMusd: 20,
    confidence: 0.9,
    ...over,
  }) as ProposedAction;

// Fee-inclusive cost in points = stake / net shares x 100.
const quoteAtCost = (cost: number): QuoteEvidence => ({
  eligible: true,
  freshness: { status: "fresh" },
  entryProbability: cost,
  stakeMusd: 20,
  sharesEstimate: (100 * 20) / cost,
});

function ctx(
  spec: AgentSpec,
  over: Partial<DecisionContext> = {},
): DecisionContext {
  return {
    spec,
    observation: obs(),
    quote: quoteAtCost(50),
    riskIncreasesThisCycle: 0,
    riskIncreasesToday: 0,
    openCount: 0,
    cashAvailableMusd: 10_000,
    openMarginMusd: 0,
    realizedLossTodayMusd: 0,
    targetedPositionIds: [],
    targetedOrderIds: [],
    ...over,
  };
}

describe("risk.pmMinEdgeGapPct", () => {
  it("computes the house examples (16% of the gap)", () => {
    expect(requiredGapEdgePoints(50, 16)).toBeCloseTo(8, 9);
    expect(requiredGapEdgePoints(70, 16)).toBeCloseTo(4.8, 9);
    expect(requiredGapEdgePoints(85, 16)).toBeCloseTo(2.4, 9);
    expect(requiredGapEdgePoints(100, 16)).toBe(Number.POSITIVE_INFINITY);
    expect(requiredGapEdgePoints(100, 0)).toBe(0);
  });

  it("absent: only the global 2-point edge applies, and no forecast is fine", () => {
    const spec = pmSpec();
    expect(validateAction(open(), ctx(spec)).valid).toBe(true);
    expect(
      validateAction(open({ forecastProbability: 53 }), ctx(spec)).valid,
    ).toBe(true);
  });

  it("set: enforces the gap rule at the boundary against fee-inclusive cost", () => {
    const spec = pmSpec({ pmMinEdgeGapPct: 16 });
    expect(
      validateAction(open({ forecastProbability: 58 }), ctx(spec)).valid,
    ).toBe(true);
    const r = validateAction(open({ forecastProbability: 57.9 }), ctx(spec));
    expect(r.code).toBe("pm_edge_below_gap_rule");
    expect(r.reason).toContain("8.0pt required by 16%");
    // Cost 70 needs 74.8, not the flat 72.
    expect(
      validateAction(
        open({ forecastProbability: 72 }),
        ctx(spec, { quote: quoteAtCost(70) }),
      ).code,
    ).toBe("pm_edge_below_gap_rule");
    expect(
      validateAction(
        open({ forecastProbability: 74.8 }),
        ctx(spec, { quote: quoteAtCost(70) }),
      ).valid,
    ).toBe(true);
  });

  it("never lowers the global minimum edge", () => {
    // 1% of the gap at cost 90 is 0.1pt; the 2-point floor still wins.
    const spec = pmSpec({ pmMinEdgeGapPct: 1 });
    expect(
      validateAction(
        open({ forecastProbability: 91 }),
        ctx(spec, { quote: quoteAtCost(90) }),
      ).code,
    ).toBe("forecast_no_positive_edge");
  });

  it("set: a pm_open without a forecast is rejected", () => {
    const r = validateAction(open(), ctx(pmSpec({ pmMinEdgeGapPct: 16 })));
    expect(r.code).toBe("pm_forecast_required");
  });

  it("exempts the mechanical benchmarks", () => {
    expect(
      validateAction(
        open(),
        ctx(pmSpec({ pmMinEdgeGapPct: 16 }), { mechanical: true }),
      ).valid,
    ).toBe(true);
  });

  it("fails closed on a malformed value", () => {
    expect(
      validateAction(
        open({ forecastProbability: 90 }),
        ctx(pmSpec({ pmMinEdgeGapPct: "16" as never })),
      ).code,
    ).toBe("pm_edge_gap_invalid");
  });
});

describe("risk.pmMaxEdgePoints (overconfidence guard)", () => {
  it("absent: a 60-point claimed edge passes as before", () => {
    expect(
      validateAction(
        open({ forecastProbability: 75 }),
        ctx(pmSpec(), { quote: quoteAtCost(15) }),
      ).valid,
    ).toBe(true);
  });

  it("rejects a claimed edge over the cap and accepts at it", () => {
    const spec = pmSpec({ pmMaxEdgePoints: 20 });
    const r = validateAction(
      open({ forecastProbability: 75 }),
      ctx(spec, { quote: quoteAtCost(15) }),
    );
    expect(r.code).toBe("pm_edge_overconfident");
    expect(r.reason).toContain("over the 20pt cap");
    expect(
      validateAction(
        open({ forecastProbability: 70 }),
        ctx(spec, { quote: quoteAtCost(50) }),
      ).valid,
    ).toBe(true);
  });

  it("combines with the gap rule into a band", () => {
    // cost 50: gap 16% needs >= 8, cap 20 allows <= 20.
    const spec = pmSpec({ pmMinEdgeGapPct: 16, pmMaxEdgePoints: 20 });
    expect(
      validateAction(open({ forecastProbability: 57 }), ctx(spec)).code,
    ).toBe("pm_edge_below_gap_rule");
    expect(
      validateAction(open({ forecastProbability: 60 }), ctx(spec)).valid,
    ).toBe(true);
    expect(
      validateAction(open({ forecastProbability: 71 }), ctx(spec)).code,
    ).toBe("pm_edge_overconfident");
  });

  it("requires a forecast, exempts benchmarks, fails closed on junk", () => {
    const spec = pmSpec({ pmMaxEdgePoints: 20 });
    expect(validateAction(open(), ctx(spec)).code).toBe("pm_forecast_required");
    expect(validateAction(open(), ctx(spec, { mechanical: true })).valid).toBe(
      true,
    );
    expect(
      validateAction(
        open({ forecastProbability: 60 }),
        ctx(pmSpec({ pmMaxEdgePoints: -1 })),
      ).code,
    ).toBe("pm_max_edge_invalid");
  });
});

describe("risk.pmMaxOpenPerEvent", () => {
  let heldId = 0;
  const held = (outcome: string, slug = "btc-above-oct-8") => ({
    id: ++heldId,
    source: "kalshi",
    slug,
    outcomeExternalMarketId: outcome,
    status: "open",
  });

  it("absent: no per-event cap", () => {
    const o = obs({ pmPositions: [held("band-3"), held("band-4")] });
    expect(
      validateAction(open(), ctx(pmSpec(), { observation: o })).valid,
    ).toBe(true);
  });

  it("counts held open bets on the same event, case-insensitively", () => {
    const spec = pmSpec({ pmMaxOpenPerEvent: 2 });
    const one = obs({ pmPositions: [held("band-3")] });
    expect(validateAction(open(), ctx(spec, { observation: one })).valid).toBe(
      true,
    );
    const two = obs({
      pmPositions: [
        held("band-3"),
        { ...held("band-4"), slug: "BTC-Above-Oct-8" },
      ],
    });
    const r = validateAction(open(), ctx(spec, { observation: two }));
    expect(r.code).toBe("pm_event_cap");
    expect(r.reason).toContain("per-event cap 2");
  });

  it("ignores settled bets and other events", () => {
    const spec = pmSpec({ pmMaxOpenPerEvent: 1 });
    const o = obs({
      pmPositions: [
        { ...held("band-3"), status: "won" },
        held("band-3", "eth-above-oct-8"),
      ],
    });
    expect(validateAction(open(), ctx(spec, { observation: o })).valid).toBe(
      true,
    );
  });

  it("counts opens already accepted this cycle", () => {
    const spec = pmSpec({ pmMaxOpenPerEvent: 2 });
    const key = pmEventKey("kalshi", "btc-above-oct-8");
    expect(
      validateAction(open(), ctx(spec, { pmEventsOpenedThisCycle: [key] }))
        .valid,
    ).toBe(true);
    expect(
      validateAction(open(), ctx(spec, { pmEventsOpenedThisCycle: [key, key] }))
        .code,
    ).toBe("pm_event_cap");
  });

  it("fails closed on a malformed value", () => {
    expect(
      validateAction(open(), ctx(pmSpec({ pmMaxOpenPerEvent: 1.5 }))).code,
    ).toBe("pm_event_cap_invalid");
  });
});

describe("risk.pmMaxOpenPerCoinHorizon", () => {
  // Live 2026-10-07: BTC "end of 2026" events end on 2026-12-31 or 2027-01-01.
  const END = "2026-12-31T23:59:00.000Z";
  const candidate = (over: Partial<PmMarket> = {}) =>
    market({
      slug: "btc-price-end-2026",
      coins: ["bitcoin"],
      endDate: END,
      ...over,
    });
  const btcOpen = open({ slug: "btc-price-end-2026" });
  let heldId = 0;
  const held = (over: Record<string, unknown> = {}) => ({
    id: ++heldId,
    source: "polymarket",
    slug: `btc-other-${heldId}`,
    outcomeExternalMarketId: "yes",
    status: "open",
    coins: ["bitcoin"],
    endDate: "2027-01-01T00:00:00.000Z",
    ...over,
  });
  const withHeld = (positions: unknown[], mkt = candidate()) =>
    obs({
      pmMarkets: [mkt],
      pmPositions: positions as Observation["pmPositions"],
    });
  const check = (
    risk: Partial<AgentSpec["risk"]>,
    o: Observation,
    over: Partial<DecisionContext> = {},
  ) => validateAction(btcOpen, ctx(pmSpec(risk), { observation: o, ...over }));

  it("absent: no cap", () => {
    expect(check({}, withHeld([held(), held(), held()])).valid).toBe(true);
  });

  it("groups different events on one coin whose ends fall within 24 h", () => {
    const spec = { pmMaxOpenPerCoinHorizon: 2 };
    expect(check(spec, withHeld([held()])).valid).toBe(true);
    const r = check(spec, withHeld([held(), held()]));
    expect(r.code).toBe("pm_coin_horizon_cap");
    expect(r.reason).toContain("bitcoin");
    expect(r.reason).toContain("per-coin-horizon cap 2");
  });

  it("does not group other coins, far-apart ends or settled bets", () => {
    const spec = { pmMaxOpenPerCoinHorizon: 1 };
    const o = withHeld([
      held({ coins: ["ethereum"] }),
      held({ endDate: "2027-01-02T00:00:01.000Z" }),
      held({ status: "won" }),
    ]);
    expect(check(spec, o).valid).toBe(true);
  });

  it("counts a multi-coin event under each of its coins", () => {
    const spec = { pmMaxOpenPerCoinHorizon: 1 };
    const both = candidate({ coins: ["bitcoin", "solana"] });
    const r = check(spec, withHeld([held({ coins: ["solana"] })], both));
    expect(r.code).toBe("pm_coin_horizon_cap");
    expect(r.reason).toContain("solana");
  });

  it("never blocks on an unknown coin or an implausible end", () => {
    const spec = { pmMaxOpenPerCoinHorizon: 1 };
    const full = [held(), held()];
    for (const mkt of [
      candidate({ coins: undefined }),
      candidate({ endDate: undefined }),
      candidate({ endDate: "not-a-date" }),
      candidate({ endDate: "2026-10-07T11:00:00.000Z" }), // already past
      candidate({ endDate: "2099-12-31T00:00:00.000Z" }), // venue sentinel
    ])
      expect(check(spec, withHeld(full, mkt)).valid).toBe(true);
    // Held bets without coin or with a sentinel end are never counted.
    const unknownHeld = withHeld([
      held({ coins: undefined }),
      held({ endDate: "2099-12-31T00:00:00.000Z" }),
    ]);
    expect(check(spec, unknownHeld).valid).toBe(true);
  });

  it("counts opens already accepted this cycle", () => {
    const spec = { pmMaxOpenPerCoinHorizon: 2 };
    const same = pmCoinHorizonOf(
      { coins: ["bitcoin"], endDate: "2027-01-01T00:00:00.000Z" },
      Date.parse(ASOF),
    )!;
    expect(
      check(spec, withHeld([]), { pmCoinHorizonsOpenedThisCycle: [same] })
        .valid,
    ).toBe(true);
    expect(
      check(spec, withHeld([held()]), {
        pmCoinHorizonsOpenedThisCycle: [same],
      }).code,
    ).toBe("pm_coin_horizon_cap");
  });

  it("leaves the per-event cap unchanged and fails closed on a bad value", () => {
    expect(check({ pmMaxOpenPerCoinHorizon: 0 }, withHeld([])).code).toBe(
      "pm_coin_horizon_cap_invalid",
    );
    const perEvent = check(
      { pmMaxOpenPerEvent: 1, pmMaxOpenPerCoinHorizon: 5 },
      withHeld([held({ source: "kalshi", slug: "btc-price-end-2026" })]),
    );
    expect(perEvent.code).toBe("pm_event_cap");
  });

  it("tells a PM agent about the cap in the system prompt", () => {
    expect(
      buildSystemPrompt(pmSpec({ pmMaxOpenPerCoinHorizon: 2 }), ""),
    ).toContain("PM COIN-HORIZON CAP: at most 2 open bet(s)");
    expect(buildSystemPrompt(pmSpec(), "")).not.toContain(
      "PM COIN-HORIZON CAP",
    );
  });

  it("parses the additive relatedCoins field defensively", () => {
    expect(coinsField(["Bitcoin", "bitcoin", " solana ", "", 7])).toEqual({
      coins: ["bitcoin", "solana"],
    });
    expect(coinsField(undefined)).toEqual({});
    expect(coinsField("bitcoin")).toEqual({});
    expect(coinsField([])).toEqual({});
    expect(
      coinsField(Array.from({ length: 25 }, (_, i) => `coin-${i}`)).coins,
    ).toHaveLength(20);
  });
});

describe("risk.pmMinMinutesToClose", () => {
  const closingIn = (minutes: number) =>
    obs({
      pmMarkets: [
        market({
          endDate: new Date(Date.parse(ASOF) + minutes * 60_000).toISOString(),
        }),
      ],
    });

  it("absent: a market closing in 2 minutes is accepted as before", () => {
    expect(
      validateAction(open(), ctx(pmSpec(), { observation: closingIn(2) }))
        .valid,
    ).toBe(true);
  });

  it("rejects inside the cutoff and accepts at it", () => {
    const spec = pmSpec({ pmMinMinutesToClose: 10 });
    const r = validateAction(
      open(),
      ctx(spec, { observation: closingIn(9.5) }),
    );
    expect(r.code).toBe("pm_closes_too_soon");
    expect(r.reason).toContain("10 min cutoff");
    expect(
      validateAction(open(), ctx(spec, { observation: closingIn(10) })).valid,
    ).toBe(true);
  });

  it("re-checks at validation time: a slow model call cannot open inside the cutoff", () => {
    const spec = pmSpec({ pmMinMinutesToClose: 10 });
    // 12 minutes left at observation time, but the model answered 4 minutes later.
    const late = Date.parse(ASOF) + 4 * 60_000;
    expect(
      validateAction(open(), ctx(spec, { observation: closingIn(12) })).valid,
    ).toBe(true);
    const r = validateAction(
      open(),
      ctx(spec, { observation: closingIn(12), nowMs: late }),
    );
    expect(r.code).toBe("pm_closes_too_soon");
    // A clock earlier than asOf never relaxes the rule.
    expect(
      validateAction(
        open(),
        ctx(spec, {
          observation: closingIn(9),
          nowMs: Date.parse(ASOF) - 60 * 60_000,
        }),
      ).code,
    ).toBe("pm_closes_too_soon");
  });

  it("an unknown or unparseable close never blocks", () => {
    const spec = pmSpec({ pmMinMinutesToClose: 10 });
    for (const endDate of [undefined, "", "not-a-date"]) {
      const o = obs({ pmMarkets: [market({ endDate })] });
      expect(validateAction(open(), ctx(spec, { observation: o })).valid).toBe(
        true,
      );
    }
  });

  it("fails closed on a malformed value", () => {
    expect(
      validateAction(open(), ctx(pmSpec({ pmMinMinutesToClose: -1 }))).code,
    ).toBe("pm_close_cutoff_invalid");
  });
});

describe("skill validation of the PM dials", () => {
  const parsed = parseSkill(renderFolderOfOne("a", "conservative"));
  const codes = (risk: Record<string, unknown>) =>
    validateSkill({
      ...parsed,
      raw: {
        ...parsed.raw,
        risk: { ...(parsed.raw.risk as Record<string, unknown>), ...risk },
      },
    }).issues.map((e) => e.code);

  it("accepts in-range values", () => {
    const c = codes({
      pmMinEdgeGapPct: 16,
      pmMaxOpenPerEvent: 2,
      pmMaxOpenPerCoinHorizon: 2,
      pmMinMinutesToClose: 10,
    });
    expect(c).not.toContain("skill_risk_pm_edge_gap");
    expect(c).not.toContain("skill_risk_pm_per_event");
    expect(c).not.toContain("skill_risk_pm_coin_horizon");
    expect(c).not.toContain("skill_risk_pm_close_cutoff");
  });

  it("rejects out-of-range values", () => {
    expect(codes({ pmMinEdgeGapPct: 101 })).toContain("skill_risk_pm_edge_gap");
    expect(codes({ pmMaxEdgePoints: 150 })).toContain("skill_risk_pm_max_edge");
    expect(codes({ pmMaxOpenPerEvent: 0 })).toContain(
      "skill_risk_pm_per_event",
    );
    expect(codes({ pmMaxOpenPerCoinHorizon: 51 })).toContain(
      "skill_risk_pm_coin_horizon",
    );
    expect(codes({ pmMinMinutesToClose: 20_000 })).toContain(
      "skill_risk_pm_close_cutoff",
    );
  });
});
