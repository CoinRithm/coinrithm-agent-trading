import { describe, expect, it } from "vitest";
import {
  freshnessOf,
  pmCalibrationOf,
  pmConsensusOf,
  pmDecisionSupportOf,
  pmQualityOf,
  pmSettlementRuleOf,
  PM_RULES_TEXT_MAX,
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

describe("event-level cross-venue consensus (referenceProbability)", () => {
  const ref = (over: Record<string, unknown> = {}) => ({
    referenceProbability: {
      probability: 57,
      venueCount: 3,
      spreadPoints: 4.5,
      kind: "binary",
      outcomeName: null,
      ...over,
    },
  });

  it("keeps omission (older backend) distinct from an explicit null", () => {
    expect(pmConsensusOf({})).toBeUndefined();
    expect(pmConsensusOf({ referenceProbability: null })).toBeNull();
  });

  it("copies a binary or leader reference onto the 0..1 prob scale, unmapped and unflipped", () => {
    expect(pmConsensusOf(ref())).toEqual({
      prob: 0.57,
      venues: 3,
      spreadPts: 4.5,
      kind: "binary",
      outcome: null,
    });
    expect(
      pmConsensusOf(ref({ kind: "leader", outcomeName: "Kamala Harris" })),
    ).toEqual({
      prob: 0.57,
      venues: 3,
      spreadPts: 4.5,
      kind: "leader",
      outcome: "Kamala Harris",
    });
  });

  it.each([
    ["an array", { referenceProbability: [57] }],
    ["a string", { referenceProbability: "57" }],
    ["probability over 100", ref({ probability: 101 })],
    ["negative probability", ref({ probability: -1 })],
    ["string probability", ref({ probability: "57" })],
    ["zero venues", ref({ venueCount: 0 })],
    ["fractional venues", ref({ venueCount: 2.5 })],
    ["negative spread", ref({ spreadPoints: -1 })],
    ["spread over 100", ref({ spreadPoints: 101 })],
    ["unknown kind", ref({ kind: "ladder" })],
    ["leader with no named outcome", ref({ kind: "leader" })],
    ["non-string outcome", ref({ outcomeName: 7 })],
    ["blank outcome", ref({ outcomeName: " " })],
  ])("treats %s as unknown (null), never as agreement", (_label, event) => {
    expect(pmConsensusOf(event)).toBeNull();
  });
});

describe("own settled PM calibration record (pmCalibration)", () => {
  it("needs at least 20 whole settled forecasts", () => {
    for (const settled of [undefined, null, "40", 19, 20.5, -1, NaN]) {
      expect(pmCalibrationOf({ settled })).toBeUndefined();
    }
    expect(pmCalibrationOf(null)).toBeUndefined();
    expect(pmCalibrationOf({ settled: 20 })).toEqual({
      settled: 20,
      brierAgent: null,
      brierMarket: null,
      meanForecastPct: null,
      winRatePct: null,
      bands: [],
    });
  });

  it("keeps unknown numbers null instead of guessing and caps the bands", () => {
    const band = (i: number) => ({
      fromPct: i,
      toPct: i + 1,
      n: 1,
      meanForecastPct: i,
      winRatePct: 0,
    });
    const out = pmCalibrationOf({
      settled: 25,
      brierAgent: 1.2,
      brierMarket: "0.18",
      meanForecastPct: 101,
      winRatePct: -3,
      bands: [
        ...Array.from({ length: 12 }, (_, i) => band(i)),
        { fromPct: 0, toPct: 101, n: 5, meanForecastPct: 50, winRatePct: 50 },
      ],
    });
    expect(out).toMatchObject({
      brierAgent: null,
      brierMarket: null,
      meanForecastPct: null,
      winRatePct: null,
    });
    expect(out?.bands).toHaveLength(10);
    expect(out?.bands[0]).toEqual(band(0));
  });
});

describe("pmSettlementRuleOf (discover `resolution`, backend-v2 #111)", () => {
  const resolution = (over: Record<string, unknown> = {}) => ({
    resolution: {
      published: true,
      rules:
        'This market will resolve to "Yes" if MicroStrategy sells any of its Bitcoin by the named outcome, 11:59 PM ET. Otherwise, this market will resolve to "No".',
      rulesTruncated: false,
      settlementSource: null,
      settlementSources: null,
      ...over,
    },
  });

  it("keeps omission (older backend) distinct from an explicit null or junk", () => {
    expect(pmSettlementRuleOf({})).toBeUndefined();
    expect(pmSettlementRuleOf({ resolution: null })).toBeNull();
    expect(pmSettlementRuleOf({ resolution: "rules" })).toBeNull();
    expect(pmSettlementRuleOf(resolution({ published: "yes" }))).toBeNull();
  });

  it("carries the published rule text and the named outlets", () => {
    expect(
      pmSettlementRuleOf(
        resolution({
          settlementSources: [
            { name: "Associated Press", url: "https://apnews.com" },
            { name: "" },
            { name: "Reuters", url: null },
          ],
        }),
      ),
    ).toEqual({
      published: true,
      text: 'This market will resolve to "Yes" if MicroStrategy sells any of its Bitcoin by the named outcome, 11:59 PM ET. Otherwise, this market will resolve to "No".',
      sources: ["Associated Press", "Reuters"],
    });
  });

  it("an unpublished rule never carries text, whatever the row says", () => {
    expect(
      pmSettlementRuleOf(resolution({ published: false, rules: "Who wins?" })),
    ).toEqual({ published: false });
  });

  it("bounds long text for the prompt and marks the cut", () => {
    const text = pmSettlementRuleOf(
      resolution({ rules: "Condition. ".repeat(100) }),
    )?.text;
    expect(text?.length).toBe(PM_RULES_TEXT_MAX);
    expect(text?.endsWith("…")).toBe(true);
  });
});
