import { describe, it, expect } from "vitest";
import { buildUserPrompt, formatPmResolutions } from "./prompt.js";
import { Observation, PmResolution } from "./types.js";

const baseObs = (over: Partial<Observation> = {}): Observation => ({
  asOf: "t",
  scopes: ["read", "trade:pm"],
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

describe("formatPmResolutions", () => {
  it("returns nothing for an empty list (no block, no token cost)", () => {
    expect(formatPmResolutions([])).toEqual([]);
  });

  it("renders win/loss/void concisely with side + rounded pnl", () => {
    const resolutions: PmResolution[] = [
      {
        id: 1,
        eventTitle: "Will BTC top $80k?",
        side: "yes",
        status: "settled_win",
        pnlMusd: 320.6,
        stakeMusd: 25,
      },
      {
        id: 2,
        eventTitle: "ETH flips SOL by Friday?",
        side: "no",
        status: "settled_loss",
        pnlMusd: -100,
        stakeMusd: 100,
      },
      {
        id: 3,
        eventTitle: "Tie game?",
        side: "yes",
        status: "void_refunded",
        pnlMusd: undefined,
        stakeMusd: 10,
      },
    ];
    const lines = formatPmResolutions(resolutions).join("\n");
    // Reflective framing — explicitly NOT a position to manage.
    expect(lines).toMatch(/settlement feedback/i);
    expect(lines).toMatch(/learn from these/i);
    // Win: side + WON + signed pnl.
    expect(lines).toContain('"Will BTC top $80k?" — YES, WON +321 mUSD');
    // Loss: side + LOST + negative pnl.
    expect(lines).toContain('"ETH flips SOL by Friday?" — NO, LOST -100 mUSD');
    // Void: refund framing, no pnl number.
    expect(lines).toContain('"Tie game?" — YES, VOID (stake refunded)');
  });

  it("caps the rendered list at 12 items", () => {
    const many: PmResolution[] = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      eventTitle: `M${i}`,
      side: "yes",
      status: "settled_win",
      pnlMusd: 1,
      stakeMusd: 10,
    }));
    const line = formatPmResolutions(many).at(-1) ?? "";
    // 12 rendered items -> 11 separators ("; ").
    expect(line.split("; ").length).toBe(12);
  });
});

describe("buildUserPrompt — settlement feedback integration", () => {
  it("omits the resolutions block when there are none", () => {
    const out = buildUserPrompt(baseObs());
    expect(out).not.toMatch(/settlement feedback/i);
  });

  it("includes the resolutions block when pmResolutions is non-empty", () => {
    const out = buildUserPrompt(
      baseObs({
        pmResolutions: [
          {
            id: 1,
            eventTitle: "Will BTC top $80k?",
            side: "yes",
            status: "settled_win",
            pnlMusd: 320,
            stakeMusd: 25,
          },
        ],
      }),
    );
    expect(out).toMatch(/Resolved since last cycle/);
    expect(out).toContain('"Will BTC top $80k?" — YES, WON +320 mUSD');
  });
});
