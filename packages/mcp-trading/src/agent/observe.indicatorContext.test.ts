import { describe, expect, it, vi } from "vitest";
import type { CoinRithmClient } from "./client.js";
import { observe } from "./observe.js";
import { buildUserPrompt, buildSystemPrompt } from "./prompt.js";
import { parseSkill } from "./skill.js";
import { newState } from "./state.js";
import { renderFolderOfOne } from "./templates.js";

const AS_OF = "2026-09-24T00:48:00.000Z";
const LAST_TIME = 1_790_210_400; // Live 1D payload: 2026-09-24T00:40:00Z.
const spec = parseSkill(renderFolderOfOne("fixture", "conservative")).spec;
spec.capabilities = ["indicators"];
spec.venues = ["futures"];
spec.risk.watchlist = ["BTC"];
const ok = (data: unknown) => ({ ok: true, status: 200, data });
const bars = (count = 288): Array<Record<string, unknown>> =>
  Array.from({ length: count }, (_, i) => ({
    t: LAST_TIME - (count - i - 1) * 300,
    o: 77_300 + i,
    h: 77_320 + i,
    l: 77_290 + i,
    c: 77_310 + i,
    v: 2_586_526_753,
    vm: 0,
  }));

async function observed(candles: Array<Record<string, unknown>>) {
  const fetchCandles = vi.fn(async () => ok({ range: "1D", candles }));
  const client = {
    me: async () => ok({ scopes: ["read", "trade:futures"] }),
    portfolio: async () =>
      ok({ equity: { totalUsd: 50_000, availableUsd: 1000 } }),
    wallet: async () => ok({ usdt: { available: 1000 } }),
    futuresPositions: async () => ok({ positions: [] }),
    trades: async () => ok({ asOf: AS_OF, trades: [] }),
    resolve: async () => ok({ match: { coinId: "1", symbol: "BTC" } }),
    market: async () =>
      ok({
        price: { usd: 77_600 },
        observation: {
          freshness: { status: "fresh", asOf: AS_OF, ageSeconds: 0 },
        },
      }),
    candles: fetchCandles,
  } as unknown as CoinRithmClient;
  const state = newState("fixture");
  const result = await observe(client, spec, state);
  expect(result.skip).toBeUndefined();
  expect(fetchCandles).toHaveBeenCalledTimes(1);
  return {
    entry: result.observation.watch[0],
    observation: result.observation,
    state,
  };
}

describe("indicator candle provenance", () => {
  it("preserves real t seconds, nominal cadence and coverage in model input", async () => {
    const { entry, observation } = await observed(bars());
    expect(entry.indicatorContext).toEqual({
      range: "1D",
      nominalIntervalSeconds: 300,
      asOf: "2026-09-24T00:40:00.000Z",
      barCount: 288,
      timestampedBarCount: 288,
      checkedIntervalCount: 287,
      irregularIntervalCount: 0,
      intervalStatus: "regular",
      maxGapSeconds: 300,
      recent15: { barCount: 15, intervalStatus: "regular" },
    });
    expect(entry.indicators?.atr14).not.toBeNull();
    expect(buildUserPrompt(observation)).toContain(
      JSON.stringify(entry.indicatorContext),
    );
    const instructions = buildSystemPrompt(spec, "strategy");
    expect(instructions).toContain("/market freshness is separate");
    expect(instructions).toContain("Wilder atr14 also retains earlier history");
  });

  it("keeps historical untimestamped fixture indicators with unknown temporal evidence", async () => {
    const payload = bars(60);
    for (const bar of payload) delete bar.t;
    const { entry } = await observed(payload);
    expect(entry.indicators?.atr14).not.toBeNull();
    expect(entry.indicatorContext).toEqual({
      range: "1D",
      nominalIntervalSeconds: 300,
      barCount: 60,
      timestampedBarCount: 0,
      checkedIntervalCount: 0,
      irregularIntervalCount: 0,
      intervalStatus: "unknown",
      recent15: { barCount: 15, intervalStatus: "unknown" },
    });
  });

  it.each([
    undefined,
    null,
    "1790210400",
    NaN,
    Infinity,
    -1,
    0,
    LAST_TIME * 1000,
    LAST_TIME + 0.5,
  ])(
    "does not replace invalid terminal t=%s with an older or market timestamp",
    async (t) => {
      const payload = bars(60);
      payload[59].t = t;
      const { entry } = await observed(payload);
      expect(entry.indicatorContext?.asOf).toBeUndefined();
      expect(entry.indicatorContext?.timestampedBarCount).toBe(59);
      expect(entry.indicatorContext?.checkedIntervalCount).toBe(58);
      expect(entry.indicatorContext?.intervalStatus).toBe("unknown");
      expect(entry.indicatorContext?.recent15.intervalStatus).toBe("unknown");
      expect(entry.indicators?.atr14).not.toBeNull();
    },
  );

  it("retains stale candle time even when market-price freshness is current", async () => {
    const payload = bars(60);
    for (const bar of payload) bar.t = (bar.t as number) - 3600;
    const { entry, observation } = await observed(payload);
    expect(entry.freshness?.status).toBe("fresh");
    expect(entry.indicatorContext?.asOf).toBe("2026-09-23T23:40:00.000Z");
    expect(
      Date.parse(observation.asOf) - Date.parse(entry.indicatorContext!.asOf!),
    ).toBe(68 * 60_000);
  });

  it("distinguishes an old gap from regular recent spacing without calling it a complete ATR window", async () => {
    const payload = bars(60);
    payload.splice(5, 1);
    const { entry } = await observed(payload);
    expect(entry.indicatorContext).toMatchObject({
      barCount: 59,
      intervalStatus: "irregular",
      irregularIntervalCount: 1,
      maxGapSeconds: 600,
      recent15: { barCount: 15, intervalStatus: "regular" },
    });
  });

  it("reports gaps caused by rejected OHLC rows and preserves the last accepted bar timestamp", async () => {
    const payload = bars(60);
    payload[55].h = null;
    payload[59].c = null;
    const { entry } = await observed(payload);
    expect(entry.indicatorContext).toMatchObject({
      barCount: 58,
      asOf: "2026-09-24T00:35:00.000Z",
      intervalStatus: "irregular",
      maxGapSeconds: 600,
      recent15: { barCount: 15, intervalStatus: "irregular" },
    });
    expect(entry.indicators?.asOfClose).toBe(payload[58].c);
  });

  it.each([0, -300, 900])(
    "reports duplicate, reversed or sparse terminal intervals (%ss)",
    async (gap) => {
      const payload = bars(20);
      payload[19].t = (payload[18].t as number) + gap;
      const { entry } = await observed(payload);
      expect(entry.indicatorContext).toMatchObject({
        intervalStatus: "irregular",
        irregularIntervalCount: 1,
        recent15: { barCount: 15, intervalStatus: "irregular" },
      });
    },
  );

  it.each([0, 1])(
    "does not infer regular cadence from %s accepted bars",
    async (count) => {
      const { entry } = await observed(bars(count));
      expect(entry.indicatorContext).toMatchObject({
        barCount: count,
        checkedIntervalCount: 0,
        intervalStatus: "unknown",
        recent15: { barCount: count, intervalStatus: "unknown" },
      });
      expect(entry.indicatorContext?.maxGapSeconds).toBeUndefined();
      expect(entry.indicators?.atr14 ?? null).toBeNull();
    },
  );
});
