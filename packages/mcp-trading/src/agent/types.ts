// Core types for the CoinRithm public agent runner.
//
// An "agent" is a single SKILL.md: machine-read frontmatter (the AgentSpec
// types here) plus a plain-language strategy body. The runner reads the spec,
// wakes on cadence, asks a model for proposed actions, validates them against
// these caps, and acts via the CoinRithm paper API. Nothing here touches real
// money.

import { IndicatorSet } from "./indicators.js";

export const SPEC_VERSION = "coinrithm.agent.v1";

export type Venue = "spot" | "futures" | "pm";
export const VENUES: readonly Venue[] = ["spot", "futures", "pm"];

// The runner's live action vocabulary — the capability set the drift guard
// checks authored prose against. MUST mirror the ProposedAction union below and
// the zod schema in decision.ts. A test ("ACTION_TYPES stays in lockstep with
// the decision schema", capabilityGuard.test.ts) derives the literal set from
// decision.ts's actionSchema and asserts equality, so the two cannot drift.
export const ACTION_TYPES = [
  "futures_open",
  "futures_close",
  "futures_set_sltp",
  "spot_order",
  "spot_cancel",
  "pm_open",
] as const;
export type ActionType = (typeof ACTION_TYPES)[number];

export type ProviderName =
  | "anthropic"
  | "openai"
  | "groq"
  | "nvidia"
  | "gemini"
  | "openai-compatible"
  // A NON-LLM, deterministic decision path used by the mechanical BENCHMARK
  // baseline agents (market-implied / base-rate / random). No model is called;
  // the runner computes the decision from the observation via a strategy key
  // carried in model.name. Zero inference cost, fully reproducible. See
  // mechanical.ts. selectProvider returns a stub that never issues a network
  // call, and runCycle short-circuits before the provider is ever asked.
  | "mechanical";
export const PROVIDERS: readonly ProviderName[] = [
  "anthropic",
  "openai",
  "groq",
  "nvidia",
  "gemini",
  "openai-compatible",
  "mechanical",
];

// ───────────────────────── Skill frontmatter (the spec) ─────────────────────

export interface ModelConfig {
  provider: ProviderName;
  name: string;
  // Optional base-URL override for OpenAI-compatible gateways.
  baseUrl?: string;
}

export interface TriggerConfig {
  cadence: string; // "15m" | "1h" | "4h" ... parsed via parseCadenceMs
  timezone?: string;
}

// Slice-2 preflight-gate policy: when does a cycle SPEND an LLM call? The gate
// reads this (DEFAULT_TRIGGER_POLICY applied when the OKF omits it). This is OKF
// INTENT — the platform deployment overlay may tighten it server-side later, and
// the gate never lets it widen a hard cap (caps live in the runner).
export interface TriggerPolicy {
  mode: "event_driven" | "always"; // 'always' = call every cycle (legacy behaviour)
  skipLlmWhenNoTrigger: boolean; // no trigger -> cheap heartbeat, no LLM call
  alwaysManageOpenPositions: boolean; // an open position always fires the gate
  maxLlmCallsPerHour: number; // 0 = unlimited (entry triggers only; positions exempt)
  debounceMinutes: number; // 0 = off; suppress an identical entry-trigger set
  // On a quiet PRICE tape (no price setup, no open position) the gate would skip
  // forever — but PM markets carry tradeable edge regardless of crypto price. So
  // wake the agent periodically to evaluate PM, at most once per this many minutes.
  // 0 = off.
  pmEvalCooldownMinutes: number;
}
export const DEFAULT_TRIGGER_POLICY: TriggerPolicy = {
  mode: "event_driven",
  skipLlmWhenNoTrigger: true,
  alwaysManageOpenPositions: true,
  maxLlmCallsPerHour: 0,
  debounceMinutes: 0,
  pmEvalCooldownMinutes: 10,
};

