import {
  mkdtempSync,
  readFileSync,
  existsSync,
  writeFileSync,
  mkdirSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildPmLabels,
  buildPriceLabels,
  cassetteCoins,
  cassettePmEvents,
  planPriceLabels,
  pmVerdictLabels,
  priceBarsFor,
} from "./labelBuilder.js";
import { parseLabelFile } from "./labels.js";
import { cmdLabel } from "../cli.js";
import type { ApiResult } from "../types.js";

// Shapes follow the live probe of 2026-10-07 (GET /api/coins/bitcoin/candles
// ?range=1D, the loader the agent candles endpoint shares): {coin, range,
// fiat, rateToUsd, candles: [{t, o, h, l, c, v, vm}]}, t = bar open (s).
const ASOF = "2026-10-07T07:52:00.689Z";
const ASOF_SEC = Math.floor(Date.parse(ASOF) / 1000);
const HOUR = 3_600_000;

const marketRead = (coinId: string, symbol: string) => ({
  key: `GET /api/agent/market/${coinId}`,
  method: "GET",
  path: `/api/agent/market/${coinId}`,
  query: {},
  status: 200,
  ok: true,
  data: { coin: { coinId, symbol, name: symbol } },
});

const cassette = (id = "c1", asOf = ASOF) => ({
  id,
  asOf,
  responses: [
    marketRead("1", "BTC"),
    marketRead("1027", "ETH"),
    {
      key: "GET /api/agent/market/1/candles?range=1D",
      method: "GET",
      path: "/api/agent/market/1/candles",
      query: { range: "1D" },
      status: 200,
      ok: true,
      data: { candles: [] },
    },
  ],
});

const candles = (fromSec: number, n: number, bar: number) => ({
  coin: { ucid: "1", symbol: "BTC" },
  range: "1D",
  fiat: "USD",
  rateToUsd: 1,
  candles: Array.from({ length: n }, (_, i) => ({
    t: fromSec + i * bar,
    o: 100 + i,
    h: 101 + i,
    l: 99 + i,
    c: 100.5 + i,
    v: 1,
    vm: 0,
  })),
});

describe("planPriceLabels", () => {
  it("waits until the horizon has elapsed", () => {
    expect(
      planPriceLabels(ASOF, 24, Date.parse(ASOF) + 23 * HOUR),
    ).toMatchObject({ status: "not_yet" });
  });

  it("uses the finest range whose window still covers asOf", () => {
    const at = (hours: number) =>
      planPriceLabels(ASOF, 4, Date.parse(ASOF) + hours * HOUR);
    expect(at(5)).toMatchObject({ range: "1D", barSeconds: 300 });
    expect(at(30)).toMatchObject({ range: "1W", barSeconds: 900 });
    expect(at(24 * 10)).toMatchObject({ range: "1M", barSeconds: 3600 });
    expect(at(24 * 60)).toMatchObject({ range: "3M", barSeconds: 14400 });
    expect(at(24 * 100)).toEqual({ status: "too_old" });
  });
});

describe("cassetteCoins / priceBarsFor", () => {
  it("reads the coins a cassette observed, not its candle reads", () => {
    expect(cassetteCoins(cassette())).toEqual([
      { coinId: "1", symbol: "BTC" },
      { coinId: "1027", symbol: "ETH" },
    ]);
  });

  it("keeps finite bars from the one containing asOf to the last bar closing by the horizon", () => {
    const data = candles(ASOF_SEC - 900, 10, 300);
    data.candles[5]!.h = Number.NaN;
    const bars = priceBarsFor(data, ASOF_SEC, ASOF_SEC + 1200, 300);
    expect(bars.map((b) => b.t)).toEqual(
      data.candles
        .filter(
          (c, i) =>
            i !== 5 && c.t > ASOF_SEC - 300 && c.t + 300 <= ASOF_SEC + 1200,
        )
        .map((c) => c.t),
    );
    expect(Object.keys(bars[0]!).sort()).toEqual(["c", "h", "l", "t"]);
    expect(priceBarsFor({ error: "x" }, ASOF_SEC, ASOF_SEC + 60, 300)).toEqual(
      [],
    );
    // A bar straddling the horizon end (or still open) is never stored.
    const straddle = priceBarsFor(
      candles(ASOF_SEC + 900, 2, 900),
      ASOF_SEC,
      ASOF_SEC + 2000,
      900,
    );
    expect(straddle.map((b) => b.t)).toEqual([ASOF_SEC + 900]);
  });
});

