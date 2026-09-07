import { describe, it, expect } from "vitest";
import {
  buildDailyRiskBudget,
  buildSystemPrompt,
  buildUserPrompt,
  formatPmResolutions,
} from "./prompt.js";
import { parseSkill } from "./skill.js";
import { renderFolderOfOne } from "./templates.js";
import { Observation, PmResolution } from "./types.js";
import { newState } from "./state.js";

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

describe("daily entry/add risk budget context", () => {
  it.each([
    { limit: 5, used: 2, remaining: 3 },
    { limit: 5, used: 5, remaining: 0 },
    { limit: 5, used: 7, remaining: 0 },
    { limit: 0, used: 999, remaining: null },
  ])(
    "renders limit=$limit used=$used as remaining=$remaining",
    ({ limit, used, remaining }) => {
      const spec = parseSkill(renderFolderOfOne("a", "conservative")).spec;
      spec.limits.maxTradesPerDay = limit;
      const state = newState("r");
      state.riskIncreasesToday = used;
      // Protective writes and calls must not reduce the available entry slots.
      state.writesToday = 2000;
      state.llmCallTimestamps = [1, 2, 3];
      const before = structuredClone(state);
      const budget = buildDailyRiskBudget(spec, state);
      expect(budget).toEqual({
        version: "coinrithm.daily-risk-budget.v1",
        utcDay: state.dayKey,
        limit: limit || null,
        used,
        remaining,
      });
      expect(state).toEqual(before);

      const obs = baseObs({
        openPositions: [
          { venue: "futures", id: 7, symbol: "BTC", status: "open" },
        ],
        openOrders: [{ id: 8, symbol: "ETH" }],
      });
      const out = buildUserPrompt(obs, undefined, { dailyRiskBudget: budget });
      const input = JSON.parse(out.match(/```json\n(.*)\n```/)![1]);
      expect(input.dailyRiskBudget).toEqual(budget);
      expect(input.openPositions).toEqual(obs.openPositions);
      expect(input.openOrders).toEqual(obs.openOrders);
      expect(input.cashAvailableMusd).toBe(obs.cashAvailableMusd);
      expect(input.equityMusd).toBe(obs.equityMusd);
      expect(out.match(/"openPositions":/g)).toHaveLength(1);
      expect(out).toContain(
        "futures_open (including adds) / spot_order buys / pm_open",
      );
      expect(out).toContain("NOT a model-call, API-call or total-write budget");
      expect(out).toContain(
        "Multiple entries/adds in one decision share the remaining slots",
      );
      expect(out).toContain("Closing does not restore a used slot");
      expect(out).toContain(
        "futures_close / futures_set_sltp / spot_order sells / spot_cancel",
      );
      expect(out).toContain(
        "remain available when the entry/add budget is exhausted",
      );
      expect(out.includes("EXHAUSTED until the next UTC day")).toBe(
        remaining === 0,
      );
    },
  );

  it("keeps budget action guidance scoped to enabled venues", () => {
    const spec = parseSkill(renderFolderOfOne("a", "conservative")).spec;
    const out = buildUserPrompt(baseObs(), undefined, {
      venues: ["futures"],
      dailyRiskBudget: buildDailyRiskBudget(spec, newState("r")),
    });
    expect(out).toContain("futures_open (including adds)");
    expect(out).toContain("futures_set_sltp");
    expect(out).not.toMatch(/pm_open|spot_order|spot_cancel/);
  });

  it("does not invent an allowance for callers without runtime state", () => {
    const out = buildUserPrompt(baseObs());
    expect(out).not.toContain("dailyRiskBudget");
    expect(out).not.toContain("EXHAUSTED");
  });

  it("makes budget exhaustion outrank setup pressure without forbidding protection", () => {
    const spec = parseSkill(renderFolderOfOne("a", "conservative")).spec;
    expect(buildSystemPrompt(spec, "strategy")).toContain(
      "exhaustion is a legitimate skip for new risk, never a reason to skip otherwise-valid closes or protection",
    );
  });
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
  it("shows bounded PM quality and age without promising quote approval", () => {
    const spec = parseSkill(renderFolderOfOne("a", "conservative")).spec;
    spec.venues = ["pm"];
    const obs = baseObs({
      pmMarkets: [
        {
          ref: "pm1",
          source: "polymarket",
          slug: "test",
          outcomeExternalMarketId: "yes",
          probability: 0.01,
          freshness: {
            status: "fresh",
            ageSeconds: 600,
            asOf: "2026-09-07T01:55:17.076Z",
            basis: "latest_snapshot",
          },
          quality: {
            decisionEligible: true,
            warningReasons: ["anomaly_flagged"],
            blockReasons: [],
            reasonsOmitted: true,
          },
          decisionSupport: {
            qualityTier: "medium",
            flags: { highAmbiguity: true },
          },
        },
      ],
    });
    const prompt = buildUserPrompt(obs, undefined, { venues: ["pm"] });
    const data = JSON.parse(prompt.match(/```json\n(.*)\n```/)![1]);
    expect(data.pmMarkets[0]).toMatchObject({
      prob: 0.01,
      ageSeconds: 600,
      freshnessBasis: "latest_snapshot",
      quality: { warningReasons: ["anomaly_flagged"], reasonsOmitted: true },
      decisionSupport: { flags: { highAmbiguity: true } },
    });
    const system = buildSystemPrompt(spec, "strategy");
    expect(system).toContain("NOT an execution promise");
    expect(system).toContain("NOT winning probability or forecast accuracy");
    expect(system).not.toContain("a listed market will not bounce at quote");
  });

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
    expect(out).toMatch(
      /listed in observation\.pmMarkets THIS cycle \(pm1\.\.pmN\)/,
    );
    // The scan REQUIREMENT (edge thesis) is preserved, not removed.
    expect(out).toMatch(/REQUIRED that you scan/);
  });

  it("keeps the pm_open action ref instruction scoped to THIS cycle's listed refs (pm1..pmN)", () => {
    const out = buildSystemPrompt(specWithPm(), "strategy");
    expect(out).toMatch(/one of the refs listed THIS cycle \(pm1\.\.pmN\)/);
  });
});