export interface RiskConfig {
  maxLeverage: number;
  perTradeMarginMusd: number;
  maxConcurrentPositions: number;
  requireStopLoss: boolean;
  // Allow-list of tradable symbols (uppercase). The runtime gate is
  // WATCH-membership: the validator accepts a symbol that is in this list OR
  // was promoted into observation.watch by the `universe_scan` capability this
  // cycle (marked `discovered: true`) — blocklist wins over both. Without
  // universe_scan this list IS the whole tradable set. PM markets come from
  // discovery, so they are not gated by this.
  watchlist: string[];
  // Optional deny-list (uppercase): an open on a symbol here is rejected even if
  // it is also on the watchlist (deny wins). Empty/omitted = nothing blocked.
  blocklist?: string[];
  // Optional HARD side restriction (2026-08-24). Born from a live incident: a
  // short-only fade strategy expressed ONLY in prose opened two momentum LONGS
  // when the decide prompt's flagged-setups pressure ("act on the strongest
  // one") outweighed the prose. A strategy's direction is a cap, not a
  // suggestion — the validator rejects a violating open before any API write:
  //   short_only  -> futures_open must be side "short"; spot buys are long
  //                  exposure and are rejected too (spot sells still allowed —
  //                  reducing a holding is not a directional bet)
  //   long_only   -> futures_open must be side "long"
  // Omitted = both directions allowed (every agent before this field existed).
  direction?: "long_only" | "short_only";
}

export interface LimitsConfig {
  maxTradesPerDay: number;
  maxWritesPerCycle: number;
  maxDailyLossMusd: number;
  maxOpenMarginMusd: number;
}

export interface AbstentionConfig {
  // RESERVED (2026-08-19 honesty pass): the four booleans parse, validate,
  // and default to true, but NO code path currently branches on them — the
  // behaviors they describe are unconditionally enforced elsewhere (stale
  // quotes are rejected at quote-gating, missing quotes block opens,
  // insufficient balance rejects at the server). Setting any of them false
  // changes NOTHING today. Do not wire them without an owner decision:
  // making onStaleData:false actually trade on stale data is a risk-behavior
  // change, not a bug fix.
  onStaleData: boolean;
  onWeakSignal: boolean;
  onMissingQuote: boolean;
  onInsufficientBalance: boolean;
  minConfidence: number; // [0..1]; skip an action below this model confidence — ENFORCED
}

export interface SyncConfig {
  requirePollBeforeWrite: boolean;
}

export interface KillSwitchConfig {
  maxDrawdownMusd: number; // 0 = disabled
  maxConsecutiveRejects: number; // 0 = disabled
  maxConsecutiveModelFailures: number; // 0 = disabled
  onRateLimitPressure: boolean;
}

// What the agent declares it is optimizing for — so two similar-looking agents
// are distinguishable and the scorecard/Arena can read intent.
export const OBJECTIVE_PRIMARIES = [
  "realized_pnl",
  "risk_adjusted",
  "drawdown_control",
  "calibration",
] as const;
export type ObjectivePrimary = (typeof OBJECTIVE_PRIMARIES)[number];

export interface ObjectiveConfig {
  primary: ObjectivePrimary;
  secondary: string[];
  horizon?: string; // e.g. "7d"
}

// Opt-in capabilities beyond CoinRithm market reads + paper execution.
// RESERVED in v1: declared + validated here, wired into the runner in a later
// slice. `websearch` = external lookups (an injection surface + a cost — it can
// inform reasoning but NEVER widen a cap, since caps live in the runner);
// `indicators` = runner-computed RSI/MACD/etc. fed into the observation.
// `universe_scan` (2026-08-18, direct user request): each cycle the runner
// pulls the top 24h movers across CoinRithm's tracked coin universe, resolves
// the top few into FULL watch entries (price, sentiment, indicators when that
// capability is also on) and appends them to the observation marked
// `discovered: true`. Downstream is unchanged by design: a discovered entry
// passes through the exact same risk gates as a watchlist symbol (blocklist
// still wins, caps/SL rules unchanged) — the capability widens the CANDIDATE
// SET for one cycle, never any cap. Off by default; without it the universe
// is invisible and only manual watchlist pairs are analyzed.
export const ALLOWED_CAPABILITIES = [
  "websearch",
  "indicators",
  "news",
  "universe_scan",
] as const;
export type Capability = (typeof ALLOWED_CAPABILITIES)[number];

