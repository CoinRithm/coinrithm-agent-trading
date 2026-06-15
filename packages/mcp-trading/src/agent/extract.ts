// Defensive extractors for untyped API JSON.
export const asObj = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
export const asArr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
export const asNum = (v: unknown): number | undefined =>
  typeof v === "number" && Number.isFinite(v) ? v : undefined;
export const asStr = (v: unknown): string | undefined =>
  typeof v === "string" ? v : undefined;
