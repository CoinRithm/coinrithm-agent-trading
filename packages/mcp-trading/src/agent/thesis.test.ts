import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  coerceThesis,
  bindThesis,
  evaluateFuturesThesis,
  evaluatePmThesis,
  attachTheses,
  thesisExits,
  rememberThesis,
  forgetThesis,
  thesisKey,
  describeInvalidation,
  THESIS_MIN_HOLD_MINUTES,
  THESIS_MAX_HOLD_MINUTES,
  MAX_PERSISTED_THESES,
} from "./thesis.js";
import { parseDecision, DECISION_JSON_SCHEMA } from "./decision.js";
import { loadState, newState, saveState } from "./state.js";
import type {
  Observation,
  OpenPosition,
  PmPosition,
  PositionThesis,
} from "./types.js";

const NOW = Date.parse("2026-09-02T12:00:00.000Z");
const minutesAgo = (m: number) => new Date(NOW - m * 60_000).toISOString();

const futuresThesis = (over: Partial<PositionThesis> = {}): PositionThesis => ({
  summary: "BTC broke its recent20 high with EMA20 above EMA50",
  invalidation: { priceBelow: 64000, maxHoldMinutes: 240 },
  venue: "futures",
  positionId: 52,
  symbol: "BTC",
  side: "long",
  openedAt: minutesAgo(30),
  entryPrice: 67000,
  ...over,
});

const futuresPos = (over: Partial<OpenPosition> = {}): OpenPosition => ({
  venue: "futures",
  id: 52,
  symbol: "BTC",
  side: "long",
  status: "open",
  leverage: 2,
  marginMusd: 2000,
  entryPrice: 67000,
  markPrice: 67500,
  openedAt: minutesAgo(30),
  ...over,
});

const pmPos = (over: Partial<PmPosition> = {}): PmPosition => ({
  id: 7,
  source: "polymarket",
  slug: "btc-above-80k",
  outcomeExternalMarketId: "12345",
  side: "yes",
  stakeMusd: 500,
  entryProbability: 42,
  currentProbability: 38,
  openedAt: minutesAgo(90),
  status: "open",
  ...over,
});

const obs = (over: Partial<Observation> = {}): Observation => ({
  asOf: "t",
  scopes: [],
  cashAvailableMusd: 1000,
  equityMusd: 50000,
  openPositions: [],
  openOrders: [],
  pmPositions: [],
  pmResolutions: [],
  pmMarkets: [],
  watch: [],
  setups: [],
  syncCursor: null,
  newClosedTrades: [],
  polledBeforeWrite: true,
  ...over,
});

describe("coerceThesis (tolerant parse of the model's thesis)", () => {
  it("parses the nested contract, coercing stringified numbers and trimming text", () => {
    const t = coerceThesis({
      summary: "  Breakout with momentum agreeing  ",
      invalidation: {
        priceBelow: "64000",
        maxHoldMinutes: 240,
        catalyst: "  CPI prints hot ",
      },
    });
    expect(t).toEqual({
      summary: "Breakout with momentum agreeing",
      invalidation: {
        priceBelow: 64000,
        maxHoldMinutes: 240,
        catalyst: "CPI prints hot",
      },
    });
  });

  it("accepts a flattened shape from a weak model", () => {
    const t = coerceThesis({ summary: "x", priceBelow: 64000 });
    expect(t?.invalidation.priceBelow).toBe(64000);
  });

  it("returns undefined for garbage, never throws", () => {
    expect(coerceThesis(null)).toBeUndefined();
    expect(coerceThesis("just text")).toBeUndefined();
    expect(coerceThesis([])).toBeUndefined();
    expect(coerceThesis({})).toBeUndefined();
    expect(coerceThesis({ summary: "", invalidation: {} })).toBeUndefined();
    // A negative level is not a condition; with no summary nothing is left.
    expect(
      coerceThesis({ invalidation: { priceBelow: -5, maxHoldMinutes: "abc" } }),
    ).toBeUndefined();
  });

  it("keeps machine-checkable conditions even when the summary is missing", () => {
    const t = coerceThesis({ invalidation: { maxHoldMinutes: 120 } });
    expect(t?.summary).toBe("(no summary stated)");
    expect(t?.invalidation.maxHoldMinutes).toBe(120);
  });

  it("caps runaway text", () => {
    const t = coerceThesis({
      summary: "s".repeat(500),
      invalidation: { catalyst: "c".repeat(500) },
    });
    expect(t?.summary.length).toBe(200);
    expect(t?.invalidation.catalyst?.length).toBe(160);
  });
});