export interface AgentSpec {
  name: string;
  description: string;
  spec: string; // expected SPEC_VERSION
  trigger: TriggerConfig;
  model?: ModelConfig; // omitted => hosted free-tier default (invalid for self-host)
  venues: Venue[];
  risk: RiskConfig;
  limits: LimitsConfig;
  abstention: AbstentionConfig;
  sync: SyncConfig;
  killSwitch: KillSwitchConfig;
  objective?: ObjectiveConfig;
  capabilities: Capability[];
  // Slice-2 gate policy (OKF intent). Omitted => DEFAULT_TRIGGER_POLICY.
  triggerPolicy?: TriggerPolicy;
}

export interface ParsedSkill {
  spec: AgentSpec; // coerced + defaulted (run through validateSkill before use)
  body: string; // the markdown strategy body
  raw: Record<string, unknown>; // raw frontmatter for presence/secret checks
}

// ───────────────────────── Validation result (fail-closed) ──────────────────

export interface ValidationResult {
  valid: boolean;
  code?: string;
  reason?: string;
}

export const ok = (): ValidationResult => ({ valid: true });
export const fail = (code: string, reason: string): ValidationResult => ({
  valid: false,
  code,
  reason,
});

// ───────────────────────── Observation bundle ───────────────────────────────

export interface Freshness {
  status: string; // "fresh" | "stale" | "never_ingested" | ...
  ageSeconds?: number;
}

export interface WatchEntry {
  symbol: string;
  coinId: string | null; // resolved UCID; null if unresolvable
  name?: string;
  priceUsd?: number;
  change1h?: number;
  change24h?: number;
  change7d?: number;
  // Community sentiment for this coin (% bullish votes) — already fetched in the
  // /market context but previously stripped. A light regime read the model can lean
  // on (crowd lopsidedly bullish into a downtrend = a contrarian's tell).
  sentimentBullishPct?: number;
  freshness?: Freshness;
  // Compact technical-indicator bundle (RSI/EMA/ATR/Bollinger/breakout) computed
  // from candles when the agent declares the `indicators` capability. Omitted
  // otherwise or when the candle fetch fails/is too sparse.
  indicators?: IndicatorSet;
  // true = this entry came from the `universe_scan` capability's top-movers
  // sweep, not the spec watchlist. Valid for THIS cycle only; the prompt labels
  // it so the model knows it is a discovered candidate, not a standing holding.
  discovered?: boolean;
}

export interface OpenPosition {
  venue: Venue;
  id: number;
  coinId?: string;
  symbol?: string;
  side?: string;
  status?: string;
  leverage?: number;
  marginMusd?: number;
  unrealizedPnlMusd?: number;
  // Per-position prices the backend already returns on /positions/futures.
  // Surfaced so the model can orient triggers (take-profit vs markPrice,
  // stop-loss vs liquidationPrice) and tell a winner from a loser, instead of
  // proposing blind triggers the server rejects.
  entryPrice?: number;
  markPrice?: number;
  liquidationPrice?: number;
  stopLossPrice?: number;
  takeProfitPrice?: number;
}

export interface SpotOrder {
  id: number;
  coinId?: string;
  symbol?: string;
  side?: string; // buy | sell
  orderType?: string;
  quantity?: number;
  status?: string;
}

export interface PmPosition {
  id: number;
  source?: string;
  slug?: string;
  outcomeExternalMarketId?: string;
  stakeMusd?: number;
  unrealizedPnlMusd?: number;
  status?: string;
}

// A recently-RESOLVED prediction-market position (the settlement-feedback loop):
// one of the agent's OWN bets that reached a terminal status (win/loss/void) since
// the last cycle, with its realized pnl. Reflective context for the observe phase
// — the agent reflects on what its predictions actually resolved to and adapts. It
// is NOT a new action; the runner never bets off it. Sourced from
// /positions/pm's additive `recentlyResolved` array (delivered ~once per
// resolution; dedupe is the consumer's job, but a short capped window is fine to
// re-show). Paper-only, like everything else here.
export interface PmResolution {
  id: number;
  eventTitle?: string;
  slug?: string;
  side?: string; // yes | no
  status?: string; // settled_win | settled_loss | void_refunded
  pnlMusd?: number;
  stakeMusd?: number;
}

