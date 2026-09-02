import { describe, it, expect } from "vitest";
import { buildSystemPrompt, buildUserPrompt } from "./prompt.js";
import { parseSkill } from "./skill.js";
import { renderFolderOfOne } from "./templates.js";
import type { Observation, Venue } from "./types.js";

const specWith = (venues: Venue[], capabilities: string[] = []) => {
  const spec = parseSkill(renderFolderOfOne("a", "conservative")).spec;
  spec.venues = venues;
  spec.capabilities = capabilities as typeof spec.capabilities;
  return spec;
};

const baseObs = (over: Partial<Observation> = {}): Observation => ({
  asOf: "t",
  scopes: ["read", "trade:futures", "trade:pm"],
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

describe("buildSystemPrompt: thesis requirement and thesis exits", () => {
  it("states the thesis contract on every open action and the runner-enforced exit", () => {
    const out = buildSystemPrompt(
      specWith(["futures", "spot", "pm"]),
      "strategy",
    );
    expect(out).toContain("## Thesis on every open, and thesis exits");
    expect(out).toContain(
      "Every opening action (futures_open / spot_order / pm_open) MUST carry a `thesis`",
    );
    // The action shapes carry the field, venue-specific conditions.
    expect(out).toContain(
      '"type":"futures_open","symbol","side":"long"|"short","leverage","marginMusd","stopLossPrice","takeProfitPrice","confidence":0..1,"thesis":{"summary","invalidation":{"priceBelow"|"priceAbove","maxHoldMinutes","catalyst"}}}',
    );
    expect(out).toMatch(
      /"type":"spot_order".*"thesis":\{"summary","invalidation":\{"priceBelow"\|"priceAbove"/,
    );
    expect(out).toMatch(
      /"type":"pm_open".*"thesis":\{"summary","invalidation":\{"probabilityBelow"\|"probabilityAbove"/,
    );
    // What the runner does, and what the model must do while intact.
    expect(out).toMatch(
      /the position is CLOSED automatically \(logged as a thesis exit\)/,
    );
    expect(out).toMatch(/cannot be closed before settlement/);
    expect(out).toMatch(/While the status is intact, HOLD/);
    expect(out).toMatch(/minimum 60, at most 43200/);
  });

  it("keeps a futures-only prompt free of prediction-market thesis and fundamentals wording", () => {
    const out = buildSystemPrompt(
      specWith(["futures"], ["indicators", "news"]),
      "strategy",
    );
    expect(out).toContain(
      "Every opening action (futures_open) MUST carry a `thesis`",
    );
    expect(out).not.toMatch(/prediction markets/i);
    expect(out).not.toContain("probabilityBelow");
    expect(out).not.toContain("observation.pmMarkets");
    expect(out).not.toContain("pmMarkets row");
  });
});

describe("buildSystemPrompt: fundamentals section", () => {
  it("describes the fundamentals fields, gated on the capabilities that source them", () => {
    const full = buildSystemPrompt(
      specWith(["futures", "pm"], ["indicators", "news"]),
      "strategy",
    );
    expect(full).toContain(
      "## Fundamentals (observation.watch[].fundamentals, observation.pmMarkets)",
    );
    expect(full).toContain("`volume24hUsd`");
    expect(full).toContain("`headlines`");
    expect(full).toContain("`end` (resolution date), `vol24h` and `liq`");
    const bare = buildSystemPrompt(specWith(["futures"]), "strategy");
    expect(bare).toContain(
      "## Fundamentals (observation.watch[].fundamentals)",
    );
    expect(bare).toContain("`categories`");
    expect(bare).not.toContain("`volume24hUsd`");
    expect(bare).not.toContain("`headlines`");
  });

  it("uses no em-dashes in the new sections", () => {
    const out = buildSystemPrompt(
      specWith(["futures", "pm"], ["indicators", "news"]),
      "strategy",
    );
    const section = (start: string, end: string) =>
      out.slice(out.indexOf(start), out.indexOf(end));
    expect(section("## Fundamentals", "## Output contract")).not.toContain("—");
    expect(section("## Thesis on every open", "## How to act")).not.toContain(
      "—",
    );
  });
});

describe("buildUserPrompt: thesis views and PM fundamentals", () => {
  it("renders PM rows with end / vol24h / liq and serializes each position's thesis view", () => {
    const out = buildUserPrompt(
      baseObs({
        pmMarkets: [
          {
            ref: "pm1",
            source: "polymarket",
            slug: "btc-above-80k",
            outcomeExternalMarketId: "12345",
            title: "BTC above 80k by Dec?",
            outcomeName: "Yes",
            probability: 0.42,
            volumeUsd: 999.4,
            liquidityUsd: 12345.6,
            endDate: "2026-12-31T00:00:00.000Z",
          },
        ],
        openPositions: [
          {
            venue: "futures",
            id: 52,
            symbol: "BTC",
            side: "long",
            thesis: {
              summary: "breakout",
              invalidation: { priceBelow: 64000 },
              holdMinutes: 30,
              status: "intact",
            },
          },
        ],
      }),
      undefined,
      { venues: ["futures", "pm"] },
    );
    expect(out).toContain('"end":"2026-12-31T00:00:00.000Z"');
    expect(out).toContain('"vol24h":999');
    expect(out).toContain('"liq":12346');
    expect(out).toContain(
      '"thesis":{"summary":"breakout","invalidation":{"priceBelow":64000},"holdMinutes":30,"status":"intact"}',
    );
    expect(out).not.toContain("INVALIDATED this cycle");
  });

  it("names the broken theses: a futures one to close, a PM one never to add to", () => {
    const out = buildUserPrompt(
      baseObs({
        openPositions: [
          {
            venue: "futures",
            id: 52,
            symbol: "BTC",
            side: "long",
            thesis: {
              summary: "breakout",
              invalidation: { priceBelow: 64000 },
              holdMinutes: 30,
              status: "invalidated",
              invalidatedBy: "mark 63900 at or below priceBelow 64000",
            },
          },
        ],
        pmPositions: [
          {
            id: 7,
            title: "BTC above 80k by Dec?",
            side: "yes",
            thesis: {
              summary: "mispriced",
              invalidation: { probabilityBelow: 35 },
              holdMinutes: 90,
              status: "invalidated",
              invalidatedBy: "probability 30 at or below probabilityBelow 35",
            },
          },
        ],
      }),
      undefined,
      { venues: ["futures", "pm"] },
    );
    expect(out).toContain(
      "## Positions whose thesis is INVALIDATED this cycle",
    );
    expect(out).toContain(
      "- futures pos#52 long BTC: mark 63900 at or below priceBelow 64000 (close it with futures_close)",
    );
    expect(out).toContain(
      '- PM pos#7 "BTC above 80k by Dec?": probability 30 at or below probabilityBelow 35 (no close endpoint: do NOT add, let it settle)',
    );
  });

  it("omits PM thesis lines when the pm venue is disabled", () => {
    const out = buildUserPrompt(
      baseObs({
        pmPositions: [
          {
            id: 7,
            thesis: {
              summary: "x",
              invalidation: {},
              holdMinutes: 1,
              status: "invalidated",
              invalidatedBy: "y",
            },
          },
        ],
      }),
      undefined,
      { venues: ["futures"] },
    );
    expect(out).not.toContain("INVALIDATED this cycle");
    expect(out).not.toContain("PM pos#7");
  });
});
