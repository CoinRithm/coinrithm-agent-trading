// The execution loop: observe -> decide (BYO model) -> validate -> act across
// spot, futures, and prediction markets. Dry-run never writes. Live uses
// idempotency keys + agentTrace and exports run evidence. The client + provider
// are injected so the loop is fully unit-testable with no network/model calls.

import { CoinRithmClient, ProvenanceReport } from "./client.js";
import { Provider } from "./providers.js";
import { COINRITHM_API } from "./version.js";
import {
  AgentSpec,
  RunState,
  CycleResult,
  Decision,
  PlannedAction,
  ProposedAction,
  PmMarket,
  PostedOpportunity,
  QuoteEvidence,
  spotBuyCost,
  DEFAULT_TRIGGER_POLICY,
} from "./types.js";
import { decideMechanical } from "./mechanical.js";
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
  isPermanentModelError,
  isAuthFailureSkip,
  PERMANENT_MODEL_ERROR_THRESHOLD,
  AUTH_FAILURE_THRESHOLD,
} from "./state.js";
import { asObj, asNum, asStr } from "./extract.js";
import { parseCadenceMs, sleep } from "./util.js";
import { buildObservationReceipt } from "./observationReceipt.js";

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

// Independent-forecast kill-switch. Default ON: the fleet elicits + submits its
// OWN forecastProbability on PM opens. Set HOUSE_AGENT_FORECAST_ENABLED to
// "false"/"0"/"no"/"off" to ship pm/open requests WITHOUT the field, byte-identical
// to pre-forecast behavior (prompt extension also drops out). Read at CALL TIME
// (not module-load) so a process env / a test can toggle it without re-import.
export function houseAgentForecastEnabled(): boolean {
  const v = (process.env.HOUSE_AGENT_FORECAST_ENABLED ?? "")
    .trim()
    .toLowerCase();
  return !["false", "0", "no", "off"].includes(v);
}

// Opportunity-capture kill-switch. Default ON: the runner reports the NON-opened
// opportunities the trade paths cannot see — the model ABSTAINING while PM markets
// were listed, forecasting WITHOUT trading (forecast_only), or a validated pm_open
// whose quote EXPIRED at act time (quote_expired) — so the public evaluation is not
// selection-biased toward opened trades. Mirrors the backend env name; set
// AGENT_OPPORTUNITY_CAPTURE_ENABLED to "false"/"0"/"no"/"off" to disable. Read at
// CALL TIME so a process env / a test can toggle it without re-import. Only ever
// posts on a LIVE cycle (dry-run never writes), at most ONCE per cycle.
export function agentOpportunityCaptureEnabled(): boolean {
  const v = (process.env.AGENT_OPPORTUNITY_CAPTURE_ENABLED ?? "")
    .trim()
    .toLowerCase();
  return !["false", "0", "no", "off"].includes(v);
}

// The runner's SELF-REPORTED runtime kind. This is the npm coinrithm-agent runner,
// so the honest default is "self_host_runner". When the house scheduler spawns the
// runner it may set COINRITHM_RUNTIME_KIND=hosted_scheduler — a purely DESCRIPTIVE
// label that carries NO trust (the backend forces providerVerified=false for every
// keyed caller regardless), so it can never be used to fake verification. Any
// unrecognized value falls back to self_host_runner.
export function runnerRuntimeKind(): ProvenanceReport["runtimeKind"] {
  const v = (process.env.COINRITHM_RUNTIME_KIND ?? "").trim().toLowerCase();
  return v === "hosted_scheduler" ? "hosted_scheduler" : "self_host_runner";
}

// Build the runner's REAL provenance from what it honestly knows: its runtime kind,
// the published package version (read from package.json via version.ts), and the
// self-reported model provider/name from the resolved agent spec. Everything the
// runner cannot truthfully attest (bundle/skill/prompt/config hashes, evidence refs)
// is OMITTED — absent > fabricated. Sending this block makes the artifact v2; the
// server still stamps the policy versions + providerVerified itself.
export function buildRunnerProvenance(spec: AgentSpec): ProvenanceReport {
  const prov: ProvenanceReport = {
    runtimeKind: runnerRuntimeKind(),
    packageVersion: COINRITHM_API.mcpVersion,
  };
  if (spec.model?.provider) prov.modelProvider = spec.model.provider;
  if (spec.model?.name) prov.modelName = spec.model.name;
  return prov;
}