// A discovered, quote-ready prediction-market candidate the model may pick from
// (PM markets are not coins, so they come from discovery, not the watchlist).
export interface PmMarket {
  // Short, stable per-cycle handle (pm1, pm2, …) the model copies instead of the
  // long outcomeExternalMarketId. Small free models (Llama 3.1 8B) reliably copy a
  // 3-char ref but mis-copy a 40-char hex/uuid id → pm_market_not_discovered. The
  // runner resolves the ref back to {source,slug,outcomeExternalMarketId} pre-validation.
  ref?: string;
  source: string;
  slug: string;
  outcomeExternalMarketId: string;
  // The outcome's label + the market's CURRENT probability (0..1). Without these
  // the model sees a market exists but not its odds, so it can never decide the
  // market is mispriced — the reason agents never bet PM. The edge = |model − market|.
  outcomeName?: string;
  probability?: number;
  title?: string;
  freshness?: Freshness;
  // Event-level 24h notional volume (USD) from the discover payload's
  // `volume24h` (COALESCE'd to 0 by the backend, so present on every event;
  // probe-confirmed 2026-07-10 against the discover controller). Shared by all
  // outcomes of an event. Used by the mechanical BENCHMARK agents' deterministic
  // "highest-volume eligible not-already-held" pick rule; LLM agents ignore it.
  // Optional so an older backend that omits it degrades to discovery order.
  volumeUsd?: number;
}

// A deterministic "this cycle has tradeable structure" flag, computed from the
// watch indicators BEFORE the model runs. content-engine's lesson (and the
// preflight-gate design): don't ask a cautious free-tier brain "is something
// happening?" — DETECT it deterministically and hand it over, so the model acts on
// real structure instead of defaulting to "no clear setup". The `bias` is the
// trend-following read; a contrarian/mean-reversion agent fades it using the same
// facts in `note`.
export interface SetupSignal {
  symbol: string;
  kind: "breakout" | "breakdown" | "uptrend" | "downtrend" | "stretched";
  bias: "long" | "short" | "fade-long" | "fade-short";
  strength: number; // 0..1 rough conviction the structure is real
  note: string; // compact factual one-liner the model reads
  // If you ALREADY hold a position on this symbol, its side — so the model MANAGES
  // it (trail / add-only-if-room / cut) instead of re-proposing an open that just
  // hits the margin cap and wastes the cycle (DUPLICATE_INTENT_SUPPRESS).
  held?: "long" | "short";
}

// A compact, enrichment-gated news item fed into the decide context (only with
// the `news` capability). Importance 0..10 (>=8 = market-moving); the market
// catalyst layer the price chart can't show.
export interface NewsItem {
  title: string;
  source?: string;
  sentiment?: string; // bullish | bearish | neutral
  importance?: number; // 0..10
  ageHours?: number;
  coins?: string[]; // related coin slugs
}

export interface Observation {
  asOf: string; // server time the bundle was built
  scopes: string[];
  cashAvailableMusd: number | null;
  equityMusd: number | null;
  openPositions: OpenPosition[]; // open FUTURES positions
  openOrders: SpotOrder[]; // resting SPOT orders
  pmPositions: PmPosition[]; // open prediction-market positions
  pmResolutions: PmResolution[]; // recently-settled PM bets (settlement-feedback loop; reflective context, not an action)
  pmMarkets: PmMarket[]; // discovered quote-ready PM candidates (only if pm venue)
  watch: WatchEntry[];
  setups: SetupSignal[]; // deterministic per-cycle structure flags (see SetupSignal)
  // Market-wide mood (the Fear & Greed index) — a one-line regime read fetched once
  // from the /market context. Risk-on/off colour for every decision this cycle.
  marketMood?: { fearGreed: number; label: string };
  syncCursor: string | null; // advanced from /trades
  newClosedTrades: Array<Record<string, unknown>>; // fired stops/liqs/settlements
  polledBeforeWrite: boolean; // whether this cycle synced /trades first
  news?: NewsItem[]; // recent high-importance watchlist news (only with `news` capability)
  // Universe context beyond the resolved candidates (only with `universe_scan`):
  // the remaining top movers as symbol + 24h change, so the model sees breadth
  // without the runner paying a resolve/market call per row.
  universeMovers?: Array<{
    symbol: string;
    name?: string;
    change24hPct?: number;
    priceUsd?: number;
  }>;
}

// ───────────────────────── Model decision + actions ─────────────────────────