describe("bindThesis (side-aware sanitizing at open)", () => {
  const base = {
    positionId: 99,
    openedAt: minutesAgo(0),
    symbol: "BTC",
  };

  it("long: keeps a priceBelow under entry, drops priceAbove and PM fields", () => {
    const { thesis, notes } = bindThesis({
      ...base,
      thesis: {
        summary: "s",
        invalidation: {
          priceBelow: 65000,
          priceAbove: 70000,
          probabilityBelow: 30,
        },
      },
      venue: "futures",
      side: "long",
      entryPrice: 67000,
    });
    expect(thesis.invalidation).toEqual({ priceBelow: 65000 });
    expect(notes.join(" ")).toMatch(/dropped priceAbove/);
    expect(notes.join(" ")).toMatch(/dropped probabilityBelow/);
    expect(thesis).toMatchObject({
      venue: "futures",
      positionId: 99,
      symbol: "BTC",
      side: "long",
      entryPrice: 67000,
      openedAt: base.openedAt,
    });
  });

  it("long: a priceBelow at or above entry is dropped (would fire on the next tick)", () => {
    const { thesis, notes } = bindThesis({
      ...base,
      thesis: { summary: "s", invalidation: { priceBelow: 67500 } },
      venue: "futures",
      side: "long",
      entryPrice: 67000,
    });
    expect(thesis.invalidation.priceBelow).toBeUndefined();
    expect(notes.join(" ")).toMatch(/must be below entry 67000/);
  });

  it("short: keeps a priceAbove over entry, drops priceBelow", () => {
    const { thesis } = bindThesis({
      ...base,
      thesis: {
        summary: "s",
        invalidation: { priceAbove: 69000, priceBelow: 60000 },
      },
      venue: "futures",
      side: "short",
      entryPrice: 67000,
    });
    expect(thesis.invalidation).toEqual({ priceAbove: 69000 });
  });

  it("PM yes: keeps probabilityBelow under entry, drops probabilityAbove, price fields and >100 values", () => {
    const { thesis } = bindThesis({
      ...base,
      thesis: {
        summary: "s",
        invalidation: {
          probabilityBelow: 35,
          probabilityAbove: 80,
          priceBelow: 1,
        },
      },
      venue: "pm",
      side: "yes",
      source: "polymarket",
      slug: "btc-above-80k",
      outcomeExternalMarketId: "12345",
      entryProbability: 42,
    });
    expect(thesis.invalidation).toEqual({ probabilityBelow: 35 });
    expect(thesis).toMatchObject({
      venue: "pm",
      source: "polymarket",
      slug: "btc-above-80k",
      outcomeExternalMarketId: "12345",
      entryProbability: 42,
    });
    const over = bindThesis({
      ...base,
      thesis: { summary: "s", invalidation: { probabilityBelow: 150 } },
      venue: "pm",
      side: "yes",
    });
    expect(over.thesis.invalidation.probabilityBelow).toBeUndefined();
  });

  it("PM no: keeps probabilityAbove over entry, drops probabilityBelow", () => {
    const { thesis } = bindThesis({
      ...base,
      thesis: {
        summary: "s",
        invalidation: { probabilityAbove: 60, probabilityBelow: 20 },
      },
      venue: "pm",
      side: "no",
      entryProbability: 42,
    });
    expect(thesis.invalidation).toEqual({ probabilityAbove: 60 });
  });

  it("clamps the time stop to the floor and ceiling and says so", () => {
    const low = bindThesis({
      ...base,
      thesis: { summary: "s", invalidation: { maxHoldMinutes: 5 } },
      venue: "futures",
      side: "long",
    });
    expect(low.thesis.invalidation.maxHoldMinutes).toBe(
      THESIS_MIN_HOLD_MINUTES,
    );
    expect(low.notes.join(" ")).toMatch(/clamped to 60/);
    const high = bindThesis({
      ...base,
      thesis: { summary: "s", invalidation: { maxHoldMinutes: 1_000_000 } },
      venue: "futures",
      side: "long",
    });
    expect(high.thesis.invalidation.maxHoldMinutes).toBe(
      THESIS_MAX_HOLD_MINUTES,
    );
  });
});

