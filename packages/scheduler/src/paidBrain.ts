// Paid brains (contract v2, 2026-10-07, with the root/Data corrections): pure
// pricing, spec parsing, admission and call classification. No I/O here;
// db.ts holds the ledger transactions and runtime.ts the cycle wiring.
//
// Money is integer micro-USD end to end (1 USD = 1_000_000 micro). A list
// price of P dollars per million tokens is exactly P micro-USD per token, so
// every price is stored as integer micro-USD per THOUSAND tokens (P * 1000).
// A call's provider cost is then sum(tokens * rate) / 1000 with exact integer
// arithmetic, and the margin is applied to that exact sum before the single
// round-up to whole micro-USD:
//   total    = ceil(sum * (100 + marginPct) / 100_000)
//   provider = ceil(sum / 1000), margin = total - provider (for the ledger row)
//
// We never invoice estimates. Only provider-reported usage is priced: input,
// output (thinking is billed as output), cache reads, and cache writes at the
// provider's reported 5m/1h split. A cache write total without the split is
// priced at the 1h rate (the higher one) and noted. There are no fixed
// multipliers: each SKU's cache rates come from Data's price table
// (temp/agentic-baseline-20261007/brain_prices.json, official pages,
// 2026-10-07). The margin is a configurable markup (PAID_BRAIN_MARGIN_PCT,
// default 20); it is not a claim to cover every processor or store fee.

import type { ProviderUsage } from "@coinrithm/mcp-trading/engine";

export const PAID_BRAIN_CATALOGUE_VERSION = "2026-10-07.v2";

export type PaidBrainProvider = "anthropic" | "gemini";

/** One price row, valid from `validFrom` (inclusive, UTC day) to `validTo`
 * (inclusive, UTC day) or open-ended. Rates are integer micro-USD per 1,000
 * tokens; a cache rate the provider does not sell is absent. */
export interface PaidBrainPriceRow {
  version: string;
  validFrom: string;
  validTo: string | null;
  inputK: number;
  outputK: number;
  cacheReadK?: number;
  cacheWrite5mK?: number;
  cacheWrite1hK?: number;
}

export interface PaidBrainModel {
  id: string;
  provider: PaidBrainProvider;
  model: string;
  /** Disabled entries stay listed but can never be admitted. */
  enabled: boolean;
  prices: readonly PaidBrainPriceRow[];
}

export const paidBrainCatalogue: readonly PaidBrainModel[] = [
  {
    id: "claude-sonnet-5-5",
    provider: "anthropic",
    model: "claude-sonnet-5-5",
    enabled: true,
    prices: [
      {
        version: "claude-sonnet-5-5@2026-10-07",
        validFrom: "2026-10-07",
        validTo: null,
        inputK: 2_000, // $2.00 / M
        cacheReadK: 200, // $0.20 / M
        cacheWrite5mK: 2_500, // $2.50 / M
        cacheWrite1hK: 4_000, // $4.00 / M
        outputK: 10_000, // $10.00 / M
      },
    ],
  },
  {
    // Thinking is always on and billed as output.
    id: "claude-opus-5-5",
    provider: "anthropic",
    model: "claude-opus-5-5",
    enabled: true,
    prices: [
      {
        version: "claude-opus-5-5@2026-10-07",
        validFrom: "2026-10-07",
        validTo: null,
        inputK: 4_000, // $4.00 / M
        cacheReadK: 200, // $0.20 / M (0.05x input)
        cacheWrite5mK: 5_000, // $5.00 / M
        cacheWrite1hK: 8_000, // $8.00 / M (2x input)
        outputK: 20_000, // $20.00 / M
      },
    ],
  },
  // Gemini ships DISABLED until a live probe confirms how the OpenAI-
  // compatible endpoint reports thinking and cache tokens. Google publishes no
  // separate cache-write rate here, so a reported write cannot be priced and
  // would fail closed.
  {
    id: "gemini-2.5-flash",
    provider: "gemini",
    model: "gemini-2.5-flash",
    enabled: false,
    prices: [
      {
        version: "gemini-2.5-flash@2026-10-07",
        validFrom: "2026-10-07",
        validTo: null,
        inputK: 300,
        cacheReadK: 30,
        outputK: 2_500,
      },
    ],
  },
  {
    id: "gemini-2.5-flash-lite",
    provider: "gemini",
    model: "gemini-2.5-flash-lite",
    enabled: false,
    prices: [
      {
        version: "gemini-2.5-flash-lite@2026-10-07",
        validFrom: "2026-10-07",
        validTo: null,
        inputK: 100,
        cacheReadK: 10,
        outputK: 400,
      },
    ],
  },
  {
    id: "gemini-3.8-flash",
    provider: "gemini",
    model: "gemini-3.8-flash",
    enabled: false,
    prices: [
      {
        version: "gemini-3.8-flash@2026-10-07",
        validFrom: "2026-10-07",
        validTo: "2026-12-31",
        inputK: 750,
        cacheReadK: 75,
        outputK: 3_750,
      },
      {
        version: "gemini-3.8-flash@2027-01-01",
        validFrom: "2027-01-01",
        validTo: null,
        inputK: 1_500,
        cacheReadK: 150,
        outputK: 7_500,
      },
    ],
  },
];

