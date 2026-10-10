import { describe, expect, it } from "vitest";
import {
  pmCandidateWithinHorizon,
  pmHeldNativeMarkets,
  pmPaperCandidates,
} from "./pmPaperCandidates.js";
import { expandPmMarkets } from "./observe.js";

const now = Date.parse("2026-10-10T10:00:00.000Z");
const day = 86_400_000;
const market = "0x" + "a".repeat(64);
const outcome = (
  id = "KXBTC-1",
  end: unknown = new Date(now + day).toISOString(),
) => ({
  externalMarketId: id,
  probability: 60,
  nativeMarket: { venue: "kalshi", key: `kalshi:${id}` },
  nativeEndAt: end,
  nativeEndBasis: "kalshi_market_close_time",
  settlementTimeKnown: false,
});
const event = (outcomes: unknown[], extra = {}) => ({
  source: "kalshi",
  slug: "fixture",
  title: "Fixture",
  outcomes,
  ...extra,
});
const payload = (...data: unknown[]) => ({
  executionModel: "pm_paper_v2",
  data,
});
const select = (
  data: unknown,
  days: number | undefined = 1,
  held = new Set<string>(),
) => pmPaperCandidates(data, held, days, now);

describe("PM v2 native candidates", () => {
  it("fails closed on missing source/native shape without throwing", () => {
    expect(
      select(
        payload(
          { outcomes: [{}, null] },
          { source: "unknown", outcomes: [outcome()] },
          { source: "kalshi", outcomes: null },
        ),
      ),
    ).toEqual([]);
  });
  it("deduplicates native aliases/YES-NO tokens and held markets before the twelve cap", () => {
    const aliases = Array.from({ length: 15 }, (_, i) =>
      event(
        [
          {
            ...outcome(`TOKEN-${i}`),
            nativeMarket: { venue: "polymarket", key: `polymarket:${market}` },
            nativeEndBasis: "gamma_market_endDate",
          },
        ],
        { source: "polymarket", slug: `alias-${i}` },
      ),
    );
    const current = event(
      Array.from({ length: 15 }, (_, i) => outcome(`KXBTC-${i}`)),
    );
    const data = payload(...aliases, current);
    const rows = select(
      data,
      1,
      new Set([`polymarket:${market}`, "kalshi:KXBTC-0"]),
    );
    expect(rows).toHaveLength(12);
    expect(rows.map((r) => r.outcomeExternalMarketId)).toEqual(
      Array.from({ length: 12 }, (_, i) => `KXBTC-${i + 1}`),
    );
    expect(select(payload(...aliases))).toHaveLength(1);
    // Legacy helper keeps its established per-event expansion policy.
    expect(expandPmMarkets({ data: [current] }, new Set())).toHaveLength(3);
  });
  it("filters annual/unknown outcomes before cap and keeps exact upper horizon boundary", () => {
    const rejected = Array.from({ length: 20 }, (_, i) =>
      outcome(`LONG-${i}`, new Date(now + 365 * day).toISOString()),
    );
    const rows = select(
      payload(event([...rejected, outcome("UNKNOWN", null), outcome("EXACT")])),
    );
    expect(rows.map((r) => r.outcomeExternalMarketId)).toEqual(["EXACT"]);
    expect(rows[0]).toMatchObject({
      nativeEndAt: new Date(now + day).toISOString(),
      nativeEndBasis: "kalshi_market_close_time",
      settlementTimeKnown: false,
    });
  });
  it.each([
    null,
    "0001-01-01T00:00:00.000Z",
    "1999-12-31T23:59:59.999Z",
    "2026-02-30T00:00:00.000Z",
    "2026-10-11",
    "2026-10-11T10:00:00+00:00",
    new Date(now).toISOString(),
    new Date(now - 1).toISOString(),
    new Date(now + day + 1).toISOString(),
  ])("refuses unknown/sentinel/expired/outside native end %s", (value) => {
    expect(
      select(
        payload(
          event([outcome("KXBTC", value)], {
            endDate: new Date(now + 1).toISOString(),
          }),
        ),
      ),
    ).toEqual([]);
  });
  it("does not infer native maturity from event date or wrong provider field", () => {
    expect(
      select(
        payload(
          event([{ ...outcome(), nativeEndBasis: "gamma_market_endDate" }], {
            endDate: new Date(now + 1).toISOString(),
          }),
        ),
      ),
    ).toEqual([]);
  });
  it("optional policy omission keeps unknown maturity without promoting event date", () => {
    const rows = pmPaperCandidates(
      payload(
        event([outcome("UNKNOWN", null)], {
          endDate: new Date(now + day).toISOString(),
        }),
      ),
      new Set(),
      undefined,
      now,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      nativeEndAt: null,
      settlementTimeKnown: false,
    });
    expect(rows[0]?.endDate).toBeUndefined();
  });
  it.each([0, 31, 1.5, NaN])(
    "refuses invalid configured horizon %s",
    (days) => {
      expect(select(payload(event([outcome()])), days)).toEqual([]);
    },
  );
  it("requires valid current clock and rechecks maturity at decision time", () => {
    const c = { nativeEndAt: new Date(now + 1).toISOString() };
    expect(pmCandidateWithinHorizon(c, 1, NaN)).toBe(false);
    expect(pmCandidateWithinHorizon(c, 1, now)).toBe(true);
    expect(pmCandidateWithinHorizon(c, 1, now + 1)).toBe(false);
    expect(
      pmCandidateWithinHorizon(
        { nativeEndAt: new Date(now + 30 * day).toISOString() },
        30,
        now,
      ),
    ).toBe(true);
  });
  it.each([null, {}, { data: [] }, { executionModel: "legacy", data: [] }])(
    "never falls back from a non-v2 response",
    (value) => expect(select(value)).toEqual([]),
  );
  it("ignores malformed/ineligible evidence without reserving that native key", () => {
    const bad = [
      null,
      { ...outcome(), probability: NaN },
      { ...outcome(), probability: -1 },
      { ...outcome(), probability: 101 },
      { ...outcome(), externalMarketId: "" },
      { ...outcome(), eligible: false },
      {
        ...outcome(),
        nativeMarket: { venue: "polymarket", key: "kalshi:KXBTC-1" },
      },
      {
        ...outcome(),
        nativeMarket: { venue: "kalshi", key: "kalshi:lowercase" },
      },
    ];
    const rows = select(
      payload(
        null,
        event([outcome()], { eligible: false }),
        event([outcome()], { quality: { decisionEligible: false } }),
        event([outcome()], { slug: "" }),
        event([...bad, outcome()]),
      ),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.nativeMarketKey).toBe("kalshi:KXBTC-1");
  });
  it("retains true probability endpoints and exact token IDs", () => {
    expect(
      select(
        payload(
          event([
            { ...outcome("ZERO"), probability: 0 },
            { ...outcome("ONE"), probability: 100 },
          ]),
        ),
      ).map((r) => r.probability),
    ).toEqual([0, 1]);
  });
});

describe("held native identities", () => {
  it("includes accounting-pending closed exposure and ignores settled rows", () => {
    const held = pmHeldNativeMarkets([
      {
        source: "polymarket",
        accountingStatus: "open",
        entry: {
          nativeIdentity: {
            venue: "polymarket",
            market: market.toUpperCase().replace("0X", "0x"),
            tokenId: "YES",
          },
        },
      },
      {
        source: "kalshi",
        accountingStatus: "pending",
        status: "closed_sold",
        entry: {
          nativeIdentity: {
            venue: "kalshi",
            requestedTicker: "KXBTC",
            side: "no",
          },
        },
      },
      { accountingStatus: "settled" },
    ]);
    expect(held.complete).toBe(true);
    expect([...held.keys]).toEqual([`polymarket:${market}`, "kalshi:KXBTC"]);
  });
  it.each([
    null,
    {},
    {
      source: "kalshi",
      entry: { nativeIdentity: { venue: "polymarket", market } },
    },
    {
      source: "polymarket",
      entry: { nativeIdentity: { venue: "polymarket", market: "alias" } },
    },
  ])("holds new entries for unknown or mismatched entry identity", (value) => {
    expect(pmHeldNativeMarkets([value]).complete).toBe(false);
  });
});
