import { describe, expect, it, vi } from "vitest";
import {
  describeUniverse,
  filterUniverseRows,
  scansUniverse,
  universeIssues,
  universeQuery,
  universeQueryParams,
  universeResolveTop,
} from "./universe.js";
import { observe } from "./observe.js";
import { parseSkill } from "./skill.js";
import { validateSkill } from "./skillValidator.js";
import { strictLint } from "./strictLint.js";
import { renderFolderOfOne } from "./templates.js";
import { newState } from "./state.js";
import { buildSystemPrompt } from "./prompt.js";
import type { CoinRithmClient } from "./client.js";
import type { AgentSpec } from "./types.js";

// Market boundaries (owner 2026-10-07, Telegram 56641/56644): the agent scans
// inside a declared rank band / volume floor / sector filter each cycle.

describe("universeQuery", () => {
  it("defaults to the top 100 by absolute 24h move", () => {
    expect(universeQuery({})).toEqual({
      rankMin: 1,
      rankMax: 100,
      minVolume24hUsd: 0,
      excludeStablecoins: false,
      includeSectors: [],
      excludeSectors: [],
      sort: "abs_change_24h",
      limit: 15,
    });
    expect(universeResolveTop({})).toBe(6);
    expect(universeResolveTop({ resolveTop: 99 })).toBe(10);
  });

  it("serializes to the screener wire form, omitting empty sector lists", () => {
    expect(
      universeQueryParams(
        universeQuery({
          rank: { min: 301, max: 1000 },
          minVolume24hUsd: 250_000,
          excludeStablecoins: true,
          excludeSectors: ["meme", "eco-tron"],
          sort: "losers_24h",
        }),
      ),
    ).toEqual({
      rankMin: 301,
      rankMax: 1000,
      minVolume24hUsd: 250_000,
      excludeStablecoins: "true",
      excludeSectors: "meme,eco-tron",
      sort: "losers_24h",
      limit: 15,
    });
  });
});

describe("filterUniverseRows (defence in depth)", () => {
  const q = universeQuery({
    rank: { min: 1, max: 100 },
    minVolume24hUsd: 1_000_000,
    excludeStablecoins: true,
    excludeSectors: ["meme"],
  });
  it("drops rows whose own fields breach the boundaries", () => {
    const rows = [
      { symbol: "OK", marketCapRank: 20, volume24hUsd: 5e6, sectors: ["defi"] },
      { symbol: "DEEP", marketCapRank: 400, volume24hUsd: 5e6 },
      { symbol: "THIN", marketCapRank: 20, volume24hUsd: 10 },
      { symbol: "USDC", marketCapRank: 7, sectors: ["stablecoins"] },
      { symbol: "DOGE", marketCapRank: 9, sectors: ["meme"] },
      { symbol: "UNKNOWN" },
    ];
    expect(filterUniverseRows(rows, q).map((r) => r.symbol)).toEqual([
      "OK",
      "UNKNOWN",
    ]);
  });
  it("an include list requires a row to show a matching sector", () => {
    const inc = universeQuery({ includeSectors: ["ai"] });
    const rows = [
      { symbol: "A", sectors: ["ai", "eco-base"] },
      { symbol: "B", sectors: ["defi"] },
      { symbol: "C" },
    ];
    expect(filterUniverseRows(rows, inc).map((r) => r.symbol)).toEqual(["A"]);
  });
  it("exclusion wins over inclusion", () => {
    const both = universeQuery({
      includeSectors: ["stablecoins"],
      excludeStablecoins: true,
    });
    expect(
      filterUniverseRows([{ symbol: "USDT", sectors: ["stablecoins"] }], both),
    ).toEqual([]);
  });
});

describe("universeIssues", () => {
  it("accepts absent and well-formed blocks", () => {
    expect(universeIssues(undefined)).toEqual([]);
    expect(
      universeIssues({
        rank: { min: 101, max: 300 },
        minVolume24hUsd: 0,
        excludeStablecoins: false,
        includeSectors: ["defi", "eco-solana"],
        sort: "volume_24h",
        resolveTop: 10,
        scanLimit: 50,
      }),
    ).toEqual([]);
  });
  it.each([
    [null, "skill_universe"],
    [{ rank: { min: 300, max: 100 } }, "skill_universe_rank"],
    [{ rank: { min: 0 } }, "skill_universe_rank"],
    [{ rank: 100 }, "skill_universe_rank"],
    [{ minVolume24hUsd: -1 }, "skill_universe_volume"],
    [{ excludeStablecoins: "yes" }, "skill_universe_stablecoins"],
    [{ excludeSectors: "meme" }, "skill_universe_sectors"],
    [{ includeSectors: ["DeFi Coins"] }, "skill_universe_sectors"],
    [{ sort: "random" }, "skill_universe_sort"],
    [{ resolveTop: 11 }, "skill_universe_resolve_top"],
    [{ scanLimit: 0 }, "skill_universe_scan_limit"],
  ])("rejects %j with %s", (raw, code) => {
    expect(universeIssues(raw).map(([c]) => c)).toContain(code);
  });
});

