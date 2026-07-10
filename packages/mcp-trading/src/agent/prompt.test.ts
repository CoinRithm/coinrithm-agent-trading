import { describe, it, expect } from "vitest";
import { buildSystemPrompt, buildUserPrompt, formatPmResolutions } from "./prompt.js";
import { parseSkill } from "./skill.js";
import { renderFolderOfOne } from "./templates.js";
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

describe("buildSystemPrompt — independent forecast (pm_open forecastProbability)", () => {
  const specWithPm = () => {
    const spec = parseSkill(renderFolderOfOne("a", "conservative")).spec;
    spec.venues = ["pm", "futures", "spot"];
    return spec;
  };

  it("omits the forecast field + rule by default (includeForecast off)", () => {
    const out = buildSystemPrompt(specWithPm(), "strategy");
    expect(out).not.toMatch(/forecastProbability/);
    expect(out).not.toMatch(/FORECAST RULE/);
  });

  it("adds the forecast field to pm_open + the anti-echo FORECAST RULE when includeForecast is on", () => {
    const out = buildSystemPrompt(specWithPm(), "strategy", {
      includeForecast: true,
    });
    expect(out).toMatch(/"forecastProbability":1\.\.99/);
    expect(out).toMatch(/FORECAST RULE/);
    // The rule must tell the model NOT to echo/anchor on the market price.
    expect(out).toMatch(/do NOT copy, round, or anchor/i);
  });
});

describe("buildSystemPrompt — pm_ref escape hatch (hallucination fix)", () => {
  const specWithPm = () => {
    const spec = parseSkill(renderFolderOfOne("a", "conservative")).spec;
    spec.venues = ["pm", "futures", "spot"];
    return spec;
  };

  it("adds an ESCAPE HATCH: an unlisted crypto view is a legitimate SKIP, not a reason to invent a ref", () => {
    const out = buildSystemPrompt(specWithPm(), "strategy");
    expect(out).toMatch(/ESCAPE HATCH/);
    expect(out).toMatch(/legitimate SKIP for PM/i);
    // Explicitly forbids inventing/incrementing a ref and names the wasted-cycle cost.
    expect(out).toMatch(/do NOT invent, guess, or increment a ref/i);
    expect(out).toMatch(/pm_ref_unknown/);
    // Scopes the "bettable" set to THIS cycle's listed markets.
    expect(out).toMatch(/listed in observation\.pmMarkets THIS cycle \(pm1\.\.pmN\)/);
    // The scan REQUIREMENT (edge thesis) is preserved, not removed.
    expect(out).toMatch(/REQUIRED that you scan/);
  });

  it("keeps the pm_open action ref instruction scoped to THIS cycle's listed refs (pm1..pmN)", () => {
    const out = buildSystemPrompt(specWithPm(), "strategy");
    expect(out).toMatch(/one of the refs listed THIS cycle \(pm1\.\.pmN\)/);
  });
});
