// Parse the model's single text response into a strict, structured Decision.
// Accepts futures + spot + prediction-market actions. Anything else — invalid
// JSON, an unknown action type, a free-form endpoint/tool name, extra unknown
// fields, or a missing required field — fails closed (the runner skips).

import { z } from "zod";
import { Decision, ProposedAction } from "./types.js";
import { coerceThesis } from "./thesis.js";

// Small models (especially Llama 3.1 8B) frequently emit numbers as JSON strings
// ("12345", "0.8", "62000"). Coerce a *clean* numeric string to a number before
// validating; leave anything else untouched so genuine garbage ("abc", "pos#5")
// still fails closed. This is why actions were being rejected with
// "actions.0.positionId: Expected number, received string".
const num = (inner: z.ZodTypeAny) =>
  z.preprocess(
    (v) =>
      typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))
        ? Number(v)
        : v,
    inner,
  );

// Optional 0..1 confidence, tolerant of stringified/null input.
const confidence = num(z.number().min(0).max(1))
  .nullable()
  .optional()
  .transform((v) => v ?? undefined);

// The model's OWN 0-100 forecast for the backed PM side (its independent
// probability the side wins, decided from the question — NOT the market price).
// Deliberately TOLERANT: a missing / null / non-numeric value becomes undefined
// (the runner then omits the field) rather than failing the whole action. A bad
// forecast must NEVER block an otherwise-valid trade. Out-of-range values are NOT
// rejected here — the runner clamps them to the backend's [1,99] rail. Kept as a
// permissive `any→number|undefined` so it can never throw inside the strict
// discriminated union.
const forecastProbability = z
  .any()
  .transform((v) => {
    const n =
      typeof v === "string" && v.trim() !== "" ? Number(v) : (v as unknown);
    return typeof n === "number" && Number.isFinite(n) ? n : undefined;
  })
  .optional();

// The thesis an OPEN is made on (slice 2, 2026-09-02): {summary, invalidation}.
// TOLERANT like forecastProbability: a missing / malformed thesis becomes
// undefined and never fails an otherwise-valid open. The prompt requires it and
// the structured-output schema below lists it as required; the runner binds it
// to the position the server returns and evaluates it every cycle.
const thesis = z
  .any()
  .transform((v) => coerceThesis(v))
  .optional();

const futuresOpen = z
  .object({
    type: z.literal("futures_open"),
    symbol: z.string().min(1),
    side: z.enum(["long", "short"]),
    leverage: num(z.number().positive()),
    marginMusd: num(z.number().positive()),
    stopLossPrice: num(z.number()).nullable().optional(),
    takeProfitPrice: num(z.number()).nullable().optional(),
    confidence,
    rationaleSummary: z.string().optional(),
    thesis,
  })
  .strict();

const futuresClose = z
  .object({
    type: z.literal("futures_close"),
    positionId: num(z.number()),
    fraction: num(z.number().positive().max(1)).optional(),
    confidence,
    rationaleSummary: z.string().optional(),
    // Accepted-and-unused: models copy the open-side `thesis` onto every
    // action exactly as they copied `confidence` (the .strict() fail-closed
    // lesson of 2026-08-19). The structured-output schema never asks for it
    // here; a BYO model that echoes it must not zero the whole cycle.
    thesis,
  })
  .strict();

const futuresSetSltp = z
  .object({
    type: z.literal("futures_set_sltp"),
    positionId: num(z.number()),
    stopLossPrice: num(z.number()).nullable().optional(),
    takeProfitPrice: num(z.number()).nullable().optional(),
    // Accepted-and-unused: the output contract asks for per-action confidence,
    // so models copy it onto EVERY action. The two schemas that lacked it were
    // fail-closing whole decisions under .strict() (~180-200 discarded
    // fleet-wide per day, live-measured 2026-08-19). Same tolerance the four
    // trade actions already have.
    confidence,
    rationaleSummary: z.string().optional(),
    thesis, // accepted-and-unused, see futures_close
  })
  .strict();

const spotOrder = z
  .object({
    type: z.literal("spot_order"),
    symbol: z.string().min(1),
    side: z.enum(["buy", "sell"]),
    orderType: z.enum(["market", "limit", "stop"]),
    quantity: num(z.number().positive()),
    limitPrice: num(z.number().positive()).optional(),
    stopPrice: num(z.number().positive()).optional(),
    confidence,
    rationaleSummary: z.string().optional(),
    thesis,
  })
  .strict();

const spotCancel = z
  .object({
    type: z.literal("spot_cancel"),
    orderId: num(z.number()),
    // Same accepted-and-unused tolerance as futures_set_sltp above.
    confidence,
    rationaleSummary: z.string().optional(),
    thesis,
  })
  .strict();