describe("bundle parsing", () => {
  const parsed = parseSkill(renderFolderOfOne("fixture", "conservative"));
  const withUniverse = (universe: unknown) => ({
    ...parsed,
    raw: { ...parsed.raw, universe },
  });

  it("validateSkill fails closed on a malformed block", () => {
    const v = validateSkill(withUniverse({ sort: "random" }));
    expect(v.valid).toBe(false);
    expect(v.issues.map((i) => i.code)).toContain("skill_universe_sort");
  });

  it("strictLint knows the block and flags unknown keys inside it", () => {
    const codes = (raw: Record<string, unknown>) =>
      strictLint(raw).map((i) => `${i.code}:${i.message}`);
    expect(
      codes({ ...parsed.raw, universe: { rank: { max: 50 } } }).join(),
    ).not.toContain("universe");
    expect(codes({ ...parsed.raw, universe: { rnak: 1 } }).join()).toContain(
      "rnak",
    );
  });

  it("scansUniverse: a universe block or the legacy capability", () => {
    expect(scansUniverse({ capabilities: [] })).toBe(false);
    expect(scansUniverse({ capabilities: ["universe_scan"] })).toBe(true);
    expect(scansUniverse({ capabilities: [], universe: {} })).toBe(true);
  });
});

describe("prompt", () => {
  const base = parseSkill(renderFolderOfOne("fixture", "conservative")).spec;
  it("states the declared boundaries in plain words", () => {
    const spec: AgentSpec = {
      ...base,
      universe: {
        rank: { min: 101, max: 300 },
        minVolume24hUsd: 250_000,
        excludeStablecoins: true,
        excludeSectors: ["meme"],
        sort: "gainers_24h",
      },
    };
    const system = buildSystemPrompt(spec, "body");
    expect(system).toContain("## Your market (declared boundaries)");
    expect(system).toContain(
      "market-cap rank 101-300; 24h volume >= $250,000; no stablecoins; excluding sectors: meme; ranked by gainers 24h",
    );
    expect(system).not.toContain("## Universe scan (discovered movers)");
    expect(describeUniverse({})).toBe(
      "market-cap rank 1-100; ranked by abs change 24h",
    );
  });
});

describe("observe with declared boundaries", () => {
  const ok = (data: unknown) => ({ ok: true, status: 200, data });
  const base = parseSkill(renderFolderOfOne("fixture", "conservative")).spec;
  const spec: AgentSpec = {
    ...base,
    capabilities: [],
    risk: { ...base.risk, watchlist: ["BTC"], blocklist: ["SKIP"] },
    universe: {
      rank: { min: 1, max: 100 },
      excludeStablecoins: true,
      resolveTop: 2,
    },
  };
  function client(over: Record<string, unknown> = {}) {
    return {
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
      openOrders: async () => ok({ orders: [] }),
      pmPositions: async () => ok({ positions: [] }),
      discoverPmMarkets: async () => ok({ data: [] }),
      ...over,
    } as unknown as CoinRithmClient;
  }
  // Row shape as served by GET /api/agent/universe (backend-v2 #131).
  const row = (symbol: string, ucid: string, extra = {}) => ({
    ucid,
    symbol,
    name: symbol,
    slug: symbol.toLowerCase(),
    marketCapRank: 20,
    priceUsd: 2,
    change24h: -8.5,
    volume24hUsd: 4e7,
    sectors: ["defi"],
    priceStale: false,
    ...extra,
  });

  it("asks the screener, never the gainers feed, and resolves the top rows", async () => {
    const agentUniverse = vi.fn(
      async (_query: Record<string, string | number>) =>
        ok({
          rows: [
            row("UNI", "7083"),
            row("SKIP", "1"),
            row("USDC", "3408", { sectors: ["stablecoins"] }),
            row("ARB", "11841"),
            row("DOT", "6636"),
          ],
        }),
    );
    const cryptoMovers = vi.fn();
    const { observation } = await observe(
      client({ agentUniverse, cryptoMovers }),
      spec,
      newState("fixture"),
    );
    expect(cryptoMovers).not.toHaveBeenCalled();
    expect(agentUniverse.mock.calls[0]?.[0]).toMatchObject({
      rankMin: 1,
      rankMax: 100,
      excludeStablecoins: "true",
    });
    expect(observation.watch.map((w) => [w.symbol, w.discovered])).toEqual([
      ["BTC", undefined],
      ["UNI", true],
      ["ARB", true],
    ]);
    expect(observation.universeMovers).toEqual([
      { symbol: "DOT", name: "DOT", change24hPct: -8.5, priceUsd: 2 },
    ]);
  });

  it("a failed screener degrades to the watchlist only", async () => {
    const { observation, skip } = await observe(
      client({
        agentUniverse: async () => ({ ok: false, status: 404, data: {} }),
      }),
      spec,
      newState("fixture"),
    );
    expect(skip).toBeUndefined();
    expect(observation.watch.map((w) => w.symbol)).toEqual(["BTC"]);
    expect(observation.universeMovers).toBeUndefined();
  });
});
