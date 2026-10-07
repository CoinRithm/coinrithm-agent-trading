import { describe, expect, it } from "vitest";
import { LabelFile, parseLabelFile, scoreAction } from "./labels.js";
import { FUTURES_SYNTHETIC_FEE_BPS } from "./costs.js";
import type { ProposedAction, QuoteEvidence } from "../types.js";

const ASOF = "2026-10-07T10:00:00.000Z";
const T0 = Date.parse(ASOF) / 1000;
const bar = (dt: number, h: number, l: number, c: number) => ({
  t: T0 + dt,
  h,
  l,
  c,
});

const pmOpen = (forecast?: number): ProposedAction => ({
  type: "pm_open",
  source: "polymarket",
  slug: "bitcoin-above",
  outcomeExternalMarketId: "0xabc",
  stakeMusd: 10,
  ...(forecast !== undefined ? { forecastProbability: forecast } : {}),
});

const longOpen = (over: Partial<ProposedAction> = {}): ProposedAction =>
  ({
    type: "futures_open",
    symbol: "BTC",
    side: "long",
    leverage: 2,
    marginMusd: 50,
    stopLossPrice: 95,
    takeProfitPrice: 110,
    ...over,
  }) as ProposedAction;

const futQuote: QuoteEvidence = { eligible: true, entryPrice: 100 };
const fees = (lev: number) => (2 * FUTURES_SYNTHETIC_FEE_BPS * lev) / 10_000;

const score = (
  action: ProposedAction,
  labels: LabelFile | undefined,
  quote: QuoteEvidence | undefined = futQuote,
  asOf = ASOF,
) => scoreAction({ action, quote, asOf, labels });

describe("label file parsing", () => {
  it("accepts the documented shape and upper-cases symbols", () => {
    const parsed = parseLabelFile(
      {
        pm: { "a/b/c": { settled: 0 } },
        prices: { btc: [{ t: 1, h: 2, l: 0.5, c: 1, extra: 9 }] },
        funding: { btc: [{ t: 1, rate: 0.0001 }] },
        horizonHours: 24,
        barSeconds: 60,
      },
      "x",
    );
    expect(parsed).toEqual({
      pm: { "a/b/c": { settled: 0 } },
      prices: { BTC: [{ t: 1, h: 2, l: 0.5, c: 1 }] },
      funding: { BTC: [{ t: 1, rate: 0.0001 }] },
      horizonHours: 24,
      barSeconds: 60,
    });
  });

  it.each([
    [[], /not a JSON object/],
    [{ pm: [] }, /pm must be an object/],
    [{ pm: { "a/b/c": { settled: true } } }, /settled must be 0 or 1/],
    [
      { pm: { "a/b": { settled: 1 } } },
      /source\/slug\/outcomeExternalMarketId/,
    ],
    [{ prices: 3 }, /prices must be an object/],
    [{ prices: { BTC: {} } }, /must be an array/],
    [{ prices: { BTC: [{ t: 1, h: 2 }] } }, /needs numeric t, h, l, c/],
    [{ funding: { BTC: [{ t: 1 }] } }, /needs numeric t, rate/],
    [{ horizonHours: 0 }, /horizonHours must be a positive number/],
    [{ barSeconds: "5m" }, /barSeconds must be a positive number/],
  ])("rejects %j", (value, error) => {
    expect(() => parseLabelFile(value, "f.json")).toThrow(error);
  });
});