// Clamp a model-proposed forecast to the backend's exclusive (0,100) rail as a
// whole-or-one-decimal value in [1,99]. Returns undefined for missing / null /
// NaN / non-finite input (absent > fake — the trade proceeds WITHOUT the field;
// the value is NEVER defaulted to the market price / entryProbability). The
// decision parser already tolerates non-numeric model output down to undefined,
// so this mainly enforces the numeric range.
export function sanitizeForecastProbability(raw: unknown): number | undefined {
  if (typeof raw !== "number" || !Number.isFinite(raw)) return undefined;
  const clamped = Math.min(99, Math.max(1, raw));
  return Math.round(clamped * 10) / 10; // one-decimal precision
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

// A market's current probability (stored 0..1) as whole percentage POINTS (0..100),
// the basis the opportunity/decision record uses. undefined when not reported.
function marketPct(prob: number | undefined): number | undefined {
  return typeof prob === "number" && Number.isFinite(prob)
    ? Math.round(prob * 100)
    : undefined;
}

// Find the discovered market matching a resolved pm_open triple (case-insensitive
// source/slug, exact outcome id) — for the observed market probability.
function findPmMarket(
  pmMarkets: PmMarket[],
  ref: { source?: string; slug?: string; outcomeExternalMarketId?: string },
): PmMarket | undefined {
  return pmMarkets.find(
    (m) =>
      (m.source ?? "").toLowerCase() === (ref.source ?? "").toLowerCase() &&
      (m.slug ?? "").toLowerCase() === (ref.slug ?? "").toLowerCase() &&
      m.outcomeExternalMarketId === ref.outcomeExternalMarketId,
  );
}

// Build the NON-opened opportunity for a MODEL-SKIP cycle, or null when there is no
// PM universe to report on. The top listed market is the subject and the universe
// breadth rides in universeSize so ONE post captures the whole cohort (never one
// per market). A pm_open the model listed WITH a usable forecast makes it
// forecast_only (it produced a probability but chose not to trade); otherwise it is
// a plain abstention. NEVER defaults the forecast to the market price.
//
// NOTE: parseDecision() clears a pure `skip` decision's actions to [] (an act with
// actions goes down the act path instead), so in the live runner this yields
// `abstained`. The forecast_only rule is exercised whenever a decision reaches here
// WITH surviving actions (kept faithful to the capture spec + future-proof; covered
// directly by the unit test).
export function buildSkipOpportunity(
  decision: Decision,
  pmMarkets: PmMarket[],
  forecastEnabled: boolean,
): PostedOpportunity | null {
  if (pmMarkets.length === 0) return null;
  const universeSize = pmMarkets.length;
  const reasonCode = decision.reason?.trim() || undefined;

  const pmAction = decision.actions.find(
    (a): a is Extract<ProposedAction, { type: "pm_open" }> =>
      a.type === "pm_open",
  );
  if (forecastEnabled && pmAction) {
    const fc = sanitizeForecastProbability(pmAction.forecastProbability);
    if (fc != null) {
      // Resolve the forecasted market for an honest subject; fall back to the top
      // listed market when the ref can't be resolved (still a valid forecast_only).
      const resolved = resolvePmRef(pmAction, pmMarkets);
      const subject =
        (resolved.ok ? findPmMarket(pmMarkets, resolved.action) : undefined) ??
        pmMarkets[0];
      return {
        kind: "forecast_only",
        source: subject.source,
        slug: subject.slug,
        outcomeExternalMarketId: subject.outcomeExternalMarketId,
        universeSize,
        forecastProbability: fc,
        marketProbability: marketPct(subject.probability),
        reasonCode,
      };
    }
  }

  const top = pmMarkets[0];
  return {
    kind: "abstained",
    source: top.source,
    slug: top.slug,
    outcomeExternalMarketId: top.outcomeExternalMarketId,
    universeSize,
    marketProbability: marketPct(top.probability),
    reasonCode,
  };
}

// A validated pm_open that FAILED at act with quote-expiry semantics — the server
// rejected the open with a 422 mock_entry_blocked, i.e. the eligibility/quality/
// pricing state moved between the quote the runner validated and the act, so the
// quote it acted on had effectively expired. Distinct from a risk/balance 422
// (insufficient_balance), which is not a quote-expiry.
function isQuoteExpiredResult(status: number, data: unknown): boolean {
  if (status !== 422) return false;
  const d = asObj(data);
  return asStr(d.error) === "mock_entry_blocked";
}

// Joined server block reasons (reasonCode) for a quote_expired opportunity.
function blockReasonsOf(data: unknown): string | undefined {
  const d = asObj(data);
  const reasons = Array.isArray(d.blockReasons)
    ? (d.blockReasons as unknown[]).map(String).filter((s) => s.length > 0)
    : [];
  return reasons.length > 0 ? reasons.join(",") : undefined;
}

export async function runCycle(deps: RunnerDeps): Promise<CycleResult> {
  const { client, provider, spec, mergedProse, state, live, stateFile } = deps;
  const log = deps.log ?? (() => {});
  // One flag read per cycle governs BOTH the prompt extension and the submission,
  // so they can never diverge (prompt asks for it iff we would submit it).
  const forecastEnabled = houseAgentForecastEnabled();
  // The runner's REAL provenance for this cycle (runtime kind + package version +
  // self-reported model). Attached to every durable-artifact write (pm_open,
  // opportunity) so the artifact records WHAT RAN. Constant per cycle.
  const provenance = buildRunnerProvenance(spec);
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

  // Opportunity capture (kills evaluation selection bias). Post at most ONE
  // non-opened opportunity per cycle, LIVE only (dry-run never writes), best-effort
  // — a failed post never affects the cycle result. The latch is set BEFORE the
  // await so a failure never retries within the cycle (respects the write budget);
  // the cohort/universe field carries the breadth, so we never post per-market.
  const captureOpportunity = agentOpportunityCaptureEnabled();
  let opportunityPosted = false;
  let postedOpportunity: PostedOpportunity | undefined;
  const postOpportunity = async (o: PostedOpportunity): Promise<void> => {
    if (!captureOpportunity || !live || opportunityPosted) return;
    opportunityPosted = true;
    postedOpportunity = o;
    try {
      await client.reportPmOpportunity(
        {
          kind: o.kind,
          source: o.source,
          slug: o.slug,
          outcomeExternalMarketId: o.outcomeExternalMarketId,
          forecastProbability: o.forecastProbability,
          marketProbability: o.marketProbability,
          reasonCode: o.reasonCode,
          cohort: {
            universeSize: o.universeSize,
            horizon: spec.objective?.horizon,
          },
          decisionId,
          runId,
          provenance,
        },
        baseTrace,
      );
      log(`reported ${o.kind} opportunity (universe ${o.universeSize ?? "?"})`);
    } catch (err) {
      log(
        `opportunity post failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  };

  // OBSERVE
  const obs = await observe(client, spec, state, baseTrace);
  const observation = obs.observation;
  const observationReceipt = buildObservationReceipt(observation);
  // Reads build the observation, so its hash cannot exist before they finish.
  // From this point every durable write carries the exact decision-input receipt.
  Object.assign(baseTrace, observationReceipt);
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
      ...observationReceipt,
    };
  }

  if (obs.skip) {
    state.consecutiveRejectCycles += 1;
    // Permanent-failure classification: a revoked/invalid CoinRithm key
    // answers 401 deterministically — after the threshold, disable with the
    // machine-readable 'key_invalid' prefix the scheduler's self-heal exempts
    // (the old path revived such agents into ~1,500 guaranteed-dead
    // cycles/day). A transient rotation blip stays under the threshold.
    if (isAuthFailureSkip(obs.skip)) {
      state.consecutiveAuthFailures = (state.consecutiveAuthFailures ?? 0) + 1;
      if (state.consecutiveAuthFailures >= AUTH_FAILURE_THRESHOLD) {
        state.disabled = true;
        state.disabledReason = `key_invalid: CoinRithm key rejected (HTTP 401) on ${state.consecutiveAuthFailures} consecutive cycles`;
        saveState(stateFile, state);
        log(`disabled: ${state.disabledReason}`);
        return {
          decision: "skip",
          skipReason: obs.skip,
          planned: [],
          disabled: true,
          disabledReason: state.disabledReason,
          live,
          ...observationReceipt,
        };
      }
    }
    saveState(stateFile, state);
    log(`skip: ${obs.skip}`);
    return {
      decision: "skip",
      skipReason: obs.skip,
      planned: [],
      live,
      ...observationReceipt,
    };
  }
  // A full observation implies /me succeeded — the auth-failure streak is over.
  state.consecutiveAuthFailures = 0;

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
      ...observationReceipt,
    };
  }
  // DECIDE. Two paths share the same downstream validate+act loop:
  //   • mechanical benchmark agents (provider "mechanical") compute the decision
  //     deterministically from the observation — no prompt, no model call, no
  //     inference cost. They never touch the LLM budget/debounce (noteLlmCall).
  //   • every other agent asks its BYO model.
  let decision: Decision;
  let meter: {
    triggerCodes: string[];
    llmCallMade: boolean;
    tokensIn: number;
    tokensOut: number;
    estimatedCostUsd: number;
  };
  if (providerName === "mechanical") {
    const mech = decideMechanical({
      strategy: spec.model?.name ?? "",
      observation,
      dateKey: state.dayKey,
    });
    for (const l of mech.log) log(l);
    decision = mech.decision;
    state.consecutiveModelFailures = 0;
    // Zero-cost cycle: a mechanical decision made no LLM call.
    meter = {
      triggerCodes: gate.codes,
      llmCallMade: false,
      tokensIn: 0,
      tokensOut: 0,
      estimatedCostUsd: 0,
    };
  } else {
    noteLlmCall(state, gate.codes, nowMs);
    const system = buildSystemPrompt(spec, mergedProse, {
      includeForecast: forecastEnabled,
    });
    const user = buildUserPrompt(observation, state.journal, {
      venues: spec.venues,
    });
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
    meter = {
      triggerCodes: gate.codes,
      llmCallMade: true,
      tokensIn,
      tokensOut,
      estimatedCostUsd,
    };
    if (!res.ok) {
      state.consecutiveModelFailures += 1;
      // Permanent-failure classification: a 404/model_not_found is a
      // DECOMMISSIONED or misconfigured model that will fail every cycle
      // forever (live-measured: 93% of one agent's cycles for days, revived
      // 7x in 3h). Three consecutive occurrences rules out a routing fluke;
      // then disable with the 'model_unavailable' prefix the scheduler's
      // self-heal exempts. Transient errors reset the permanent streak.
      if (isPermanentModelError(res.error)) {
        state.consecutivePermanentModelErrors =
          (state.consecutivePermanentModelErrors ?? 0) + 1;
        if (
          state.consecutivePermanentModelErrors >=
          PERMANENT_MODEL_ERROR_THRESHOLD
        ) {
          state.disabled = true;
          state.disabledReason = `model_unavailable: ${res.error.slice(0, 160)}`;
          saveState(stateFile, state);
          log(`disabled: ${state.disabledReason}`);
          return {
            decision: "skip",
            skipReason: `model error: ${res.error}`,
            planned: [],
            modelFailed: true,
            disabled: true,
            disabledReason: state.disabledReason,
            live,
            ...meter,
            decisionType: "model_error",
            writeAttempted: 0,
            writeAccepted: 0,
            ...observationReceipt,
          };
        }
      } else {
        state.consecutivePermanentModelErrors = 0;
      }
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
        ...observationReceipt,
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
        // Never persist raw model text (no-CoT privacy policy) — the parse error
        // in skipReason is the diagnostic; the malformed output is not stored.
        rawModelOutput: undefined,
        planned: [],
        modelFailed: true,
        live,
        ...meter,
        decisionType: "model_error",
        writeAttempted: 0,
        writeAccepted: 0,
        ...observationReceipt,
      };
    }
    state.consecutiveModelFailures = 0;
    state.consecutivePermanentModelErrors = 0;
    decision = parsed.decision;
  }
  // Reasoning captured for the Arena terminal (keystone transparency): the
  // model's PARSED, sanitized short analysis + decision confidence. We do NOT
  // persist the full raw model text — a response can carry prose reasoning
  // around the JSON, and the privacy promise (frontend copy + CLAUDE.md
  // data-retention) is that raw model reasoning traces are NEVER stored, only
  // the sanitized rationale summary. Shared across the skip + act return paths.
  const rationale = decision.rationale;
  const confidence = decision.confidence;
  // undefined (not the raw text) → db.ts stores NULL for raw_model_output.
  const rawModelOutput = undefined;

  if (decision.decision === "skip" || decision.actions.length === 0) {
    state.consecutiveRejectCycles += 1;
    // Capture the abstention / forecast-only: the model evaluated a non-empty PM
    // universe and chose NOT to open, so the public evaluation must see it (else an
    // agent looks skilled by exposure choice alone). One post carries the whole
    // cohort via universeSize.
    const skipOpp = buildSkipOpportunity(
      decision,
      observation.pmMarkets,
      forecastEnabled,
    );
    if (skipOpp) await postOpportunity(skipOpp);
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
      ...(postedOpportunity ? { opportunity: postedOpportunity } : {}),
      ...observationReceipt,
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
      // Independent forecast submission (HOUSE_AGENT_FORECAST_ENABLED, default ON).
      // Attach the model's OWN probability the backed side wins — clamped to [1,99],
      // OMITTED when absent/unparseable (a bad forecast never blocks the trade), and
      // NEVER defaulted to the market price. Flag OFF strips any forecast so the open
      // request is byte-identical to pre-forecast behavior.
      if (forecastEnabled) {
        const fc = sanitizeForecastProbability(pm.forecastProbability);
        if (fc != null) {
          const mkt = observation.pmMarkets.find(
            (m) =>
              (m.source ?? "").toLowerCase() ===
                (pm.source ?? "").toLowerCase() &&
              (m.slug ?? "").toLowerCase() === (pm.slug ?? "").toLowerCase() &&
              m.outcomeExternalMarketId === pm.outcomeExternalMarketId,
          );
          const marketPct =
            typeof mkt?.probability === "number" &&
            Number.isFinite(mkt.probability)
              ? Math.round(mkt.probability * 100)
              : undefined;
          // Anti-echo: an EXACT match on the market's integer probability is still
          // submitted (a forecast can legitimately agree) — but we LOG it so echo
          // rates stay observable; we never silently mutate the value. NOTE: the
          // market-implied BENCHMARK agent (provider "mechanical", model.name
          // "market-implied") echoes the market probability BY DESIGN — it IS the
          // baseline definition — so a 100% echo rate there is expected, not a
          // defect. Its agentModel/description say BENCHMARK so this log line is
          // never mistaken for a mispriced skill agent.
          if (marketPct != null && Math.round(fc) === marketPct) {
            log(
              `pm_open forecast ${fc} == market prob ${marketPct}% (echo) — submitting as-is`,
            );
          }
          action = { ...pm, forecastProbability: fc };
        } else {
          action = { ...pm, forecastProbability: undefined };
        }
      } else if (pm.forecastProbability != null) {
        // Flag off but the model still emitted a forecast — strip it so the request
        // carries NO forecastProbability field (byte-identical to pre-forecast).
        action = { ...pm, forecastProbability: undefined };
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
    // Early PM skip: the quote's openBlocked preview tells us a pm/open right now
    // would be rejected 422 by the open-time quality gate (distinct from the
    // eligible/blockReasons SHAPE gate the validator checks). Bail here with a clear
    // reason instead of burning the open attempt on a guaranteed 422.
    if (action.type === "pm_open" && quote?.openBlocked === true) {
      const reasons = Array.isArray(quote.openBlockReasons)
        ? (quote.openBlockReasons as unknown[]).map(String)
        : [];
      planned.push({
        action,
        accepted: false,
        code: "pm_open_blocked",
        reason: `open-time quality gate would reject this (422): ${JSON.stringify(reasons)}`,
        quote,
      });
      log(
        `skip pm_open early: openBlocked (${reasons.join(",") || "quality gate"})`,
      );
      continue;
    }
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
    const trace = {
      ...makeTrace(
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
      ),
      ...observationReceipt,
    };
    const r = await executeAction(
      client,
      action,
      observation,
      trace,
      idem,
      provenance,
    );
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
      // Quote-expiry capture: a validated pm_open the SERVER rejected at act time
      // with a 422 mock_entry_blocked — the eligibility/quality/pricing state moved
      // between the quote we validated and the act, so the quote expired. Report it
      // (once-per-cycle; carries the universe breadth in the cohort field).
      if (action.type === "pm_open" && isQuoteExpiredResult(r.status, r.data)) {
        const pm = action;
        await postOpportunity({
          kind: "quote_expired",
          source: pm.source,
          slug: pm.slug,
          outcomeExternalMarketId: pm.outcomeExternalMarketId,
          universeSize: observation.pmMarkets.length,
          forecastProbability: forecastEnabled
            ? sanitizeForecastProbability(pm.forecastProbability)
            : undefined,
          marketProbability: marketPct(
            findPmMarket(observation.pmMarkets, pm)?.probability,
          ),
          reasonCode: blockReasonsOf(r.data),
        });
      }
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
    ...(postedOpportunity ? { opportunity: postedOpportunity } : {}),
    ...observationReceipt,
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