describe("buildPriceLabels", () => {
  const now = Date.parse(ASOF) + 25 * HOUR; // 1W window, 15-minute bars

  it("fetches once per coin and range, and reports missing symbols", async () => {
    const fetchCandles = vi.fn(async (coinId: string): Promise<ApiResult> =>
      coinId === "1"
        ? { ok: true, status: 200, data: candles(ASOF_SEC, 200, 900) }
        : { ok: false, status: 503, data: null },
    );
    const results = await buildPriceLabels([cassette("c1"), cassette("c2")], {
      fetchCandles,
      horizonHours: 4,
      nowMs: now,
    });
    expect(fetchCandles).toHaveBeenCalledTimes(2); // BTC + ETH, shared by c1/c2
    for (const r of results) {
      expect(r).toMatchObject({
        status: "built",
        range: "1W",
        symbols: ["BTC"],
        missing: ["ETH"],
      });
      if (r.status !== "built") throw new Error("expected a label file");
      expect(r.file).toMatchObject({ barSeconds: 900, horizonHours: 4 });
      // What the bench will read back must validate.
      expect(() => parseLabelFile(r.file, "test")).not.toThrow();
    }
  });

  it("keeps existing PM labels and prices unless asked to overwrite", async () => {
    const fetchCandles = vi.fn(async (): Promise<ApiResult> => ({
      ok: true,
      status: 200,
      data: candles(ASOF_SEC, 200, 900),
    }));
    const pm = { "kalshi/x/y": { settled: 1 as const } };
    const kept = await buildPriceLabels([cassette()], {
      fetchCandles,
      nowMs: now,
      existing: { c1: { pm, prices: { BTC: [] }, horizonHours: 24 } },
    });
    expect(kept).toEqual([{ id: "c1", status: "kept" }]);
    // A file labelled for another horizon is never reported as done.
    const mismatch = await buildPriceLabels([cassette()], {
      fetchCandles,
      nowMs: now,
      horizonHours: 24,
      existing: { c1: { pm, prices: { BTC: [] }, horizonHours: 4 } },
    });
    expect(mismatch).toEqual([
      { id: "c1", status: "horizon_mismatch", existingHorizonHours: 4 },
    ]);
    expect(fetchCandles).not.toHaveBeenCalled();
    const [rebuilt] = await buildPriceLabels([cassette()], {
      fetchCandles,
      nowMs: now,
      existing: { c1: { pm } },
    });
    expect(rebuilt).toMatchObject({ status: "built", file: { pm } });
  });

  it("does not label a cassette whose horizon has not elapsed", async () => {
    const fetchCandles = vi.fn();
    expect(
      await buildPriceLabels([cassette()], {
        fetchCandles,
        nowMs: Date.parse(ASOF) + HOUR,
      }),
    ).toEqual([expect.objectContaining({ id: "c1", status: "not_yet" })]);
    expect(fetchCandles).not.toHaveBeenCalled();
  });
});