// pm_open accepts EITHER a short ref (pm1…pmN, what the prompt now asks for) OR
// the full {source,slug,outcomeExternalMarketId} triple (back-compat for models
// that copy ids correctly). The id fields are optional here; the runner's
// resolvePmRef() fills them from the ref (or rejects a bad/missing ref) BEFORE
// the validator/act phase, which require the triple. Kept a plain `.strict()`
// object (not refined) so it stays valid inside the discriminatedUnion.
const pmOpen = z
  .object({
    type: z.literal("pm_open"),
    ref: z.string().min(1).optional(),
    source: z.string().min(1).optional(),
    slug: z.string().min(1).optional(),
    outcomeExternalMarketId: z.string().min(1).optional(),
    stakeMusd: num(z.number().positive()),
    confidence,
    rationaleSummary: z.string().optional(),
    forecastProbability,
    thesis,
  })
  .strict();

export const actionSchema = z.discriminatedUnion("type", [
  futuresOpen,
  futuresClose,
  futuresSetSltp,
  spotOrder,
  spotCancel,
  pmOpen,
]);

// Request-side structured-output contract for providers that support JSON
// Schema. Keep this beside the Zod parser: the provider must not be allowed to
// emit an `act` with no actions (the Nano incident on 2026-08-27), while a real
// skip must carry an empty action list. The runner still parses with Zod and
// re-validates every action against live quotes/caps before any write.
//
// `pm_open` deliberately requires the short per-cycle `ref` here. The parser
// remains backwards-compatible with the full source/slug/id triple, but the
// hosted prompt asks models for refs and that is the only reliable generated
// shape.
const nullableNumber = { anyOf: [{ type: "number" }, { type: "null" }] };
const optionalConfidence = { type: "number", minimum: 0, maximum: 1 };
const optionalRationaleSummary = { type: "string" };
// Thesis contract for the structured-output transports (the NVIDIA endpoint
// forces the tool call from this schema, so a field absent here can never be
// emitted). One shared shape; the runner drops the fields that do not apply to
// the venue and re-signs nothing.
const thesisSchema = {
  type: "object",
  properties: {
    summary: { type: "string", maxLength: 200 },
    invalidation: {
      type: "object",
      properties: {
        priceBelow: { type: "number", exclusiveMinimum: 0 },
        priceAbove: { type: "number", exclusiveMinimum: 0 },
        probabilityBelow: { type: "number", exclusiveMinimum: 0, maximum: 100 },
        probabilityAbove: { type: "number", exclusiveMinimum: 0, maximum: 100 },
        maxHoldMinutes: { type: "number", exclusiveMinimum: 0 },
        catalyst: { type: "string", maxLength: 160 },
      },
      additionalProperties: false,
    },
  },
  required: ["summary", "invalidation"],
  additionalProperties: false,
} as const;

const generatedActionSchemas = [
  {
    type: "object",
    properties: {
      type: { const: "futures_open" },
      symbol: { type: "string", minLength: 1 },
      side: { enum: ["long", "short"] },
      leverage: { type: "number", exclusiveMinimum: 0 },
      marginMusd: { type: "number", exclusiveMinimum: 0 },
      stopLossPrice: nullableNumber,
      takeProfitPrice: nullableNumber,
      confidence: optionalConfidence,
      rationaleSummary: optionalRationaleSummary,
      thesis: thesisSchema,
    },
    required: ["type", "symbol", "side", "leverage", "marginMusd", "thesis"],
    additionalProperties: false,
  },
  {
    type: "object",
    properties: {
      type: { const: "futures_close" },
      positionId: { type: "number" },
      fraction: { type: "number", exclusiveMinimum: 0, maximum: 1 },
      confidence: optionalConfidence,
      rationaleSummary: optionalRationaleSummary,
    },
    required: ["type", "positionId"],
    additionalProperties: false,
  },
  {
    type: "object",
    properties: {
      type: { const: "futures_set_sltp" },
      positionId: { type: "number" },
      stopLossPrice: nullableNumber,
      takeProfitPrice: nullableNumber,
      confidence: optionalConfidence,
      rationaleSummary: optionalRationaleSummary,
    },
    required: ["type", "positionId"],
    additionalProperties: false,
  },
  {
    type: "object",
    properties: {
      type: { const: "spot_order" },
      symbol: { type: "string", minLength: 1 },
      side: { enum: ["buy", "sell"] },
      orderType: { enum: ["market", "limit", "stop"] },
      quantity: { type: "number", exclusiveMinimum: 0 },
      limitPrice: { type: "number", exclusiveMinimum: 0 },
      stopPrice: { type: "number", exclusiveMinimum: 0 },
      confidence: optionalConfidence,
      rationaleSummary: optionalRationaleSummary,
      thesis: thesisSchema,
    },
    required: ["type", "symbol", "side", "orderType", "quantity", "thesis"],
    additionalProperties: false,
  },
  {
    type: "object",
    properties: {
      type: { const: "spot_cancel" },
      orderId: { type: "number" },
      confidence: optionalConfidence,
      rationaleSummary: optionalRationaleSummary,
    },
    required: ["type", "orderId"],
    additionalProperties: false,
  },
  {
    type: "object",
    properties: {
      type: { const: "pm_open" },
      ref: { type: "string", minLength: 1 },
      stakeMusd: { type: "number", exclusiveMinimum: 0 },
      confidence: optionalConfidence,
      rationaleSummary: optionalRationaleSummary,
      forecastProbability: { type: "number" },
      thesis: thesisSchema,
    },
    required: ["type", "ref", "stakeMusd", "thesis"],
    additionalProperties: false,
  },
] as const;

