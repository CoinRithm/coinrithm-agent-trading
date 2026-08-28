import { describe, it, expect } from "vitest";
import { evaluateGate, noteLlmCall, estimateCostUsd } from "./gate.js";
import {
  Observation,
  RunState,
  SetupSignal,
  OpenPosition,
  PmMarket,
  TriggerPolicy,
  DEFAULT_TRIGGER_POLICY,
} from "./types.js";

function obs(
  setups: SetupSignal[],
  openPositions: OpenPosition[] = [],
  pmMarkets: PmMarket[] = [],
): Observation {
  return {
    asOf: "t",
    scopes: [],
    cashAvailableMusd: 50000,
    equityMusd: 50000,
    openPositions,
    openOrders: [],
    pmPositions: [],
    pmResolutions: [],
    pmMarkets,
    watch: [],
    setups,
    syncCursor: null,
    newClosedTrades: [],
    polledBeforeWrite: true,
  };
}
function state(partial: Partial<RunState> = {}): RunState {
  return {
    runId: "r",
    cyclesRun: 1,
    writesToday: 0,
    riskIncreasesToday: 0,
    realizedPnlMusd: 0,
    peakRealizedMusd: 0,
    consecutiveRejectCycles: 0,
    consecutiveModelFailures: 0,
    rateLimitHits: 0,
    disabled: false,
    dayKey: "d",
    cursor: null,
    seen: [],
    realizedPnlTodayMusd: 0,
    consecutiveExecFailures: 0,
    intentSeq: {},
    ...partial,
  };
}
const setup = (
  kind: SetupSignal["kind"],
  held?: "long" | "short",
): SetupSignal => ({
  symbol: "BTC",
  kind,
  bias: "short",
  strength: 0.8,
  note: "x",
  held,
});
const pol = (p: Partial<TriggerPolicy> = {}): TriggerPolicy => ({
  ...DEFAULT_TRIGGER_POLICY,
  ...p,
});
const POS: OpenPosition = { venue: "futures", id: 1, side: "short" };

describe("evaluateGate", () => {
  it("does NOT fire on a flat tape with no open position (and no PM)", () => {
    const g = evaluateGate(obs([]), state(), pol(), 1000);
    expect(g.fire).toBe(false);
    expect(g.codes).toEqual([]);
  });

  it("wakes for PM periodically on a quiet price tape once the cooldown elapsed", () => {
    const now = 100_000_000;
    const pm: PmMarket[] = [
      {
        source: "polymarket",
        slug: "x",
        outcomeExternalMarketId: "1",
        probability: 0.4,
      },
    ];
    const st = state({ lastLlmCallAt: now - 11 * 60_000 }); // 11 min > 10 min cooldown
    const g = evaluateGate(obs([], [], pm), st, pol(), now);
    expect(g.fire).toBe(true);
    expect(g.codes).toContain("PM_PERIODIC");
  });

  it("does NOT wake for PM within the cooldown window", () => {
    const now = 100_000_000;
    const pm: PmMarket[] = [
      {
        source: "polymarket",
        slug: "x",
        outcomeExternalMarketId: "1",
        probability: 0.4,
      },
    ];
    const st = state({ lastLlmCallAt: now - 2 * 60_000 }); // 2 min < 10 min cooldown
    const g = evaluateGate(obs([], [], pm), st, pol(), now);
    expect(g.fire).toBe(false);
  });

  it("fires on a fresh (not-held) entry setup", () => {
    const g = evaluateGate(obs([setup("breakdown")]), state(), pol(), 1000);
    expect(g.fire).toBe(true);
    expect(g.codes).toContain("PRICE_BREAKDOWN");
  });

  it("always fires when an open position exists (manage path)", () => {
    const g = evaluateGate(obs([], [POS]), state(), pol(), 1000);
    expect(g.fire).toBe(true);
    expect(g.codes).toContain("POSITION_OPEN");
  });

  it("flags a big PnL swing on an open position", () => {
    const g = evaluateGate(
      obs([], [{ ...POS, unrealizedPnlMusd: -300 }]),
      state(),
      pol(),
      1000,
    );
    expect(g.codes).toContain("POSITION_BIG_PNL_SWING");
  });

  it("a held setup with no open position adds no entry trigger", () => {
    const g = evaluateGate(
      obs([setup("downtrend", "short")]),
      state(),
      pol(),
      1000,
    );
    expect(g.fire).toBe(false);
  });

  it("always-mode fires even with no trigger", () => {
    const g = evaluateGate(obs([]), state(), pol({ mode: "always" }), 1000);
    expect(g.fire).toBe(true);
  });

  it("suppresses entry-only cycles over the hourly budget", () => {
    const now = 10_000_000;
    const st = state({
      llmCallTimestamps: [now - 1000, now - 2000, now - 3000],
    });
    const g = evaluateGate(
      obs([setup("breakout")]),
      st,
      pol({ maxLlmCallsPerHour: 3 }),
      now,
    );
    expect(g.fire).toBe(false);
    expect(g.reason).toMatch(/budget/);
  });

  it("exempts an open position from the hourly budget", () => {
    const now = 10_000_000;
    const st = state({
      llmCallTimestamps: [now - 1000, now - 2000, now - 3000],
    });
    const g = evaluateGate(
      obs([], [POS]),
      st,
      pol({ maxLlmCallsPerHour: 3 }),
      now,
    );
    expect(g.fire).toBe(true);
  });

  it("debounces an identical entry-trigger set within the window", () => {
    const now = 10_000_000;
    const st = state({
      lastTriggerFingerprint: "PRICE_BREAKOUT",
      lastLlmCallAt: now - 60_000,
    });
    const g = evaluateGate(
      obs([setup("breakout")]),
      st,
      pol({ debounceMinutes: 5 }),
      now,
    );
    expect(g.fire).toBe(false);
    expect(g.reason).toMatch(/debounced/);
  });
});

describe("noteLlmCall", () => {
  it("records the call time + sorted fingerprint", () => {
    const st = state();
    noteLlmCall(st, ["PRICE_BREAKOUT", "POSITION_OPEN"], 5000);
    expect(st.lastLlmCallAt).toBe(5000);
    expect(st.lastTriggerFingerprint).toBe("POSITION_OPEN,PRICE_BREAKOUT");
    expect(st.llmCallTimestamps).toEqual([5000]);
  });
});

describe("estimateCostUsd", () => {
  it("is zero for the free NVIDIA tier", () => {
    expect(estimateCostUsd("nvidia", 5000, 300)).toBe(0);
  });
  it("is positive for a paid provider", () => {
    expect(estimateCostUsd("anthropic", 1_000_000, 0)).toBeGreaterThan(0);
  });
});
