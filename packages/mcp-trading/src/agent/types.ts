// Core types for the CoinRithm public agent runner.
//
// An "agent" is a single SKILL.md: machine-read frontmatter (the AgentSpec
// types here) plus a plain-language strategy body. The runner reads the spec,
// wakes on cadence, asks a model for proposed actions, validates them against
// these caps, and acts via the CoinRithm paper API. Nothing here touches real
// money.

export const SPEC_VERSION = "coinrithm.agent.v1";

export type Venue = "spot" | "futures" | "pm";
export const VENUES: readonly Venue[] = ["spot", "futures", "pm"];

export type ProviderName = "anthropic" | "openai" | "groq" | "openai-compatible";
export const PROVIDERS: readonly ProviderName[] = [
  "anthropic",
  "openai",
  "groq",
  "openai-compatible",
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

export interface RiskConfig {
  maxLeverage: number;
  perTradeMarginMusd: number;
  maxConcurrentPositions: number;
  requireStopLoss: boolean;
  watchlist: string[];
}

export interface LimitsConfig {
  maxTradesPerDay: number;
  maxWritesPerCycle: number;
  maxDailyLossMusd: number;
  maxOpenMarginMusd: number;
}

export interface AbstentionConfig {
  onStaleData: boolean;
  onWeakSignal: boolean;
  onMissingQuote: boolean;
  onInsufficientBalance: boolean;
  minConfidence: number; // [0..1]; skip an action below this model confidence
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
export const ALLOWED_CAPABILITIES = ["websearch", "indicators"] as const;
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
  freshness?: Freshness;
}

export interface OpenPosition {
  venue: Venue;
  id: number;
  coinId?: string;
  symbol?: string;
  side?: string;
  status?: string;
  marginMusd?: number;
  unrealizedPnlMusd?: number;
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
  status?: string;
}

// A discovered, quote-ready prediction-market candidate the model may pick from
// (PM markets are not coins, so they come from discovery, not the watchlist).
export interface PmMarket {
  source: string;
  slug: string;
  outcomeExternalMarketId: string;
  title?: string;
  freshness?: Freshness;
}

export interface Observation {
  asOf: string; // server time the bundle was built
  scopes: string[];
  cashAvailableMusd: number | null;
  equityMusd: number | null;
  openPositions: OpenPosition[]; // open FUTURES positions
  openOrders: SpotOrder[]; // resting SPOT orders
  pmPositions: PmPosition[]; // open prediction-market positions
  pmMarkets: PmMarket[]; // discovered quote-ready PM candidates (only if pm venue)
  watch: WatchEntry[];
  syncCursor: string | null; // advanced from /trades
  newClosedTrades: Array<Record<string, unknown>>; // fired stops/liqs/settlements
  polledBeforeWrite: boolean; // whether this cycle synced /trades first
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
      source: string;
      slug: string;
      outcomeExternalMarketId: string;
      stakeMusd: number;
      confidence?: number;
      rationaleSummary?: string;
    };

export type ActionVenue = Venue;

export function actionVenue(a: ProposedAction): ActionVenue {
  if (a.type.startsWith("futures")) return "futures";
  if (a.type.startsWith("spot")) return "spot";
  return "pm";
}

export function isWriteAction(a: ProposedAction): boolean {
  // Every proposed action mutates state (set-sltp/cancel included). The model
  // never proposes a read; reads are the runner's job during observe.
  return true;
}

export function isOpenAction(
  a: ProposedAction,
): a is Extract<ProposedAction, { type: "futures_open" | "spot_order" | "pm_open" }> {
  return a.type === "futures_open" || a.type === "spot_order" || a.type === "pm_open";
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
    return typeof action.limitPrice === "number" ? action.limitPrice * action.quantity : undefined;
  }
  if (action.orderType === "stop") {
    return typeof action.stopPrice === "number" ? action.stopPrice * action.quantity : undefined;
  }
  // market: prefer the server's gross notional, else derive from the fill price.
  if (typeof quote?.estimatedCostMusd === "number") return quote.estimatedCostMusd;
  return typeof quote?.executionPrice === "number" ? quote.executionPrice * action.quantity : undefined;
}

export interface Decision {
  decision: "skip" | "act";
  reason?: string; // when skip
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
}

// ───────────────────────── Per-session run state ────────────────────────────

export interface RunState {
  runId: string;
  cyclesRun: number;
  writesToday: number;
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
}

export interface AgentTrace {
  runId?: string;
  decisionId?: string;
  strategyLabel?: string;
  confidence?: number;
  rationaleSummary?: string;
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
  planned: PlannedAction[];
  modelFailed?: boolean;
  disabled?: boolean;
  disabledReason?: string;
  live: boolean;
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
