import { describe, expect, it, vi } from "vitest";
import {
  barLabel,
  DEFAULT_SIGNAL_THRESHOLDS,
  indicatorRangeOf,
  signalIssues,
  signalThresholdsOf,
} from "./signals.js";
import { scanSetups } from "./setups.js";
import { observe } from "./observe.js";
import { buildSystemPrompt } from "./prompt.js";
import { parseSkill } from "./skill.js";
import { validateSkill } from "./skillValidator.js";
import { strictLint } from "./strictLint.js";
import { renderFolderOfOne } from "./templates.js";
import { newState } from "./state.js";
import type { CoinRithmClient } from "./client.js";
import type { AgentSpec, WatchEntry } from "./types.js";

// Per-agent signal thresholds and data diet (owner 2026-10-07: personality
// must change what the agent notices, not only what it is told).

const entry = (
  change24h: number,
  rsi14: number,
  stack: "up" | "down" | "flat" = "flat",
): WatchEntry =>
  ({
    symbol: "SOL",
    coinId: "5426",
    change24h,
    indicators: {
      rsi14,
      ema20AboveEma50: stack === "up" ? true : stack === "down" ? false : null,
      aboveEma20: stack === "up" ? true : stack === "down" ? false : null,
      brokeRecentHigh: false,
      brokeRecentLow: false,
    },
  }) as unknown as WatchEntry;

describe("signal thresholds", () => {
  it("defaults are exactly the previous hard-coded constants", () => {
    expect(DEFAULT_SIGNAL_THRESHOLDS).toEqual({
      rsiOversold: 35,
      rsiOverbought: 68,
      strongMovePct: 2,
      leanMovePct: 0.8,
      minStrength: 0.5,
    });
    expect(signalThresholdsOf({})).toEqual(DEFAULT_SIGNAL_THRESHOLDS);
  });

  it("an omitted thresholds argument keeps the old flags", () => {
    expect(scanSetups([entry(0, 70)])).toEqual(
      scanSetups([entry(0, 70)], [], DEFAULT_SIGNAL_THRESHOLDS),
    );
  });

  it("a stricter contrarian does not flag RSI 70 as overbought", () => {
    const strict = signalThresholdsOf({ signals: { rsiOverbought: 80 } });
    expect(scanSetups([entry(0, 70)]).map((s) => s.kind)).toEqual([
      "stretched",
    ]);
    expect(scanSetups([entry(0, 70)], [], strict)).toEqual([]);
  });

  it("a momentum trader can call a 1.5% move strong", () => {
    const fast = signalThresholdsOf({ signals: { strongMovePct: 1.5 } });
    expect(scanSetups([entry(1.6, 50)])).toEqual([]);
    expect(scanSetups([entry(1.6, 50)], [], fast)[0]).toMatchObject({
      kind: "uptrend",
      bias: "long",
    });
  });

  it("minStrength raises the bar for any flag", () => {
    const picky = signalThresholdsOf({ signals: { minStrength: 0.7 } });
    // A lean uptrend scores 0.6: flagged by default, not when picky.
    expect(scanSetups([entry(1, 50, "up")])).toHaveLength(1);
    expect(scanSetups([entry(1, 50, "up")], [], picky)).toEqual([]);
  });
});

