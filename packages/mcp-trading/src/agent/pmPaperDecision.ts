import { z } from "zod";
import { pmPaperOpenSchema, pmPaperCloseSchema } from "../pmPaperV2.js";
import type { ActionsStringDiagnostic } from "./decision.js";
export const pmV2OpenActionSchema = pmPaperOpenSchema
  .omit({ idempotencyKey: true, minEntryProbabilityPct: true })
  .extend({ type: z.literal("pm_v2_open") })
  .strict();
export const pmV2CloseActionSchema = pmPaperCloseSchema
  .omit({ idempotencyKey: true })
  .extend({ type: z.literal("pm_v2_close") })
  .strict();
export const pmPaperDecisionSchema = z
  .object({
    decision: z.enum(["act", "skip"]),
    reason: z.string().max(280).optional(),
    rationale: z.string().max(1000).optional(),
    confidence: z.number().min(0).max(1).optional(),
    actions: z
      .array(
        z.discriminatedUnion("type", [
          pmV2OpenActionSchema,
          pmV2CloseActionSchema,
        ]),
      )
      .max(1),
  })
  .strict()
  .refine((value) =>
    value.decision === "act"
      ? value.actions.length === 1
      : value.actions.length === 0,
  );
export type PmPaperAction =
  z.infer<typeof pmV2OpenActionSchema> | z.infer<typeof pmV2CloseActionSchema>;
export function parsePmPaperDecision(text: string):
  | { ok: true; decision: z.infer<typeof pmPaperDecisionSchema> }
  | {
      ok: false;
      error: string;
      actionsStringDiagnostic?: ActionsStringDiagnostic;
    } {
  try {
    const parsed = pmPaperDecisionSchema.safeParse(JSON.parse(text));
    return parsed.success
      ? { ok: true, decision: parsed.data }
      : { ok: false, error: "invalid PM paper v2 decision" };
  } catch {
    return { ok: false, error: "invalid PM paper v2 JSON" };
  }
}
const decimal = {
  type: "string",
  pattern: "^(0|[1-9]\\d*)(\\.\\d{1,18})?$",
  maxLength: 40,
};
export const PM_PAPER_DECISION_JSON_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["decision", "actions"],
  properties: {
    decision: { type: "string", enum: ["act", "skip"] },
    reason: { type: "string", maxLength: 280 },
    rationale: { type: "string", maxLength: 1000 },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    actions: {
      type: "array",
      maxItems: 1,
      items: {
        oneOf: [
          {
            type: "object",
            additionalProperties: false,
            required: [
              "type",
              "source",
              "slug",
              "outcomeExternalMarketId",
              "side",
              "maxCashBudget",
            ],
            properties: {
              type: { const: "pm_v2_open" },
              source: { type: "string", enum: ["kalshi", "polymarket"] },
              slug: { type: "string", minLength: 1, maxLength: 256 },
              outcomeExternalMarketId: {
                type: "string",
                minLength: 1,
                maxLength: 256,
              },
              side: { type: "string", enum: ["yes", "no"] },
              maxCashBudget: decimal,
              forecastProbability: { anyOf: [decimal, { type: "null" }] },
              thesis: { type: ["string", "null"], maxLength: 280 },
            },
          },
          {
            type: "object",
            additionalProperties: false,
            required: ["type", "positionId"],
            properties: {
              type: { const: "pm_v2_close" },
              positionId: { type: "integer", minimum: 1, maximum: 2147483647 },
              detail: { type: ["string", "null"], maxLength: 1024 },
            },
          },
        ],
      },
    },
  },
};
