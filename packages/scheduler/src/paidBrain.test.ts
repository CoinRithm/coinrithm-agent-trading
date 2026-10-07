import { describe, expect, it } from "vitest";
import {
  PAID_BRAIN_MAX_OUTPUT_TOKENS,
  PAID_BRAIN_FRAMING_TOKENS,
  PAID_BRAIN_INPUT_TOKEN_BOUND,
  PAID_BRAIN_MAX_INPUT_BYTES,
  paidInputBytes,
  admitPaidCall,
  classifyPaidCall,
  debitKeyFor,
  monthStartUtc,
  paidBrainCatalogue,
  paidBrainModel,
  paidBrainSpecState,
  parsePaidBrain,
  priceRowAt,
  priceUsage,
  releaseKeyFor,
  reserveKeyFor,
  worstCaseCallMicroUsd,
  type PaidBrainPriceRow,
} from "./paidBrain.js";

const fallback = {
  provider: "nvidia",
  name: "nvidia/nemotron-3-super-120b-a12b",
};
const paidSpec = (paidBrain: unknown) => ({ pinnedModel: false, paidBrain });
const OCT_7 = Date.UTC(2026, 9, 7, 12);
const row = (modelId: string, at = OCT_7): PaidBrainPriceRow =>
  priceRowAt(paidBrainModel(modelId)!, at)!;

describe("paid brain catalogue (Data's price table, 2026-10-07)", () => {
  it("prices each SKU in integer micro-USD per thousand tokens, cache rates per SKU", () => {
    expect(row("claude-sonnet-5-5")).toMatchObject({
      inputK: 2_000,
      cacheReadK: 200,
      cacheWrite5mK: 2_500,
      cacheWrite1hK: 4_000,
      outputK: 10_000,
    });
    // Opus cache read is 0.05x input and the 1h write 2x: no fixed multiplier.
    expect(row("claude-opus-5-5")).toMatchObject({
      inputK: 4_000,
      cacheReadK: 200,
      cacheWrite5mK: 5_000,
      cacheWrite1hK: 8_000,
      outputK: 20_000,
    });
    for (const entry of paidBrainCatalogue) {
      for (const price of entry.prices) {
        for (const value of [
          price.inputK,
          price.outputK,
          price.cacheReadK ?? 0,
          price.cacheWrite5mK ?? 0,
          price.cacheWrite1hK ?? 0,
        ]) {
          expect(Number.isSafeInteger(value)).toBe(true);
        }
      }
    }
  });

  it("ships Gemini disabled until a live usage probe, Claude enabled", () => {
    const enabled = Object.fromEntries(
      paidBrainCatalogue.map((entry) => [entry.id, entry.enabled]),
    );
    expect(enabled).toEqual({
      "claude-sonnet-5-5": true,
      "claude-opus-5-5": true,
      "gemini-2.5-flash": false,
      "gemini-2.5-flash-lite": false,
      "gemini-3.8-flash": false,
    });
  });

  it("selects the price row valid at call time, both UTC days inclusive", () => {
    const gemini = paidBrainModel("gemini-3.8-flash")!;
    expect(priceRowAt(gemini, Date.UTC(2026, 11, 31, 23, 59))?.inputK).toBe(
      750,
    );
    expect(priceRowAt(gemini, Date.UTC(2027, 0, 1))?.inputK).toBe(1_500);
    expect(
      priceRowAt(paidBrainModel("claude-sonnet-5-5")!, Date.UTC(2026, 9, 6)),
    ).toBeUndefined();
  });
});

