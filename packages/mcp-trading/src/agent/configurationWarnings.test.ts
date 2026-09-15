import { it, expect } from "vitest";
import { configurationWarnings } from "./configurationWarnings.js";

it("distinguishes explicit inactive fields without inventing warnings for absent defaults", () => {
  expect(configurationWarnings({})).toEqual([]);
  expect(
    configurationWarnings({ abstention: true, capabilities: ["news"] }),
  ).toEqual([]);
  expect(configurationWarnings({ abstention: { minConfidence: 0.6 } })).toEqual(
    [],
  );
  const notes = configurationWarnings({
    capabilities: ["websearch"],
    abstention: {
      onStaleData: false,
      onWeakSignal: true,
      onMissingQuote: false,
      onInsufficientBalance: true,
    },
  });
  expect(notes).toHaveLength(5);
  expect(notes[0]).toContain("reserved");
  expect(notes.slice(1).every((note) => note.includes("inactive"))).toBe(true);
});
