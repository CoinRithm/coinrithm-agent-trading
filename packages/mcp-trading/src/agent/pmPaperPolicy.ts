import { z } from "zod";
import { pmPaperOpenSchema } from "../pmPaperV2.js";
const id = z.number().int().positive().max(2147483647);
export const pmHouseIdentitySchema = z
  .object({ userId: id, apiKeyId: id, walletId: id, houseAgentId: id })
  .strict();
export const pmHousePolicySchema = pmHouseIdentitySchema
  .extend({
    version: z.literal("pm_paper_house_v2"),
    entryEnabled: z.boolean().default(false),
    maxCashBudgetPerEntry: pmPaperOpenSchema.shape.maxCashBudget,
    maxOpenPositions: z.number().int().min(1).max(20),
    maxEntriesPerDay: z.number().int().min(1).max(100),
    maxModelCallsPerHour: z.number().int().min(1).max(30).default(12),
    maxDailyLoss: pmPaperOpenSchema.shape.maxCashBudget,
    discoveryQuery: z.string().min(1).max(100),
  })
  .strict();
export type PmHouseIdentity = z.infer<typeof pmHouseIdentitySchema>;
export type PmHousePolicy = z.infer<typeof pmHousePolicySchema>;
export const samePmHouse = (a: PmHouseIdentity, b: PmHouseIdentity) =>
  a.userId === b.userId &&
  a.apiKeyId === b.apiKeyId &&
  a.walletId === b.walletId &&
  a.houseAgentId === b.houseAgentId;
export function readPmHousePolicies(
  raw: string | undefined,
): readonly PmHousePolicy[] {
  if (raw === undefined || raw === "") return [];
  const policies = z.array(pmHousePolicySchema).max(10).parse(JSON.parse(raw));
  if (
    new Set(policies.map((p) => p.houseAgentId)).size !== policies.length ||
    new Set(policies.map((p) => p.apiKeyId)).size !== policies.length ||
    new Set(policies.map((p) => p.walletId)).size !== policies.length
  )
    throw new Error("Duplicate PM house policy identity");
  return policies;
}
export function selectPmHousePolicy(
  agent: { id: number; ownerUserId?: number | null; isHouse?: boolean },
  policies: readonly PmHousePolicy[] = [],
): PmHousePolicy | undefined {
  if (agent.isHouse !== true) return undefined;
  return policies.find(
    (p) => p.houseAgentId === agent.id && p.userId === agent.ownerUserId,
  );
}
export function pmCashUnits(value: string): bigint {
  if (!/^-?(0|[1-9]\d*)(\.\d{1,18})?$/.test(value) || value.length > 41)
    throw new Error("Invalid exact paper cash");
  const negative = value.startsWith("-");
  const [whole, fraction = ""] = (negative ? value.slice(1) : value).split(".");
  const units = BigInt(whole) * 10n ** 18n + BigInt(fraction.padEnd(18, "0"));
  return negative ? -units : units;
}