export function paidBrainModel(modelId: string): PaidBrainModel | undefined {
  return paidBrainCatalogue.find((entry) => entry.id === modelId);
}

const DAY_MS = 86_400_000;

/** The price row valid at `nowMs` (UTC days, both ends inclusive). */
export function priceRowAt(
  entry: PaidBrainModel,
  nowMs: number,
): PaidBrainPriceRow | undefined {
  return entry.prices.find((row) => {
    const from = Date.parse(`${row.validFrom}T00:00:00Z`);
    const to =
      row.validTo === null
        ? Infinity
        : Date.parse(`${row.validTo}T00:00:00Z`) + DAY_MS;
    return nowMs >= from && nowMs < to;
  });
}

// Hard per-call caps (root review of #118: the reserve must be a proven bound,
// enforced BEFORE dispatch, not an estimate).
// - Output: every paid call is sent with max_tokens 4096, thinking included.
// - Input: the paid request is exactly {system, one user message}; no tools,
//   images or cache_control. Its text is capped at PAID_BRAIN_MAX_INPUT_BYTES
//   of UTF-8 and a prompt over the cap is NOT sent (never truncated). A
//   byte-level BPE token covers at least one byte of text, so the text cannot
//   exceed that many tokens; the request framing (role and system markers) is
//   covered by a fixed allowance. The measured agent prompt is ~16-20k tokens
//   (~50-80 KB), well inside the cap.
// - Should provider-reported usage ever still exceed the reserve, the debit is
//   capped at the reserve (never above what the owner's balance and cap
//   admitted) and the call is flagged for root review (finalizePaidCall).
// The paid request carries no cache_control, so the reserve prices the whole
// prompt as uncached input.
export const PAID_BRAIN_MAX_OUTPUT_TOKENS = 4_096;
export const PAID_BRAIN_MAX_INPUT_BYTES = 160_000;
export const PAID_BRAIN_FRAMING_TOKENS = 512;
export const PAID_BRAIN_INPUT_TOKEN_BOUND =
  PAID_BRAIN_MAX_INPUT_BYTES + PAID_BRAIN_FRAMING_TOKENS;

/** UTF-8 bytes of everything a paid call would send as text. Both user
 * presentations are counted (the larger wins), so the check never depends on
 * which one a route picks. */
export function paidInputBytes(input: {
  system: string;
  user: string;
  compactUser?: string;
}): number {
  return (
    Buffer.byteLength(input.system, "utf8") +
    Math.max(
      Buffer.byteLength(input.user, "utf8"),
      Buffer.byteLength(input.compactUser ?? "", "utf8"),
    )
  );
}

export interface PricedCall {
  providerCostMicro: number;
  marginMicro: number;
  totalMicro: number;
  /** Plain-language pricing notes for the ledger row (never content). */
  notes: string[];
}

function tokens(value: number | undefined, label: string): number {
  if (value === undefined) return 0;
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`paid brain ${label} must be a finite non-negative count`);
  }
  return Math.ceil(value);
}

function rate(value: number | undefined, label: string): number {
  if (value === undefined) {
    throw new Error(`price row has no ${label} rate: cannot price this call`);
  }
  return value;
}

