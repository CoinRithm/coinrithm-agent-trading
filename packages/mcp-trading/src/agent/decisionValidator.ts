// The decision gate: re-check EVERY proposed action against the spec's hard caps
// BEFORE any write. The model only proposes; this disposes. Because the caps
// come from the spec (not the observation or the model), a prompt-injection in
// market text cannot widen a limit or force a trade. v1 = futures only.

import {
  AgentSpec,
  Observation,
  ProposedAction,
  QuoteEvidence,
  ValidationResult,
  ok,
  fail,
  actionVenue,
} from "./types.js";

export interface DecisionContext {
  spec: AgentSpec;
  observation: Observation;
  quote?: QuoteEvidence; // for futures_open — fetched by the runner, not the model
  writesThisCycle: number;
  writesToday: number;
  openCount: number;
  cashAvailableMusd: number | null; // RUNNING: decremented after each open this cycle
  openMarginMusd: number; // RUNNING: total open margin (existing + this cycle)
  realizedLossTodayMusd: number; // today's realized LOSS as a positive number
  targetedPositionIds: number[]; // positions already acted on this cycle
}

const SERVER_MAX_LEVERAGE = 20;

export function validateAction(action: ProposedAction, ctx: DecisionContext): ValidationResult {
  const { spec, observation } = ctx;

  // v1 scope: futures only.
  if (action.type === "spot_order" || action.type === "spot_cancel" || action.type === "pm_open") {
    return fail("out_of_scope_v1", `action "${action.type}" is out of v1 scope (futures only)`);
  }

  const venue = actionVenue(action);
  if (!spec.venues.includes(venue)) {
    return fail("venue_not_allowed", `venue ${venue} not in [${spec.venues.join(", ")}]`);
  }

  if (spec.sync.requirePollBeforeWrite && !observation.polledBeforeWrite) {
    return fail("no_poll_before_write", "must successfully poll /trades before writing");
  }
  if (ctx.writesThisCycle >= spec.limits.maxWritesPerCycle) {
    return fail("write_budget_exceeded", `maxWritesPerCycle ${spec.limits.maxWritesPerCycle} reached`);
  }
  if (ctx.writesToday >= spec.limits.maxTradesPerDay) {
    return fail("daily_trade_cap", `maxTradesPerDay ${spec.limits.maxTradesPerDay} reached`);
  }

  if (action.type === "futures_open") {
    // Daily realized-loss stop: once today's loss hits the cap, open no new risk.
    if (spec.limits.maxDailyLossMusd > 0 && ctx.realizedLossTodayMusd >= spec.limits.maxDailyLossMusd) {
      return fail("daily_loss_cap", `today's realized loss ${ctx.realizedLossTodayMusd} >= ${spec.limits.maxDailyLossMusd}`);
    }

    const entry = observation.watch.find(
      (w) => w.symbol.toUpperCase() === action.symbol.toUpperCase(),
    );
    if (!entry) return fail("unknown_symbol", `${action.symbol} is not on the watchlist`);
    if (!entry.coinId) return fail("unresolved_symbol", `${action.symbol} did not resolve to a coin`);

    if (action.leverage > spec.risk.maxLeverage) {
      return fail("leverage_exceeds_cap", `leverage ${action.leverage} > cap ${spec.risk.maxLeverage}`);
    }
    if (action.leverage > SERVER_MAX_LEVERAGE) {
      return fail("leverage_exceeds_server", `leverage ${action.leverage} > server cap ${SERVER_MAX_LEVERAGE}`);
    }
    if (action.marginMusd > spec.risk.perTradeMarginMusd) {
      return fail("margin_exceeds_cap", `margin ${action.marginMusd} > cap ${spec.risk.perTradeMarginMusd}`);
    }
    // Aggregate exposure ceiling (existing open margin + this cycle) — the cap
    // that perTradeMargin × maxConcurrentPositions would otherwise blow past.
    if (ctx.openMarginMusd + action.marginMusd > spec.limits.maxOpenMarginMusd) {
      return fail("open_margin_exceeds_cap", `open margin ${ctx.openMarginMusd} + ${action.marginMusd} > ${spec.limits.maxOpenMarginMusd}`);
    }
    if (ctx.openCount >= spec.risk.maxConcurrentPositions) {
      return fail("max_positions", `already ${ctx.openCount} open >= ${spec.risk.maxConcurrentPositions}`);
    }
    if (ctx.cashAvailableMusd != null && action.marginMusd > ctx.cashAvailableMusd) {
      return fail("insufficient_balance", `margin ${action.marginMusd} > available ${ctx.cashAvailableMusd}`);
    }
    // NOTE: minConfidence keys on the model's SELF-REPORTED confidence — a
    // cooperation hint, NOT an injection-resistant control. The hard caps above
    // (which come from the spec, never the observation) are what actually bind.
    if ((action.confidence ?? 0) < spec.abstention.minConfidence) {
      return fail("below_min_confidence", `confidence ${action.confidence ?? 0} < min ${spec.abstention.minConfidence}`);
    }
    if (spec.risk.requireStopLoss) {
      const sl = action.stopLossPrice;
      if (sl == null || !Number.isFinite(sl) || sl <= 0) {
        return fail("missing_stop_loss", "requireStopLoss is set but no valid (finite, positive) stopLossPrice was proposed");
      }
      // Side-aware corridor: a long's stop must be BELOW entry, a short's ABOVE.
      // A wrong-side "stop" is a dead trigger that never protects.
      const e = ctx.quote?.entryPrice;
      if (typeof e === "number" && Number.isFinite(e)) {
        if (action.side === "long" && sl >= e) {
          return fail("stop_loss_wrong_side", `long stop ${sl} must be below entry ${e}`);
        }
        if (action.side === "short" && sl <= e) {
          return fail("stop_loss_wrong_side", `short stop ${sl} must be above entry ${e}`);
        }
      }
    }
    if (!ctx.quote) return fail("missing_quote", "no quote evidence was fetched for this open");
    if (!ctx.quote.eligible) {
      return fail("quote_ineligible", `quote blocked: ${JSON.stringify(ctx.quote.blockReasons ?? [])}`);
    }
    // FAIL-CLOSED: a missing freshness block is treated as not-fresh.
    if (!ctx.quote.freshness || ctx.quote.freshness.status !== "fresh") {
      return fail("stale_quote", `quote freshness ${ctx.quote.freshness?.status ?? "missing"} (need fresh)`);
    }
    return ok();
  }

  if (action.type === "futures_close" || action.type === "futures_set_sltp") {
    const pos = observation.openPositions.find(
      (p) => p.id === action.positionId && p.venue === "futures",
    );
    if (!pos) return fail("unknown_position", `no open futures position ${action.positionId}`);
    // No double-acting on the same position within one cycle.
    if (ctx.targetedPositionIds.includes(action.positionId)) {
      return fail("position_already_targeted", `position ${action.positionId} already acted on this cycle`);
    }
    if (action.type === "futures_set_sltp") {
      const hasTrigger = [action.stopLossPrice, action.takeProfitPrice].some(
        (v) => typeof v === "number" && Number.isFinite(v) && v > 0,
      );
      if (!hasTrigger) {
        return fail("sltp_no_op", "futures_set_sltp must set at least one positive stopLossPrice or takeProfitPrice");
      }
    }
    return ok();
  }

  return fail("unknown_action", "unsupported action type");
}
