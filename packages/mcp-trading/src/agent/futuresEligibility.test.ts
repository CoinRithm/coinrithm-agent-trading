import { describe, it, expect } from "vitest";
import {
  futuresEntryEligibilityOf,
  futuresEntryPreflight,
  type FuturesEntryEligibility,
} from "./futuresEligibility.js";
import type { Observation, ProposedAction } from "./types.js";

const eligibility = (
  over: Partial<FuturesEntryEligibility> = {},
): FuturesEntryEligibility => ({
  status: "eligible",
  referenceRequired: true,
  venue: "binance",
  symbol: "BTCUSDT",
  referenceFetchedAt: "2026-09-30T00:55:00.000Z",
  maxReferenceAgeHours: 6,
  evaluatedAt: "2026-09-30T01:00:00.000Z",
  ...over,
});

const obs = (
  futuresEntryEligibility?: FuturesEntryEligibility,
  openPositions: Observation["openPositions"] = [],
): Observation => ({
  asOf: "t",
  scopes: ["trade:futures"],
  cashAvailableMusd: 1000,
  equityMusd: 50000,
  openPositions,
  openOrders: [],
  pmPositions: [],
  pmMarkets: [],
  watch: [
    {
      symbol: "SLVON",
      coinId: "99",
      freshness: { status: "fresh" },
      discovered: true,
      ...(futuresEntryEligibility ? { futuresEntryEligibility } : {}),
    },
  ],
  syncCursor: null,
  newClosedTrades: [],
  polledBeforeWrite: true,
});

const open = {
  type: "futures_open",
  symbol: "SLVON",
  side: "long",
  leverage: 3,
  marginMusd: 50,
  confidence: 0.8,
} as unknown as ProposedAction;

describe("futuresEntryPreflight", () => {
  it("supported fresh reference: the open proceeds to the quote", () => {
    expect(futuresEntryPreflight(open, obs(eligibility()))).toBeNull();
  });

  it("missing reference row: a NEW open is refused before the quote, with a coded reason", () => {
    const r = futuresEntryPreflight(
      open,
      obs(
        eligibility({
          status: "reference_unavailable",
          venue: null,
          symbol: null,
          referenceFetchedAt: null,
        }),
      ),
    );
    expect(r?.code).toBe("futures_reference_unavailable");
    expect(r?.reason).toContain("no supported perpetual reference");
    expect(r?.reason).not.toMatch(/does not exist|no perpetual anywhere/i);
  });

  it("stale reference: a NEW open is refused before the quote", () => {
    expect(
      futuresEntryPreflight(
        open,
        obs(eligibility({ status: "reference_stale" })),
      )?.code,
    ).toBe("futures_reference_stale");
  });

  it("unknown eligibility (older API, no field): today's behaviour, the server decides", () => {
    expect(futuresEntryPreflight(open, obs(undefined))).toBeNull();
    expect(
      futuresEntryPreflight(
        open,
        obs(
          eligibility({
            status: "reference_unavailable",
            referenceRequired: false,
          }),
        ),
      ),
    ).toBeNull();
  });

  it("existing-position management is never refused: adds, closes, SL/TP and spot", () => {
    const unavailable = eligibility({ status: "reference_unavailable" });
    const held = obs(unavailable, [
      {
        venue: "futures",
        id: 7,
        symbol: "SLVON",
        side: "long",
        status: "open",
      },
    ]);
    expect(futuresEntryPreflight(open, held)).toBeNull();
    for (const action of [
      { type: "futures_close", positionId: 7 },
      { type: "futures_set_sltp", positionId: 7, stopLossPrice: 1 },
      { type: "spot_order", symbol: "SLVON", side: "buy", quantity: 1 },
    ]) {
      expect(
        futuresEntryPreflight(
          action as unknown as ProposedAction,
          obs(unavailable),
        ),
      ).toBeNull();
    }
  });
});

describe("futuresEntryEligibilityOf", () => {
  it("parses the API field and treats anything malformed as unknown", () => {
    expect(
      futuresEntryEligibilityOf({ futuresEntryEligibility: eligibility() }),
    ).toEqual(eligibility());
    expect(futuresEntryEligibilityOf({})).toBeUndefined();
    expect(
      futuresEntryEligibilityOf({
        futuresEntryEligibility: { status: "maybe", referenceRequired: true },
      }),
    ).toBeUndefined();
    expect(
      futuresEntryEligibilityOf({
        futuresEntryEligibility: { status: "eligible" },
      }),
    ).toBeUndefined();
    // Explicit unavailable/stale with broken contract fields is UNKNOWN, never a block.
    const bad: Array<Record<string, unknown>> = [
      {
        ...eligibility({ status: "reference_unavailable" }),
        evaluatedAt: undefined,
      },
      {
        ...eligibility({ status: "reference_unavailable" }),
        evaluatedAt: "yesterday",
      },
      {
        ...eligibility({ status: "reference_stale" }),
        maxReferenceAgeHours: 0,
      },
      {
        ...eligibility({ status: "reference_stale" }),
        maxReferenceAgeHours: "6",
      },
      {
        ...eligibility({ status: "reference_stale" }),
        maxReferenceAgeHours: Number.NaN,
      },
      {
        ...eligibility({ status: "reference_stale" }),
        referenceFetchedAt: "not a date",
      },
      {
        ...eligibility({ status: "reference_unavailable" }),
        referenceRequired: "true",
      },
    ];
    // Not a zoned ISO date-time, although Date.parse accepts each of them.
    for (const notZoned of [
      "0",
      "2026-09-30",
      "2026-09-30T01:00:00",
      "2026-09-30 01:00:00Z",
    ]) {
      bad.push({
        ...eligibility({ status: "reference_unavailable" }),
        evaluatedAt: notZoned,
      });
      bad.push({
        ...eligibility({ status: "reference_stale" }),
        referenceFetchedAt: notZoned,
      });
    }
    expect(
      futuresEntryEligibilityOf({
        futuresEntryEligibility: eligibility({
          evaluatedAt: "2026-09-30T02:00:00+01:00",
        }),
      })?.evaluatedAt,
    ).toBe("2026-09-30T02:00:00+01:00");
    for (const futuresEntryEligibility of bad) {
      expect(
        futuresEntryEligibilityOf({ futuresEntryEligibility }),
      ).toBeUndefined();
    }
  });
});
