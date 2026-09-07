import { describe, expect, it } from "vitest";
import {
  buildDecisionInputRecord,
  DECISION_INPUT_MAX_BYTES,
  sanitizeDecisionInputRecord,
  unavailableDecisionInputRecord,
} from "./decisionReceipt.js";
import type { DecisionInputCapture } from "./decisionReceipt.js";
import type { Observation } from "./types.js";
import { parseSkill } from "./skill.js";
import { renderFolderOfOne } from "./templates.js";
import { newState } from "./state.js";
import { buildObservationReceipt } from "./observationReceipt.js";

function input(): DecisionInputCapture {
  const observation: Observation = {
    asOf: "2026-09-07T00:00:00.000Z",
    scopes: ["read"],
    cashAvailableMusd: 1234,
    equityMusd: 50000,
    openPositions: [],
    openOrders: [],
    pmPositions: [],
    pmMarkets: [],
    pmResolutions: [],
    watch: [
      {
        symbol: "BTC",
        coinId: "1",
        priceUsd: 67000,
        freshness: { status: "fresh", ageSeconds: 3 },
      },
    ],
    setups: [],
    syncCursor: null,
    newClosedTrades: [],
    polledBeforeWrite: true,
  };
  const spec = parseSkill(renderFolderOfOne("a", "conservative")).spec;
  const state = newState("run-1");
  state.dayKey = "2026-09-07";
  return {
    phase: "decision_input",
    runId: "run-1",
    decisionId: "cycle-1-abcd",
    spec,
    state,
    mergedProse: "private strategy",
    observation,
    observationFingerprint:
      buildObservationReceipt(observation).observationHash,
  };
}

