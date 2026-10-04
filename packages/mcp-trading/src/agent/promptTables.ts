// Prompt presentation only. Every serialized value and missing-field distinction
// survives; observations, receipts and execution validation keep their objects.
type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
type Row = { [key: string]: Json };
const row = (v: Json): v is Row =>
  v !== null && typeof v === "object" && !Array.isArray(v);
// Keep market refs and per-outcome settlement rules in their proven object
// representation. A provider probe mis-associated an optional rule with a ref.
const TABLE_FIELDS = ["watch", "pmPositions", "newClosedTrades"];
const FORMAT =
  "Tabular lists use columns and rows: each row's values map to the columns in order. Every row remains a separate item; nested objects keep their field names. References such as watch[].priceUsd refer to the reconstructed row. Only lists with identical fields use tables. Market refs and settlement rules remain objects. Return the normal decision JSON with actions as an array of objects.";

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
    if (
      columns.length < 3 ||
      list.some((r) => Object.keys(r).length !== columns.length)
    )
      continue;
    const table = {
      columns,
      rows: list.map((r) => columns.map((k) => r[k])),
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
