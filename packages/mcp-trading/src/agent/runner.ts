// The execution loop: observe -> decide (BYO model) -> validate -> act across
// spot, futures, and prediction markets. Dry-run never writes. Live uses
// idempotency keys + agentTrace and exports run evidence. The client + provider
// are injected so the loop is fully unit-testable with no network/model calls.

import { CoinRithmClient } from "./client.js";
import { Provider } from "./providers.js";
import {
  AgentSpec,
  RunState,
  CycleResult,
  PlannedAction,
  ProposedAction,
  QuoteEvidence,
  spotBuyCost,
  DEFAULT_TRIGGER_POLICY,
} from "./types.js";
import { evaluateGate, noteLlmCall, estimateCostUsd } from "./gate.js";
import { baseSymbol } from "./setups.js";
import { observe } from "./observe.js";
import { buildSystemPrompt, buildUserPrompt } from "./prompt.js";
import { parseDecision } from "./decision.js";
import { validateAction, DecisionContext } from "./decisionValidator.js";
import { resolvePmRef } from "./resolvePm.js";
import { fetchQuote, executeAction } from "./act.js";
import { makeDecisionId, makeTrace, exportRunEvidence } from "./runEvidence.js";
import {
  rollDay,
  checkKillSwitch,
  accrueRealized,
  saveState,
} from "./state.js";
import { asObj, asNum, asStr } from "./extract.js";
import { parseCadenceMs, sleep } from "./util.js";

export interface RunnerDeps {
  client: CoinRithmClient;
  provider: Provider;
  spec: AgentSpec;
  mergedProse: string;
  state: RunState;
  live: boolean;
  stateFile?: string;
  log?: (line: string) => void;
}

// A stable idempotency-key component per distinct intent (so a lost response
// replays rather than re-trades, but a genuinely new intent gets a new key).
function intentKeyOf(action: ProposedAction): string {
  if (action.type === "futures_open") {
    return `open:${action.symbol.toUpperCase()}:${action.side}:${action.leverage}:${action.marginMusd}`;
  }
  if (action.type === "futures_close") {
    return `close:${action.positionId}:${action.fraction ?? "full"}`;
  }
  if (action.type === "futures_set_sltp") {
    return `sltp:${action.positionId}`;
  }
  if (action.type === "spot_order") {
    return `spot:${action.symbol.toUpperCase()}:${action.side}:${action.orderType}:${action.quantity}:${action.limitPrice ?? ""}:${action.stopPrice ?? ""}`;
  }
  if (action.type === "spot_cancel") {
    return `cancel:${action.orderId}`;
  }
  if (action.type === "pm_open") {
    return `pm:${action.source.toLowerCase()}:${action.slug.toLowerCase()}:${action.outcomeExternalMarketId}:${action.stakeMusd}`;
  }
  return "other"; // unreachable: every action type is handled above
}

// Estimated cash a successful action consumes (for the running-cash guard):
// futures margin, spot buy notional, or a PM stake. Closes/cancels/sells free
// cash or are neutral, so they consume nothing here. Spot buys use the SAME
// `spotBuyCost` helper the validator gates on, so the gate and this decrement
// never diverge. The `?? 0` is unreachable for an EXECUTED buy: the validator
// fails closed (missing_quote_price) on any buy whose cost can't be sized, so
// nothing with an undefined cost ever reaches execution to be decremented.
function cashConsumed(action: ProposedAction, quote?: QuoteEvidence): number {
  if (action.type === "futures_open") return action.marginMusd;
  if (action.type === "pm_open") return action.stakeMusd;
  if (action.type === "spot_order" && action.side === "buy") {
    return spotBuyCost(action, quote) ?? 0;
  }
  return 0;
}

