// Opt-in, deterministic PAPER sizing. No provider, price or database reads.
import { asNum, asObj } from "./extract.js";
import { spotBuyCost } from "./types.js";
import { validateCapitalSizingPolicy } from "./skillValidator.js";
import type {
  AgentSpec,
  CapitalBook,
  CapitalSizingAdjustment,
  Observation,
  ProposedAction,
  QuoteEvidence,
} from "./types.js";

export const CAPITAL_VALUATION_BASIS =
  "wallet_assets_spot_marked_futures_pm_at_collateral";
// Conservative pre-quote runner estimate: 10bp each way, with the exit fee
// charged on stop notional. Actual API fee evidence is checked after ONE quote.
// This is not an exchange-fill, funding or stop-execution guarantee.
export const CAPITAL_FEE_BUFFER_BPS = 10;
const CENT_TOLERANCE = 0.011;
const centsDown = (n: number) => Math.floor(n * 100) / 100;
const positive = (n: unknown): n is number =>
  asNum(n) !== undefined && (n as number) > 0;
const nonnegative = (n: unknown): n is number =>
  asNum(n) !== undefined && (n as number) >= 0;

/** Reconcile the bounded open-position reads against the wallet's frozen
 * buckets. A full page is not assumed complete: the collateral checksums must
 * agree. No held mark, unknown status, missing bucket, or mismatched book can
 * silently become zero exposure. Lists retain legacy positions on other books
 * for management; only explicitly attributed current-book rows reconcile its
 * cash and marks. Closed history never contributes unrealized. */
export function deriveCapitalBook(
  portfolio: unknown,
  wallet: unknown,
  futures: unknown,
  pm: unknown,
): CapitalBook {
  const p = asObj(portfolio),
    w = asObj(wallet),
    eq = asObj(p.equity),
    cash = asObj(w.usdt);
  const unavailable = (reason: string): CapitalBook => ({
    status: "unavailable",
    reason,
  });
  if (p.bookScope !== "api_key")
    return unavailable("independent_agent_book_unproven");
  if (
    !Number.isSafeInteger(p.walletId) ||
    (p.walletId as number) <= 0 ||
    p.walletId !== w.walletId
  )
    return unavailable("portfolio_wallet_identity_mismatch");
  if (eq.valuationBasis !== CAPITAL_VALUATION_BASIS || !positive(eq.totalUsd))
    return unavailable("portfolio_valuation_unavailable");
  if (eq.spotValuationComplete !== true)
    return unavailable("held_spot_valuation_unproven");
  const buckets = ["available", "frozen", "frozenPm", "frozenFutures"] as const;
  for (const key of buckets) {
    if (
      !nonnegative(cash[key]) ||
      !nonnegative(eq[key]) ||
      Math.abs(cash[key] - eq[key]) > CENT_TOLERANCE
    )
      return unavailable("cash_partitions_incomplete_or_changed");
  }
  const cashTotal = buckets.reduce((sum, k) => sum + (cash[k] as number), 0);
  if (eq.totalUsd + CENT_TOLERANCE < cashTotal)
    return unavailable("wallet_asset_value_incoherent");
  let negativeMarks = 0;
  for (const [raw, bucket, amountKey, markKeys] of [
    [futures, "frozenFutures", "marginMusd", ["unrealizedPnlMusd"]],
    [pm, "frozenPm", "stakeMusd", ["unrealizedPnl", "unrealizedPnlMusd"]],
  ] as const) {
    const rows = asObj(raw).positions;
    if (!Array.isArray(rows)) {
      // PM is not fetched for a futures-only legacy universe. Zero frozen PM
      // proves no tied-up PM collateral; a nonzero bucket must have coverage.
      if (bucket === "frozenPm" && raw === undefined && cash[bucket] === 0)
        continue;
      return unavailable("position_coverage_unavailable");
    }
    let held = 0;
    for (const row of rows) {
      const position = asObj(row);
      if (typeof position.status !== "string")
        return unavailable("position_status_unavailable");
      if (position.status !== "open") continue;
      if (
        !Number.isSafeInteger(position.walletId) ||
        (position.walletId as number) <= 0
      )
        return unavailable("held_position_wallet_unavailable");
      // The key-scoped API includes legacy/shared-book positions. Their
      // liabilities settle to their originating wallet, not this active book.
      // Do not filter the management observation or credit their close proceeds.
      if (position.walletId !== p.walletId) continue;
      const amount = position[amountKey];
      const mark = markKeys
        .map((key) => asNum(position[key]))
        .find((n) => n !== undefined);
      if (!nonnegative(amount) || mark === undefined)
        return unavailable("held_position_mark_unavailable");
      held += amount;
      negativeMarks += Math.min(0, mark);
    }
    if (Math.abs(held - (cash[bucket] as number)) > CENT_TOLERANCE)
      return unavailable("held_collateral_coverage_mismatch");
  }
  const conservativeEquityMusd = eq.totalUsd + negativeMarks;
  if (!positive(conservativeEquityMusd))
    return unavailable("nonpositive_conservative_equity");
  return {
    status: "ready",
    walletId: p.walletId as number,
    conservativeEquityMusd,
    cashAvailableMusd: Math.min(
      cash.available as number,
      eq.available as number,
    ),
    committedCapitalMusd: Math.max(0, eq.totalUsd - (cash.available as number)),
  };
}