/** Price provider-reported usage with a (snapshotted) price row and margin.
 * Throws rather than guess: unknown rates, invalid counts or a non-integer
 * margin never produce a charge. */
export function priceUsage(
  price: PaidBrainPriceRow,
  usage: ProviderUsage,
  marginPct: number,
): PricedCall {
  if (!Number.isSafeInteger(marginPct) || marginPct < 0) {
    throw new Error("paid brain margin must be a whole non-negative percent");
  }
  const notes: string[] = [];
  const input = tokens(usage.promptTokens, "input");
  const output = tokens(usage.completionTokens, "output");
  const cacheRead = tokens(usage.cacheReadTokens, "cache read");
  const write5m = tokens(usage.cacheWrite5mTokens, "5m cache write");
  const write1h = tokens(usage.cacheWrite1hTokens, "1h cache write");
  const writeTotal = tokens(usage.cacheWriteTokens, "cache write");
  // Any write the split does not account for is priced at the 1h rate.
  const unsplitWrite = Math.max(0, writeTotal - write5m - write1h);
  if (unsplitWrite > 0)
    notes.push(
      `cache write split not reported: ${unsplitWrite} priced at the 1h rate`,
    );
  let sum = input * price.inputK + output * price.outputK;
  if (cacheRead > 0) sum += cacheRead * rate(price.cacheReadK, "cache read");
  if (write5m > 0) sum += write5m * rate(price.cacheWrite5mK, "5m cache write");
  if (write1h + unsplitWrite > 0)
    sum +=
      (write1h + unsplitWrite) * rate(price.cacheWrite1hK, "1h cache write");
  if (cacheRead > 0 || writeTotal > 0 || write5m > 0 || write1h > 0)
    notes.push(
      `cache read ${cacheRead}, cache write 5m ${write5m}, 1h ${write1h + unsplitWrite}`,
    );
  if (!Number.isSafeInteger(sum * (100 + marginPct))) {
    throw new Error("paid brain charge is out of the safe integer range");
  }
  const providerCostMicro = Math.ceil(sum / 1000);
  const totalMicro = Math.ceil((sum * (100 + marginPct)) / 100_000);
  return {
    providerCostMicro,
    marginMicro: totalMicro - providerCostMicro,
    totalMicro,
    notes,
  };
}

/** The reservation for one paid call: the proven input bound priced as
 * uncached input plus the 4096-token output cap, at the price row's rates,
 * with margin. */
export function worstCaseCallMicroUsd(
  price: PaidBrainPriceRow,
  marginPct: number,
): number {
  return priceUsage(
    price,
    {
      promptTokens: PAID_BRAIN_INPUT_TOKEN_BOUND,
      completionTokens: PAID_BRAIN_MAX_OUTPUT_TOKENS,
    },
    marginPct,
  ).totalMicro;
}

export type PaidBrainOnExhausted = "free" | "pause";

