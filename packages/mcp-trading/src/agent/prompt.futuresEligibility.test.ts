import { describe, expect, it, vi } from "vitest";
import { buildUserPrompt } from "./prompt.js";
import {
  futuresEntryChoices,
  futuresEntryEligibilityOf,
  futuresEntryPreflight,
  type FuturesEntryEligibility,
} from "./futuresEligibility.js";
import { buildObservationReceipt } from "./observationReceipt.js";
import { observe } from "./observe.js";
import { parseSkill } from "./skill.js";
import { renderFolderOfOne } from "./templates.js";
import { newState } from "./state.js";
import type { CoinRithmClient } from "./client.js";
import type { Observation, ProposedAction, WatchEntry } from "./types.js";

const eligibility = (
  over: Partial<FuturesEntryEligibility> = {},
): FuturesEntryEligibility => ({
  status: "reference_unavailable",
  referenceRequired: true,
  venue: null,
  symbol: null,
  referenceFetchedAt: null,
  maxReferenceAgeHours: 6,
  evaluatedAt: "2026-10-09T12:00:00.000Z",
  ...over,
});
const watch = (
  symbol: string,
  e: FuturesEntryEligibility | undefined = eligibility(),
): WatchEntry => ({
  symbol,
  coinId: symbol.toLowerCase(),
  priceUsd: 100,
  change24h: 20,
  futuresEntryEligibility: e,
});
const observation = (rows: WatchEntry[]): Observation => ({
  asOf: "2026-10-09T12:00:00.000Z",
  scopes: ["trade:futures"],
  cashAvailableMusd: 1000,
  equityMusd: 50000,
  openPositions: [],
  openOrders: [],
  pmPositions: [],
  pmMarkets: [],
  watch: rows,
  setups: rows.map((row) => ({
    symbol: row.symbol,
    kind: "breakout",
    bias: "long",
    strength: 0.8,
    note: "broke 20-bar high",
  })),
  syncCursor: null,
  newClosedTrades: [],
  polledBeforeWrite: true,
});
function projected(text: string) {
  const data = JSON.parse(text.split("```json\n")[1].split("\n```")[0]);
  const rows = data.watch;
  if (!Array.isArray(rows))
    data.watch = rows.rows.map((row: unknown[]) =>
      Object.fromEntries(
        rows.columns.map((column: string, index: number) => [
          column,
          row[index],
        ]),
      ),
    );
  return data;
}
const open = (symbol: string): ProposedAction => ({
  type: "futures_open",
  symbol,
  side: "long",
  marginMusd: 50,
  leverage: 2,
  confidence: 0.8,
});