describe("priceUsage", () => {
  it("prices provider-reported input and output with the margin, rounded up once", () => {
    // 20k x $2/M + 400 x $10/M = 44,000 micro; x 1.20 = 52,800.
    expect(
      priceUsage(
        row("claude-sonnet-5-5"),
        { promptTokens: 20_000, completionTokens: 400 },
        20,
      ),
    ).toEqual({
      providerCostMicro: 44_000,
      marginMicro: 8_800,
      totalMicro: 52_800,
      notes: [],
    });
  });

  it("prices cache reads and the reported 5m/1h write split at their own SKU rates", () => {
    // Opus: 1,000 in x 4000 + 10,000 read x 200 + 2,000 5m x 5000
    //       + 1,000 1h x 8000 + 500 out x 20000 = 34,000,000 / 1000 = 34,000.
    expect(
      priceUsage(
        row("claude-opus-5-5"),
        {
          promptTokens: 1_000,
          completionTokens: 500,
          cacheReadTokens: 10_000,
          cacheWriteTokens: 3_000,
          cacheWrite5mTokens: 2_000,
          cacheWrite1hTokens: 1_000,
        },
        20,
      ),
    ).toEqual({
      providerCostMicro: 34_000,
      marginMicro: 6_800,
      totalMicro: 40_800,
      notes: ["cache read 10000, cache write 5m 2000, 1h 1000"],
    });
  });

  it("prices a write total without its split at the 1h rate, the higher one, and notes it", () => {
    const priced = priceUsage(
      row("claude-sonnet-5-5"),
      { promptTokens: 0, completionTokens: 0, cacheWriteTokens: 1_000 },
      0,
    );
    expect(priced.providerCostMicro).toBe(4_000);
    expect(priced.notes[0]).toBe(
      "cache write split not reported: 1000 priced at the 1h rate",
    );
  });

  it("rounds up to whole micro-USD, never down", () => {
    // 1 cache-read token on Sonnet = 0.2 micro; x 1.2 = 0.24 -> 1.
    expect(
      priceUsage(
        row("claude-sonnet-5-5"),
        { promptTokens: 0, completionTokens: 0, cacheReadTokens: 1 },
        20,
      ),
    ).toMatchObject({ providerCostMicro: 1, marginMicro: 0, totalMicro: 1 });
    expect(
      priceUsage(
        row("claude-sonnet-5-5"),
        { promptTokens: 999.2, completionTokens: 0 },
        0,
      ).providerCostMicro,
    ).toBe(2_000);
  });

  it("refuses to price what the row cannot price, or invalid inputs", () => {
    // Gemini rows carry no cache-write rate.
    expect(() =>
      priceUsage(
        row("gemini-2.5-flash"),
        { promptTokens: 1, completionTokens: 1, cacheWrite5mTokens: 5 },
        20,
      ),
    ).toThrow("cannot price");
    expect(() =>
      priceUsage(
        row("claude-sonnet-5-5"),
        { promptTokens: -1, completionTokens: 1 },
        20,
      ),
    ).toThrow("non-negative");
    for (const margin of [-1, 1.5, Number.NaN]) {
      expect(() =>
        priceUsage(
          row("claude-sonnet-5-5"),
          { promptTokens: 1, completionTokens: 1 },
          margin,
        ),
      ).toThrow("whole non-negative percent");
    }
    expect(() =>
      priceUsage(
        row("claude-opus-5-5"),
        { promptTokens: 1e16, completionTokens: 0 },
        20,
      ),
    ).toThrow("safe integer");
  });
});

describe("worstCaseCallMicroUsd", () => {
  it("reserves the proven input bound as uncached input plus the 4096-token output cap, with margin", () => {
    expect(PAID_BRAIN_MAX_INPUT_BYTES).toBe(160_000);
    expect(PAID_BRAIN_FRAMING_TOKENS).toBe(512);
    expect(PAID_BRAIN_INPUT_TOKEN_BOUND).toBe(160_512);
    expect(PAID_BRAIN_MAX_OUTPUT_TOKENS).toBe(4_096);
    // (160,512 x 2000 + 4096 x 10000) / 1000 = 361,984; x 1.2 = 434,380.8 -> 434,381.
    expect(worstCaseCallMicroUsd(row("claude-sonnet-5-5"), 20)).toBe(434_381);
    // (160,512 x 4000 + 4096 x 20000) / 1000 = 723,968; x 1.2 = 868,761.6 -> 868,762.
    expect(worstCaseCallMicroUsd(row("claude-opus-5-5"), 20)).toBe(868_762);
  });
});

