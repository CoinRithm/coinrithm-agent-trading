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
    thesis: {
      summary: "Keep this exact text",
      invalidation: { priceBelow: 0.2 },
    },
    explicitNull: null,
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
    expect(parsed.tableFormat).toContain(
      "Only lists with identical fields use tables",
    );
    expect(parsed.pmMarkets).toEqual(data.pmMarkets);
    for (const field of ["watch", "pmPositions", "newClosedTrades"]) {
      const t = parsed[field];
      expect(t.rows).toHaveLength(rows.length);
      parsed[field] = t.rows.map((r: unknown[]) => ({
        ...Object.fromEntries(
          t.columns.map((k: string, j: number) => [k, r[j]]),
        ),
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
    const text = serializePromptObservation(data, true);
    expect(text).toBe(JSON.stringify(data));
    const parsed = JSON.parse(text);
    expect(parsed.watch[0]).not.toHaveProperty("optional");
    expect(parsed.watch[0].explicitNull).toBeNull();
    expect(parsed.watch[1].optional).toBe("present");
  });
});
