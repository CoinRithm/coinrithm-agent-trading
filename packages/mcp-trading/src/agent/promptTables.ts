// Prompt presentation only. Every serialized value and missing-field distinction
// survives; observations, receipts and execution validation keep their objects.
type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
type Row = { [key: string]: Json };
const row = (v: Json): v is Row =>
  v !== null && typeof v === "object" && !Array.isArray(v);
const TABLE_FIELDS = ["watch", "pmMarkets", "pmPositions", "newClosedTrades"];
const FORMAT =
  "Tabular lists use columns and rows: each row's values map to the columns in order. Merge extra[i] into row i when present. Every row remains a separate item; nested objects keep their field names. References such as watch[].priceUsd or pmMarkets[].ref refer to the reconstructed row. Missing extra fields remain unknown, never zero. Return the normal decision JSON with actions as an array of objects.";

export function serializePromptObservation(
  value: unknown,
  compact = false,
): string {
  const original = JSON.stringify(value);
  if (!compact) return original;
  const data: Row = JSON.parse(original);
  let changed = false;
  for (const field of TABLE_FIELDS) {
    const list = data[field];
    if (!Array.isArray(list) || list.length < 3 || !list.every(row)) continue;
    const columns = Object.keys(list[0]).filter((k) =>
      list.every((r) => Object.hasOwn(r, k)),
    );
    if (columns.length < 3) continue;
    const shared = new Set(columns);
    const extra = list.map((r) =>
      Object.fromEntries(Object.entries(r).filter(([k]) => !shared.has(k))),
    );
    const table = {
      columns,
      rows: list.map((r) => columns.map((k) => r[k])),
      ...(extra.some((r) => Object.keys(r).length > 0) ? { extra } : {}),
    };
    if (JSON.stringify(list).length - JSON.stringify(table).length < 512)
      continue;
    data[field] = table;
    changed = true;
  }
  if (!changed) return original;
  const result = JSON.stringify({ tableFormat: FORMAT, ...data });
  return result.length < original.length ? result : original;
}
