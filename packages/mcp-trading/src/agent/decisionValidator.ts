// The decision gate: re-check EVERY proposed action against the spec's hard caps
// BEFORE any write. The model only proposes; this disposes. Because the caps
// come from the spec (not the observation or the model), a prompt-injection in
// market text cannot widen a limit or force a trade. Covers futures + spot + PM.

import {
  AgentSpec,
  Observation,
  ProposedAction,
  QuoteEvidence,
  ValidationResult,
  ok,
  fail,
  actionVenue,
  spotBuyCost,
} from "./types.js";

export interface DecisionContext {
  spec: AgentSpec;
  // The model reports `confidence` at the DECISION level (per the output
  // contract); the per-action abstention gate inherits it when an action omits
  // its own, so a contract-following model isn't auto-rejected at confidence 0.
  decisionConfidence?: number;
  observation: Observation;
  quote?: QuoteEvidence; // for futures_open — fetched by the runner, not the model
  writesThisCycle: number;
  writesToday: number;
  openCount: number;
  cashAvailableMusd: number | null; // RUNNING: decremented after each open this cycle
  openMarginMusd: number; // RUNNING: total open margin (existing + this cycle)
  realizedLossTodayMusd: number; // today's realized LOSS as a positive number
  targetedPositionIds: number[]; // futures positions already acted on this cycle
  targetedOrderIds: number[]; // spot orders already cancelled this cycle
}

const SERVER_MAX_LEVERAGE = 20;
const PM_MIN_STAKE_MUSD = 10; // server minimum prediction-market stake