describe("cmdLabel", () => {
  const prior = process.env.COINRITHM_API_KEY;
  afterEach(() => {
    if (prior === undefined) delete process.env.COINRITHM_API_KEY;
    else process.env.COINRITHM_API_KEY = prior;
  });

  it("writes validated label files through GET-only candle reads", async () => {
    process.env.COINRITHM_API_KEY = "fixture-key";
    const dir = mkdtempSync(join(tmpdir(), "label-"));
    const file = {
      schema: "coinrithm.bench.cassette.v1",
      clockMs: Date.parse(ASOF),
      agentSpecHash: "sha256:fixture",
      marketBaselineRecorded: false,
      recordCycle: { decision: "skip" },
      refusedRequests: [],
      spec: { venues: ["futures"] },
      recordedAt: ASOF,
      ...cassette("2026-10-07T07-52-00-689Z-e9eaa6887d61"),
    };
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, `${file.id}.json`), JSON.stringify(file));
    const methods: string[] = [];
    const fetchFn = (async (input: unknown, init?: { method?: string }) => {
      methods.push(init?.method ?? "GET");
      const url = new URL(String(input));
      expect(url.pathname).toMatch(/^\/api\/agent\/market\/\d+\/candles$/);
      return new Response(JSON.stringify(candles(ASOF_SEC, 30, 300)), {
        status: 200,
      });
    }) as unknown as typeof fetch;
    const r = await cmdLabel({
      corpus: dir,
      horizonHours: 2,
      fetchFn,
      nowMs: Date.parse(ASOF) + 3 * HOUR,
    });
    expect(r.ok).toBe(true);
    expect(methods.every((m) => m === "GET")).toBe(true);
    const out = join(dir, "labels", `${file.id}.json`);
    expect(existsSync(out)).toBe(true);
    const written = parseLabelFile(
      JSON.parse(readFileSync(out, "utf8")),
      "written",
    );
    expect(written.barSeconds).toBe(300);
    expect(Object.keys(written.prices ?? {}).sort()).toEqual(["BTC", "ETH"]);
    expect(r.lines.join("\n")).toContain("stay unlabelled");
  });

  it("refuses to run without a key or with a bad horizon", async () => {
    delete process.env.COINRITHM_API_KEY;
    expect((await cmdLabel({ corpus: tmpdir() })).ok).toBe(false);
    process.env.COINRITHM_API_KEY = "fixture-key";
    expect((await cmdLabel({ corpus: tmpdir(), horizonHours: 0 })).ok).toBe(
      false,
    );
  });
});

// Shapes follow the live public event reads of 2026-10-07 (kalshi
// kxbnbd-26oct0706: 1 won / 74 lost, eligible, limbo settle; forecastex
// axxsc-110326-lg: winner known, time unverified, eligible false, void).
const outcome = (
  id: string,
  result: string,
  over: Record<string, unknown> = {},
) => ({
  externalMarketId: id,
  lifecycle: { isResult: true, result, basis: "provider", ...over },
});
const eventBody = (trust: Record<string, unknown>, outcomes: unknown[]) => ({
  event: { outcomes },
  resolution: {
    resolutionState: "resolved",
    settlementTrust: { shape: "multi", ...trust },
  },
});
const SETTLE = { settlementEligible: true, limboVerdict: "settle" };

describe("pmVerdictLabels (existing public verdict only)", () => {
  it("labels provider results of a settled, eligible event", () => {
    expect(
      pmVerdictLabels(
        "kalshi",
        "kxbnbd-26oct0706",
        eventBody(SETTLE, [
          outcome("T764.99", "won"),
          outcome("T759.99", "lost"),
          outcome("T754.99", "lost", { basis: "derived" }),
          outcome("T749.99", "won", { isResult: false }),
          outcome("T744.99", "void"),
        ]),
      ),
    ).toEqual({
      "kalshi/kxbnbd-26oct0706/T764.99": { settled: 1 },
      "kalshi/kxbnbd-26oct0706/T759.99": { settled: 0 },
    });
  });

  it("labels nothing for a void, ineligible or malformed verdict", () => {
    const outs = [outcome("YES", "won"), outcome("NO", "lost")];
    for (const trust of [
      { settlementEligible: false, limboVerdict: "void" },
      { settlementEligible: true, limboVerdict: "void" },
      { settlementEligible: false, limboVerdict: "settle" },
      {},
    ])
      expect(
        pmVerdictLabels("forecastex", "x", eventBody(trust, outs)),
      ).toEqual({});
    expect(pmVerdictLabels("kalshi", "x", null)).toEqual({});
    expect(
      pmVerdictLabels("kalshi", "x", { event: { outcomes: outs } }),
    ).toEqual({});
  });
});