describe("evaluateFuturesThesis", () => {
  it("is intact while the mark holds above the level and the time stop is not reached", () => {
    const v = evaluateFuturesThesis(futuresThesis(), futuresPos(), NOW);
    expect(v.status).toBe("intact");
    expect(v.holdMinutes).toBe(30);
    expect(v.invalidatedBy).toBeUndefined();
    expect(v.summary).toMatch(/recent20 high/);
  });

  it("is invalidated when the mark trades at or below priceBelow", () => {
    const v = evaluateFuturesThesis(
      futuresThesis(),
      futuresPos({ markPrice: 63900 }),
      NOW,
    );
    expect(v.status).toBe("invalidated");
    expect(v.invalidatedBy).toMatch(/63900 at or below priceBelow 64000/);
  });

  it("short: is invalidated when the mark trades at or above priceAbove", () => {
    const v = evaluateFuturesThesis(
      futuresThesis({ side: "short", invalidation: { priceAbove: 69000 } }),
      futuresPos({ side: "short", markPrice: 69000 }),
      NOW,
    );
    expect(v.status).toBe("invalidated");
    expect(v.invalidatedBy).toMatch(/priceAbove 69000/);
  });

  it("is invalidated by the time stop once the hold reaches maxHoldMinutes", () => {
    const v = evaluateFuturesThesis(
      futuresThesis(),
      futuresPos({ openedAt: minutesAgo(300) }),
      NOW,
    );
    expect(v.status).toBe("invalidated");
    expect(v.holdMinutes).toBe(300);
    expect(v.invalidatedBy).toMatch(/time stop 240m/);
  });

  it("without a mark it is judged on the time stop only", () => {
    const v = evaluateFuturesThesis(
      futuresThesis(),
      futuresPos({ markPrice: undefined }),
      NOW,
    );
    expect(v.status).toBe("intact");
  });

  it("falls back to the bind-time openedAt when the position carries none", () => {
    const v = evaluateFuturesThesis(
      futuresThesis({ openedAt: minutesAgo(45) }),
      futuresPos({ openedAt: undefined }),
      NOW,
    );
    expect(v.holdMinutes).toBe(45);
  });
});

describe("evaluatePmThesis", () => {
  const t = (over: Partial<PositionThesis> = {}): PositionThesis => ({
    summary: "market underprices a resolved catalyst",
    invalidation: { probabilityBelow: 35, maxHoldMinutes: 1440 },
    venue: "pm",
    positionId: 7,
    side: "yes",
    openedAt: minutesAgo(90),
    entryProbability: 42,
    ...over,
  });

  it("yes: invalidated once the outcome's probability is at or below probabilityBelow", () => {
    expect(
      evaluatePmThesis(t(), pmPos({ currentProbability: 35 }), NOW),
    ).toMatchObject({
      status: "invalidated",
      holdMinutes: 90,
    });
    expect(
      evaluatePmThesis(t(), pmPos({ currentProbability: 60 }), NOW).status,
    ).toBe("intact");
  });

  it("no: invalidated once the probability is at or above probabilityAbove", () => {
    const v = evaluatePmThesis(
      t({ side: "no", invalidation: { probabilityAbove: 60 } }),
      pmPos({ side: "no", currentProbability: 61 }),
      NOW,
    );
    expect(v.status).toBe("invalidated");
    expect(v.invalidatedBy).toMatch(/probabilityAbove 60/);
  });

  it("a null current probability is judged on the time stop only", () => {
    const v = evaluatePmThesis(
      t(),
      pmPos({ currentProbability: undefined }),
      NOW,
    );
    expect(v.status).toBe("intact");
  });
});