describe("paidInputBytes", () => {
  it("counts UTF-8 bytes of system plus the larger user presentation", () => {
    expect(paidInputBytes({ system: "abc", user: "de" })).toBe(5);
    // Multi-byte text counts bytes, not characters: "ş" is 2 bytes, "€" 3.
    expect(paidInputBytes({ system: "ş", user: "€" })).toBe(5);
    expect(
      paidInputBytes({ system: "s", user: "u", compactUser: "longer" }),
    ).toBe(7);
  });
});

describe("parsePaidBrain", () => {
  it("parses a complete spec with an explicit exhaustion choice", () => {
    expect(
      parsePaidBrain(
        paidSpec({
          modelId: "claude-sonnet-5-5",
          monthlyCapUsd: 25,
          onExhausted: "free",
          fallback,
        }),
      ),
    ).toMatchObject({
      modelId: "claude-sonnet-5-5",
      entry: { provider: "anthropic", model: "claude-sonnet-5-5" },
      capMicro: 25_000_000,
      onExhausted: "free",
      fallback,
    });
    expect(
      parsePaidBrain(
        paidSpec({
          modelId: "claude-opus-5-5",
          monthlyCapUsd: 0.5,
          onExhausted: "pause",
          fallback: { provider: "nvidia", name: ` ${fallback.name} ` },
        }),
      ),
    ).toMatchObject({ capMicro: 500_000, onExhausted: "pause", fallback });
  });

  it("has NO default exhaustion choice: a spec without one is not paid", () => {
    const state = paidBrainSpecState(
      paidSpec({ modelId: "claude-sonnet-5-5", monthlyCapUsd: 25, fallback }),
    );
    expect(state).toEqual({
      kind: "invalid",
      reason: "onExhausted must be explicitly free or pause",
    });
    expect(
      parsePaidBrain(
        paidSpec({
          modelId: "claude-sonnet-5-5",
          monthlyCapUsd: 25,
          onExhausted: null,
          fallback,
        }),
      ),
    ).toBeNull();
  });

  it.each([undefined, null, "spec", 7, [], {}, { paidBrain: null }])(
    "treats %j as absent (a free or BYO brain)",
    (spec) => {
      expect(paidBrainSpecState(spec)).toEqual({ kind: "absent" });
      expect(parsePaidBrain(spec)).toBeNull();
    },
  );

  const base = {
    modelId: "claude-sonnet-5-5",
    monthlyCapUsd: 25,
    onExhausted: "free",
    fallback,
  };
  it.each([
    ["not an object", "claude-sonnet-5-5"],
    ["an array", []],
    ["unknown model", { ...base, modelId: "gpt-9" }],
    ["model id not a string", { ...base, modelId: 5 }],
    ["missing cap", { ...base, monthlyCapUsd: undefined }],
    ["zero cap", { ...base, monthlyCapUsd: 0 }],
    ["negative cap", { ...base, monthlyCapUsd: -5 }],
    ["string cap", { ...base, monthlyCapUsd: "25" }],
    ["infinite cap", { ...base, monthlyCapUsd: Infinity }],
    ["absurd cap", { ...base, monthlyCapUsd: 1e9 }],
    ["sub-micro cap", { ...base, monthlyCapUsd: 1e-9 }],
    ["unknown onExhausted", { ...base, onExhausted: "stop" }],
    ["missing fallback", { ...base, fallback: undefined }],
    ["array fallback", { ...base, fallback: [] }],
    [
      "paid fallback provider",
      {
        ...base,
        fallback: { provider: "anthropic", name: "claude-sonnet-5-5" },
      },
    ],
    [
      "blank fallback name",
      { ...base, fallback: { provider: "nvidia", name: " " } },
    ],
    [
      "oversized fallback name",
      { ...base, fallback: { provider: "nvidia", name: "x".repeat(201) } },
    ],
  ])("rejects a malformed spec (%s) as NOT paid", (_label, paidBrain) => {
    expect(paidBrainSpecState(paidSpec(paidBrain)).kind).toBe("invalid");
    expect(parsePaidBrain(paidSpec(paidBrain))).toBeNull();
  });
});