describe("buildPmLabels", () => {
  const discover = (events: Array<{ source: string; slug: string }>) => ({
    key: "GET /api/agent/pm/discover?limit=30&q=Bitcoin",
    method: "GET",
    path: "/api/agent/pm/discover",
    query: { limit: "30", q: "Bitcoin" },
    status: 200,
    ok: true,
    data: { data: events.map((e) => ({ ...e, outcomes: [] })) },
  });
  const pmCassette = (id: string) => ({
    id,
    responses: [
      discover([
        { source: "Kalshi", slug: "KXBTC-A" },
        { source: "kalshi", slug: "kxbtc-a" },
        { source: "forecastex", slug: "fx-b" },
      ]),
    ],
  });

  it("collects each discovered event once, lower-cased", () => {
    expect(cassettePmEvents(pmCassette("c1"))).toEqual([
      { source: "kalshi", slug: "kxbtc-a" },
      { source: "forecastex", slug: "fx-b" },
    ]);
  });

  it("reads each event once, counts failed reads, and keeps existing labels", async () => {
    const fetchEvent = vi.fn(async (source: string): Promise<ApiResult> =>
      source === "kalshi"
        ? {
            ok: true,
            status: 200,
            data: eventBody(SETTLE, [
              outcome("A-YES", "won"),
              outcome("A-NO", "lost"),
            ]),
          }
        : { ok: false, status: 503, data: null },
    );
    const results = await buildPmLabels([pmCassette("c1"), pmCassette("c2")], {
      fetchEvent,
      existing: { c2: { pm: { "kalshi/kxbtc-a/A-YES": { settled: 0 } } } },
    });
    expect(fetchEvent).toHaveBeenCalledTimes(2);
    expect(results[0]).toMatchObject({ events: 2, labelled: 2, failed: 1 });
    expect(results[0]!.pm).toEqual({
      "kalshi/kxbtc-a/A-YES": { settled: 1 },
      "kalshi/kxbtc-a/A-NO": { settled: 0 },
    });
    // c2 already had A-YES: kept as is without --overwrite.
    expect(results[1]!.pm["kalshi/kxbtc-a/A-YES"]).toEqual({ settled: 0 });
    expect(results[1]!.labelled).toBe(1);
  });
});

describe("cmdLabel with PM verdicts", () => {
  const prior = process.env.COINRITHM_API_KEY;
  afterEach(() => {
    if (prior === undefined) delete process.env.COINRITHM_API_KEY;
    else process.env.COINRITHM_API_KEY = prior;
  });

  it("writes a PM-only label file while prices are not yet due", async () => {
    process.env.COINRITHM_API_KEY = "fixture-key";
    const dir = mkdtempSync(join(tmpdir(), "label-pm-"));
    const id = "2026-10-07T07-52-00-689Z-e9eaa6887d61";
    const file = {
      schema: "coinrithm.bench.cassette.v1",
      id,
      asOf: ASOF,
      clockMs: Date.parse(ASOF),
      agentSpecHash: "sha256:fixture",
      marketBaselineRecorded: true,
      recordCycle: { decision: "skip" },
      refusedRequests: [],
      spec: { venues: ["pm"] },
      recordedAt: ASOF,
      responses: [
        {
          key: "GET /api/agent/pm/discover?limit=30&q=Bitcoin",
          method: "GET",
          path: "/api/agent/pm/discover",
          query: {},
          status: 200,
          ok: true,
          data: { data: [{ source: "kalshi", slug: "kxbtc-a", outcomes: [] }] },
        },
      ],
    };
    writeFileSync(join(dir, `${id}.json`), JSON.stringify(file));
    const paths: string[] = [];
    const fetchFn = (async (input: unknown, init?: { method?: string }) => {
      expect(init?.method ?? "GET").toBe("GET");
      const url = new URL(String(input));
      paths.push(url.pathname);
      return new Response(
        JSON.stringify(eventBody(SETTLE, [outcome("A-YES", "won")])),
        { status: 200 },
      );
    }) as unknown as typeof fetch;
    const r = await cmdLabel({
      corpus: dir,
      fetchFn,
      nowMs: Date.parse(ASOF) + HOUR, // 24 h prices not due yet
    });
    expect(r.ok).toBe(true);
    expect(paths).toEqual(["/api/prediction-markets/events/kalshi/kxbtc-a"]);
    const written = parseLabelFile(
      JSON.parse(readFileSync(join(dir, "labels", `${id}.json`), "utf8")),
      "written",
    );
    expect(written).toEqual({ pm: { "kalshi/kxbtc-a/A-YES": { settled: 1 } } });
  });
});