export interface PaidBrain {
  modelId: string;
  entry: PaidBrainModel;
  monthlyCapUsd: number;
  /** The cap in integer micro-USD. */
  capMicro: number;
  /** The owner's explicit choice; there is no default. */
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
 * be anything. Absent means a free or BYO brain; anything malformed, including
 * a missing onExhausted choice, is INVALID and the caller treats the agent as
 * NOT paid (never runs the platform key). */
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
  const onExhausted = value.onExhausted;
  if (onExhausted !== "free" && onExhausted !== "pause")
    return {
      kind: "invalid",
      reason: "onExhausted must be explicitly free or pause",
    };
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
  | "ok"
  | "metering_uncertain"
  | "balance_short"
  | "cap_reached"
  | "model_disabled"
  | "pricing_invalid"
  | "invalid_position";

/** Default margin on provider cost, percent. */
export const PAID_BRAIN_DEFAULT_MARGIN_PCT = 20;
export const PAID_BRAIN_MAX_MARGIN_PCT = 200;

/**
 * PAID_BRAIN_MARGIN_PCT, parsed EXACTLY as backend-v2's paidBrainMarginPct
 * (root review of #135: one rule in both services). Unset or blank = the
 * default 20; a whole number 0..200 (surrounding spaces allowed) = that
 * number; anything else (fractions, signs, exponents, words, over 200) =
 * null, which disables paid brains rather than charging a guessed margin.
 */
export function parsePaidBrainMarginPct(
  raw: string | undefined,
): number | null {
  if (raw === undefined || raw.trim() === "")
    return PAID_BRAIN_DEFAULT_MARGIN_PCT;
  const s = raw.trim();
  if (!/^\d{1,3}$/.test(s)) return null;
  const n = Number(s);
  return n <= PAID_BRAIN_MAX_MARGIN_PCT ? n : null;
}

/** Admit one paid call only when the owner has no uncertain metering, the
 * balance covers the worst case and the agent's month spend (finalized
 * debits plus open reservations of this UTC month) plus that worst case stays
 * within the cap. Any non-integer input fails closed. */
export function admitPaidCall(args: {
  balanceMicro: number;
  monthSpendMicro: number;
  capMicro: number;
  worstCaseMicro: number;
  uncertain: boolean;
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
  if (args.uncertain) return { admit: false, reason: "metering_uncertain" };
  if (balanceMicro < worstCaseMicro)
    return { admit: false, reason: "balance_short" };
  if (monthSpendMicro + worstCaseMicro > capMicro)
    return { admit: false, reason: "cap_reached" };
  return { admit: true, reason: "ok" };
}

/** 00:00 UTC on the 1st of the month containing `nowMs`, as YYYY-MM-DD: the
 * month a reservation is attributed to, even if it is finalised later. */
export function monthStartUtc(nowMs: number): string {
  const now = new Date(nowMs);
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10);
}

const CYCLE_KEY = /^[A-Za-z0-9-]{1,64}$/;

/** reserve:<agentId>:<cycleKey>; release/debit keys are derived from it. */
export function reserveKeyFor(agentId: number, cycleKey: string): string {
  if (
    !Number.isSafeInteger(agentId) ||
    agentId <= 0 ||
    !CYCLE_KEY.test(cycleKey)
  )
    throw new Error("invalid paid reservation key parts");
  return `reserve:${agentId}:${cycleKey}`;
}
export const releaseKeyFor = (reserveKey: string): string =>
  `release:${reserveKey}`;
export const debitKeyFor = (reserveKey: string): string =>
  `debit:${reserveKey}`;

/** What one provider answer means for metering:
 * - answered: the provider reported usage (an answer, or an incomplete one
 *   it still billed); price exactly that usage.
 * - rejected: a KNOWN non-billable rejection with no usage (the request
 *   was refused before processing: see NONBILLABLE_REJECTION_STATUSES);
 *   release.
 * - uncertain: possibly billed with no usage to price (an answer without
 *   usage, any other HTTP error including 5xx/529 overload, or a transport
 *   failure/timeout). Never priced from an estimate and never auto-refunded
 *   (root 56750).
 * - not_called: no request reached the provider (deferred). */
export type PaidCallResult =
  | { status: "answered"; usage: ProviderUsage }
  | { status: "rejected"; providerStatus: number }
  | { status: "uncertain"; reason: string }
  | { status: "not_called" };

/** Anthropic's documented errors for a request refused before processing
 * (invalid_request, authentication, permission, not_found, request_too_large,
 * rate_limit). Only these release a reservation without usage; a 5xx or an
 * overload (529) may have consumed compute and stays uncertain. */
export const NONBILLABLE_REJECTION_STATUSES: ReadonlySet<number> = new Set([
  400, 401, 403, 404, 413, 429,
]);

export function classifyPaidCall(res: {
  ok: boolean;
  usage?: ProviderUsage;
  status?: number;
  deferred?: boolean;
}): PaidCallResult {
  if (res.usage) return { status: "answered", usage: res.usage };
  if (res.ok) return { status: "uncertain", reason: "answered without usage" };
  if (res.deferred) return { status: "not_called" };
  if (typeof res.status === "number" && Number.isInteger(res.status))
    return NONBILLABLE_REJECTION_STATUSES.has(res.status)
      ? { status: "rejected", providerStatus: res.status }
      : { status: "uncertain", reason: `HTTP ${res.status} without usage` };
  return { status: "uncertain", reason: "no provider response" };
}