const generatedDecisionProperties = {
  confidence: optionalConfidence,
  reason: { type: "string" },
  rationale: { type: "string", maxLength: 1200 },
} as const;

export const DECISION_JSON_SCHEMA = {
  type: "object",
  properties: {
    decision: { enum: ["skip", "act"] },
    ...generatedDecisionProperties,
    actions: {
      type: "array",
      items: { oneOf: generatedActionSchemas },
    },
  },
  required: ["decision", "actions"],
  additionalProperties: false,
  allOf: [
    {
      if: {
        properties: { decision: { const: "act" } },
        required: ["decision"],
      },
      then: { properties: { actions: { minItems: 1 } } },
    },
    {
      if: {
        properties: { decision: { const: "skip" } },
        required: ["decision"],
      },
      then: { properties: { actions: { maxItems: 0 } } },
    },
  ],
} as const;

const decisionSchema = z
  .object({
    decision: z.enum(["skip", "act"]),
    confidence,
    reason: z.string().optional(),
    // The model's short analysis for this cycle. Allowed here so a model that
    // explains its thinking isn't fail-closed by .strict(); capped so a runaway
    // generation can't bloat the cycle record. Surfaced in the Arena terminal.
    rationale: z.string().max(1200).optional(),
    actions: z.array(actionSchema).default([]),
  })
  .strict();

// Weak/instruct models routinely answer the decision verb with a natural-language
// synonym ("manage", "trade", "hold", "wait") instead of the strict skip|act enum
// — which fail-closed the ENTIRE cycle on a zod enum error (observed live: Carl /
// Nemotron 49B returning "manage" repeatedly, burning whole cycles). Normalize the
// common synonyms to the canonical enum before validation; anything unrecognised
// still falls through to the enum error. ("act" with no actions is already treated
// as a skip downstream, so mapping a manage-with-no-action to "act" is harmless.)
const DECISION_ALIASES: Record<string, "skip" | "act"> = {
  act: "act",
  manage: "act",
  trade: "act",
  open: "act",
  close: "act",
  adjust: "act",
  add: "act",
  reduce: "act",
  execute: "act",
  enter: "act",
  exit: "act",
  rebalance: "act",
  skip: "skip",
  hold: "skip",
  wait: "skip",
  none: "skip",
  nothing: "skip",
  noop: "skip",
  no_action: "skip",
  pass: "skip",
  monitor: "skip",
  observe: "skip",
  stay: "skip",
};

function normalizeDecisionVerb(obj: unknown): unknown {
  if (obj && typeof obj === "object" && !Array.isArray(obj)) {
    const o = obj as Record<string, unknown>;
    if (typeof o.decision === "string") {
      const mapped = DECISION_ALIASES[o.decision.trim().toLowerCase()];
      if (mapped) o.decision = mapped;
    }
  }
  return obj;
}

// Pull a JSON object out of a model response that may be fenced or wrapped.
function coerceJson(text: string): unknown {
  let s = text.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)\s*```$/.exec(s);
  if (fence) s = fence[1].trim();
  if (!s.startsWith("{")) {
    const i = s.indexOf("{");
    const j = s.lastIndexOf("}");
    if (i >= 0 && j > i) s = s.slice(i, j + 1);
  }
  return JSON.parse(s); // throws on invalid JSON -> caller treats as fail-closed
}

export type ParseDecisionResult =
  { ok: true; decision: Decision } | { ok: false; error: string };

export function parseDecision(text: string): ParseDecisionResult {
  let obj: unknown;
  try {
    obj = normalizeDecisionVerb(coerceJson(text));
  } catch (err) {
    return {
      ok: false,
      error: `model output is not valid JSON: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
  const res = decisionSchema.safeParse(obj);
  if (!res.success) {
    return {
      ok: false,
      error: res.error.issues
        .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
        .join("; "),
    };
  }
  const d = res.data;
  // A "skip" decision ignores any actions; an "act" with no actions is a skip.
  const actions = d.decision === "act" ? (d.actions as ProposedAction[]) : [];
  return {
    ok: true,
    decision: {
      decision: d.decision,
      confidence: d.confidence,
      reason: d.reason,
      rationale: d.rationale,
      actions,
    },
  };
}
