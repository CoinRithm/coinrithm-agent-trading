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
} from "./types.js";
import { observe } from "./observe.js";
import { buildSystemPrompt, buildUserPrompt } from "./prompt.js";
import { parseDecision } from "./decision.js";
import { validateAction, DecisionContext } from "./decisionValidator.js";
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

  // Equity-aware drawdown: open mark-to-market losses trip the kill-switch too,
  // not only realized losses.
  const unrealized = observation.openPositions.reduce(
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

  // DECIDE
  const system = buildSystemPrompt(spec, mergedProse);
  const user = buildUserPrompt(observation);
  // Prompt-size visibility: a bloated observation (esp. PM/trades) was 413ing the
  // small free models. ~chars/4 is a rough token estimate; the field counts show
  // which part is heavy.
  log(
    `prompt ~${Math.round((system.length + user.length) / 4)} tok ` +
      `(pm ${observation.pmMarkets.length}, trades ${observation.newClosedTrades.length}, watch ${observation.watch.length})`,
  );
  const res = await provider.decide({ system, user });
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

  for (const action of decision.actions) {
    const quote = await fetchQuote(client, action, observation, baseTrace);
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
      meta.rationaleSummary,
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
  saveState(stateFile, state);
  if (live && anyExecuted) await exportRunEvidence(client, runId);
  return { decision: "act", rationale, confidence, rawModelOutput, planned, live };
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