export interface CapitalBudget {
  cashAvailableMusd: number;
  committedCapitalMusd: number;
  openMarginMusd: number;
}
export const usesCapitalSizing = (
  spec: AgentSpec,
  mechanical = false,
): boolean =>
  spec.capitalSizing !== undefined &&
  !mechanical &&
  spec.model?.provider !== "mechanical";
const increases = (a: ProposedAction) =>
  a.type === "futures_open" ||
  a.type === "pm_open" ||
  (a.type === "spot_order" && a.side === "buy");

export function prepareCapitalAction(
  action: ProposedAction,
  spec: AgentSpec,
  observation: Observation,
  budget: CapitalBudget,
): {
  action: ProposedAction;
  adjustment?: CapitalSizingAdjustment;
  rejection?: string;
} {
  if (!usesCapitalSizing(spec) || !increases(action)) return { action };
  if (validateCapitalSizingPolicy(spec.capitalSizing).length > 0)
    return { action, rejection: "capital_policy_invalid" };
  const policy = spec.capitalSizing!;
  const adjustment: CapitalSizingAdjustment = {
    version: policy.version,
    basis: "owned_collateral_spot_marked_negative_position_marks_only",
  };
  const reject = (rejection: string) => ({ action, adjustment, rejection });
  const book = observation.capitalBook;
  if (!book || book.status !== "ready")
    return reject(book?.reason ?? "capital_book_unavailable");
  const equity = book.conservativeEquityMusd;
  if (
    !positive(equity) ||
    !nonnegative(budget.cashAvailableMusd) ||
    !nonnegative(budget.committedCapitalMusd) ||
    !nonnegative(budget.openMarginMusd)
  )
    return reject("capital_budget_unavailable");
  adjustment.conservativeEquityMusd = equity;
  const ticket = Math.min(
    spec.risk.perTradeMarginMusd,
    (equity * policy.perTicketCapitalPct) / 100,
  );
  const room = Math.min(
    ticket,
    (equity * policy.totalCapitalPct) / 100 - budget.committedCapitalMusd,
    budget.cashAvailableMusd - (equity * policy.cashReservePct) / 100,
  );
  if (!positive(room)) return reject("capital_allocation_or_reserve_exhausted");
  if (action.type === "spot_order") return { action, adjustment }; // retain quantity; quote gate owns its cost
  if (action.type === "pm_open") {
    const stake = centsDown(
      Math.min(room, (equity * policy.pmMaxLossPct) / 100),
    );
    adjustment.proposedAmountMusd = action.stakeMusd;
    adjustment.sizedAmountMusd = stake;
    adjustment.riskBudgetMusd = (equity * policy.pmMaxLossPct) / 100;
    if (stake < 10) return reject("capital_ticket_below_minimum");
    return { action: { ...action, stakeMusd: stake }, adjustment };
  }
  if (action.type !== "futures_open") return { action };
  const mark = observation.watch.find(
    (w) => w.symbol.toUpperCase() === action.symbol.toUpperCase(),
  )?.priceUsd;
  const stop = action.stopLossPrice;
  if (
    !positive(mark) ||
    !positive(stop) ||
    !positive(action.leverage) ||
    (action.side === "long" ? stop >= mark : stop <= mark)
  )
    return reject("capital_stop_or_mark_unavailable");
  const distance = Math.abs(mark - stop) / mark;
  const fee = CAPITAL_FEE_BUFFER_BPS / 10_000;
  const riskPerMargin = action.leverage * (distance + fee * (1 + stop / mark));
  const riskBudget = (equity * policy.futuresRiskPct) / 100;
  const margin = centsDown(
    Math.min(
      ticket,
      riskBudget / riskPerMargin,
      spec.limits.maxOpenMarginMusd - budget.openMarginMusd,
      room / (1 + action.leverage * fee),
    ),
  );
  Object.assign(adjustment, {
    proposedAmountMusd: action.marginMusd,
    sizedAmountMusd: margin,
    riskBudgetMusd: riskBudget,
    feeBufferBps: CAPITAL_FEE_BUFFER_BPS,
  });
  if (margin < 10) return reject("capital_ticket_below_minimum");
  return { action: { ...action, marginMusd: margin }, adjustment };
}

/** Quote-bound monetary checks. Drift fails closed; never requote a resized
 * ticket, silently widen a cap, or credit uncertain close/sell proceeds. */