describe("PM scoring", () => {
  const labels: LabelFile = {
    pm: { "Polymarket/Bitcoin-Above/0xabc": { settled: 0 } },
  };
  const quote: QuoteEvidence = {
    eligible: true,
    entryProbability: 10,
    stakeMusd: 10,
    sharesEstimate: 80,
  };

  it("scores Brier, market Brier and P&L from the fee-inclusive cost", () => {
    const lost = score(pmOpen(30), labels, quote) as {
      brier: number;
      marketBrier: number;
    };
    expect(lost).toMatchObject({
      status: "labelled",
      venue: "pm",
      settled: 0,
      cost: 0.125,
      pnlPerShare: -0.125,
      returnOnStake: -1,
      pnlMusd: -10,
    });
    expect(lost.brier).toBeCloseTo(0.09, 12);
    expect(lost.marketBrier).toBeCloseTo(0.01, 12);
    const won = score(
      pmOpen(),
      { pm: { "polymarket/bitcoin-above/0xabc": { settled: 1 } } },
      { eligible: true, entryProbability: 25 },
    );
    expect(won).toMatchObject({ cost: 0.25, returnOnStake: 3, pnlMusd: 30 });
    expect(won).not.toHaveProperty("brier");
  });

  it("is unlabelled without a settlement or a usable cost", () => {
    expect(score(pmOpen(30), { pm: {} }, quote)).toEqual({
      status: "unlabelled",
      reason: "no_pm_settlement_label",
    });
    expect(score(pmOpen(30), labels, { eligible: true })).toEqual({
      status: "unlabelled",
      reason: "no_entry_cost",
    });
    expect(score(pmOpen(30), undefined, quote)).toEqual({
      status: "unlabelled",
      reason: "no_label_file",
    });
  });
});

