// Parse the model's single text response into a strict, structured Decision.
// Accepts futures + spot + prediction-market actions. Anything else — invalid
// JSON, an unknown action type, a free-form endpoint/tool name, extra unknown
// fields, or a missing required field — fails closed (the runner skips).

import { z } from "zod";
import { Decision, ProposedAction } from "./types.js";

const futuresOpen = z
  .object({
    type: z.literal("futures_open"),
    symbol: z.string().min(1),
    side: z.enum(["long", "short"]),
    leverage: z.number().positive(),
    marginMusd: z.number().positive(),
    stopLossPrice: z.number().nullable().optional(),
    takeProfitPrice: z.number().nullable().optional(),
    confidence: z.number().min(0).max(1).optional(),
    rationaleSummary: z.string().optional(),
  })
  .strict();

const futuresClose = z
  .object({
    type: z.literal("futures_close"),
    positionId: z.number(),
    fraction: z.number().positive().max(1).optional(),
    confidence: z.number().min(0).max(1).optional(),
    rationaleSummary: z.string().optional(),
  })
  .strict();

const futuresSetSltp = z
  .object({
    type: z.literal("futures_set_sltp"),
    positionId: z.number(),
    stopLossPrice: z.number().nullable().optional(),
    takeProfitPrice: z.number().nullable().optional(),
  })
  .strict();

const spotOrder = z
  .object({
    type: z.literal("spot_order"),
    symbol: z.string().min(1),
    side: z.enum(["buy", "sell"]),
    orderType: z.enum(["market", "limit", "stop"]),
    quantity: z.number().positive(),
    limitPrice: z.number().positive().optional(),
    stopPrice: z.number().positive().optional(),
    confidence: z.number().min(0).max(1).optional(),
    rationaleSummary: z.string().optional(),
  })
  .strict();

const spotCancel = z
  .object({
    type: z.literal("spot_cancel"),
    orderId: z.number(),
  })
  .strict();

const pmOpen = z
  .object({
    type: z.literal("pm_open"),
    source: z.string().min(1),
    slug: z.string().min(1),
    outcomeExternalMarketId: z.string().min(1),
    stakeMusd: z.number().positive(),
    confidence: z.number().min(0).max(1).optional(),
    rationaleSummary: z.string().optional(),
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

const decisionSchema = z
  .object({
    decision: z.enum(["skip", "act"]),
    confidence: z.number().min(0).max(1).optional(),
    reason: z.string().optional(),
    actions: z.array(actionSchema).default([]),
  })
  .strict();

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
  | { ok: true; decision: Decision }
  | { ok: false; error: string };

export function parseDecision(text: string): ParseDecisionResult {
  let obj: unknown;
  try {
    obj = coerceJson(text);
  } catch (err) {
    return { ok: false, error: `model output is not valid JSON: ${err instanceof Error ? err.message : String(err)}` };
  }
  const res = decisionSchema.safeParse(obj);
  if (!res.success) {
    return {
      ok: false,
      error: res.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join("; "),
    };
  }
  const d = res.data;
  // A "skip" decision ignores any actions; an "act" with no actions is a skip.
  const actions = d.decision === "act" ? (d.actions as ProposedAction[]) : [];
  return {
    ok: true,
    decision: { decision: d.decision, confidence: d.confidence, reason: d.reason, actions },
  };
}
