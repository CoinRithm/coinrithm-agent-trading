import { describe, expect, it } from "vitest";
import {
  PAID_BRAIN_WORST_CASE_INPUT_TOKENS,
  PAID_BRAIN_WORST_CASE_OUTPUT_TOKENS,
  admitPaidCall,
  debitIdempotencyKey,
  debitMicroUsd,
  monthStartUtc,
  paidBrainCatalogue,
  paidBrainModel,
  paidBrainSpecState,
  paidCycleCharge,
  parsePaidBrain,
  worstCaseCallMicroUsd,
  type PaidBrain,
} from "./paidBrain.js";

const fallback = {
  provider: "nvidia",
  name: "nvidia/nemotron-3-super-120b-a12b",
};
const paidSpec = (paidBrain: unknown) => ({ pinnedModel: false, paidBrain });

describe("paid brain catalogue", () => {
  it("prices every model in integer micro-USD per thousand tokens (USD per million x 1000)", () => {
    expect(
      paidBrainCatalogue.map((entry) => [
        entry.id,
        entry.provider,
        entry.model,
        entry.inMicroPerKTok / 1000,
        entry.outMicroPerKTok / 1000,
      ]),
    ).toEqual([
      ["claude-sonnet-5-5", "anthropic", "claude-sonnet-5-5", 2, 10],
      ["claude-opus-5-5", "anthropic", "claude-opus-5-5", 4, 20],
      ["gemini-2.5-flash", "gemini", "gemini-2.5-flash", 0.3, 2.5],
      ["gemini-3.8-flash", "gemini", "gemini-3.8-flash", 0.75, 3.75],
    ]);
    for (const entry of paidBrainCatalogue) {
      expect(Number.isSafeInteger(entry.inMicroPerKTok)).toBe(true);
      expect(Number.isSafeInteger(entry.outMicroPerKTok)).toBe(true);
    }
    expect(paidBrainModel("gpt-unknown")).toBeUndefined();
  });
});

describe("debitMicroUsd", () => {
  it("charges provider cost plus the margin for a typical call", () => {
    // 20k in x $2/M = $0.040, 500 out x $10/M = $0.005, +20% = $0.054.
    expect(
      debitMicroUsd({
        modelId: "claude-sonnet-5-5",
        tokensIn: 20_000,
        tokensOut: 500,
        marginPct: 20,
      }),
    ).toEqual({
      providerCostMicro: 45_000,
      marginMicro: 9_000,
      totalMicro: 54_000,
    });
  });

  it("rounds the provider cost and the margin UP, never down", () => {
    // 1 token x $0.30/M = 0.3 micro -> 1; margin 0.2 micro -> 1.
    expect(
      debitMicroUsd({
        modelId: "gemini-2.5-flash",
        tokensIn: 1,
        tokensOut: 0,
        marginPct: 20,
      }),
    ).toEqual({ providerCostMicro: 1, marginMicro: 1, totalMicro: 2 });
    // 3 x 0.3 + 1 x 2.5 = 3.4 micro -> 4; margin 0.8 -> 1.
    expect(
      debitMicroUsd({
        modelId: "gemini-2.5-flash",
        tokensIn: 3,
        tokensOut: 1,
        marginPct: 20,
      }).totalMicro,
    ).toBe(5);
    // Fractional token counts round up before pricing.
    expect(
      debitMicroUsd({
        modelId: "claude-sonnet-5-5",
        tokensIn: 999.2,
        tokensOut: 0,
        marginPct: 0,
      }).providerCostMicro,
    ).toBe(2_000);
  });

  it("applies no margin at 0 percent and charges nothing for zero tokens", () => {
    expect(
      debitMicroUsd({
        modelId: "claude-opus-5-5",
        tokensIn: 1_000,
        tokensOut: 1_000,
        marginPct: 0,
      }),
    ).toEqual({
      providerCostMicro: 24_000,
      marginMicro: 0,
      totalMicro: 24_000,
    });
    expect(
      debitMicroUsd({
        modelId: "claude-opus-5-5",
        tokensIn: 0,
        tokensOut: 0,
        marginPct: 20,
      }).totalMicro,
    ).toBe(0);
  });

  it.each([
    [{ modelId: "nope", tokensIn: 1, tokensOut: 1, marginPct: 20 }, "unknown"],
    [
      {
        modelId: "claude-sonnet-5-5",
        tokensIn: -1,
        tokensOut: 1,
        marginPct: 20,
      },
      "tokensIn",
    ],
    [
      {
        modelId: "claude-sonnet-5-5",
        tokensIn: 1,
        tokensOut: NaN,
        marginPct: 20,
      },
      "tokensOut",
    ],
    [
      {
        modelId: "claude-sonnet-5-5",
        tokensIn: 1,
        tokensOut: 1,
        marginPct: -1,
      },
      "margin",
    ],
    [
      {
        modelId: "claude-sonnet-5-5",
        tokensIn: 1,
        tokensOut: 1,
        marginPct: Infinity,
      },
      "margin",
    ],
    [
      {
        modelId: "claude-opus-5-5",
        tokensIn: 1e16,
        tokensOut: 0,
        marginPct: 20,
      },
      "safe integer",
    ],
  ])("refuses to guess a debit for %j", (args, message) => {
    expect(() => debitMicroUsd(args)).toThrow(message);
  });
});