describe.each([false, true])(
  "availability-aware prompt (compactTables=%s)",
  (compactTables) => {
    it("removes unsupported strongest futures setups without removing watch evidence or changing its receipt", () => {
      const obs = observation([
        watch("NXT"),
        { ...watch("CAW"), discovered: true },
        watch(
          "BTC",
          eligibility({
            status: "eligible",
            venue: "binance",
            symbol: "BTCUSDT",
          }),
        ),
      ]);
      obs.setups[2].strength = 0.55;
      const before = JSON.stringify(obs),
        receipt = buildObservationReceipt(obs);
      const text = buildUserPrompt(obs, undefined, {
        venues: ["futures"],
        compactTables,
      });
      const data = projected(text);
      expect(data.watch).toEqual(obs.watch);
      expect(data.setups.map((s: { symbol: string }) => s.symbol)).toEqual([
        "BTC",
      ]);
      expect(data.futuresEntryChoices).toEqual({
        candidates: [{ symbol: "BTC", reference: "eligible" }],
        blocked: ["NXT", "CAW"].map((symbol) => ({
          symbol,
          code: "futures_reference_unavailable",
        })),
      });
      expect(text).toContain(
        "A strong move or flagged structure does not override this block",
      );
      expect(text).toContain(
        "not other caps, universe boundaries, direction or quote/execution rules",
      );
      expect(JSON.stringify(obs)).toBe(before);
      expect(buildObservationReceipt(obs)).toEqual(receipt);
      expect(futuresEntryPreflight(open("NXT"), obs)?.code).toBe(
        "futures_reference_unavailable",
      );
    });

    it("retains mixed-venue spot setups with an explicit futures-only restriction", () => {
      const obs = observation([watch("NXT"), watch("CAW")]);
      const data = projected(
        buildUserPrompt(obs, undefined, {
          venues: ["spot", "futures"],
          compactTables,
        }),
      );
      expect(data.setups).toHaveLength(2);
      expect(data.setups[0].note).toContain(
        "consider spot only if independently allowed, or skip",
      );
      expect(data.watch).toEqual(obs.watch);
      expect(obs.setups[0].note).toBe("broke 20-bar high");
    });

    it("keeps unknown evidence distinct from approval and honors disabled reference requirements", () => {
      const unknown = watch("OLD");
      delete unknown.futuresEntryEligibility;
      const malformed = watch("BAD");
      malformed.futuresEntryEligibility = futuresEntryEligibilityOf({
        futuresEntryEligibility: {
          status: "reference_unavailable",
          referenceRequired: true,
        },
      });
      const obs = observation([
        watch("STALE", eligibility({ status: "reference_stale" })),
        unknown,
        malformed,
        watch("NOT_REQUIRED", eligibility({ referenceRequired: false })),
      ]);
      const text = buildUserPrompt(obs, undefined, {
        venues: ["futures"],
        compactTables,
      });
      expect(projected(text).futuresEntryChoices).toEqual({
        candidates: [
          { symbol: "OLD", reference: "unknown" },
          { symbol: "BAD", reference: "unknown" },
          { symbol: "NOT_REQUIRED", reference: "not_required" },
        ],
        blocked: [{ symbol: "STALE", code: "futures_reference_stale" }],
      });
      expect(text).toContain("reference=unknown is NOT eligibility");
      expect(projected(text).setups).toHaveLength(3);
      expect(futuresEntryPreflight(open("OLD"), obs)).toBeNull();
      expect(futuresEntryPreflight(open("NOT_REQUIRED"), obs)).toBeNull();
    });

    it("preserves the held futures add/manage exception even without a reference", () => {
      const obs = observation([watch("NXT"), watch("CAW")]);
      obs.openPositions = [
        {
          id: 7,
          venue: "futures",
          symbol: "nxt-perp",
          side: "long",
          status: "open",
        },
      ];
      obs.setups[0].held = "long";
      const text = buildUserPrompt(obs, undefined, {
        venues: ["futures"],
        compactTables,
      });
      const data = projected(text);
      expect(data.futuresEntryChoices.candidates).toEqual([
        { symbol: "NXT", reference: "held_position" },
      ]);
      expect(data.setups).toEqual([obs.setups[0]]);
      expect(data.openPositions).toEqual(obs.openPositions);
      expect(text).toContain(
        "an ADD and must carry NO stopLossPrice or takeProfitPrice",
      );
      expect(futuresEntryPreflight(open("NXT"), obs)).toBeNull();
      for (const action of [
        { type: "futures_close", positionId: 7 },
        { type: "futures_set_sltp", positionId: 7, stopLossPrice: 90 },
      ])
        expect(futuresEntryPreflight(action as ProposedAction, obs)).toBeNull();
    });

    it("truthfully allows skipping when every new futures entry is blocked", () => {
      const obs = observation([watch("NXT"), watch("CAW")]);
      const text = buildUserPrompt(obs, undefined, {
        venues: ["futures"],
        compactTables,
      });
      expect(projected(text).setups).toEqual([]);
      expect(text).toContain(
        "There are NO new futures entry candidates this cycle",
      );
      expect(text).toContain("No entry action is available this cycle; skip.");
      expect(text).not.toContain("Your ONLY moves are to OPEN");
      const mixed = buildUserPrompt(obs, undefined, {
        venues: ["spot", "futures"],
        compactTables,
      });
      expect(mixed).toContain("do not force a spot trade to avoid skipping");
      expect(mixed).toContain("(spot_order) or to skip");
    });

    it("does not restrict a spot-only agent or infer unavailability from coin symbols", () => {
      const obs = observation([watch("NXT"), watch("CAW")]);
      const spot = buildUserPrompt(obs, undefined, {
        venues: ["spot"],
        compactTables,
      });
      expect(projected(spot).setups).toEqual(obs.setups);
      expect(projected(spot)).not.toHaveProperty("futuresEntryChoices");
      for (const row of obs.watch) delete row.futuresEntryEligibility;
      const unknown = buildUserPrompt(obs, undefined, {
        venues: ["futures"],
        compactTables,
      });
      expect(projected(unknown).setups).toEqual(obs.setups);
      expect(unknown).not.toContain("NEW FUTURES ENTRY AVAILABILITY");
    });
  },
);

