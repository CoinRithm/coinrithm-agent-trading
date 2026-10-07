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
  buildPriceLabels,
  cassetteCoins,
  planPriceLabels,
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

  it("keeps finite bars from the one containing asOf to the horizon end", () => {
    const data = candles(ASOF_SEC - 900, 10, 300);
    data.candles[5]!.h = Number.NaN;
    const bars = priceBarsFor(data, ASOF_SEC, ASOF_SEC + 1200, 300);
    expect(bars.map((b) => b.t)).toEqual(
      data.candles
        .filter(
          (c, i) => i !== 5 && c.t > ASOF_SEC - 300 && c.t <= ASOF_SEC + 1200,
        )
        .map((c) => c.t),
    );
    expect(Object.keys(bars[0]!).sort()).toEqual(["c", "h", "l", "t"]);
    expect(priceBarsFor({ error: "x" }, ASOF_SEC, ASOF_SEC + 60, 300)).toEqual(
      [],
    );
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
      existing: { c1: { pm, prices: { BTC: [] } } },
    });
    expect(kept).toEqual([{ id: "c1", status: "kept" }]);
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
    expect(r.lines.join("\n")).toContain("PM opens stay unlabelled");
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