export type ProposedAction =
  | {
      type: "futures_open";
      symbol: string;
      side: "long" | "short";
      leverage: number;
      marginMusd: number;
      stopLossPrice?: number | null;
      takeProfitPrice?: number | null;
      confidence?: number;
      rationaleSummary?: string;
    }
  | {
      type: "futures_close";
      positionId: number;
      fraction?: number;
      confidence?: number;
      rationaleSummary?: string;
    }
  | {
      type: "futures_set_sltp";
      positionId: number;
      stopLossPrice?: number | null;
      takeProfitPrice?: number | null;
    }
  | {
      type: "spot_order";
      symbol: string;
      side: "buy" | "sell";
      orderType: "market" | "limit" | "stop";
      quantity: number;
      limitPrice?: number;
      stopPrice?: number;
      confidence?: number;
      rationaleSummary?: string;
    }
  | { type: "spot_cancel"; orderId: number }
  | {
      type: "pm_open";
      // The model may identify the market by a short ref (pm1…pmN, preferred) OR
      // the full id triple. The runner's resolvePmRef() fills in the triple from
      // the ref before validation, so source/slug/outcomeExternalMarketId are
      // present by the time the validator / act phase read them.
      ref?: string;
      source: string;
      slug: string;
      outcomeExternalMarketId: string;
      stakeMusd: number;
      confidence?: number;
      rationaleSummary?: string;
      // The agent's OWN probability (1..99) that the backed side wins, formed from
      // the question/resolution criteria/deadline — NOT the market price. Recorded
      // separately from the entry price for the agent's public calibration record.
      // The runner clamps it to [1,99] and OMITS it when absent/unparseable (a bad
      // forecast never blocks the trade); it is NEVER defaulted to the market price.
      forecastProbability?: number;
    };

export type ActionVenue = Venue;

export function actionVenue(a: ProposedAction): ActionVenue {
  if (a.type.startsWith("futures")) return "futures";
  if (a.type.startsWith("spot")) return "spot";
  return "pm";
}

export function isWriteAction(_a: ProposedAction): boolean {
  // Every proposed action mutates state (set-sltp/cancel included). The model
  // never proposes a read; reads are the runner's job during observe.
  return true;
}

export function isOpenAction(
  a: ProposedAction,
): a is Extract<
  ProposedAction,
  { type: "futures_open" | "spot_order" | "pm_open" }
> {
  return (
    a.type === "futures_open" || a.type === "spot_order" || a.type === "pm_open"
  );
}

// Gross mUSD a spot BUY consumes. The validator (per-trade cap + balance gate)
// and the runner (running-cash decrement) BOTH size with this one function so
// they can never diverge. Sizing: limit -> limitPrice*qty, stop -> stopPrice*qty,
// market -> the server-computed `estimatedCostMusd` (preferred) or
// executionPrice*qty. Returns undefined when no price is available (e.g. an
// unpriced market quote) so callers FAIL CLOSED instead of treating it as $0.
export function spotBuyCost(
  action: Extract<ProposedAction, { type: "spot_order" }>,
  quote?: QuoteEvidence,
): number | undefined {
  if (action.orderType === "limit") {
    return typeof action.limitPrice === "number"
      ? action.limitPrice * action.quantity
      : undefined;
  }
  if (action.orderType === "stop") {
    return typeof action.stopPrice === "number"
      ? action.stopPrice * action.quantity
      : undefined;
  }
  // market: prefer the server's gross notional, else derive from the fill price.
  if (typeof quote?.estimatedCostMusd === "number")
    return quote.estimatedCostMusd;
  return typeof quote?.executionPrice === "number"
    ? quote.executionPrice * action.quantity
    : undefined;
}

export interface Decision {
  decision: "skip" | "act";
  reason?: string; // when skip — short label
  // The model's own 1-2 sentence analysis of THIS cycle ("show your work").
  // Optional + capped; surfaced in the Arena terminal so users can watch the
  // agent reason, debug it, and share it. Previously impossible: the decision
  // schema was .strict() and the prompt only ever asked for a short reason.
  rationale?: string;
  confidence?: number;
  actions: ProposedAction[]; // empty when skip
}