// Orienting a take-profit relative to side + mark is deterministic arithmetic —
// the runner should OWN it, not trust a weak model to compute it (the same reason
// pmN offloads the long-id copy). When a futures_open's takeProfitPrice is missing
// or on the WRONG side (long TP <= mark / short TP >= mark), the server rejects the
// WHOLE open (take_profit_not_*_mark) — the position never opens, so the model
// can't "let winners run". Here we substitute a sensible R:R target off the stop so
// the open succeeds with a valid TP. Only fires when a usable stop is present (so
// risk is computable) and the TP is actually missing/wrong-side; a correct TP is
// left untouched. Systemic fix for the whole free-tier 8B/instruct fleet.
const DEFAULT_TP_RR = 1.5; // reward:risk of the substituted take-profit
export function repairFuturesTakeProfit(
  action: ProposedAction,
  quote?: QuoteEvidence,
): { action: ProposedAction; repaired: boolean } {
  if (action.type !== "futures_open") return { action, repaired: false };
  const entry = quote?.entryPrice;
  const sl = action.stopLossPrice;
  if (typeof entry !== "number" || !Number.isFinite(entry) || entry <= 0)
    return { action, repaired: false };
  if (typeof sl !== "number" || !Number.isFinite(sl) || sl <= 0)
    return { action, repaired: false };
  const isLong = action.side === "long";
  const tp = action.takeProfitPrice;
  const tpValid =
    typeof tp === "number" &&
    Number.isFinite(tp) &&
    tp > 0 &&
    (isLong ? tp > entry : tp < entry);
  if (tpValid) return { action, repaired: false };
  // Stop must be on the correct side to imply a positive risk distance; if it
  // isn't, leave the action for the validator to reject (don't fabricate).
  const risk = isLong ? entry - sl : sl - entry;
  if (!(risk > 0)) return { action, repaired: false };
  const target = isLong
    ? entry + DEFAULT_TP_RR * risk
    : entry - DEFAULT_TP_RR * risk;
  if (!(target > 0)) return { action, repaired: false };
  return { action: { ...action, takeProfitPrice: target }, repaired: true };
}

// One-line, human-readable summary of an executed action for the agent's journal
// (slice-3 memory). Compact so a few entries cost almost nothing in the prompt.
function summarizeAction(a: ProposedAction): string {
  switch (a.type) {
    case "futures_open":
      return `opened ${a.side} ${a.symbol} (x${a.leverage}, ${a.marginMusd}mUSD)`;
    case "futures_close":
      return `closed pos#${a.positionId}`;
    case "futures_set_sltp":
      return `trailed stop on pos#${a.positionId}`;
    case "spot_order":
      return `${a.side} ${a.symbol} (${a.orderType})`;
    case "spot_cancel":
      return `cancelled order#${a.orderId}`;
    case "pm_open":
      return `bet PM ${a.slug} ${a.stakeMusd}mUSD`;
  }
}

// Tokens that identify the MARKET an action is on, for checking a rationale is
// actually about it. close/sltp/cancel reference a position/order id (not a market
// name) so they return none and keep their position-management rationale as-is.
function actionMarketTokens(a: ProposedAction): string[] {
  switch (a.type) {
    case "futures_open":
    case "spot_order":
      return [a.symbol, baseSymbol(a.symbol)];
    case "pm_open":
      return [a.source, ...a.slug.split("-").filter((w) => w.length >= 4)];
    default:
      return [];
  }
}

// Does the decision rationale plausibly name this action's market? Lenient: any
// market token present counts. An empty token set (close/sltp/cancel) returns true.
function rationaleMatchesAction(rationale: string, a: ProposedAction): boolean {
  const toks = actionMarketTokens(a).filter((t) => t && t.length >= 2);
  if (toks.length === 0) return true;
  const lower = rationale.toLowerCase();
  return toks.some((t) => lower.includes(t.toLowerCase()));
}

// The per-trade "why" shown on the Arena floor, kept HONEST about the market it's
// on. Prefer the model's per-action summary. Else the decision-level rationale —
// but a MULTI-action decision commits that rationale to its PRIMARY idea, which can
// contradict a secondary action's market ("reasoning didn't match the selected
// market"), so attach it only when it names this action's market; otherwise a
// faithful one-line summary of the move. A single-action decision's rationale IS
// about that action, so it is always kept (the common case, unchanged).
export function rationaleForAction(
  a: ProposedAction,
  decisionRationale: string | undefined,
  perActionSummary: string | undefined,
  totalActions: number,
): string | undefined {
  const perAction = perActionSummary?.trim();
  if (perAction) return perAction;
  if (!decisionRationale) return summarizeAction(a);
  if (totalActions <= 1) return decisionRationale;
  return rationaleMatchesAction(decisionRationale, a)
    ? decisionRationale
    : summarizeAction(a);
}