describe("attachTheses / thesisExits / pruning", () => {
  it("attaches evaluated views to the matching positions and prunes orphans", () => {
    const state = newState("r");
    state.theses = {
      [thesisKey("futures", 52)]: futuresThesis(),
      [thesisKey("futures", 53)]: futuresThesis({ positionId: 53 }), // gone
      [thesisKey("pm", 7)]: {
        summary: "s",
        invalidation: { probabilityBelow: 35 },
        venue: "pm",
        positionId: 7,
        side: "yes",
        openedAt: minutesAgo(90),
      },
      [thesisKey("pm", 8)]: {
        summary: "s",
        invalidation: { probabilityBelow: 35 },
        venue: "pm",
        positionId: 8, // gone
        side: "yes",
        openedAt: minutesAgo(90),
      },
    };
    const o = obs({
      openPositions: [futuresPos({ markPrice: 63000 }), futuresPos({ id: 60 })],
      pmPositions: [pmPos({ currentProbability: 30 })],
    });
    const r = attachTheses(o, state, NOW, { prunePm: true });
    expect(r.attached).toBe(2);
    expect(r.pruned.sort()).toEqual(["futures:53", "pm:8"]);
    expect(o.openPositions[0].thesis?.status).toBe("invalidated");
    expect(o.openPositions[1].thesis).toBeUndefined(); // no thesis stated
    expect(o.pmPositions[0].thesis?.status).toBe("invalidated");
    expect(Object.keys(state.theses).sort()).toEqual(["futures:52", "pm:7"]);
    // Only the invalidated FUTURES position is a runner exit; PM never is.
    expect(thesisExits(o).map((p) => p.id)).toEqual([52]);
  });

  it("keeps PM theses when the pm book was not read this cycle", () => {
    const state = newState("r");
    state.theses = {
      [thesisKey("pm", 8)]: {
        summary: "s",
        invalidation: { maxHoldMinutes: 120 },
        venue: "pm",
        positionId: 8,
        openedAt: minutesAgo(10),
      },
    };
    attachTheses(obs(), state, NOW, { prunePm: false });
    expect(state.theses["pm:8"]).toBeDefined();
  });

  it("is a no-op without any persisted theses (state stays byte-identical)", () => {
    const state = newState("r");
    const r = attachTheses(obs({ openPositions: [futuresPos()] }), state, NOW, {
      prunePm: true,
    });
    expect(r).toEqual({ attached: 0, pruned: [] });
    expect(state.theses).toBeUndefined();
  });
});

describe("rememberThesis / forgetThesis", () => {
  it("adds, caps at the oldest-first bound, and forgets", () => {
    const state = newState("r");
    for (let i = 0; i < MAX_PERSISTED_THESES + 5; i++) {
      rememberThesis(
        state,
        futuresThesis({ positionId: i, openedAt: minutesAgo(1000 - i) }),
      );
    }
    expect(Object.keys(state.theses ?? {}).length).toBe(MAX_PERSISTED_THESES);
    // The oldest (smallest i = furthest openedAt) were dropped.
    expect(state.theses?.["futures:0"]).toBeUndefined();
    expect(state.theses?.[`futures:${MAX_PERSISTED_THESES + 4}`]).toBeDefined();
    forgetThesis(state, `futures:${MAX_PERSISTED_THESES + 4}`);
    expect(
      state.theses?.[`futures:${MAX_PERSISTED_THESES + 4}`],
    ).toBeUndefined();
    forgetThesis(state, "futures:nope"); // no throw
  });

  it("describes an invalidation in one line", () => {
    expect(
      describeInvalidation({
        priceBelow: 64000,
        maxHoldMinutes: 240,
        catalyst: "CPI",
      }),
    ).toBe("priceBelow 64000, time stop 240m, catalyst: CPI");
    expect(describeInvalidation({})).toBe("no condition");
  });
});