describe("worstCaseCallMicroUsd", () => {
  it("prices the admission bound at the worst-case token counts with margin", () => {
    // (64k x 2000 + 4096 x 10000) / 1000 = 168,960; +20% = 202,752.
    expect(
      worstCaseCallMicroUsd(
        "claude-sonnet-5-5",
        PAID_BRAIN_WORST_CASE_INPUT_TOKENS,
        PAID_BRAIN_WORST_CASE_OUTPUT_TOKENS,
        20,
      ),
    ).toBe(202_752);
    expect(
      worstCaseCallMicroUsd(
        "claude-opus-5-5",
        PAID_BRAIN_WORST_CASE_INPUT_TOKENS,
        PAID_BRAIN_WORST_CASE_OUTPUT_TOKENS,
        20,
      ),
    ).toBe(405_504);
  });
  it("stays well above the measured ~20k-token call", () => {
    for (const entry of paidBrainCatalogue) {
      const typical = debitMicroUsd({
        modelId: entry.id,
        tokensIn: 20_000,
        tokensOut: 1_024,
        marginPct: 20,
      }).totalMicro;
      expect(
        worstCaseCallMicroUsd(
          entry.id,
          PAID_BRAIN_WORST_CASE_INPUT_TOKENS,
          PAID_BRAIN_WORST_CASE_OUTPUT_TOKENS,
          20,
        ),
      ).toBeGreaterThan(typical * 2);
    }
  });
});

describe("parsePaidBrain", () => {
  it("parses a complete spec and defaults onExhausted to free", () => {
    const brain = parsePaidBrain(
      paidSpec({ modelId: "claude-sonnet-5-5", monthlyCapUsd: 25, fallback }),
    );
    expect(brain).toMatchObject({
      modelId: "claude-sonnet-5-5",
      entry: { provider: "anthropic", model: "claude-sonnet-5-5" },
      monthlyCapUsd: 25,
      capMicro: 25_000_000,
      onExhausted: "free",
      fallback,
    });
    expect(
      parsePaidBrain(
        paidSpec({
          modelId: "gemini-2.5-flash",
          monthlyCapUsd: 0.5,
          onExhausted: "pause",
          fallback: { provider: "nvidia", name: ` ${fallback.name} ` },
        }),
      ),
    ).toMatchObject({
      capMicro: 500_000,
      onExhausted: "pause",
      fallback,
    });
  });

  it.each([undefined, null, "spec", 7, [], {}, { paidBrain: null }])(
    "treats %j as absent (a free or BYO brain)",
    (spec) => {
      expect(paidBrainSpecState(spec)).toEqual({ kind: "absent" });
      expect(parsePaidBrain(spec)).toBeNull();
    },
  );

  it.each([
    ["not an object", "claude-sonnet-5-5"],
    ["an array", []],
    ["unknown model", { modelId: "gpt-9", monthlyCapUsd: 25, fallback }],
    ["model id not a string", { modelId: 5, monthlyCapUsd: 25, fallback }],
    ["missing cap", { modelId: "claude-sonnet-5-5", fallback }],
    ["zero cap", { modelId: "claude-sonnet-5-5", monthlyCapUsd: 0, fallback }],
    [
      "negative cap",
      { modelId: "claude-sonnet-5-5", monthlyCapUsd: -5, fallback },
    ],
    [
      "string cap",
      { modelId: "claude-sonnet-5-5", monthlyCapUsd: "25", fallback },
    ],
    [
      "infinite cap",
      { modelId: "claude-sonnet-5-5", monthlyCapUsd: Infinity, fallback },
    ],
    [
      "absurd cap",
      { modelId: "claude-sonnet-5-5", monthlyCapUsd: 1e9, fallback },
    ],
    [
      "sub-micro cap",
      { modelId: "claude-sonnet-5-5", monthlyCapUsd: 1e-9, fallback },
    ],
    [
      "unknown onExhausted",
      {
        modelId: "claude-sonnet-5-5",
        monthlyCapUsd: 25,
        onExhausted: "stop",
        fallback,
      },
    ],
    ["missing fallback", { modelId: "claude-sonnet-5-5", monthlyCapUsd: 25 }],
    [
      "array fallback",
      { modelId: "claude-sonnet-5-5", monthlyCapUsd: 25, fallback: [] },
    ],
    [
      "paid fallback provider",
      {
        modelId: "claude-sonnet-5-5",
        monthlyCapUsd: 25,
        fallback: { provider: "anthropic", name: "claude-sonnet-5-5" },
      },
    ],
    [
      "blank fallback name",
      {
        modelId: "claude-sonnet-5-5",
        monthlyCapUsd: 25,
        fallback: { provider: "nvidia", name: "  " },
      },
    ],
    [
      "oversized fallback name",
      {
        modelId: "claude-sonnet-5-5",
        monthlyCapUsd: 25,
        fallback: { provider: "nvidia", name: "x".repeat(201) },
      },
    ],
  ])("rejects a malformed spec (%s) as NOT paid", (_label, paidBrain) => {
    const state = paidBrainSpecState(paidSpec(paidBrain));
    expect(state.kind).toBe("invalid");
    expect(parsePaidBrain(paidSpec(paidBrain))).toBeNull();
  });
});