describe("choice and observation contract", () => {
  it.each(["closed", "spot"])(
    "does not exempt a %s holding and deduplicates normalized symbols",
    (kind) => {
      const obs = observation([watch("NXT"), watch("nxt-perp")]);
      obs.openPositions = [
        {
          id: 7,
          venue: kind === "spot" ? "spot" : "futures",
          symbol: "NXT",
          status: kind === "closed" ? "closed" : "open",
        },
      ];
      expect(futuresEntryChoices(obs)).toEqual({
        candidates: [],
        blocked: [{ symbol: "NXT", code: "futures_reference_unavailable" }],
      });
    },
  );

  it("compact watch tables retain every blocked row and the same choice/setups projection", () => {
    const obs = observation(
      Array.from({ length: 10 }, (_, i) => watch(`COIN${i}`)),
    );
    const full = projected(
      buildUserPrompt(obs, undefined, { venues: ["futures"] }),
    );
    const compact = projected(
      buildUserPrompt(obs, undefined, {
        venues: ["futures"],
        compactTables: true,
      }),
    );
    expect(compact.tableFormat).toContain("Tabular lists");
    delete compact.tableFormat;
    expect(compact).toEqual(full);
    expect(compact.watch).toEqual(obs.watch);
  });

  it("carries watchlist NXT and discovered CAW provider shapes through real observe and prompt without additional requests", async () => {
    const ok = (data: unknown) => ({ ok: true, status: 200, data });
    const base = parseSkill(renderFolderOfOne("fixture", "conservative")).spec;
    const spec = {
      ...base,
      venues: ["futures"] as typeof base.venues,
      capabilities: ["universe_scan", "indicators"] as typeof base.capabilities,
      risk: { ...base.risk, watchlist: ["NXT", "BTC"] },
    };
    const api = {
      me: async () => ok({ scopes: ["read", "trade:futures"] }),
      portfolio: async () =>
        ok({ equity: { totalUsd: 50000, availableUsd: 1000 } }),
      wallet: async () => ok({ usdt: { available: 1000 } }),
      futuresPositions: async () => ok({ positions: [] }),
      trades: async () => ok({ trades: [] }),
      resolve: vi.fn(async (symbol: string) =>
        ok({
          match: { coinId: symbol === "NXT" ? "nexst" : "1", name: symbol },
        }),
      ),
      market: vi.fn(async (coinId: string) =>
        ok({
          price: { usd: 100, change24h: 20 },
          observation: { freshness: { status: "fresh" } },
          futuresEntryEligibility: eligibility(
            coinId === "1"
              ? { status: "eligible", venue: "binance", symbol: "BTCUSDT" }
              : {},
          ),
        }),
      ),
      cryptoMovers: vi.fn(async () =>
        ok([
          {
            symbol: "CAW",
            ucid: "30402",
            currentPrice: "100",
            change24h: "30",
          },
        ]),
      ),
      candles: vi.fn(async () =>
        ok({
          candles: Array.from({ length: 60 }, (_, i) => ({
            t: 1791540000 + i * 300,
            o: 100 + i,
            h: 102 + i,
            l: 98 + i,
            c: 101 + i,
            v: 1000,
          })),
        }),
      ),
    };
    const { observation: obs, skip } = await observe(
      api as unknown as CoinRithmClient,
      spec,
      newState("fixture"),
    );
    expect(skip).toBeUndefined();
    expect(obs.watch.map((row) => [row.symbol, row.coinId])).toEqual([
      ["NXT", "nexst"],
      ["BTC", "1"],
      ["CAW", "30402"],
    ]);
    expect(obs.watch[2].discovered).toBe(true);
    expect(new Set(obs.setups.map((setup) => setup.symbol))).toEqual(
      new Set(["NXT", "BTC", "CAW"]),
    );
    const receipt = buildObservationReceipt(obs);
    const data = projected(
      buildUserPrompt(obs, undefined, { venues: spec.venues }),
    );
    expect(
      new Set(data.setups.map((setup: { symbol: string }) => setup.symbol)),
    ).toEqual(new Set(["BTC"]));
    expect(buildObservationReceipt(obs)).toEqual(receipt);
    expect(api.resolve).toHaveBeenCalledTimes(2);
    expect(api.market).toHaveBeenCalledTimes(3);
    expect(api.candles).toHaveBeenCalledTimes(3);
    expect(api.cryptoMovers).toHaveBeenCalledTimes(1);
  });
});
