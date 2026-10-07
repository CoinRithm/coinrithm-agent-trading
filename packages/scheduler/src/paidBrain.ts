// Paid brains (contract v1, 2026-10-07): pure pricing, spec parsing and
// admission. No I/O here; runtime.ts reads the ledger (db.ts) and calls these.
//
// Money is integer micro-USD end to end (1 USD = 1_000_000 micro). A catalogue
// price of P dollars per million tokens is exactly P micro-USD per token, so
// prices are stored as integer micro-USD per THOUSAND tokens (P * 1000) and a
// call's cost is ceil((tokensIn * in + tokensOut * out) / 1000): exact integer
// arithmetic, no float anywhere near a balance, and every rounding goes UP so
// the platform never under-recovers a provider bill. The margin is applied on
// top of that rounded provider cost and is itself rounded up.
//
// The backend half (GET /api/agents/paid-brains, the Studio estimates) carries
// the same catalogue; PAID_BRAIN_CATALOGUE_VERSION names the price set so a
// drift between the two is visible in review. Prices: official provider pages,
// verified 2026-10-07 (Data 56677).

export const PAID_BRAIN_CATALOGUE_VERSION = "2026-10-07";

export type PaidBrainProvider = "anthropic" | "gemini";

export interface PaidBrainModel {
  id: string;
  provider: PaidBrainProvider;
  model: string;
  /** Integer micro-USD per 1,000 input tokens (= USD per million * 1000). */
  inMicroPerKTok: number;
  /** Integer micro-USD per 1,000 output tokens. */
  outMicroPerKTok: number;
}

export const paidBrainCatalogue: readonly PaidBrainModel[] = [
  {
    id: "claude-sonnet-5-5",
    provider: "anthropic",
    model: "claude-sonnet-5-5",
    inMicroPerKTok: 2_000, // $2.00 / M
    outMicroPerKTok: 10_000, // $10.00 / M
  },
  {
    // Thinking is billed as output; provider-reported output tokens include it.
    id: "claude-opus-5-5",
    provider: "anthropic",
    model: "claude-opus-5-5",
    inMicroPerKTok: 4_000, // $4.00 / M
    outMicroPerKTok: 20_000, // $20.00 / M
  },
  {
    id: "gemini-2.5-flash",
    provider: "gemini",
    model: "gemini-2.5-flash",
    inMicroPerKTok: 300, // $0.30 / M
    outMicroPerKTok: 2_500, // $2.50 / M
  },
  {
    // Provider price doubles on 1 Jan 2027: bump the catalogue version then.
    id: "gemini-3.8-flash",
    provider: "gemini",
    model: "gemini-3.8-flash",
    inMicroPerKTok: 750, // $0.75 / M
    outMicroPerKTok: 3_750, // $3.75 / M
  },
];

export function paidBrainModel(modelId: string): PaidBrainModel | undefined {
  return paidBrainCatalogue.find((entry) => entry.id === modelId);
}

// Worst case of ONE paid call, used only for admission. The runner asks for at
// most 1024 output tokens (DecideInput.maxTokens default), so 4096 leaves room
// for thinking or a provider that bills reasoning outside max_tokens. Input has
// no hard cap in the engine; the measured agent profile is ~20k tokens per call
// (Data), so 64k is a deliberately generous ceiling. The paid route makes ONE
// call per cycle (no same-model retry, no cross-model fallback), so one call is
// the whole cycle.
export const PAID_BRAIN_WORST_CASE_INPUT_TOKENS = 64_000;
export const PAID_BRAIN_WORST_CASE_OUTPUT_TOKENS = 4_096;

export interface DebitAmount {
  providerCostMicro: number;
  marginMicro: number;
  totalMicro: number;
}

function tokenCount(value: number, label: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`paid brain ${label} must be a finite non-negative number`);
  }
  return Math.ceil(value);
}

/** Integer micro-USD to debit for one call: provider cost rounded up, then the
 * margin (percent of that cost) rounded up on top. Throws on an unknown model
 * or invalid inputs: a debit is never guessed. */
