import { describe, it, expect } from "vitest";
import {
  buildDailyRiskBudget,
  buildFuturesCapacity,
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

describe("opt-in capital sizing prompt context", () => {
  const policy = {
    version: "equity_fraction_v1" as const,
    futuresRiskPct: 0.75,
    pmMaxLossPct: 2,
    perTicketCapitalPct: 6,
    totalCapitalPct: 40,
    cashReservePct: 20,
    minRewardRisk: 1.5,
  };
  it("explains amount replacement and includes only the already-captured capital evidence", () => {
    const spec = parseSkill(renderFolderOfOne("a", "conservative")).spec;
    spec.capitalSizing = policy;
    expect(buildSystemPrompt(spec, "strategy")).toContain(
      "REPLACES proposed futures margins and PM stakes",
    );
    const obs = baseObs({
      capitalBook: {
        status: "unavailable",
        reason: "independent_agent_book_unproven",
      },
    });
    const before = structuredClone(obs);
    const text = buildUserPrompt(obs, undefined, { capitalSizing: policy });
    const input = JSON.parse(text.match(/```json\n(.*)\n```/)![1]);
    expect(input.capitalBook).toEqual(obs.capitalBook);
    expect(input.capitalSizingPolicy).toEqual(policy);
    expect(text).toContain("NOT complete marked equity");
    expect(text).toContain(
      "Positions on other walletIds remain visible for management",
    );
    expect(text).toContain(
      "Missing/unavailable capitalBook means no new entries",
    );
    expect(obs).toEqual(before);
  });
  it("leaves legacy prompt bytes identical when capital evidence exists but the policy is omitted", () => {
    const obs = baseObs();
    const original = buildUserPrompt(obs);
    expect(
      buildUserPrompt({
        ...obs,
        capitalBook: { status: "unavailable", reason: "unavailable" },
      }),
    ).toBe(original);
    const spec = parseSkill(renderFolderOfOne("a", "conservative")).spec;
    const system = buildSystemPrompt(spec, "strategy");
    expect(
      buildSystemPrompt({ ...spec, capitalSizing: undefined }, "strategy"),
    ).toBe(system);
    const mechanical = {
      ...spec,
      model: { provider: "mechanical" as const, name: "market-implied" },
    };
    expect(
      buildSystemPrompt({ ...mechanical, capitalSizing: policy }, "strategy"),
    ).toBe(buildSystemPrompt(mechanical, "strategy"));
  });
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

describe("capacity-aware action guidance", () => {
  const excluded = { excludeActionTypes: ["futures_open"] as const };
  const examples = (prompt: string) =>
    [...prompt.matchAll(/^- \{"type":"([^"]+)"/gm)].map((match) => match[1]);

  it("withholds only the entry example while retaining management and enabled venues", () => {
    const spec = parseSkill(renderFolderOfOne("a", "conservative")).spec;
    spec.venues = ["futures", "spot", "pm"];
    const ordinary = buildSystemPrompt(spec, "strategy", {
      includeForecast: true,
    });
    const spent = buildSystemPrompt(spec, "strategy", {
      includeForecast: true,
      ...excluded,
    });
    expect(examples(spent)).toEqual(
      examples(ordinary).filter((type) => type !== "futures_open"),
    );
    expect(examples(spent)).toEqual([
      "futures_close",
      "futures_set_sltp",
      "spot_order",
      "spot_cancel",
      "pm_open",
    ]);
    expect(spent).toContain("Every opening action (spot_order / pm_open)");
    expect(spent).toContain("market-aware estimate, not a blinded forecast");
    expect(spent).toContain("otherwise skip PM");
    expect(spent).not.toMatch(
      /TAKE THE POSITION|Skip ONLY|ADD only if|you may ADD|act on the strongest/,
    );
    expect(spent).toContain("capacity-constrained skip is valid");
    expect(spent).toContain("Trigger rules still apply");
    expect(spent).toContain("a SHORT is inverted (TP below mark, SL above)");
    const marker = "Each action is one of:\n";
    expect(spent.split(marker)[0]).toBe(ordinary.split(marker)[0]);
  });

  it("restores unchanged available-capacity guidance and ignores futures exclusion for other venues", () => {
    const spec = parseSkill(renderFolderOfOne("a", "conservative")).spec;
    const ordinary = buildSystemPrompt(spec, "strategy");
    expect(
      buildSystemPrompt(spec, "strategy", { excludeActionTypes: [] }),
    ).toBe(ordinary);
    buildSystemPrompt(spec, "strategy", excluded);
    expect(buildSystemPrompt(spec, "strategy")).toBe(ordinary);
    expect(examples(ordinary)).toContain("futures_open");
    spec.venues = ["spot", "pm"];
    expect(buildSystemPrompt(spec, "strategy", excluded)).toBe(
      buildSystemPrompt(spec, "strategy"),
    );
  });

  it.each([false, true])(
    "flat exhausted futures keeps only other enabled entries (spot enabled: %s)",
    (withSpot) => {
      const spec = parseSkill(renderFolderOfOne("a", "conservative")).spec;
      spec.venues = withSpot ? ["futures", "spot"] : ["futures"];
      const system = buildSystemPrompt(spec, "strategy", excluded);
      const user = buildUserPrompt(baseObs(), undefined, {
        venues: spec.venues,
        ...excluded,
      });
      expect(user).not.toContain("OPEN the best available setup (futures_open");
      expect(user).not.toContain("OPEN the best available setup ()");
      expect(system).not.toContain("Every opening action (futures_open");
      if (withSpot) {
        expect(user).toContain("OPEN the best available setup (spot_order)");
        expect(system).toContain('"type":"spot_order"');
      } else {
        expect(user).toContain(
          "No entry action is available this cycle; skip.",
        );
        expect(system).not.toContain("Every opening action (");
        expect(examples(system)).toEqual(["futures_close", "futures_set_sltp"]);
      }
    },
  );
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

  it("shows event-level consensus on a row when known and omits it when null or absent", () => {
    const row = {
      source: "kalshi",
      slug: "btc-120k-2026",
      outcomeExternalMarketId: "no",
      outcomeName: "No",
      probability: 0.6,
    };
    const consensus = {
      prob: 0.31,
      venues: 3,
      spreadPts: 2,
      kind: "binary" as const,
      outcome: null,
    };
    const prompt = buildUserPrompt(
      baseObs({
        pmMarkets: [
          { ...row, ref: "pm1", consensus },
          { ...row, ref: "pm2", consensus: null },
          { ...row, ref: "pm3" },
        ],
      }),
      undefined,
      { venues: ["pm"] },
    );
    const data = JSON.parse(prompt.match(/```json\n(.*)\n```/)![1]);
    // Passed through exactly as observed: a NO row is not complemented.
    expect(data.pmMarkets[0]).toMatchObject({ outcome: "No", prob: 0.6 });
    expect(data.pmMarkets[0].consensus).toEqual(consensus);
    expect(data.pmMarkets[1]).not.toHaveProperty("consensus");
    expect(data.pmMarkets[2]).not.toHaveProperty("consensus");
  });

  it("prints an event's settlement rules once, on its first row", () => {
    const rules = {
      published: true,
      text: 'Resolves "Yes" if MicroStrategy sells any Bitcoin by the date.',
      sources: ["MSTR filings"],
    };
    const row = {
      source: "polymarket",
      slug: "mstr-sells-btc",
      outcomeName: "Yes",
      probability: 0.1,
      rules,
    };
    const prompt = buildUserPrompt(
      baseObs({
        pmMarkets: [
          { ...row, ref: "pm1", outcomeExternalMarketId: "a" },
          { ...row, ref: "pm2", outcomeExternalMarketId: "b" },
          {
            ...row,
            slug: "other-event",
            ref: "pm3",
            outcomeExternalMarketId: "c",
            rules: null,
          },
        ],
      }),
      undefined,
      { venues: ["pm"] },
    );
    const data = JSON.parse(prompt.match(/```json\n(.*)\n```/)![1]);
    expect(data.pmMarkets[0].rules).toEqual(rules);
    expect(data.pmMarkets[1]).not.toHaveProperty("rules");
    expect(data.pmMarkets[2]).not.toHaveProperty("rules");
    expect(data.pmMarkets[0]).not.toHaveProperty("outcomeRule");
    expect(prompt).not.toMatch(/settle per outcome/);
  });

  it("prints each ladder row's own term and explains the template only when present", () => {
    const rules = {
      published: true,
      text: "Shutdown delays extend the expiration date.",
      scope: "per_outcome" as const,
    };
    const row = {
      source: "kalshi",
      slug: "kxcpiyoy-26sep",
      probability: 0.4,
      rules,
    };
    const prompt = buildUserPrompt(
      baseObs({
        pmMarkets: [
          {
            ...row,
            ref: "pm1",
            outcomeExternalMarketId: "KXCPIYOY-26SEP-T3.6",
            outcomeName: "Above 3.6%",
            outcomeRule: {
              primary: "If CPI increases by more than 3.6%, then Yes.",
            },
          },
          {
            ...row,
            ref: "pm2",
            outcomeExternalMarketId: "KXCPIYOY-26SEP-T3.7",
            outcomeName: "Above 3.7%",
            outcomeRule: { unknown: "rule_missing" as const },
          },
        ],
      }),
      undefined,
      { venues: ["pm"] },
    );
    const data = JSON.parse(prompt.match(/```json\n(.*)\n```/)![1]);
    expect(data.pmMarkets[0].rules).toEqual(rules);
    expect(data.pmMarkets[1]).not.toHaveProperty("rules");
    expect(data.pmMarkets[0].outcomeRule).toEqual({
      primary: "If CPI increases by more than 3.6%, then Yes.",
    });
    expect(data.pmMarkets[1].outcomeRule).toEqual({ unknown: "rule_missing" });
    expect(prompt).toMatch(/settle per outcome/);
    expect(prompt).toMatch(/outcomeRule.unknown means that outcome's exact/);
  });

  it("explains settlement rules only when PM is enabled, and a missing rule stays neutral", () => {
    const spec = parseSkill(renderFolderOfOne("a", "conservative")).spec;
    spec.venues = ["pm"];
    const withPm = buildSystemPrompt(spec, "strategy");
    expect(withPm).toMatch(/may carry `rules`/);
    expect(withPm).toMatch(
      /`published: false` means the venue publishes no rule/,
    );
    expect(withPm).toMatch(/A row without `rules` simply carries no rule text/);
    spec.venues = ["futures"];
    expect(buildSystemPrompt(spec, "strategy")).not.toMatch(/`rules`/);
  });

  it("explains consensus only when PM is enabled", () => {
    const spec = parseSkill(renderFolderOfOne("a", "conservative")).spec;
    spec.venues = ["pm"];
    const withPm = buildSystemPrompt(spec, "strategy");
    expect(withPm).toMatch(/may carry `consensus`/);
    expect(withPm).toMatch(
      /kind "binary" with outcome null prices the event's YES side/,
    );
    expect(withPm).toMatch(/no consensus means unknown, not agreement/);
    spec.venues = ["futures"];
    // The PM consensus paragraph is absent; the coin-venue sentiment caution
    // ("not current market consensus") is a different line and may appear.
    const futuresOnly = buildSystemPrompt(spec, "strategy");
    expect(futuresOnly).not.toMatch(/may carry `consensus`/);
    expect(futuresOnly).not.toMatch(/no consensus means unknown/);
  });

  it("shows the own calibration record only with PM, and explains how to use it", () => {
    const pmCalibration = {
      settled: 40,
      brierAgent: 0.28,
      brierMarket: 0.183,
      meanForecastPct: 57,
      winRatePct: 34,
      bands: [
        { fromPct: 50, toPct: 60, n: 40, meanForecastPct: 55, winRatePct: 30 },
      ],
    };
    const obs = baseObs({ pmCalibration });
    const json = (text: string) =>
      JSON.parse(text.match(/```json\n(.*)\n```/)![1]);
    expect(
      json(buildUserPrompt(obs, undefined, { venues: ["pm"] })).pmCalibration,
    ).toEqual(pmCalibration);
    expect(
      json(buildUserPrompt(obs, undefined, { venues: ["futures"] })),
    ).not.toHaveProperty("pmCalibration");
    expect(json(buildUserPrompt(baseObs()))).not.toHaveProperty(
      "pmCalibration",
    );
    const spec = parseSkill(renderFolderOfOne("a", "conservative")).spec;
    spec.venues = ["pm"];
    const system = buildSystemPrompt(spec, "strategy");
    expect(system).toMatch(/YOUR OWN settled PM forecast record/);
    expect(system).toMatch(
      /win rate below what you said in a band\), shade your forecast toward the market or skip/,
    );
    spec.venues = ["futures"];
    expect(buildSystemPrompt(spec, "strategy")).not.toMatch(/pmCalibration/);
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

describe("buildSystemPrompt — market-aware forecast (pm_open forecastProbability)", () => {
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
    expect(out).toContain("market-aware estimate, not a blinded forecast");
    expect(out).toContain("current market probability is already included");
    expect(out).toContain("own evidence-based probability");
    expect(out).toContain("outcome you are backing actually WINS");
    expect(out).toContain("do NOT mechanically copy or round");
    expect(out).toContain("OMIT the field rather than parroting the market");
    expect(out).toContain(
      "if it is not above what the outcome currently costs, the open is rejected",
    );
    expect(out).not.toMatch(
      /before you look|independently formed|independent view/,
    );
  });

  it("keeps the actual market probability in the same decision input", () => {
    const observation = baseObs({
      pmMarkets: [
        {
          ref: "pm1",
          source: "kalshi",
          slug: "fixture",
          outcomeExternalMarketId: "no",
          outcomeName: "No",
          probability: 0.6,
        },
      ],
    });
    const user = buildUserPrompt(observation, undefined, { venues: ["pm"] });
    const input = JSON.parse(user.match(/```json\n(.*)\n```/)![1]);
    expect(input.pmMarkets[0]).toMatchObject({
      ref: "pm1",
      outcome: "No",
      prob: 0.6,
    });
  });
});

describe("buildSystemPrompt — pm_ref escape hatch (hallucination fix)", () => {
  const specWithPm = () => {
    const spec = parseSkill(renderFolderOfOne("a", "conservative")).spec;
    spec.venues = ["pm", "futures", "spot"];
    return spec;
  };

  it("keeps the ref anti-hallucination rule: an unlisted market is a skip, never an invented ref", () => {
    const out = buildSystemPrompt(specWithPm(), "strategy");
    expect(out).toMatch(/if none fits, skip PM in one clause/i);
    // Explicitly forbids inventing/incrementing a ref and names the wasted-cycle cost.
    expect(out).toMatch(/do NOT invent, guess, or increment a ref/i);
    expect(out).toMatch(/pm_ref_unknown/);
    // Scopes the "bettable" set to THIS cycle's listed markets.
    expect(out).toMatch(
      /listed in observation\.pmMarkets THIS cycle \(pm1\.\.pmN\)/,
    );
  });

  it("keeps the pm_open action ref instruction scoped to THIS cycle's listed refs (pm1..pmN)", () => {
    const out = buildSystemPrompt(specWithPm(), "strategy");
    expect(out).toMatch(/one of the refs listed THIS cycle \(pm1\.\.pmN\)/);
  });
});

describe("buildSystemPrompt: honest PM bar (no invented edge, no bet pressure)", () => {
  const specWithPm = () => {
    const spec = parseSkill(renderFolderOfOne("a", "conservative")).spec;
    spec.venues = ["pm", "futures", "spot"];
    return spec;
  };
  const pmBar = (out: string) =>
    out.split("\n").find((line) => line.startsWith("- PM BAR:")) ?? "";

  it("drops the claimed information edge and the REQUIRED bet scan", () => {
    const out = buildSystemPrompt(specWithPm(), "strategy");
    const bar = pmBar(out);
    expect(bar).not.toBe("");
    expect(out).not.toMatch(/genuine information edge/i);
    expect(out).not.toMatch(/SHARPEST PM EDGE/);
    expect(bar).not.toContain("REQUIRED");
    expect(out).not.toMatch(/REQUIRED that you scan/);
    expect(out).not.toMatch(/mistake to avoid/i);
  });

  it("states the market already prices public data and that skipping PM is never a failure", () => {
    const bar = pmBar(buildSystemPrompt(specWithPm(), "strategy"));
    expect(bar).toMatch(/market price already reflects the same public prices/);
    expect(bar).toMatch(
      /short-dated price markets are usually efficiently priced/,
    );
    expect(bar).toMatch(/differs from the market's `prob` by more than costs/);
    expect(bar).toMatch(/name the specific reason/);
    expect(bar).toMatch(
      /Skipping PM is always a valid outcome and is never a failure/,
    );
  });

  it("no longer pushes PM bets from a futures cap, an empty setups list, news or settlement wins", () => {
    const spec = specWithPm();
    spec.capabilities = ["indicators", "news"];
    const out = buildSystemPrompt(spec, "strategy");
    expect(out).not.toMatch(/PIVOT to pm_open/);
    expect(out).toMatch(/A futures cap is not a reason to bet PM/);
    expect(out).not.toMatch(/BEFORE you skip, check observation\.pmMarkets/);
    expect(out).toMatch(
      /an empty setups list is not a reason to open a PM bet/,
    );
    expect(out).not.toMatch(/exactly the kind of mispricing edge to act on/);
    const feedback = formatPmResolutions([
      { id: 1, eventTitle: "x", side: "yes", status: "settled_win" },
    ]).join("\n");
    expect(feedback).not.toMatch(/lean into that edge/i);
    expect(feedback).toMatch(/not on a single win or loss/);
  });

  it("leaves the futures decisive-trader persona text in place", () => {
    const out = buildSystemPrompt(specWithPm(), "strategy");
    expect(out).toContain(
      "## How to act — a decisive trader in character, not a bystander",
    );
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

describe("PM entry floor in the hard caps", () => {
  it("renders the floor only when configured and only for PM venues", () => {
    const spec = parseSkill(renderFolderOfOne("a", "conservative")).spec;
    const pmSpec = {
      ...spec,
      venues: ["pm"] as ("spot" | "futures" | "pm")[],
      risk: { ...spec.risk, pmMinEntryProbabilityPct: 20 },
    };
    const text = buildSystemPrompt(pmSpec, "strategy");
    expect(text).toContain("PM ENTRY FLOOR");
    expect(text).toContain("below 20 points is REJECTED");
    expect(
      buildSystemPrompt({ ...pmSpec, risk: spec.risk }, "strategy"),
    ).not.toContain("PM ENTRY FLOOR");
    expect(
      buildSystemPrompt({ ...pmSpec, venues: ["futures"] }, "strategy"),
    ).not.toContain("PM ENTRY FLOOR");
  });
});

describe("futuresCapacity context (max_positions / open_margin_exceeds_cap waste)", () => {
  const spec = () => {
    const parsed = parseSkill(renderFolderOfOne("a", "conservative")).spec;
    parsed.venues = ["futures"];
    parsed.risk.maxConcurrentPositions = 3;
    parsed.limits.maxOpenMarginMusd = 300;
    return parsed;
  };
  const held = (n: number, marginMusd = 50) =>
    Array.from({ length: n }, (_, i) => ({
      venue: "futures" as const,
      id: i + 1,
      symbol: `C${i}`,
      side: "long" as const,
      status: "open",
      marginMusd,
    }));
  const dataOf = (prompt: string) =>
    JSON.parse(prompt.match(/```json\n(.*)\n```/)![1]);

  it("counts slots and margin exactly as the validator does", () => {
    expect(
      buildFuturesCapacity(spec(), { openPositions: held(2, 60.5) } as any),
    ).toEqual({
      version: "coinrithm.futures-capacity.v1",
      openPositions: 2,
      maxPositions: 3,
      slotsLeft: 1,
      openMarginMusd: 121,
      maxOpenMarginMusd: 300,
      marginHeadroomMusd: 179,
    });
    expect(
      buildFuturesCapacity(spec(), { openPositions: held(4, 100) } as any),
    ).toMatchObject({ slotsLeft: 0, marginHeadroomMusd: 0 });
  });

  it("with every slot used, says plainly that no futures_open can pass", () => {
    const obs = baseObs({ openPositions: held(3) as any });
    const prompt = buildUserPrompt(obs, undefined, {
      venues: ["futures"],
      futuresCapacity: buildFuturesCapacity(spec(), obs),
    });
    expect(dataOf(prompt).futuresCapacity).toMatchObject({
      openPositions: 3,
      maxPositions: 3,
      slotsLeft: 0,
    });
    expect(prompt).toContain(
      "All 3 futures position slots are in use: propose NO futures_open this cycle",
    );
  });

  it("with slots free but margin at the cap, names the margin cap instead", () => {
    const obs = baseObs({ openPositions: held(2, 150) as any });
    const prompt = buildUserPrompt(obs, undefined, {
      venues: ["futures"],
      futuresCapacity: buildFuturesCapacity(spec(), obs),
    });
    expect(prompt).toContain("Futures margin is at its cap");
    expect(prompt).not.toContain("position slots are in use");
  });

  it("room left: the numbers only, no steer; futures off: nothing at all", () => {
    const obs = baseObs({ openPositions: held(1) as any });
    const roomy = buildUserPrompt(obs, undefined, {
      venues: ["futures"],
      futuresCapacity: buildFuturesCapacity(spec(), obs),
    });
    expect(dataOf(roomy).futuresCapacity.slotsLeft).toBe(2);
    // The numbers are a pre-cycle snapshot: several actions spend them together.
    expect(roomy).toContain(
      "Multiple opens/adds in one decision share slotsLeft and marginHeadroomMusd.",
    );
    expect(roomy).not.toContain("propose NO futures_open");
    const pmOnly = buildUserPrompt(obs, undefined, {
      venues: ["pm"],
      futuresCapacity: buildFuturesCapacity(spec(), obs),
    });
    expect(pmOnly).not.toContain("futuresCapacity");
  });
});