describe("futures OHLC walk model", () => {
  it("exits at the take-profit after fees", () => {
    const s = score(longOpen(), {
      prices: { BTC: [bar(300, 105, 99, 104), bar(600, 111, 100, 110)] },
    });
    expect(s).toMatchObject({
      status: "labelled",
      venue: "futures",
      basis: "ohlc_walk_model",
      exit: "take_profit",
      exitPrice: 110,
      sameBarStopAndTarget: false,
      fundingIncluded: false,
    });
    expect((s as { returnOnMargin: number }).returnOnMargin).toBeCloseTo(
      0.2 - fees(2),
      12,
    );
  });

  it("resolves a bar touching stop and target as the stop, and flags it", () => {
    const s = score(longOpen(), { prices: { BTC: [bar(300, 111, 94, 100)] } });
    expect(s).toMatchObject({ exit: "stop", sameBarStopAndTarget: true });
    expect((s as { returnOnMargin: number }).returnOnMargin).toBeCloseTo(
      -0.1 - fees(2),
      12,
    );
  });

  it("liquidates before a stop beyond the liquidation price", () => {
    const s = score(longOpen({ leverage: 10, stopLossPrice: undefined }), {
      prices: { BTC: [bar(300, 101, 89, 90)] },
    });
    expect(s).toMatchObject({ exit: "liquidation", returnOnMargin: -1 });
    expect((s as { pnlMusd: number }).pnlMusd).toBe(-50);
  });

  it("marks at the last close without a trigger, with funding when labelled", () => {
    const s = score(longOpen({ takeProfitPrice: undefined }), {
      prices: { BTC: [bar(300, 103, 99, 102), bar(600, 104, 100, 103)] },
      funding: {
        BTC: [
          { t: T0 + 400, rate: 0.001 },
          { t: T0 - 10, rate: 1 },
        ],
      },
    });
    expect(s).toMatchObject({
      exit: "horizon",
      exitPrice: 103,
      fundingIncluded: true,
    });
    expect((s as { returnOnMargin: number }).returnOnMargin).toBeCloseTo(
      0.06 - fees(2) - 0.002,
      12,
    );
  });

  it("walks a short with millisecond bar times and a base-symbol series", () => {
    const s = score(
      longOpen({
        symbol: "BTCUSDT",
        side: "short",
        stopLossPrice: 105,
        takeProfitPrice: 90,
      }),
      { prices: { BTC: [{ t: (T0 + 300) * 1000, h: 101, l: 89, c: 90 }] } },
    );
    expect(s).toMatchObject({ exit: "take_profit", exitPrice: 90 });
  });

  it("never fills a gap in the bar path", () => {
    const gap = (labels: LabelFile) => score(longOpen(), labels);
    expect(gap({ prices: { BTC: [bar(900, 101, 99, 100)] } })).toEqual({
      status: "unlabelled_gap",
      reason: "missing_bar_before_exit",
    });
    expect(gap({ prices: { BTC: [bar(-300, 101, 99, 100)] } })).toEqual({
      status: "unlabelled_gap",
      reason: "no_bars_after_asof",
    });
    expect(
      gap({ prices: { BTC: [bar(300, 101, 99, 100)] }, horizonHours: 1 }),
    ).toEqual({ status: "unlabelled_gap", reason: "bars_end_before_horizon" });
    // A stop reached before the hole is still a labelled outcome.
    expect(
      gap({
        prices: { BTC: [bar(300, 101, 94, 95), bar(3000, 120, 119, 120)] },
      }),
    ).toMatchObject({ status: "labelled", exit: "stop" });
  });

  // Root 57069: only bars that CLOSE by the horizon end are walked.
  describe("horizon boundary (closed bars only)", () => {
    const Q = 900; // 15-minute bars
    const flat = (k: number, c = 100) => bar(k * Q, 101, 99, c);

    it("ignores a late spike inside a bar that straddles an unaligned horizon", () => {
      // asOf 10:02, +4 h -> 14:02. Full bars end by 14:00; the 14:00 bar
      // (to 14:15) would carry a 14:10 stop. It must never be seen.
      const asOf = new Date((T0 + 120) * 1000).toISOString();
      const bars = Array.from({ length: 15 }, (_, i) => flat(i + 1));
      bars[14] = bar(15 * Q, 101, 99, 102); // last full bar, 13:45-14:00
      bars.push(bar(16 * Q, 101, 90, 91)); // straddles 14:02, stop inside
      const s = score(
        longOpen({ takeProfitPrice: undefined }),
        { prices: { BTC: bars }, barSeconds: Q, horizonHours: 4 },
        futQuote,
        asOf,
      );
      expect(s).toMatchObject({
        status: "labelled",
        exit: "horizon",
        exitPrice: 102,
        horizonFlooredToBar: true,
      });
    });

    it("uses the bar that ends exactly at an aligned horizon", () => {
      const s = score(longOpen({ takeProfitPrice: undefined }), {
        prices: { BTC: [flat(1), flat(2), flat(3, 103), flat(4, 80)] },
        barSeconds: Q,
        horizonHours: 1,
      });
      expect(s).toMatchObject({
        exit: "horizon",
        exitPrice: 103,
        horizonFlooredToBar: false,
      });
    });

    it("is a gap when the last full bar before the horizon is missing or not closed", () => {
      // Bars to 10:45 only: the 10:45-11:00 bar is absent (not yet closed).
      expect(
        score(longOpen({ takeProfitPrice: undefined }), {
          prices: { BTC: [flat(1), flat(2)] },
          barSeconds: Q,
          horizonHours: 1,
        }),
      ).toEqual({
        status: "unlabelled_gap",
        reason: "bars_end_before_horizon",
      });
    });
  });

  it("is unlabelled without a series, an entry price or a parseable asOf", () => {
    expect(score(longOpen(), { prices: {} })).toEqual({
      status: "unlabelled",
      reason: "no_price_series",
    });
    expect(score(longOpen(), { prices: {} }, { eligible: true })).toEqual({
      status: "unlabelled",
      reason: "no_entry_price",
    });
    expect(score(longOpen(), { prices: {} }, futQuote, "not a date")).toEqual({
      status: "unlabelled",
      reason: "asof_unparseable",
    });
  });

  it("does not score closes, protection updates, cancels or spot", () => {
    expect(
      score({ type: "futures_close", positionId: 1 }, { prices: {} }),
    ).toEqual({ status: "not_scored", reason: "futures_close_not_scored" });
  });
});