describe("validation", () => {
  it("accepts in-range blocks and rejects contradictions", () => {
    expect(
      signalIssues(
        { rsiOversold: 30, rsiOverbought: 75 },
        { indicatorRange: "1W" },
      ),
    ).toEqual([]);
    const codes = (s: unknown, d?: unknown) =>
      signalIssues(s, d).map(([c]) => c);
    expect(codes({ rsiOverbought: 99 })).toContain("skill_signals_range");
    expect(codes({ rsiOversold: 50, rsiOverbought: 50 })).toContain(
      "skill_signals_rsi",
    );
    expect(codes({ leanMovePct: 3, strongMovePct: 2 })).toContain(
      "skill_signals_moves",
    );
    for (const bad of [["1W"], null, { range: "1W" }, 7, true])
      expect(codes(undefined, { indicatorRange: bad })).toContain(
        "skill_data_range",
      );
    expect(codes(undefined, { indicatorRange: "5m" })).toContain(
      "skill_data_range",
    );
    expect(codes("tight")).toContain("skill_signals");
  });

  it("validateSkill and strictLint know both blocks", () => {
    const parsed = parseSkill(renderFolderOfOne("fixture", "conservative"));
    const v = validateSkill({
      ...parsed,
      raw: { ...parsed.raw, signals: { minStrength: 2 } },
    });
    expect(v.issues.map((i) => i.code)).toContain("skill_signals_range");
    const lint = strictLint({
      ...parsed.raw,
      signals: { rsiOversld: 30 },
      data: { indicatorRange: "1W" },
    })
      .map((i) => i.message)
      .join();
    expect(lint).toContain("rsiOversld");
    expect(lint).not.toContain('unknown key "data"');
  });
});

describe("data diet: indicator range", () => {
  it("maps ranges to bar labels", () => {
    expect(indicatorRangeOf({})).toBe("1D");
    expect(barLabel("1D")).toBe("5-minute");
    expect(barLabel("1W")).toBe("15-minute");
    expect(barLabel("1M")).toBe("1-hour");
    expect(barLabel("3M")).toBe("4-hour");
  });

  it("observe requests the agent's range and checks spacing at its interval", async () => {
    const ok = (data: unknown) => ({ ok: true, status: 200, data });
    const base = parseSkill(renderFolderOfOne("fixture", "conservative")).spec;
    const spec: AgentSpec = {
      ...base,
      capabilities: ["indicators"],
      risk: { ...base.risk, watchlist: ["BTC"] },
      data: { indicatorRange: "1M" },
    };
    // 30 regular one-hour bars.
    const candles = Array.from({ length: 30 }, (_, i) => ({
      t: 1_760_000_000 + i * 3_600,
      o: 100,
      h: 101,
      l: 99,
      c: 100 + (i % 3),
      v: 1e9,
    }));
    const candlesFn = vi.fn(async (_id: string, _range: string) =>
      ok({ candles }),
    );
    const client = {
      me: async () =>
        ok({ scopes: ["read", "trade:futures", "trade:pm", "trade:spot"] }),
      portfolio: async () =>
        ok({ equity: { totalUsd: 50000, availableUsd: 1000 } }),
      wallet: async () => ok({ usdt: { available: 1000 } }),
      futuresPositions: async () => ok({ positions: [] }),
      trades: async () => ok({ trades: [] }),
      resolve: async () => ok({ match: { coinId: "1" } }),
      market: async () =>
        ok({
          price: { usd: 100 },
          observation: { freshness: { status: "fresh" } },
        }),
      candles: candlesFn,
      openOrders: async () => ok({ orders: [] }),
      pmPositions: async () => ok({ positions: [] }),
      discoverPmMarkets: async () => ok({ data: [] }),
    } as unknown as CoinRithmClient;
    const { observation } = await observe(client, spec, newState("fixture"));
    expect(candlesFn.mock.calls[0]?.[1]).toBe("1M");
    expect(observation.watch[0]!.indicatorContext).toMatchObject({
      range: "1M",
      nominalIntervalSeconds: 3_600,
      intervalStatus: "regular",
    });
  });

  it("the prompt names the agent's bar size and RSI levels", () => {
    const base = parseSkill(renderFolderOfOne("fixture", "conservative")).spec;
    const system = buildSystemPrompt(
      {
        ...base,
        capabilities: ["indicators"],
        data: { indicatorRange: "3M" },
        signals: { rsiOversold: 25, rsiOverbought: 80 },
      },
      "body",
    );
    expect(system).toContain("nominal 4-hour candles");
    expect(system).toContain("overbought at 80 and oversold at 25");
    expect(system).not.toContain("five-minute");
  });
});