describe("prompt venue scoping", () => {
  const futuresOnlySpec = () => {
    const spec = parseSkill(renderFolderOfOne("a", "conservative")).spec;
    spec.venues = ["futures"];
    spec.capabilities = ["indicators", "news", "universe_scan"];
    return spec;
  };

  it("removes every prediction-market instruction from a futures-only system prompt", () => {
    const out = buildSystemPrompt(futuresOnlySpec(), "strategy", {
      includeForecast: true,
    });

    expect(out).toContain('"type":"futures_open"');
    expect(out).toContain("tradable symbols (futures)");
    expect(out).not.toContain("spot_order");
    expect(out).not.toContain("spot + futures");
    expect(out).not.toMatch(/prediction markets/i);
    expect(out).not.toContain("pm_open");
    expect(out).not.toContain("observation.pmMarkets");
    expect(out).not.toContain("PM stake");
    expect(out).not.toContain("FORECAST RULE");
    expect(out).not.toContain("real volume");
    expect(out).toContain("recent20 high with EMA20 above EMA50");
  });

  it("removes disabled PM positions, markets and actions from the cycle prompt", () => {
    const out = buildUserPrompt(baseObs(), undefined, {
      venues: ["futures"],
    });

    expect(out).toContain("futures_open");
    expect(out).not.toContain("pm_open");
    expect(out).not.toContain("pmPositions");
    expect(out).not.toContain("pmMarkets");
    expect(out).not.toMatch(/prediction-market/i);
  });

  it("preserves PM guidance and observation blocks when PM is enabled", () => {
    const spec = futuresOnlySpec();
    spec.venues = ["futures", "pm"];
    const system = buildSystemPrompt(spec, "strategy", {
      includeForecast: true,
    });
    const user = buildUserPrompt(baseObs(), undefined, {
      venues: spec.venues,
    });

    expect(system).toMatch(/prediction markets are a FIRST-CLASS venue/i);
    expect(system).toContain("pm_open");
    expect(system).toContain("FORECAST RULE");
    expect(user).toContain("pm_open");
    expect(user).toContain('"pmMarkets"');
  });
});

describe("buildSystemPrompt — universe_scan vs watchlist caps line (contradiction fix)", () => {
  const spec = () => parseSkill(renderFolderOfOne("a", "conservative")).spec;

  it("without universe_scan the caps line says the watchlist is the whole set", () => {
    const s = spec();
    s.capabilities = ["indicators"];
    const out = buildSystemPrompt(s, "strategy");
    expect(out).toMatch(/watchlist \(futures use ONLY these\)/);
    expect(out).not.toMatch(/discovered: true/);
  });

  it("with universe_scan the caps line itself admits discovered entries — the hard-caps section must never contradict the universe-scan section", () => {
    const s = spec();
    s.capabilities = ["indicators", "universe_scan"];
    const out = buildSystemPrompt(s, "strategy");
    // The old unconditional "use ONLY these" line made cap-obedient models
    // refuse every discovered candidate (caps header says proposing outside
    // a cap wastes the cycle) — the capability was silently neutered.
    expect(out).not.toMatch(/use ONLY these/);
    expect(out).toMatch(
      /tradable symbols \(futures\): your watchlist .* PLUS this cycle's watch entries marked `discovered: true`/,
    );
    // The universe-scan guidance section still renders alongside.
    expect(out).toMatch(/## Universe scan \(discovered movers\)/);
  });
});
