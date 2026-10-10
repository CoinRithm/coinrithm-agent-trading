import { z } from "zod";
// Exact decimal wire values; never derive a fee-inclusive budget from stakeMusd.
const decimal = z
  .string()
  .max(40)
  .regex(/^(0|[1-9]\d*)(\.\d{1,18})?$/);
const boundedDecimal = (min: number, max: number, exclusive = false) =>
  decimal.refine((value) => {
    if (!/^(0|[1-9]\d*)(\.\d{1,18})?$/.test(value) || value.length > 40)
      return false;
    const [whole, fraction = ""] = value.split(".");
    const scaled =
      BigInt(whole) * 10n ** 18n + BigInt(fraction.padEnd(18, "0"));
    const lower = BigInt(min) * 10n ** 18n,
      upper = BigInt(max) * 10n ** 18n;
    return exclusive
      ? scaled > lower && scaled < upper
      : scaled >= lower && scaled <= upper;
  });
const text = (max: number) =>
  z
    .string()
    .max(max)
    .refine((value) =>
      [...value].every(
        (char) => char.charCodeAt(0) >= 32 && char.charCodeAt(0) !== 127,
      ),
    );
export const pmPaperOpenSchema = z
  .object({
    source: z.enum(["kalshi", "polymarket"]),
    slug: z.string().min(1).max(256),
    outcomeExternalMarketId: z.string().min(1).max(256),
    side: z.enum(["yes", "no"]),
    maxCashBudget: boundedDecimal(10, 1000000).describe(
      "Exact decimal string: maximum total paper cash including entry fees; 10..1000000 mUSD.",
    ),
    idempotencyKey: z.string().regex(/^pm-entry:[A-Za-z0-9:_-]{1,111}$/),
    minEntryProbabilityPct: boundedDecimal(0, 100).nullable().optional(),
    forecastProbability: boundedDecimal(0, 100, true).nullable().optional(),
    thesis: text(280).nullable().optional(),
  })
  .strict();
export const pmPaperCloseSchema = z
  .object({
    positionId: z.number().int().positive().max(2147483647),
    idempotencyKey: z.string().regex(/^pm-exit:[A-Za-z0-9:_-]{1,111}$/),
    detail: text(1024).nullable().optional(),
  })
  .strict();
export type PmPaperOpen = z.infer<typeof pmPaperOpenSchema>;
export type PmPaperClose = z.infer<typeof pmPaperCloseSchema>;
export const PM_PAPER_V2_BASE = "/api/agent/pm/v2";