describe("admitPaidCall", () => {
  const position = {
    balanceMicro: 1_000_000,
    monthSpendMicro: 0,
    capMicro: 25_000_000,
    worstCaseMicro: 202_752,
  };
  it("admits a call the balance and the cap both cover", () => {
    expect(admitPaidCall(position)).toEqual({ admit: true, reason: "ok" });
    // Month spend plus the worst case exactly AT the cap is within it.
    expect(
      admitPaidCall({ ...position, monthSpendMicro: 25_000_000 - 202_752 }),
    ).toEqual({ admit: true, reason: "ok" });
  });
  it("requires the balance to be ABOVE the worst case", () => {
    expect(admitPaidCall({ ...position, balanceMicro: 202_752 })).toEqual({
      admit: false,
      reason: "balance_short",
    });
    expect(admitPaidCall({ ...position, balanceMicro: -10 })).toEqual({
      admit: false,
      reason: "balance_short",
    });
  });
  it("refuses a call that could cross the monthly cap", () => {
    expect(
      admitPaidCall({ ...position, monthSpendMicro: 25_000_000 - 202_751 }),
    ).toEqual({ admit: false, reason: "cap_reached" });
    expect(admitPaidCall({ ...position, monthSpendMicro: 30_000_000 })).toEqual(
      { admit: false, reason: "cap_reached" },
    );
  });
  it.each([
    { balanceMicro: NaN },
    { balanceMicro: 1.5 },
    { monthSpendMicro: -1 },
    { capMicro: 0 },
    { worstCaseMicro: 0 },
    { worstCaseMicro: Infinity },
  ])("fails closed on an invalid position %j", (change) => {
    expect(admitPaidCall({ ...position, ...change })).toEqual({
      admit: false,
      reason: "invalid_position",
    });
  });
});

describe("monthStartUtc and debit keys", () => {
  it("starts the month at 00:00 UTC on the 1st", () => {
    expect(monthStartUtc(Date.UTC(2026, 9, 7, 13, 5)).toISOString()).toBe(
      "2026-10-01T00:00:00.000Z",
    );
    expect(monthStartUtc(Date.UTC(2026, 9, 31, 23, 59, 59)).toISOString()).toBe(
      "2026-10-01T00:00:00.000Z",
    );
    expect(monthStartUtc(Date.UTC(2026, 10, 1, 0, 0, 0)).toISOString()).toBe(
      "2026-11-01T00:00:00.000Z",
    );
  });
  it("keys one debit per persisted cycle and refuses an unpersisted one", () => {
    expect(debitIdempotencyKey(4242)).toBe("debit:4242");
    for (const bad of [0, -1, 1.5, NaN]) {
      expect(() => debitIdempotencyKey(bad)).toThrow("persisted cycle id");
    }
  });
});

describe("paidCycleCharge", () => {
  const brain = parsePaidBrain(
    paidSpec({ modelId: "claude-sonnet-5-5", monthlyCapUsd: 25, fallback }),
  ) as PaidBrain;
  const answered = {
    brain,
    llmCallMade: true,
    effectiveProvider: "anthropic",
    effectiveModel: "claude-sonnet-5-5",
    tokensIn: 20_000,
    tokensOut: 400,
    calls: [{ ok: true, usageReported: true }],
  };
  it("charges an answered call with provider-reported usage", () => {
    expect(paidCycleCharge(answered)).toEqual({
      charge: true,
      tokensIn: 20_000,
      tokensOut: 400,
      usageEstimated: false,
    });
  });
  it("still charges, flagged estimated, when the provider reported no usage", () => {
    expect(
      paidCycleCharge({
        ...answered,
        tokensIn: 5_000.4,
        calls: [{ ok: true, usageReported: false }],
      }),
    ).toEqual({
      charge: true,
      tokensIn: 5_001,
      tokensOut: 400,
      usageEstimated: true,
    });
  });
  it.each([
    ["deferred: no call made", { llmCallMade: false }],
    ["metering absent", { llmCallMade: undefined }],
    ["failed call", { calls: [{ ok: false, usageReported: true }] }],
    ["no observed call", { calls: [] }],
    ["another provider served", { effectiveProvider: "nvidia" }],
    ["another model served", { effectiveModel: "claude-opus-5-5" }],
    ["missing tokens", { tokensIn: undefined }],
    ["negative tokens", { tokensOut: -1 }],
    ["non-finite tokens", { tokensIn: NaN }],
  ])("never charges %s", (_label, change) => {
    expect(paidCycleCharge({ ...answered, ...change }).charge).toBe(false);
  });
});