export function validateCapitalAction(
  action: ProposedAction,
  spec: AgentSpec,
  observation: Observation,
  budget: CapitalBudget,
  quote?: QuoteEvidence,
): string | undefined {
  if (!usesCapitalSizing(spec) || !increases(action)) return undefined;
  if (validateCapitalSizingPolicy(spec.capitalSizing).length > 0)
    return "capital_policy_invalid";
  if (observation.capitalBook?.status !== "ready")
    return "capital_book_unavailable";
  const p = spec.capitalSizing!,
    equity = observation.capitalBook.conservativeEquityMusd;
  if (
    !positive(equity) ||
    !nonnegative(budget.cashAvailableMusd) ||
    !nonnegative(budget.committedCapitalMusd) ||
    !nonnegative(budget.openMarginMusd)
  )
    return "capital_budget_unavailable";
  let cost: number | undefined, allocated: number | undefined;
  if (action.type === "pm_open") {
    cost = allocated = action.stakeMusd;
    if (cost > (equity * p.pmMaxLossPct) / 100 + 1e-8)
      return "capital_pm_max_loss_exceeded";
  } else if (action.type === "spot_order") {
    cost = allocated = capitalSpotBuyCost(action, quote);
    // Without a stop model, the entire spot buy is the capital at risk.
    if (positive(cost) && cost > (equity * p.futuresRiskPct) / 100 + 1e-8)
      return "capital_spot_risk_exceeded";
  } else if (action.type === "futures_open") {
    const entry = quote?.entryPrice,
      stop = action.stopLossPrice,
      target = action.takeProfitPrice;
    const bps = quote?.futuresFeeBps,
      entryFee = quote?.estimatedEntryFeeMusd;
    cost = quote?.cashRequiredMusd;
    allocated = action.marginMusd;
    if (
      !positive(entry) ||
      !positive(stop) ||
      !positive(target) ||
      !nonnegative(bps) ||
      !nonnegative(entryFee) ||
      !positive(cost)
    )
      return "capital_quote_cost_evidence_missing";
    const notional = action.marginMusd * action.leverage;
    const feeRate = bps / 10_000;
    if (
      Math.abs(entryFee - notional * feeRate) > CENT_TOLERANCE ||
      Math.abs(cost - action.marginMusd - entryFee) > CENT_TOLERANCE
    )
      return "capital_quote_cost_mismatch";
    const adverse = action.side === "long" ? entry - stop : stop - entry;
    const favorable = action.side === "long" ? target - entry : entry - target;
    if (!(adverse > 0) || !(favorable > 0))
      return "capital_stop_target_wrong_side";
    const risk =
      (notional * adverse) / entry +
      entryFee +
      ((notional * stop) / entry) * feeRate;
    const reward =
      (notional * favorable) / entry -
      entryFee -
      ((notional * target) / entry) * feeRate;
    if (risk > (equity * p.futuresRiskPct) / 100 + 1e-8)
      return "capital_quote_stop_risk_exceeded";
    if (reward / risk + 1e-8 < p.minRewardRisk)
      return "capital_quote_reward_risk_too_low";
  }
  if (!positive(cost) || !positive(allocated))
    return "capital_quote_cost_evidence_missing";
  if (
    cost >
    Math.min(
      spec.risk.perTradeMarginMusd,
      (equity * p.perTicketCapitalPct) / 100,
    ) +
      1e-8
  )
    return "capital_ticket_cap_exceeded";
  if (
    budget.committedCapitalMusd + cost >
    (equity * p.totalCapitalPct) / 100 + 1e-8
  )
    return "capital_combined_allocation_exceeded";
  if (
    budget.cashAvailableMusd - cost <
    (equity * p.cashReservePct) / 100 - 1e-8
  )
    return "capital_cash_reserve_exceeded";
  return undefined;
}

/** Fee-inclusive opt-in reservation; the legacy gross helper stays unchanged.
 * The API quotes a market fill even for a pending limit/stop order. Reserve at
 * least that fee, scaled up if the proposed price requires more notional.
 * This is conservative captured quote evidence, not a future fill guarantee. */
export function capitalSpotBuyCost(
  action: Extract<ProposedAction, { type: "spot_order" }>,
  quote?: QuoteEvidence,
): number | undefined {
  const gross = spotBuyCost(action, quote);
  const quotedGross = quote?.estimatedCostMusd;
  const fee = quote?.estimatedFeeMusd;
  if (!positive(gross) || !positive(quotedGross) || !nonnegative(fee))
    return undefined;
  const cost = gross + fee * Math.max(1, gross / quotedGross);
  return positive(cost) ? cost : undefined;
}

export function capitalCashCost(
  action: ProposedAction,
  quote?: QuoteEvidence,
): number {
  if (action.type === "futures_open")
    return quote?.cashRequiredMusd ?? action.marginMusd;
  if (action.type === "pm_open") return action.stakeMusd;
  if (action.type === "spot_order" && action.side === "buy")
    return capitalSpotBuyCost(action, quote) ?? Number.NaN;
  return 0;
}
