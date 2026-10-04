import { describe, expect, it } from "vitest";
import { serializePromptObservation } from "./promptTables.js";

describe("lossless prompt tables", () => {
  const rows = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    source: "fixture",
    title: "Individual position " + i,
    marketProbability: 0.41987654321,
    positionMarginMusd: 12.45,
    openedAt: "2026-10-04T00:00:00Z",
    nested: { freshness: "fresh", ageSeconds: i },
    ...(i % 2
      ? {
          thesis: {
            summary: "Keep this exact text",
            invalidation: { priceBelow: 0.2 },
          },
        }
      : { outcomeRule: null }),
  }));
  it("round-trips every row, precision, nested rule, explicit null and absent field without mutating input", () => {
    const data = {
      watch: rows,
      pmMarkets: rows,
      pmPositions: rows,
      newClosedTrades: rows,
      openPositions: [{ id: 1 }],
      cashAvailableMusd: 0,
    };
    const before = JSON.stringify(data),
      text = serializePromptObservation(data, true);
    const parsed = JSON.parse(text);
    expect(parsed.tableFormat).toContain("Missing extra fields remain unknown");
    for (const field of [
      "watch",
      "pmMarkets",
      "pmPositions",
      "newClosedTrades",
    ]) {
      const t = parsed[field];
      expect(t.rows).toHaveLength(rows.length);
      parsed[field] = t.rows.map((r: unknown[], i: number) => ({
        ...Object.fromEntries(
          t.columns.map((k: string, j: number) => [k, r[j]]),
        ),
        ...t.extra?.[i],
      }));
    }
    delete parsed.tableFormat;
    expect(parsed).toEqual(data);
    expect(JSON.stringify(data)).toBe(before);
    expect(text.length).toBeLessThan(before.length * 0.8);
  });
  it("leaves the default and small or heterogeneous lists unchanged", () => {
    const data = { watch: rows };
    expect(serializePromptObservation(data)).toBe(JSON.stringify(data));
    for (const watch of [
      [],
      rows.slice(0, 2),
      [{ x: 1 }, { y: 2 }, { z: 3 }],
      [null, 1, "x"],
    ]) {
      expect(serializePromptObservation({ watch }, true)).toBe(
        JSON.stringify({ watch }),
      );
    }
  });
  it("matches normal JSON omission semantics without changing unknown to null", () => {
    const data = {
      watch: rows.map((r, i) => ({
        ...r,
        optional: i === 0 ? undefined : "present",
        explicitNull: null,
      })),
    };
    const parsed = JSON.parse(serializePromptObservation(data, true));
    expect(parsed.watch.columns).not.toContain("optional");
    expect(parsed.watch.columns).toContain("explicitNull");
    expect(parsed.watch.extra[0]).not.toHaveProperty("optional");
    expect(parsed.watch.extra[1].optional).toBe("present");
  });
});