export function debitMicroUsd(args: {
  modelId: string;
  tokensIn: number;
  tokensOut: number;
  marginPct: number;
}): DebitAmount {
  const entry = paidBrainModel(args.modelId);
  if (!entry) throw new Error(`unknown paid brain model ${args.modelId}`);
  if (!Number.isFinite(args.marginPct) || args.marginPct < 0) {
    throw new Error("paid brain margin must be a finite non-negative percent");
  }
  const tokensIn = tokenCount(args.tokensIn, "tokensIn");
  const tokensOut = tokenCount(args.tokensOut, "tokensOut");
  const providerCostMicro = Math.ceil(
    (tokensIn * entry.inMicroPerKTok + tokensOut * entry.outMicroPerKTok) /
      1000,
  );
  const marginMicro = Math.ceil((providerCostMicro * args.marginPct) / 100);
  const totalMicro = providerCostMicro + marginMicro;
  if (!Number.isSafeInteger(totalMicro)) {
    throw new Error("paid brain debit is out of the safe integer range");
  }
  return { providerCostMicro, marginMicro, totalMicro };
}

/** Admission bound: the debit of one call at the worst-case token counts. */
export function worstCaseCallMicroUsd(
  modelId: string,
  maxInputTokens: number,
  maxOutputTokens: number,
  marginPct: number,
): number {
  return debitMicroUsd({
    modelId,
    tokensIn: maxInputTokens,
    tokensOut: maxOutputTokens,
    marginPct,
  }).totalMicro;
}

export type PaidBrainOnExhausted = "free" | "pause";

export interface PaidBrain {
  modelId: string;
  entry: PaidBrainModel;
  monthlyCapUsd: number;
  /** The cap in integer micro-USD. */
  capMicro: number;
  onExhausted: PaidBrainOnExhausted;
  /** The free route to use when exhausted. Only the shared NVIDIA pool is a
   * free brain the scheduler can run without a key of the owner's own. */
  fallback: { provider: "nvidia"; name: string };
}

export type PaidBrainSpecState =
  | { kind: "absent" }
  | { kind: "invalid"; reason: string }
  | { kind: "paid"; brain: PaidBrain };

// A cap above this is a data error, not a budget; it also keeps every
// micro-USD value far inside the safe integer range.
const MAX_MONTHLY_CAP_USD = 1_000_000;
const MAX_MODEL_NAME_LENGTH = 200;

/** Read spec.paidBrain defensively: `spec` is jsonb written by the API and may
 * be anything. Absent means a free or BYO brain; anything malformed is INVALID
 * and the caller treats the agent as NOT paid (never runs the platform key). */
export function paidBrainSpecState(spec: unknown): PaidBrainSpecState {
  if (!spec || typeof spec !== "object" || Array.isArray(spec))
    return { kind: "absent" };
  const raw = (spec as { paidBrain?: unknown }).paidBrain;
  if (raw === undefined || raw === null) return { kind: "absent" };
  if (typeof raw !== "object" || Array.isArray(raw))
    return { kind: "invalid", reason: "paidBrain is not an object" };
  const value = raw as Record<string, unknown>;
  const entry =
    typeof value.modelId === "string"
      ? paidBrainModel(value.modelId)
      : undefined;
  if (!entry) return { kind: "invalid", reason: "unknown modelId" };
  const cap = value.monthlyCapUsd;
  if (
    typeof cap !== "number" ||
    !Number.isFinite(cap) ||
    cap <= 0 ||
    cap > MAX_MONTHLY_CAP_USD
  )
    return { kind: "invalid", reason: "monthlyCapUsd must be a finite > 0" };
  const capMicro = Math.floor(cap * 1_000_000);
  if (capMicro <= 0)
    return { kind: "invalid", reason: "monthlyCapUsd below one micro-USD" };
  const onExhausted =
    value.onExhausted === undefined ? "free" : value.onExhausted;
  if (onExhausted !== "free" && onExhausted !== "pause")
    return { kind: "invalid", reason: "onExhausted must be free or pause" };
  const fallback = value.fallback;
  if (!fallback || typeof fallback !== "object" || Array.isArray(fallback))
    return { kind: "invalid", reason: "fallback is required" };
  const { provider, name } = fallback as { provider?: unknown; name?: unknown };
  if (provider !== "nvidia")
    return { kind: "invalid", reason: "fallback provider must be nvidia" };
  if (
    typeof name !== "string" ||
    !name.trim() ||
    name.length > MAX_MODEL_NAME_LENGTH
  )
    return { kind: "invalid", reason: "fallback name is required" };
  return {
    kind: "paid",
    brain: {
      modelId: entry.id,
      entry,
      monthlyCapUsd: cap,
      capMicro,
      onExhausted,
      fallback: { provider: "nvidia", name: name.trim() },
    },
  };
}