// Read-only quote the runner fetches for an open BEFORE validating/executing.
// Field-name note (verified against the live backend): the FUTURES quote returns
// `entryPrice`/`liquidationPrice`, but the SPOT quote returns `executionPrice`
// (live fill price) + `estimatedCostMusd` (gross notional = price * qty) and
// NEVER an `entryPrice`. Both are carried so each venue reads its own field.
export interface QuoteEvidence {
  eligible: boolean;
  blockReasons?: unknown;
  entryPrice?: number; // futures fill price
  liquidationPrice?: number; // futures
  executionPrice?: number; // spot fill price
  estimatedCostMusd?: number; // spot gross notional (server-computed)
  freshness?: Freshness;
  // PM open-time quality-gate PREVIEW (distinct from eligible/blockReasons, which
  // describe the mock-entry SHAPE gate). openBlocked=true means a pm/open right now
  // would be rejected 422 by the quality gate (quality state missing/stale, or
  // decisionEligible=false). The runner uses it to SKIP a blocked PM candidate
  // early instead of burning the open attempt on a guaranteed 422.
  openBlocked?: boolean;
  openBlockReasons?: unknown;
}

// ───────────────────────── Per-session run state ────────────────────────────

export interface RunState {
  runId: string;
  cyclesRun: number;
  // Legacy total of every successful write. Kept for durable run telemetry;
  // entry limits use riskIncreasesToday so closes/protection never consume or
  // get blocked by the daily entry budget.
  writesToday: number;
  riskIncreasesToday: number;
  realizedPnlMusd: number; // session realized (for drawdown)
  peakRealizedMusd: number;
  consecutiveRejectCycles: number;
  consecutiveModelFailures: number;
  rateLimitHits: number;
  disabled: boolean;
  disabledReason?: string;
  dayKey: string;
  cursor: string | null; // /trades updatedSince cursor (the `asOf` to send next)
  seen: string[]; // dedupe key "venue:id" for closed trades already processed
  realizedPnlTodayMusd: number; // today's realized PnL (reset by rollDay) — daily-loss cap
  consecutiveExecFailures: number; // validated-but-failed live writes in a row
  intentSeq: Record<string, number>; // per-intent counter -> stable idempotency keys
  // Slice-2 gate state (optional; absent on older persisted state). Epoch-ms of
  // recent LLM calls (for maxLlmCallsPerHour), the last call time + its trigger
  // fingerprint (for debounce).
  llmCallTimestamps?: number[];
  lastLlmCallAt?: number;
  lastTriggerFingerprint?: string;
  // Permanent-failure classification (2026-08-19, optional — absent on older
  // persisted state). Deterministic upstream failures (a decommissioned model
  // returning 404 forever; a revoked CoinRithm key answering 401 forever) must
  // disable QUICKLY with a reason the scheduler's self-heal treats as
  // non-recoverable — the old path burned ~1,500 cycles/day reviving agents
  // into the same guaranteed failure.
  consecutivePermanentModelErrors?: number;
  consecutiveAuthFailures?: number;
  // Slice-3 memory: a compact rolling journal of the agent's recent MOVES (its own
  // trades + the thesis behind them, newest last). Injected back into the prompt so
  // the agent has continuity — it manages a position remembering WHY it opened it,
  // and doesn't re-open an idea it just acted on. Rides in the persisted state JSON
  // (no DB change). Capped so it can't grow the prompt.
  journal?: Array<{ at: string; did: string }>;
}

export interface AgentTrace {
  runId?: string;
  decisionId?: string;
  strategyLabel?: string;
  confidence?: number;
  rationaleSummary?: string;
  observationHash?: string;
  indicatorVersion?: string;
}

export interface ApiResult {
  ok: boolean;
  status: number;
  data: unknown;
  retryAfterSeconds?: number;
  rateLimitRemaining?: number;
  ledgerEventId?: string | null;
}

// One proposed action after the runner has fetched its quote evidence and
// decided whether the caps permit it.
export interface PlannedAction {
  action: ProposedAction;
  accepted: boolean;
  code?: string; // rejection code when accepted=false
  reason?: string;
  quote?: QuoteEvidence;
  executed?: boolean;
  result?: unknown;
}