describe("admitPaidCall", () => {
  const position = {
    balanceMicro: 1_000_000,
    monthSpendMicro: 0,
    capMicro: 25_000_000,
    worstCaseMicro: 202_752,
    uncertain: false,
  };
  it("admits a call the balance and the cap both cover", () => {
    expect(admitPaidCall(position)).toEqual({ admit: true, reason: "ok" });
    // Balance exactly the worst case, and month spend + worst exactly the cap.
    expect(
      admitPaidCall({
        ...position,
        balanceMicro: 202_752,
        monthSpendMicro: 25_000_000 - 202_752,
      }),
    ).toEqual({ admit: true, reason: "ok" });
  });
  it("refuses every new paid call while the owner's metering is uncertain", () => {
    expect(admitPaidCall({ ...position, uncertain: true })).toEqual({
      admit: false,
      reason: "metering_uncertain",
    });
  });
  it("refuses when the balance is below the worst case", () => {
    expect(admitPaidCall({ ...position, balanceMicro: 202_751 })).toEqual({
      admit: false,
      reason: "balance_short",
    });
  });
  it("refuses a call that could cross the monthly cap", () => {
    expect(
      admitPaidCall({ ...position, monthSpendMicro: 25_000_000 - 202_751 }),
    ).toEqual({ admit: false, reason: "cap_reached" });
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

describe("month attribution and ledger keys", () => {
  it("attributes a reservation to the UTC month it was made in", () => {
    expect(monthStartUtc(Date.UTC(2026, 9, 7, 13, 5))).toBe("2026-10-01");
    expect(monthStartUtc(Date.UTC(2026, 9, 31, 23, 59, 59))).toBe("2026-10-01");
    expect(monthStartUtc(Date.UTC(2026, 10, 1, 0, 0, 0))).toBe("2026-11-01");
  });
  it("derives release and debit keys from the reserve key", () => {
    const key = reserveKeyFor(42, "0f8c1b2e-aaaa-4bbb-8ccc-123456789abc");
    expect(key).toBe("reserve:42:0f8c1b2e-aaaa-4bbb-8ccc-123456789abc");
    expect(releaseKeyFor(key)).toBe(`release:${key}`);
    expect(debitKeyFor(key)).toBe(`debit:${key}`);
    for (const [agentId, cycleKey] of [
      [0, "a"],
      [1.5, "a"],
      [42, ""],
      [42, "has:colon"],
      [42, "x".repeat(65)],
    ] as const) {
      expect(() => reserveKeyFor(agentId, cycleKey)).toThrow();
    }
  });
});

describe("classifyPaidCall", () => {
  const usage = { promptTokens: 10, completionTokens: 5 };
  it.each([
    [
      "an answer with usage",
      { ok: true, usage },
      { status: "answered", usage },
    ],
    [
      "an incomplete answer the provider still billed",
      { ok: false, usage, status: undefined },
      { status: "answered", usage },
    ],
    [
      "an answer without usage (never estimated)",
      { ok: true },
      { status: "uncertain", reason: "answered without usage" },
    ],
    [
      "a timeout or transport failure (no HTTP status)",
      { ok: false },
      { status: "uncertain", reason: "no provider response" },
    ],
    [
      "a known pre-processing rejection (rate limit)",
      { ok: false, status: 429 },
      { status: "rejected", providerStatus: 429 },
    ],
    [
      "a known pre-processing rejection (invalid request)",
      { ok: false, status: 400 },
      { status: "rejected", providerStatus: 400 },
    ],
    [
      "an overload (529) without usage, never released",
      { ok: false, status: 529 },
      { status: "uncertain", reason: "HTTP 529 without usage" },
    ],
    [
      "a 5xx without usage, never released",
      { ok: false, status: 500 },
      { status: "uncertain", reason: "HTTP 500 without usage" },
    ],
    [
      "a deferred attempt",
      { ok: false, deferred: true },
      { status: "not_called" },
    ],
  ])("classifies %s", (_label, res, expected) => {
    expect(classifyPaidCall(res)).toEqual(expected);
  });
});
