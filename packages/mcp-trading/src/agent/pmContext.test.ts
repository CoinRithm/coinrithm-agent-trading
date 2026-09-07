import { describe, expect, it } from "vitest";
import {
  freshnessOf,
  pmDecisionSupportOf,
  pmQualityOf,
  sourceTimestamp,
} from "./pmContext.js";

describe("bounded PM source context", () => {
  it("converts actual numeric minutes, preserves zero seconds and rejects invented or negative ages", () => {
    expect(
      freshnessOf({ freshness: { status: "fresh", ageMinutes: 10 } }),
    ).toEqual({ status: "fresh", ageSeconds: 600 });
    expect(
      freshnessOf({
        freshness: { status: "fresh", ageSeconds: 0, ageMinutes: 10 },
      }),
    ).toEqual({ status: "fresh", ageSeconds: 0 });
    for (const ageMinutes of [null, "10", false, -1, Infinity, NaN]) {
      expect(
        freshnessOf({ freshness: { status: "unknown", ageMinutes } }),
      ).toEqual({ status: "unknown" });
    }
    expect(
      freshnessOf({ freshness: { status: "arbitrary prose", ageMinutes: 10 } }),
    ).toBeUndefined();
  });

  it("admits only fixed freshness basis and bounded UTC timestamps", () => {
    expect(sourceTimestamp("2026-09-07T01:02:03Z")).toBe(
      "2026-09-07T01:02:03.000Z",
    );
    expect(sourceTimestamp("2026-09-07T01:02:03.1Z")).toBe(
      "2026-09-07T01:02:03.100Z",
    );
    expect(sourceTimestamp("2024-02-29T01:02:03Z")).toBe(
      "2024-02-29T01:02:03.000Z",
    );
    for (const invalid of [
      "secret text",
      "2026-99-07T01:02:03Z",
      "2026-02-30T00:00:00Z",
      "2026-02-29T00:00:00Z",
      0,
      null,
      "2026-09-07T01:02:03.123456Z",
    ]) {
      expect(sourceTimestamp(invalid)).toBeUndefined();
    }
    expect(
      freshnessOf({
        freshness: {
          status: "fresh",
          asOf: "secret text",
          basis: "secret text",
        },
      }),
    ).toEqual({ status: "fresh" });
  });

  it("bounds reasons, rejects free text and never coerces eligibility", () => {
    const raw = {
      decisionEligible: "true",
      warningReasons: [...Array(40).fill("lagging_freshness"), "secret text"],
      blockReasons: ["unpriced", "secret text"],
      policyVersion: "secret text",
      assessedAt: "secret text",
    };
    expect(pmQualityOf(raw)).toEqual({
      warningReasons: ["lagging_freshness"],
      blockReasons: ["unpriced"],
      reasonsOmitted: true,
    });
    expect(JSON.stringify(pmQualityOf(raw))).not.toContain("secret text");
    expect(pmQualityOf(undefined)).toBeUndefined();
    expect(
      pmQualityOf({
        decisionEligible: false,
        warningReasons: [],
        blockReasons: [],
      }),
    ).toMatchObject({ decisionEligible: false, reasonsOmitted: false });
  });

  it("preserves zero quality and explicit false flags but excludes arbitrary support properties", () => {
    const context = pmDecisionSupportOf({
      qualityScore: 0,
      qualityTier: "low",
      qualityCapReason: null,
      spreadTier: "wide",
      flags: {
        thinMarket: false,
        highAmbiguity: true,
        staleData: "true",
        secret: "secret text",
      },
      secret: "secret text",
    });
    expect(context).toMatchObject({
      qualityScore: 0,
      qualityTier: "low",
      qualityCapReason: null,
      spreadTier: "wide",
      flags: { thinMarket: false, highAmbiguity: true },
    });
    expect(context?.flags).not.toHaveProperty("staleData");
    expect(JSON.stringify(context)).not.toContain("secret text");
    for (const qualityScore of ["50", -1, 101, Infinity, NaN]) {
      expect(pmDecisionSupportOf({ qualityScore })).not.toHaveProperty(
        "qualityScore",
      );
    }
  });
});