export interface CycleResult {
  decision: "skip" | "act";
  skipReason?: string;
  // Reasoning surfaced to the Arena terminal (keystone transparency). rationale
  // = the model's PARSED, sanitized short analysis this cycle; confidence =
  // decision-level 0..1. rawModelOutput is DEPRECATED and always left undefined:
  // the full raw model text is NEVER persisted (no-CoT privacy policy — matches
  // the frontend promise + CLAUDE.md data-retention). Kept only for type stability.
  rationale?: string;
  confidence?: number;
  rawModelOutput?: string;
  planned: PlannedAction[];
  modelFailed?: boolean;
  disabled?: boolean;
  disabledReason?: string;
  /** Reliability slice 1 (2026-08-26): a PERMANENT provider/model failure
   * (404/410/decommission class) no longer disables the agent. The runner
   * reports the hold; the scheduler aggregates holds into a fleet-wide
   * provider circuit (skip-claiming + backoff probes). User pauses, revoked
   * credentials, drawdown and safety stops keep using `disabled`. */
  providerHold?: { provider: string; model: string; error: string };
  live: boolean;
  // Privacy-safe decision-input receipt. The digest binds the exact structured
  // Observation; the version identifies the deterministic indicator algorithm.
  observationHash?: string;
  indicatorVersion?: string;
  // ── Metering (slice 2): per-cycle usage accounting — the data the future credit
  // system + tier pricing read. Recorded for EVERY cycle (incl. gated heartbeats).
  triggerCodes?: string[]; // which gate triggers fired this cycle
  llmCallMade?: boolean; // false on a gated no-trigger heartbeat
  tokensIn?: number; // prompt tokens (provider-reported)
  tokensOut?: number; // completion tokens
  estimatedCostUsd?: number; // notional cost from a per-provider rate (0 for free tiers)
  // Hosted router truth. Configured model remains immutable on the agent; these
  // fields say what actually served this cycle and why. Attempts are bounded to
  // two and sanitized before persistence (no prompt/output/key material).
  effectiveProvider?: string;
  effectiveModel?: string;
  routeReason?: string;
  routeAttempts?: Array<{
    provider: string;
    model: string;
    outcome: "success" | "failed" | "deferred";
    failureClass?: "capacity" | "permanent" | "transient" | "malformed";
    status?: number;
    retryAfterMs?: number;
    latencyMs: number;
    error?: string;
  }>;
  decisionType?: "act" | "skip" | "gate_skip" | "model_error";
  writeAttempted?: number; // actions the model proposed
  writeAccepted?: number; // actions that passed validation (+ executed when live)
  // The NON-opened opportunity this cycle reported to the backend (kills evaluation
  // selection bias): abstained (model skipped while PM markets were listed),
  // forecast_only (it forecast but did not trade), or quote_expired (a validated
  // pm_open the server rejected at act time). At most ONE per cycle (the cohort/
  // universe field carries the breadth). Present only when an opportunity was
  // POSTED (live + capture flag on); undefined otherwise.
  opportunity?: PostedOpportunity;
}

// The compact record of a reported opportunity, surfaced on CycleResult for
// observability + tests. Mirrors the POST /api/agent/pm/opportunity body.
export interface PostedOpportunity {
  kind: "abstained" | "forecast_only" | "quote_expired";
  source?: string;
  slug?: string;
  outcomeExternalMarketId?: string;
  universeSize?: number;
  forecastProbability?: number;
  marketProbability?: number;
  reasonCode?: string;
}

// ───────────────────────── Resolver (folder-as-architecture) ────────────────

// One structural problem found while compiling an agent folder. The resolver is
// fail-closed: ANY issue aborts before the spec is built or run.
export interface ResolveIssue {
  code: string;
  message: string;
  path?: string; // the offending file / $ref, relative + posix
}

export interface Provenance {
  // Which source file each top-level config block came from (posix paths).
  sources: Record<string, string>;
  // Every source file consulted, in the order it was read.
  mergeOrder: string[];
  // Active skill names in prompt order (later = layered later, NOT more power).
  includeOrder: string[];
}

// The output of compiling an agent (single file OR decomposed folder) — the
// deterministic input to buildSpec(). The machine-read config and the prose the
// LLM reads are kept strictly separate (the spine).
export interface ResolvedAgent {
  inputPath: string;
  isDirectory: boolean;
  rawFrontmatter: Record<string, unknown>; // merged config, pre-defaults
  mergedProse: string; // what the LLM reads (already secret-scanned)
  proseParts: Array<{ source: string; text: string }>;
  provenance: Provenance;
  contentHashes: Record<string, string>; // posix path -> sha256
}
