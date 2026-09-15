import { describe, expect, it } from "vitest";
import { retryAfterSeconds } from "./retryAfter.js";

describe("Retry-After parsing", () => {
  it.each([
    null,
    "",
    "  ",
    "-1",
    "Infinity",
    "0x10",
    "invalid",
    "Tue, invalid date",
    "9".repeat(400),
  ])("keeps invalid/missing evidence absent: %s", (header) => {
    expect(retryAfterSeconds(header, 0)).toBeUndefined();
  });
  it.each([
    ["0", 0],
    [" 5 ", 5],
    ["1.5", 1.5],
  ] as const)("parses delay %s", (header, seconds) => {
    expect(retryAfterSeconds(header)).toBe(seconds);
  });
  it("honors future HTTP dates and treats expired dates as zero", () => {
    const date = Date.parse("Tue, 15 Sep 2026 00:00:10 GMT");
    expect(
      retryAfterSeconds("Tue, 15 Sep 2026 00:00:10 GMT", date - 10_000),
    ).toBe(10);
    expect(
      retryAfterSeconds("Tue, 15 Sep 2026 00:00:10 GMT", date + 1000),
    ).toBe(0);
  });
});