export async function runCycle(deps: RunnerDeps): Promise<CycleResult> {
  const { client, provider, spec, mergedProse, state, live, stateFile } = deps;
  const log = deps.log ?? (() => {});
  state.cyclesRun += 1;
  rollDay(state);

  // Kill-switch pre-check: a disabled agent never observes, decides, or acts.
  const tripped = checkKillSwitch(spec, state);
  if (tripped) {
    state.disabled = true;
    state.disabledReason = tripped;
    saveState(stateFile, state);
    log(`disabled: ${tripped}`);
    return {
      decision: "skip",
      planned: [],
      disabled: true,
      disabledReason: tripped,
      live,
    };
  }

  const runId = state.runId;
  const decisionId = makeDecisionId(state.cyclesRun);
  const baseTrace = makeTrace(runId, decisionId, spec);

  // OBSERVE
  const obs = await observe(client, spec, state, baseTrace);
  const observation = obs.observation;
  accrueRealized(state, observation.newClosedTrades);
  state.cursor = observation.syncCursor;
  for (const t of observation.newClosedTrades) {
    state.seen.push(
      `${asStr(asObj(t).venue) ?? "futures"}:${asNum(asObj(t).id) ?? String(asObj(t).id)}`,
    );
  }
  state.seen = state.seen.slice(-500);

  // Slice-3 reflection: journal closed-trade OUTCOMES (not just opens) so the agent
  // remembers how its theses RESOLVED — a stop-out it should not revenge-trade, a
  // winner its style works on. Defensive field reads (the /trades shape varies);
  // a partial entry is harmless, a missing one is skipped.
  for (const t of observation.newClosedTrades.slice(-5)) {
    const o = asObj(t);
    const sym = asStr(o.symbol) ?? asStr(o.coinSymbol) ?? asStr(o.coinId);
    const pnl =
      asNum(o.realizedPnlMusd) ??
      asNum(o.pnlMusd) ??
      asNum(o.realizedPnl) ??
      asNum(o.pnl);
    const side = asStr(o.side);
    if (sym || pnl != null) {
      const did =
        `closed ${side ?? ""} ${sym ?? "position"}`.trim() +
        (pnl != null
          ? `: ${pnl >= 0 ? "+" : ""}${Math.round(pnl)}mUSD ${pnl >= 0 ? "WIN" : "LOSS"}`
          : "");
      state.journal = [
        ...(state.journal ?? []),
        { at: observation.asOf, did },
      ].slice(-12);
    }
  }

  // Equity-aware drawdown: open mark-to-market losses trip the kill-switch too,
  // not only realized losses. Includes BOTH futures AND prediction-market books —
  // a PM-only agent (or one with a large PM stake) was previously invisible to the
  // drawdown stop, so a marking-down PM book could not trip it (P1b).
  const unrealized =
    observation.openPositions.reduce(
      (s, p) => s + (p.unrealizedPnlMusd ?? 0),
      0,
    ) +
    (observation.pmPositions ?? []).reduce(
      (s, p) => s + (p.unrealizedPnlMusd ?? 0),
      0,
    );
  if (
    spec.killSwitch.maxDrawdownMusd > 0 &&
    state.peakRealizedMusd - (state.realizedPnlMusd + unrealized) >=
      spec.killSwitch.maxDrawdownMusd
  ) {
    state.disabled = true;
    state.disabledReason = `equity drawdown >= ${spec.killSwitch.maxDrawdownMusd}`;
    saveState(stateFile, state);
    log(`disabled: ${state.disabledReason}`);
    return {
      decision: "skip",
      planned: [],
      disabled: true,
      disabledReason: state.disabledReason,
      live,
    };
  }

  if (obs.skip) {
    state.consecutiveRejectCycles += 1;
    saveState(stateFile, state);
    log(`skip: ${obs.skip}`);
    return { decision: "skip", skipReason: obs.skip, planned: [], live };
  }

  // GATE (slice 2): only SPEND an LLM call when a deterministic trigger fires — a
  // flagged entry setup or an open position to manage. No trigger => a cheap
  // heartbeat (zero tokens). A heartbeat is neither a model reject nor a failure,
  // so it touches NO kill-switch counter; it just records the cheap cycle.
  const policy = spec.triggerPolicy ?? DEFAULT_TRIGGER_POLICY;
  const nowMs = Date.now();
  const gate = evaluateGate(observation, state, policy, nowMs);
  const providerName = spec.model?.provider ?? "nvidia";
  if (!gate.fire) {
    saveState(stateFile, state);
    log(`gate: skip (${gate.reason})`);
    return {
      decision: "skip",
      skipReason: gate.reason,
      planned: [],
      live,
      triggerCodes: gate.codes,
      llmCallMade: false,
      decisionType: "gate_skip",
      tokensIn: 0,
      tokensOut: 0,
      estimatedCostUsd: 0,
      writeAttempted: 0,
      writeAccepted: 0,
    };
  }
  noteLlmCall(state, gate.codes, nowMs);

  // DECIDE
  const system = buildSystemPrompt(spec, mergedProse);
  const user = buildUserPrompt(observation, state.journal);
  const tokensInEst = Math.round((system.length + user.length) / 4);
  // Prompt-size + trigger visibility in the live terminal.
  log(
    `prompt ~${tokensInEst} tok ` +
      `(pm ${observation.pmMarkets.length}, trades ${observation.newClosedTrades.length}, watch ${observation.watch.length}, setups ${observation.setups.length}, triggers ${gate.codes.join("|") || "none"})`,
  );
  const res = await provider.decide({ system, user });
  // Metering: prefer provider-reported usage; fall back to a chars/4 estimate.
  const tokensIn = res.ok
    ? (res.usage?.promptTokens ?? tokensInEst)
    : tokensInEst;
  const tokensOut = res.ok
    ? (res.usage?.completionTokens ?? Math.round(res.text.length / 4))
    : 0;
  const estimatedCostUsd = estimateCostUsd(providerName, tokensIn, tokensOut);
  const meter = {
    triggerCodes: gate.codes,
    llmCallMade: true,
    tokensIn,
    tokensOut,
    estimatedCostUsd,
  };
  if (!res.ok) {
    state.consecutiveModelFailures += 1;
    saveState(stateFile, state);
    log(`model error: ${res.error}`);
    return {
      decision: "skip",
      skipReason: `model error: ${res.error}`,
      planned: [],
      modelFailed: true,
      live,
      ...meter,
      decisionType: "model_error",
      writeAttempted: 0,
      writeAccepted: 0,
    };
  }
  const parsed = parseDecision(res.text);
  if (!parsed.ok) {
    state.consecutiveModelFailures += 1;
    saveState(stateFile, state);
    log(`model output invalid: ${parsed.error}`);
    return {
      decision: "skip",
      skipReason: `model output invalid: ${parsed.error}`,
      rawModelOutput: res.text.slice(0, 8000),
      planned: [],
      modelFailed: true,
      live,
      ...meter,
      decisionType: "model_error",
      writeAttempted: 0,
      writeAccepted: 0,
    };
  }
  state.consecutiveModelFailures = 0;
  const decision = parsed.decision;
  // Reasoning captured for the Arena terminal (keystone transparency): the
  // model's own analysis this cycle + decision confidence + the full raw text
  // (capped) for debugging. Shared across the skip + act return paths.
  const rationale = decision.rationale;
  const confidence = decision.confidence;
  const rawModelOutput = res.text.slice(0, 8000);

  if (decision.decision === "skip" || decision.actions.length === 0) {
    state.consecutiveRejectCycles += 1;
    saveState(stateFile, state);
    log(`model chose skip${decision.reason ? `: ${decision.reason}` : ""}`);
    return {
      decision: "skip",
      skipReason: decision.reason ?? "model chose skip",
      rationale,
      confidence,
      rawModelOutput,
      planned: [],
      live,
      ...meter,
      decisionType: "skip",
      writeAttempted: decision.actions.length,
      writeAccepted: 0,
    };
  }

  // VALIDATE (+ ACT when live). Quote evidence is fetched by the runner.
  const planned: PlannedAction[] = [];
  let writesThisCycle = 0;
  let openCount = observation.openPositions.length;
  // RUNNING totals so multiple opens in one cycle accumulate correctly.
  let openMarginMusd = observation.openPositions
    .filter((p) => p.venue === "futures")
    .reduce((s, p) => s + (p.marginMusd ?? 0), 0);
  let cashAvailableMusd = observation.cashAvailableMusd;
  const realizedLossTodayMusd = Math.max(0, -state.realizedPnlTodayMusd);
  const targetedPositionIds: number[] = [];
  const targetedOrderIds: number[] = [];
  let anyAccepted = false;
  let anyExecuted = false;
  let anyExecFailed = false;

  for (let action of decision.actions) {
    // Resolve a short PM ref (pm1…pmN) to the canonical {source,slug,outcome} BEFORE
    // any quote/validation. Small models copy a 3-char ref reliably but mis-copy the
    // long outcomeExternalMarketId; an unknown/missing ref is rejected here with a
    // clear code instead of crashing the validator on an undefined id.
    if (action.type === "pm_open") {
      const resolved = resolvePmRef(action, observation.pmMarkets);
      if (!resolved.ok) {
        planned.push({
          action,
          accepted: false,
          code: resolved.code,
          reason: resolved.reason,
        });
        log(`reject pm_open: ${resolved.code} (${resolved.reason})`);
        continue;
      }
      action = resolved.action;
      // Anti-churn for PM (the analog of the futures duplicate_intent guard):
      // block re-betting a market+outcome we ALREADY hold an open position on.
      // Without this a model re-bets the same mispriced market every cycle (one
      // agent opened 25 identical bets) — pure churn. The model SEES its holdings
      // in observation.pmPositions; this enforces it. Bet a DIFFERENT market instead.
      const pm = resolved.action; // narrowed to pm_open (canonical triple filled)
      const heldPm = observation.pmPositions.find(
        (p) =>
          (p.source ?? "").toLowerCase() === (pm.source ?? "").toLowerCase() &&
          (p.slug ?? "").toLowerCase() === (pm.slug ?? "").toLowerCase() &&
          p.outcomeExternalMarketId === pm.outcomeExternalMarketId,
      );
      if (heldPm) {
        planned.push({
          action,
          accepted: false,
          code: "duplicate_intent",
          reason: `already hold a PM bet on ${pm.slug} / ${pm.outcomeExternalMarketId} — do not re-bet the same market+outcome (churn); pick a different market or skip`,
        });
        log(`reject pm_open: duplicate_intent (hold PM ${pm.slug})`);
        continue;
      }
    }
    // Anti-churn critic: block re-opening a futures position we ALREADY hold unless
    // it's a confirmed WINNER with room (a legit scale-in). Stops the re-open-a-
    // loser / re-open-into-the-cap churn deterministically — before we even spend a
    // quote — with a clear "duplicate_intent" instead of a cryptic cap reject. The
    // runner caps remain the backstop; this is the cleaner, earlier stop.
    if (action.type === "futures_open") {
      // Bind the narrowed action to a const: `action` is a reassignable loop var
      // (pm-resolve + the take-profit repair below both write to it), and a later
      // reassignment would otherwise widen it back to the union inside this
      // closure's control-flow analysis.
      const fo = action;
      const ab = baseSymbol(fo.symbol);
      const held = observation.openPositions.find(
        (p) =>
          p.venue === "futures" &&
          p.side === fo.side &&
          baseSymbol(p.symbol) === ab,
      );
      if (held) {
        const winning = (held.unrealizedPnlMusd ?? 0) > 0;
        const hasRoom =
          openCount < spec.risk.maxConcurrentPositions &&
          openMarginMusd + fo.marginMusd <= spec.limits.maxOpenMarginMusd;
        if (!(winning && hasRoom)) {
          planned.push({
            action,
            accepted: false,
            code: "duplicate_intent",
            reason: `already hold ${fo.symbol} ${fo.side}${winning ? " (no margin room to add)" : " — manage it, do not average down or re-open"}`,
          });
          log(
            `reject ${action.type}: duplicate_intent (hold ${fo.symbol} ${fo.side})`,
          );
          continue;
        }
      }
    }
    const quote = await fetchQuote(client, action, observation, baseTrace);
    // Auto-clamp a missing/wrong-side futures take-profit to a valid R:R target
    // off the stop, so the open isn't silently rejected server-side (the runner
    // owns trigger orientation; weak models routinely mis-sign it).
    {
      const fixed = repairFuturesTakeProfit(action, quote);
      if (fixed.repaired) {
        action = fixed.action;
        log(
          `repaired ${action.type} take-profit -> ${(action as { takeProfitPrice?: number }).takeProfitPrice} (R:R off stop; model TP was missing/wrong-side)`,
        );
      }
    }
    const ctx: DecisionContext = {
      spec,
      // Inherit the decision-level confidence so the per-action abstention gate
      // doesn't reject a model that reports conviction on the decision (the
      // output contract) rather than on each action.
      decisionConfidence: decision.confidence,
      observation,
      quote,
      writesThisCycle,
      writesToday: state.writesToday,
      openCount,
      cashAvailableMusd,
      openMarginMusd,
      realizedLossTodayMusd,
      targetedPositionIds,
      targetedOrderIds,
    };
    const v = validateAction(action, ctx);
    if (!v.valid) {
      planned.push({
        action,
        accepted: false,
        code: v.code,
        reason: v.reason,
        quote,
      });
      log(`reject ${action.type}: ${v.code} (${v.reason})`);
      continue;
    }
    anyAccepted = true;
    if (action.type === "futures_close" || action.type === "futures_set_sltp") {
      targetedPositionIds.push(action.positionId);
    }
    if (action.type === "spot_cancel") {
      targetedOrderIds.push(action.orderId);
    }
    if (!live) {
      planned.push({ action, accepted: true, quote, executed: false });
      log(`DRY-RUN: would ${action.type}`);
      continue;
    }
    // Deterministic idempotency key: stable per intent, advanced only on
    // confirmed success — a lost response replays, a new intent gets a new key.
    const intentKey = intentKeyOf(action);
    const seq = state.intentSeq[intentKey] ?? 0;
    const idem = `${runId}:${intentKey}:${seq}`;
    const meta = action as { confidence?: number; rationaleSummary?: string };
    const trace = makeTrace(
      runId,
      decisionId,
      spec,
      meta.confidence ?? decision.confidence,
      // The trade's "why" on the Arena live floor. Prefer the model's per-action
      // summary; else the decision rationale, but kept HONEST about this action's
      // market (a multi-action decision's rationale can be about a DIFFERENT market
      // than a secondary trade — see rationaleForAction). Sanitized short reasoning
      // only — never raw chain-of-thought.
      rationaleForAction(
        action,
        decision.rationale,
        meta.rationaleSummary,
        decision.actions.length,
      ),
    );
    const r = await executeAction(client, action, observation, trace, idem);
    planned.push({
      action,
      accepted: true,
      quote,
      executed: r.ok,
      result: r.data,
    });
    if (r.ok) {
      anyExecuted = true;
      state.intentSeq[intentKey] = seq + 1;
      writesThisCycle += 1;
      state.writesToday += 1;
      if (action.type === "futures_open") {
        openCount += 1;
        openMarginMusd += action.marginMusd;
      }
      // Decrement running cash by what this action consumed (futures margin /
      // spot buy notional / PM stake) so a later action this cycle sees it spent.
      if (cashAvailableMusd != null)
        cashAvailableMusd -= cashConsumed(action, quote);
    } else {
      anyExecFailed = true;
    }
    log(`${r.ok ? "executed" : "FAILED"} ${action.type} (HTTP ${r.status})`);
  }

  // Reset the reject kill-switch only on real PROGRESS: an accepted-but-FAILED
  // live write is not progress, or a persistently failing live agent would
  // never trip the kill-switch.
  const progressed = live ? anyExecuted : anyAccepted;
  state.consecutiveRejectCycles = progressed
    ? 0
    : state.consecutiveRejectCycles + 1;
  state.consecutiveExecFailures =
    anyExecFailed && !anyExecuted ? state.consecutiveExecFailures + 1 : 0;
  state.rateLimitHits = client.rateLimitHits ?? state.rateLimitHits;
  // Slice-3 memory: journal the accepted move(s) + the thesis behind them so next
  // cycle has continuity (manage with memory of WHY; don't re-open what we just did).
  const moves = planned
    .filter((p) => p.accepted)
    .map((p) => summarizeAction(p.action));
  if (moves.length > 0) {
    const did = `${moves.join("; ")}${rationale ? ` — ${rationale.slice(0, 90)}` : ""}`;
    state.journal = [
      ...(state.journal ?? []),
      { at: observation.asOf, did },
    ].slice(-10);
  }
  saveState(stateFile, state);
  if (live && anyExecuted) await exportRunEvidence(client, runId);
  return {
    decision: "act",
    rationale,
    confidence,
    rawModelOutput,
    planned,
    live,
    ...meter,
    decisionType: "act",
    writeAttempted: decision.actions.length,
    writeAccepted: planned.filter((p) => p.accepted).length,
  };
}

export interface LoopOptions {
  once?: boolean;
  maxCycles?: number;
}

export async function runLoop(
  deps: RunnerDeps,
  opts: LoopOptions = {},
): Promise<CycleResult[]> {
  const results: CycleResult[] = [];
  const cadenceMs = parseCadenceMs(deps.spec.trigger.cadence) ?? 3_600_000;
  const log = deps.log ?? (() => {});
  let cycles = 0;
  for (;;) {
    const r = await runCycle(deps);
    results.push(r);
    cycles += 1;
    if (r.disabled) break;
    if (opts.once) break;
    if (opts.maxCycles && cycles >= opts.maxCycles) break;
    log(`sleeping ${Math.round(cadenceMs / 1000)}s until next cycle`);
    await sleep(cadenceMs);
  }
  return results;
}