export function validateAction(
  action: ProposedAction,
  ctx: DecisionContext,
): ValidationResult {
  const { spec, observation } = ctx;

  const venue = actionVenue(action);
  if (!spec.venues.includes(venue)) {
    return fail(
      "venue_not_allowed",
      `venue ${venue} not in [${spec.venues.join(", ")}]`,
    );
  }

  if (spec.sync.requirePollBeforeWrite && !observation.polledBeforeWrite) {
    return fail(
      "no_poll_before_write",
      "must successfully poll /trades before writing",
    );
  }
  if (ctx.writesThisCycle >= spec.limits.maxWritesPerCycle) {
    return fail(
      "write_budget_exceeded",
      `maxWritesPerCycle ${spec.limits.maxWritesPerCycle} reached`,
    );
  }
  // maxTradesPerDay <= 0 means UNLIMITED daily trade count — house agents are never
  // throttled (we want an active Arena), and hosted agents only when the customer sets a
  // positive cap. The risk caps below (daily loss, open margin, leverage, stops) are the
  // real guardrails and always apply regardless of the trade-count cap.
  if (spec.limits.maxTradesPerDay > 0 && ctx.writesToday >= spec.limits.maxTradesPerDay) {
    return fail(
      "daily_trade_cap",
      `maxTradesPerDay ${spec.limits.maxTradesPerDay} reached`,
    );
  }

  // Deny-list: an open on a blocked symbol is rejected up front (deny wins over
  // the watchlist). PM opens use a market slug, not a coin symbol, so skip them.
  if (action.type === "futures_open" || action.type === "spot_order") {
    const blocklist = spec.risk.blocklist;
    if (Array.isArray(blocklist) && blocklist.length > 0) {
      const sym = action.symbol.toUpperCase();
      if (blocklist.some((b) => b.toUpperCase() === sym)) {
        return fail("blocked_symbol", `${action.symbol} is on the deny-list`);
      }
    }
  }

  if (action.type === "futures_open") {
    // Daily realized-loss stop: once today's loss hits the cap, open no new risk.
    if (
      spec.limits.maxDailyLossMusd > 0 &&
      ctx.realizedLossTodayMusd >= spec.limits.maxDailyLossMusd
    ) {
      return fail(
        "daily_loss_cap",
        `today's realized loss ${ctx.realizedLossTodayMusd} >= ${spec.limits.maxDailyLossMusd}`,
      );
    }

    const entry = observation.watch.find(
      (w) => w.symbol.toUpperCase() === action.symbol.toUpperCase(),
    );
    if (!entry)
      return fail("unknown_symbol", `${action.symbol} is not on the watchlist`);
    if (!entry.coinId)
      return fail(
        "unresolved_symbol",
        `${action.symbol} did not resolve to a coin`,
      );

    // A futures_open on a symbol you ALREADY hold is treated as an ADD by the
    // server, which REJECTS any SL/TP on an add (sl_tp_not_supported_on_add) and
    // fails the whole open — the single biggest rejection class (e.g. Sam 61/61).
    // Catch it here with an actionable reason: manage triggers on the held
    // position via futures_set_sltp instead of re-opening with SL/TP. (Relies on
    // the observation now carrying a populated `symbol` per position.)
    if (action.stopLossPrice != null || action.takeProfitPrice != null) {
      const heldSame = (observation.openPositions ?? []).find(
        (p) =>
          p.venue === "futures" &&
          (p.status ?? "open") === "open" &&
          (p.symbol ?? "").toUpperCase() === action.symbol.toUpperCase(),
      );
      if (heldSame) {
        return fail(
          "add_cannot_carry_sltp",
          `already hold a ${action.symbol} futures position (#${heldSame.id}); the server rejects SL/TP on an add — manage triggers with futures_set_sltp on positionId ${heldSame.id}`,
        );
      }
    }

    if (action.leverage > spec.risk.maxLeverage) {
      return fail(
        "leverage_exceeds_cap",
        `leverage ${action.leverage} > cap ${spec.risk.maxLeverage}`,
      );
    }
    if (action.leverage > SERVER_MAX_LEVERAGE) {
      return fail(
        "leverage_exceeds_server",
        `leverage ${action.leverage} > server cap ${SERVER_MAX_LEVERAGE}`,
      );
    }
    if (action.marginMusd > spec.risk.perTradeMarginMusd) {
      return fail(
        "margin_exceeds_cap",
        `margin ${action.marginMusd} > cap ${spec.risk.perTradeMarginMusd}`,
      );
    }
    // Aggregate exposure ceiling (existing open margin + this cycle) — the cap
    // that perTradeMargin × maxConcurrentPositions would otherwise blow past.
    if (
      ctx.openMarginMusd + action.marginMusd >
      spec.limits.maxOpenMarginMusd
    ) {
      return fail(
        "open_margin_exceeds_cap",
        `open margin ${ctx.openMarginMusd} + ${action.marginMusd} > ${spec.limits.maxOpenMarginMusd}`,
      );
    }
    if (ctx.openCount >= spec.risk.maxConcurrentPositions) {
      return fail(
        "max_positions",
        `already ${ctx.openCount} open >= ${spec.risk.maxConcurrentPositions}`,
      );
    }
    if (
      ctx.cashAvailableMusd != null &&
      action.marginMusd > ctx.cashAvailableMusd
    ) {
      return fail(
        "insufficient_balance",
        `margin ${action.marginMusd} > available ${ctx.cashAvailableMusd}`,
      );
    }
    // NOTE: minConfidence keys on the model's SELF-REPORTED confidence — a
    // cooperation hint, NOT an injection-resistant control. The hard caps above
    // (which come from the spec, never the observation) are what actually bind.
    if (
      (action.confidence ?? ctx.decisionConfidence ?? 0) <
      spec.abstention.minConfidence
    ) {
      return fail(
        "below_min_confidence",
        `confidence ${action.confidence ?? 0} < min ${spec.abstention.minConfidence}`,
      );
    }
    if (spec.risk.requireStopLoss) {
      const sl = action.stopLossPrice;
      if (sl == null || !Number.isFinite(sl) || sl <= 0) {
        return fail(
          "missing_stop_loss",
          "requireStopLoss is set but no valid (finite, positive) stopLossPrice was proposed",
        );
      }
      // Side-aware corridor: a long's stop must be BELOW entry, a short's ABOVE.
      // A wrong-side "stop" is a dead trigger that never protects.
      const e = ctx.quote?.entryPrice;
      if (typeof e === "number" && Number.isFinite(e)) {
        if (action.side === "long" && sl >= e) {
          return fail(
            "stop_loss_wrong_side",
            `long stop ${sl} must be below entry ${e}`,
          );
        }
        if (action.side === "short" && sl <= e) {
          return fail(
            "stop_loss_wrong_side",
            `short stop ${sl} must be above entry ${e}`,
          );
        }
      }
    }
    // Take-profit must sit on the PROFIT side of entry, mirroring the server rule
    // (long: TP above mark; short: below). A wrong-side TP makes the server reject
    // the ENTIRE open (take_profit_not_above_mark / take_profit_not_below_mark) so
    // NO trade is placed at all — the biggest silent missed-trade failure after
    // the add case. Catch it here so the model gets a clear, self-correctable
    // reason (and, with markPrice now in the observation, stops producing it).
    {
      const tp = action.takeProfitPrice;
      const e = ctx.quote?.entryPrice;
      if (
        tp != null &&
        Number.isFinite(tp) &&
        tp > 0 &&
        typeof e === "number" &&
        Number.isFinite(e)
      ) {
        if (action.side === "long" && tp <= e) {
          return fail(
            "take_profit_wrong_side",
            `long take-profit ${tp} must be above entry ${e}`,
          );
        }
        if (action.side === "short" && tp >= e) {
          return fail(
            "take_profit_wrong_side",
            `short take-profit ${tp} must be below entry ${e}`,
          );
        }
      }
    }
    if (!ctx.quote)
      return fail(
        "missing_quote",
        "no quote evidence was fetched for this open",
      );
    if (!ctx.quote.eligible) {
      return fail(
        "quote_ineligible",
        `quote blocked: ${JSON.stringify(ctx.quote.blockReasons ?? [])}`,
      );
    }
    // FAIL-CLOSED: a missing freshness block is treated as not-fresh.
    if (!ctx.quote.freshness || ctx.quote.freshness.status !== "fresh") {
      return fail(
        "stale_quote",
        `quote freshness ${ctx.quote.freshness?.status ?? "missing"} (need fresh)`,
      );
    }
    return ok();
  }

  if (action.type === "futures_close" || action.type === "futures_set_sltp") {
    const pos = observation.openPositions.find(
      (p) => p.id === action.positionId && p.venue === "futures",
    );
    if (!pos)
      return fail(
        "unknown_position",
        `no open futures position ${action.positionId}`,
      );
    // No double-acting on the same position within one cycle.
    if (ctx.targetedPositionIds.includes(action.positionId)) {
      return fail(
        "position_already_targeted",
        `position ${action.positionId} already acted on this cycle`,
      );
    }
    if (action.type === "futures_set_sltp") {
      const hasTrigger = [action.stopLossPrice, action.takeProfitPrice].some(
        (v) => typeof v === "number" && Number.isFinite(v) && v > 0,
      );
      if (!hasTrigger) {
        return fail(
          "sltp_no_op",
          "futures_set_sltp must set at least one positive stopLossPrice or takeProfitPrice",
        );
      }
    }
    return ok();
  }

  if (action.type === "spot_order") {
    const entry = observation.watch.find(
      (w) => w.symbol.toUpperCase() === action.symbol.toUpperCase(),
    );
    if (!entry)
      return fail("unknown_symbol", `${action.symbol} is not on the watchlist`);
    if (!entry.coinId)
      return fail(
        "unresolved_symbol",
        `${action.symbol} did not resolve to a coin`,
      );
    if (
      action.orderType === "limit" &&
      !(typeof action.limitPrice === "number" && action.limitPrice > 0)
    ) {
      return fail(
        "missing_limit_price",
        "a limit order needs a positive limitPrice",
      );
    }
    if (
      action.orderType === "stop" &&
      !(typeof action.stopPrice === "number" && action.stopPrice > 0)
    ) {
      return fail(
        "missing_stop_price",
        "a stop order needs a positive stopPrice",
      );
    }
    // A BUY opens new risk: daily-loss stop, confidence, per-trade notional, cash.
    if (action.side === "buy") {
      if (
        spec.limits.maxDailyLossMusd > 0 &&
        ctx.realizedLossTodayMusd >= spec.limits.maxDailyLossMusd
      ) {
        return fail(
          "daily_loss_cap",
          `today's realized loss ${ctx.realizedLossTodayMusd} >= ${spec.limits.maxDailyLossMusd}`,
        );
      }
      if (
        (action.confidence ?? ctx.decisionConfidence ?? 0) <
        spec.abstention.minConfidence
      ) {
        return fail(
          "below_min_confidence",
          `confidence ${action.confidence ?? 0} < min ${spec.abstention.minConfidence}`,
        );
      }
      // Size the BUY with the SAME helper the runner uses to decrement cash, so
      // the gate and the running-cash accounting never diverge. FAIL CLOSED: an
      // unpriced market buy (server quote omits executionPrice/estimatedCostMusd)
      // yields undefined -> reject. The old `cost != null && ...` guards SKIPPED
      // both caps in that case (notional + balance), a fail-open we must not keep.
      const cost = spotBuyCost(action, ctx.quote);
      if (!(typeof cost === "number" && cost > 0)) {
        return fail(
          "missing_quote_price",
          "cannot size spot buy notional without a price",
        );
      }
      if (cost > spec.risk.perTradeMarginMusd) {
        return fail(
          "notional_exceeds_cap",
          `spot notional ${cost} > per-trade cap ${spec.risk.perTradeMarginMusd}`,
        );
      }
      if (ctx.cashAvailableMusd != null && cost > ctx.cashAvailableMusd) {
        return fail(
          "insufficient_balance",
          `spot cost ${cost} > available ${ctx.cashAvailableMusd}`,
        );
      }
    }
    if (!ctx.quote)
      return fail(
        "missing_quote",
        "no quote evidence was fetched for this spot order",
      );
    if (!ctx.quote.eligible) {
      return fail(
        "quote_ineligible",
        `quote blocked: ${JSON.stringify(ctx.quote.blockReasons ?? [])}`,
      );
    }
    if (!ctx.quote.freshness || ctx.quote.freshness.status !== "fresh") {
      return fail(
        "stale_quote",
        `quote freshness ${ctx.quote.freshness?.status ?? "missing"} (need fresh)`,
      );
    }
    return ok();
  }

  if (action.type === "spot_cancel") {
    const o = observation.openOrders.find((x) => x.id === action.orderId);
    if (!o)
      return fail("unknown_order", `no open spot order ${action.orderId}`);
    if (ctx.targetedOrderIds.includes(action.orderId)) {
      return fail(
        "order_already_targeted",
        `order ${action.orderId} already cancelled this cycle`,
      );
    }
    return ok();
  }

  if (action.type === "pm_open") {
    if (
      spec.limits.maxDailyLossMusd > 0 &&
      ctx.realizedLossTodayMusd >= spec.limits.maxDailyLossMusd
    ) {
      return fail(
        "daily_loss_cap",
        `today's realized loss ${ctx.realizedLossTodayMusd} >= ${spec.limits.maxDailyLossMusd}`,
      );
    }
    // The model may only open a market that DISCOVERY surfaced this cycle — no
    // hallucinated source/slug. (source/slug are lowercased; outcome is exact.)
    const mkt = observation.pmMarkets.find(
      (m) =>
        m.source === action.source.toLowerCase() &&
        m.slug === action.slug.toLowerCase() &&
        m.outcomeExternalMarketId === action.outcomeExternalMarketId,
    );
    if (!mkt) {
      return fail(
        "pm_market_not_discovered",
        `${action.source}/${action.slug} is not in the discovered PM markets`,
      );
    }
    if (action.stakeMusd < PM_MIN_STAKE_MUSD) {
      return fail(
        "pm_stake_below_min",
        `stake ${action.stakeMusd} < $${PM_MIN_STAKE_MUSD} minimum`,
      );
    }
    if (action.stakeMusd > spec.risk.perTradeMarginMusd) {
      return fail(
        "pm_stake_exceeds_cap",
        `stake ${action.stakeMusd} > per-trade cap ${spec.risk.perTradeMarginMusd}`,
      );
    }
    if (
      ctx.cashAvailableMusd != null &&
      action.stakeMusd > ctx.cashAvailableMusd
    ) {
      return fail(
        "insufficient_balance",
        `stake ${action.stakeMusd} > available ${ctx.cashAvailableMusd}`,
      );
    }
    if (
      (action.confidence ?? ctx.decisionConfidence ?? 0) <
      spec.abstention.minConfidence
    ) {
      return fail(
        "below_min_confidence",
        `confidence ${action.confidence ?? 0} < min ${spec.abstention.minConfidence}`,
      );
    }
    if (!ctx.quote)
      return fail(
        "missing_quote",
        "no quote evidence was fetched for this PM open",
      );
    if (!ctx.quote.eligible) {
      return fail(
        "quote_ineligible",
        `quote blocked: ${JSON.stringify(ctx.quote.blockReasons ?? [])}`,
      );
    }
    if (!ctx.quote.freshness || ctx.quote.freshness.status !== "fresh") {
      return fail(
        "stale_quote",
        `quote freshness ${ctx.quote.freshness?.status ?? "missing"} (need fresh)`,
      );
    }
    return ok();
  }

  return fail("unknown_action", "unsupported action type");
}