describe("parseDecision carries the thesis on opens and never fails on a bad one", () => {
  const open = {
    type: "futures_open",
    symbol: "BTC",
    side: "long",
    leverage: 3,
    marginMusd: 2000,
    stopLossPrice: 60000,
  };

  it("parses a thesis on futures_open and pm_open", () => {
    const r = parseDecision(
      JSON.stringify({
        decision: "act",
        actions: [
          {
            ...open,
            thesis: {
              summary: "breakout",
              invalidation: { priceBelow: "64000", maxHoldMinutes: 240 },
            },
          },
          {
            type: "pm_open",
            ref: "pm1",
            stakeMusd: 500,
            thesis: {
              summary: "mispriced",
              invalidation: { probabilityBelow: 35, catalyst: "vote fails" },
            },
          },
        ],
      }),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const a0 = r.decision.actions[0] as { thesis?: { invalidation: unknown } };
    const a1 = r.decision.actions[1] as { thesis?: { invalidation: unknown } };
    expect(a0.thesis?.invalidation).toEqual({
      priceBelow: 64000,
      maxHoldMinutes: 240,
    });
    expect(a1.thesis?.invalidation).toEqual({
      probabilityBelow: 35,
      catalyst: "vote fails",
    });
  });

  it("a malformed thesis is dropped, the open still parses", () => {
    const r = parseDecision(
      JSON.stringify({
        decision: "act",
        actions: [{ ...open, thesis: "hold until it works" }],
      }),
    );
    expect(r.ok).toBe(true);
    if (r.ok)
      expect(
        (r.decision.actions[0] as { thesis?: unknown }).thesis,
      ).toBeUndefined();
  });

  it("a thesis copied onto a close / sltp / cancel is accepted and ignored", () => {
    for (const action of [
      { type: "futures_close", positionId: 52, thesis: { summary: "x" } },
      {
        type: "futures_set_sltp",
        positionId: 52,
        stopLossPrice: 66000,
        thesis: { summary: "x" },
      },
      { type: "spot_cancel", orderId: 5, thesis: { summary: "x" } },
    ]) {
      const r = parseDecision(
        JSON.stringify({ decision: "act", actions: [action] }),
      );
      expect(r.ok).toBe(true);
    }
  });

  it("the structured-output schema REQUIRES a thesis on every open and none on a close", () => {
    const schemas = DECISION_JSON_SCHEMA.properties.actions.items
      .oneOf as ReadonlyArray<{
      properties: { type: { const: string }; thesis?: unknown };
      required: readonly string[];
    }>;
    const byType = new Map(schemas.map((s) => [s.properties.type.const, s]));
    for (const t of ["futures_open", "spot_order", "pm_open"]) {
      expect(byType.get(t)?.required).toContain("thesis");
      expect(byType.get(t)?.properties.thesis).toBeDefined();
    }
    for (const t of ["futures_close", "futures_set_sltp", "spot_cancel"]) {
      expect(byType.get(t)?.required).not.toContain("thesis");
      expect(byType.get(t)?.properties.thesis).toBeUndefined();
    }
  });
});

describe("state round trip (file)", () => {
  let tmp: string;
  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "cr-thesis-"));
  });
  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it("persists theses with the run state and reloads them intact", () => {
    const f = join(tmp, "state.json");
    const s = newState("run-1");
    rememberThesis(s, futuresThesis());
    saveState(f, s);
    const reloaded = loadState(f, "run-1");
    expect(reloaded.theses?.["futures:52"]).toEqual(futuresThesis());
    // Nothing else regressed on the reload path.
    expect(reloaded.disabled).toBe(false);
    expect(reloaded.intentSeq).toEqual({});
  });
});