/** The validated paid brain, or null (absent or malformed => NOT paid). */
export function parsePaidBrain(spec: unknown): PaidBrain | null {
  const state = paidBrainSpecState(spec);
  return state.kind === "paid" ? state.brain : null;
}

export type AdmissionReason =
  "ok" | "balance_short" | "cap_reached" | "invalid_position";

/** Admit one paid call only when the balance is ABOVE its worst case and the
 * agent's month spend plus that worst case stays within the cap. Any
 * non-integer input fails closed. */
export function admitPaidCall(args: {
  balanceMicro: number;
  monthSpendMicro: number;
  capMicro: number;
  worstCaseMicro: number;
}): { admit: boolean; reason: AdmissionReason } {
  const { balanceMicro, monthSpendMicro, capMicro, worstCaseMicro } = args;
  if (
    ![balanceMicro, monthSpendMicro, capMicro, worstCaseMicro].every(
      Number.isSafeInteger,
    ) ||
    monthSpendMicro < 0 ||
    capMicro <= 0 ||
    worstCaseMicro <= 0
  ) {
    return { admit: false, reason: "invalid_position" };
  }
  if (balanceMicro <= worstCaseMicro)
    return { admit: false, reason: "balance_short" };
  if (monthSpendMicro + worstCaseMicro > capMicro)
    return { admit: false, reason: "cap_reached" };
  return { admit: true, reason: "ok" };
}

/** 00:00 UTC on the 1st of the month containing `nowMs`. */
export function monthStartUtc(nowMs: number): Date {
  const now = new Date(nowMs);
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/** One debit per cycle: the ledger's unique key makes a retried insert a no-op. */
export function debitIdempotencyKey(cycleId: number): string {
  if (!Number.isSafeInteger(cycleId) || cycleId <= 0) {
    throw new Error("paid brain debit needs a persisted cycle id");
  }
  return `debit:${cycleId}`;
}

/** What the scheduler observed of each call on the paid provider. */
export interface PaidCallObservation {
  ok: boolean;
  usageReported: boolean;
}

export type PaidCycleCharge =
  | { charge: false; reason: string }
  | {
      charge: true;
      tokensIn: number;
      tokensOut: number;
      usageEstimated: boolean;
    };

/** Decide whether a finished cycle is debited, from the engine's CycleResult
 * metering and what the metered provider saw. Debit only a call the provider
 * actually answered (ok): deferred, capacity-only, failed or never-made calls
 * are never charged ("a provider failure skips the cycle as today and is never
 * debited"). Tokens are the runner's: provider-reported usage when present,
 * otherwise its conservative chars/4 estimate, flagged as estimated. */
export function paidCycleCharge(args: {
  brain: PaidBrain;
  llmCallMade?: boolean;
  effectiveProvider?: string;
  effectiveModel?: string;
  tokensIn?: number;
  tokensOut?: number;
  calls: readonly PaidCallObservation[];
}): PaidCycleCharge {
  if (args.llmCallMade !== true)
    return { charge: false, reason: "no provider call" };
  const answered = args.calls.find((call) => call.ok);
  if (!answered) return { charge: false, reason: "provider call failed" };
  if (
    (args.effectiveProvider !== undefined &&
      args.effectiveProvider !== args.brain.entry.provider) ||
    (args.effectiveModel !== undefined &&
      args.effectiveModel !== args.brain.entry.model)
  ) {
    return { charge: false, reason: "served by a different route" };
  }
  const valid = (value: number | undefined): value is number =>
    typeof value === "number" && Number.isFinite(value) && value >= 0;
  if (!valid(args.tokensIn) || !valid(args.tokensOut))
    return { charge: false, reason: "invalid token counts" };
  return {
    charge: true,
    tokensIn: Math.ceil(args.tokensIn),
    tokensOut: Math.ceil(args.tokensOut),
    usageEstimated: !answered.usageReported,
  };
}