describe("private partial decision input record", () => {
  it("retains PM quality facts and source time while rejecting nested free-text smuggling", () => {
    const i = input();
    i.observation!.pmMarkets = [
      {
        ref: "pm1",
        source: "polymarket",
        slug: "test",
        outcomeExternalMarketId: "yes",
        probability: 0.01,
        freshness: {
          status: "fresh",
          ageSeconds: 600,
          asOf: "2026-09-07T01:55:17.076Z",
          basis: "latest_snapshot",
        },
        quality: {
          decisionEligible: true,
          warningReasons: ["anomaly_flagged", "SECRET_REASON"],
          blockReasons: [],
          policyVersion: "pm-quality-3",
          assessedAt: "2026-09-07T01:55:17.076Z",
          reasonsOmitted: false,
        },
        decisionSupport: {
          qualityScore: 74,
          qualityTier: "medium",
          qualityCapReason: "raw_book",
          spreadTier: "tight",
          flags: { highAmbiguity: true, staleData: false },
        },
      },
    ];
    const receipt = buildDecisionInputRecord(i);
    expect(receipt.lists.pmMarkets[0]).toMatchObject({
      freshness: { ageSeconds: 600, asOf: "2026-09-07T01:55:17.076Z" },
      quality: {
        decisionEligible: true,
        warningReasons: ["anomaly_flagged"],
        policyVersion: "pm-quality-3",
      },
      decisionSupport: {
        highAmbiguity: true,
        staleData: false,
        qualityTier: "medium",
      },
    });
    expect(sanitizeDecisionInputRecord(receipt)).toEqual(receipt);
    expect(JSON.stringify(receipt)).not.toContain("SECRET_REASON");
    expect(receipt.lists.pmMarkets[0].quality).toMatchObject({
      reasonsOmitted: true,
    });
    expect(receipt.omissions).toContain(
      "pm_discovery_filtered_candidates_not_recorded",
    );
    for (const [field, extension] of [
      ["quality", { warningReasons: ["SECRET_REASON"] }],
      ["quality", { policyVersion: "PRIVATE_USER_PROSE" }],
      ["quality", { rationale: "PRIVATE_REASONING" }],
      ["decisionSupport", { highAmbiguity: "PRIVATE_REASONING" }],
      ["decisionSupport", { qualityScore: 101 }],
      ["freshness", { asOf: "PRIVATE_TIMESTAMP" }],
    ] as const) {
      const modified = structuredClone(receipt);
      Object.assign(modified.lists.pmMarkets[0][field] as object, extension);
      expect(sanitizeDecisionInputRecord(modified)).toBeUndefined();
    }
    const before = JSON.stringify(receipt.lists.pmMarkets);
    i.observation!.pmMarkets[0].decisionSupport!.flags!.highAmbiguity = false;
    expect(
      JSON.stringify(buildDecisionInputRecord(i).lists.pmMarkets),
    ).not.toBe(before);
    i.observation!.pmMarkets[0].decisionSupport!.qualityScore = 101;
    expect(
      buildDecisionInputRecord(i).lists.pmMarkets[0].decisionSupport,
    ).toMatchObject({ qualityScore: null });
  });

  it("keeps structured facts and fingerprints but never free text or secrets", () => {
    const i = input();
    i.mergedProse = "PRIVATE_USER_PROSE sk-this-is-a-provider-secret";
    i.state.journal = [{ at: "today", did: "PRIVATE_JOURNAL" }];
    i.observation!.news = [{ title: "PRIVATE_NEWS" }];
    i.observation!.newClosedTrades = [
      { arbitrary: "PRIVATE_LEDGER", authorization: "Bearer hidden" },
    ];
    i.observation!.openPositions = [
      {
        venue: "futures",
        id: 7,
        marginMusd: 20,
        thesis: {
          summary: "PRIVATE_THESIS",
          invalidation: { catalyst: "PRIVATE_CATALYST" },
          holdMinutes: 1,
          status: "intact",
        },
      },
    ];
    i.observation!.watch[0].name = "PRIVATE_NAME";
    i.observation!.watch.push({
      symbol: "sk-secret",
      coinId: "crk_live_secret",
    });
    const r = buildDecisionInputRecord(i);
    const json = JSON.stringify(r);
    for (const secret of [
      "PRIVATE_USER_PROSE",
      "sk-this-is-a-provider-secret",
      "PRIVATE_JOURNAL",
      "PRIVATE_NEWS",
      "PRIVATE_LEDGER",
      "PRIVATE_THESIS",
      "PRIVATE_CATALYST",
      "PRIVATE_NAME",
      "Bearer hidden",
      "sk-secret",
      "crk_live_secret",
    ])
      expect(json).not.toContain(secret);
    expect(r.account?.cashAvailableMusd).toBe(1234);
    expect(r.lists.watch[0].priceUsd).toBe(67000);
    expect(r.configFingerprint).toMatch(/^sha256:/);
    expect(r.counts.news).toEqual({ source: 1, retained: 0, omitted: 1 });
    expect(r.completeness).toBe("partial");
    expect(sanitizeDecisionInputRecord(r)).toEqual(r);
  });

  it("bounds huge input lists and metadata to 16 KiB with exact omissions", () => {
    const i = input();
    i.observation!.watch = Array.from({ length: 10000 }, (_, n) => ({
      symbol: `COIN${n}`,
      coinId: String(n),
      priceUsd: n,
      name: "x".repeat(1000),
    }));
    i.observation!.pmMarkets = Array.from({ length: 1000 }, () => ({
      source: "polymarket",
      slug: "x".repeat(128),
      outcomeExternalMarketId: "y".repeat(128),
      title: "z".repeat(10000),
      probability: 0.4,
    }));
    i.observation!.asOf = `2026-09-07T${"1".repeat(100000)}Z`;
    const r = buildDecisionInputRecord(i);
    expect(Buffer.byteLength(JSON.stringify(r))).toBeLessThanOrEqual(
      DECISION_INPUT_MAX_BYTES,
    );
    expect(r.omissions).toContain("byte_budget_exceeded");
    expect(r.counts.watch.source).toBe(10000);
    for (const [name, count] of Object.entries(r.counts)) {
      expect(count.source).toBe(count.retained + count.omitted);
      expect(count.retained).toBe(r.lists[name]?.length ?? 0);
    }
    expect(r.account?.asOf).toBeNull();
    expect(sanitizeDecisionInputRecord(r)).toEqual(r);
  });

  it("copies predecision risk state and marks unavailable input without pretending it was observed", () => {
    const i = input();
    i.spec.limits.maxTradesPerDay = 5;
    i.state.riskIncreasesToday = 4;
    const r = buildDecisionInputRecord(i);
    i.state.riskIncreasesToday = 5;
    i.observation!.cashAvailableMusd = 0;
    expect(r.dailyRiskBudget).toMatchObject({
      limit: 5,
      used: 4,
      remaining: 1,
    });
    expect(r.account?.cashAvailableMusd).toBe(1234);
    const noInput = buildDecisionInputRecord({
      ...i,
      observation: undefined,
      phase: "before_observation",
    });
    expect(noInput.account).toBeNull();
    expect(noInput.omissions).toContain("observation_not_available");
    expect(
      sanitizeDecisionInputRecord(unavailableDecisionInputRecord()),
    ).toBeDefined();
  });

  it("fails closed on foreign fields, free-text codes, oversized or malformed boundary records", () => {
    const r = buildDecisionInputRecord(input());
    for (const candidate of [
      null,
      {},
      { ...r, prompt: "secret" },
      { ...r, omissions: ["user text"] },
      { ...r, lists: { watch: [{ prompt: "secret" }] } },
      { ...r, runId: "Bearer sk-secret" },
      { ...r, lists: { watch: Array(500).fill(r.lists.watch[0]) } },
    ])
      expect(sanitizeDecisionInputRecord(candidate)).toBeUndefined();
    const detached = sanitizeDecisionInputRecord(r)!;
    detached.lists.watch[0].priceUsd = 1;
    expect(r.lists.watch[0].priceUsd).toBe(67000);
  });
});
