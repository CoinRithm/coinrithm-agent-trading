import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import {
  clearPmCalibrationCache,
  observe,
  readPmCalibration,
} from "./observe.js";
import { parseSkill } from "./skill.js";
import { renderFolderOfOne } from "./templates.js";
import { newState } from "./state.js";
import { CoinRithmClient } from "./client.js";
import { CAPITAL_VALUATION_BASIS } from "./capitalSizing.js";

const okData = (data: unknown) => ({ ok: true, status: 200, data });
// The scaffold now declares capabilities: [indicators] (dormancy fix,
// 2026-08-19); this suite's base spec strips them so the many tests that do
// not stub client.candles keep exercising the capability-less path. The
// indicators/news/universe_scan describes opt back in per test.
const spec = {
  ...parseSkill(renderFolderOfOne("a", "conservative")).spec,
  capabilities: [] as ReturnType<typeof parseSkill>["spec"]["capabilities"],
};

function fakeClient(over: Record<string, unknown> = {}): CoinRithmClient {
  return {
    me: async () => okData({ scopes: ["trade:futures"] }),
    portfolio: async () =>
      okData({ equity: { totalUsd: 50000, availableUsd: 1000 } }),
    wallet: async () => okData({ usdt: { available: 1000 } }),
    futuresPositions: async () => okData({ positions: [] }),
    trades: async () => okData({ asOf: "T1", trades: [] }),
    resolve: async (q: string) => okData({ match: { coinId: "1", name: q } }),
    market: async () =>
      okData({
        price: { usd: 67000 },
        observation: { freshness: { status: "fresh" } },
      }),
    ...over,
  } as unknown as CoinRithmClient;
}

describe("observe", () => {
  it.each(["opted", "omitted", "mechanical"] as const)(
    "keeps all originating books manageable; wallet context is opt-in only (%s)",
    async (mode) => {
      const config = {
        ...spec,
        venues: ["futures", "pm"] as typeof spec.venues,
      };
      if (mode !== "omitted")
        config.capitalSizing = {
          version: "equity_fraction_v1",
          futuresRiskPct: 0.75,
          pmMaxLossPct: 2,
          perTicketCapitalPct: 6,
          totalCapitalPct: 40,
          cashReservePct: 20,
          minRewardRisk: 1.5,
        };
      if (mode === "mechanical")
        config.model = { provider: "mechanical", name: "market-implied" };
      const cash = {
        available: 49_880,
        frozen: 0,
        frozenPm: 20,
        frozenFutures: 100,
      };
      const client = fakeClient({
        me: async () =>
          okData({ scopes: ["read", "trade:futures", "trade:pm"] }),
        portfolio: async () =>
          okData({
            walletId: 42,
            bookScope: "api_key",
            equity: {
              ...cash,
              totalUsd: 50_000,
              valuationBasis: CAPITAL_VALUATION_BASIS,
              spotValuationComplete: true,
            },
          }),
        wallet: async () => okData({ walletId: 42, usdt: cash }),
        futuresPositions: async () =>
          okData({
            positions: [
              {
                id: 1,
                status: "open",
                walletId: 42,
                marginMusd: 100,
                unrealizedPnlMusd: -10,
              },
              {
                id: 2,
                status: "open",
                walletId: 7,
                marginMusd: 200,
                unrealizedPnlMusd: -30,
              },
            ],
          }),
        pmPositions: async () =>
          okData({
            positions: [
              {
                id: 3,
                status: "open",
                walletId: 42,
                stakeMusd: 20,
                unrealizedPnl: -5,
              },
              {
                id: 4,
                status: "open",
                walletId: 7,
                stakeMusd: 40,
                unrealizedPnl: -8,
              },
            ],
          }),
        discoverPmMarkets: async () => okData({ data: [] }),
      });
      const { observation, skip } = await observe(
        client,
        config,
        newState("book-scope"),
      );
      expect(skip).toBeUndefined();
      expect(observation.openPositions.map((p) => p.id)).toEqual([1, 2]);
      expect(observation.pmPositions?.map((p) => p.id)).toEqual([3, 4]);
      expect(observation.openPositions.map((p) => p.marginMusd)).toEqual([
        100, 200,
      ]);
      if (mode === "opted") {
        expect(observation.capitalBook).toMatchObject({
          status: "ready",
          conservativeEquityMusd: 49_985,
          committedCapitalMusd: 120,
        });
        expect(observation.openPositions.map((p) => p.walletId)).toEqual([
          42, 7,
        ]);
        expect(observation.pmPositions?.map((p) => p.walletId)).toEqual([
          42, 7,
        ]);
      } else {
        expect(observation).not.toHaveProperty("capitalBook");
        for (const row of [
          ...observation.openPositions,
          ...(observation.pmPositions ?? []),
        ])
          expect(row).not.toHaveProperty("walletId");
      }
    },
  );

  const pmObservation = async (events: unknown[]) =>
    (
      await observe(
        fakeClient({
          pmPositions: async () => okData({ positions: [] }),
          discoverPmMarkets: async () => okData({ data: events }),
        }),
        { ...spec, venues: ["pm"], risk: { ...spec.risk, watchlist: [] } },
        newState("pm-context-test"),
      )
    ).observation;
  const pmEvent = (probability: unknown = 50) => ({
    source: "polymarket",
    slug: "audit-market",
    title: "Audit market",
    freshness: {
      status: "fresh",
      ageMinutes: 10,
      asOf: "2026-09-07T01:55:17.076Z",
      basis: "latest_snapshot",
    },
    outcomes: [
      { externalMarketId: "yes", name: "Yes", probability, eligible: true },
    ],
  });

  it.each([0, 0.5, 1, 1.01, 50, 100])(
    "normalizes API probability %p points without guessing units",
    async (p) => {
      expect((await pmObservation([pmEvent(p)])).pmMarkets[0].probability).toBe(
        p / 100,
      );
    },
  );
  it.each([null, undefined, false, "50", NaN, Infinity, -1, 101])(
    "does not invent a price for invalid probability %p",
    async (p) => {
      const event = pmEvent();
      event.outcomes[0].probability = p;
      expect((await pmObservation([event])).pmMarkets).toEqual([]);
    },
  );
  it("keeps bounded quality/ambiguity evidence and converts the actual PM freshness shape", async () => {
    const event = {
      ...pmEvent(25),
      quality: {
        decisionEligible: true,
        warningReasons: ["anomaly_flagged", "SECRET_FREE_TEXT"],
        blockReasons: [],
        policyVersion: "pm-quality-3",
        assessedAt: "2026-09-07T01:55:17.076Z",
        raw: "SECRET_RAW",
      },
      decisionSupport: {
        qualityScore: 74,
        qualityTier: "medium",
        qualityCapReason: "raw_book",
        spreadTier: "tight",
        liquidityTier: "high",
        volumeTier: "high",
        flags: {
          highAmbiguity: true,
          staleData: false,
          injected: "SECRET_FLAG",
        },
      },
    };
    const market = (await pmObservation([event])).pmMarkets[0];
    expect(market.freshness).toEqual({
      status: "fresh",
      ageSeconds: 600,
      asOf: "2026-09-07T01:55:17.076Z",
      basis: "latest_snapshot",
    });
    expect(market.quality).toMatchObject({
      decisionEligible: true,
      warningReasons: ["anomaly_flagged"],
      reasonsOmitted: true,
      policyVersion: "pm-quality-3",
    });
    expect(market.decisionSupport).toMatchObject({
      qualityScore: 74,
      qualityTier: "medium",
      flags: { highAmbiguity: true, staleData: false },
    });
    expect(JSON.stringify(market)).not.toContain("SECRET");
  });
  it("excludes explicitly quality-blocked and event-ineligible rows but preserves unknown quality", async () => {
    const observation = await pmObservation([
      {
        ...pmEvent(),
        slug: "blocked",
        quality: { decisionEligible: false, blockReasons: ["quote_dead"] },
      },
      { ...pmEvent(), slug: "ineligible", eligible: false },
      { ...pmEvent(), slug: "unknown" },
    ]);
    expect(observation.pmMarkets.map((m) => m.slug)).toEqual(["unknown"]);
    expect(observation.pmMarkets[0].quality).toBeUndefined();
  });
  it.each([
    [],
    null,
    {},
    [{ externalMarketId: "yes", probability: 50, eligible: false }],
  ])(
    "never resurrects a present empty/malformed/rejected outcome list (%p)",
    async (outcomes) => {
      expect(
        (
          await pmObservation([
            {
              ...pmEvent(),
              externalMarketId: "legacy",
              probability: 50,
              outcomes,
            },
          ])
        ).pmMarkets,
      ).toEqual([]);
    },
  );
  it("preserves genuinely flat legacy rows with unknown quality and valid points", async () => {
    const { outcomes: _outcomes, ...flat } = pmEvent();
    expect(
      (
        await pmObservation([
          { ...flat, externalMarketId: "legacy", probability: 1 },
        ])
      ).pmMarkets[0],
    ).toMatchObject({ outcomeExternalMarketId: "legacy", probability: 0.01 });
  });

  it("records poll-before-write after /trades succeeds", async () => {
    const { observation, skip } = await observe(
      fakeClient(),
      spec,
      newState("r"),
    );
    expect(skip).toBeUndefined();
    expect(observation.polledBeforeWrite).toBe(true);
    expect(observation.watch.length).toBeGreaterThan(0);
  });

  it("skips when no watchlist symbol resolves", async () => {
    const c = fakeClient({ resolve: async () => okData({}) });
    const { skip } = await observe(c, spec, newState("r"));
    expect(skip).toMatch(/no watchlist coin resolved/);
  });

  it("skips when a required read fails", async () => {
    const c = fakeClient({
      portfolio: async () => ({ ok: false, status: 403, data: {} }),
    });
    const { skip } = await observe(c, spec, newState("r"));
    expect(skip).toMatch(/required reads failed/);
  });

  it("does not set poll-before-write when /trades fails", async () => {
    const c = fakeClient({
      trades: async () => ({ ok: false, status: 500, data: {} }),
    });
    const { observation, skip } = await observe(c, spec, newState("r"));
    expect(observation.polledBeforeWrite).toBe(false);
    expect(skip).toMatch(/poll-before-write/);
  });

  it("expands discovered PM markets from the real data[].outcomes[] shape", async () => {
    // REAL /api/agent/pm/discover payload: { data: [event] }, source/slug/freshness
    // at the event level, the quoteable id nested at outcomes[].externalMarketId.
    const pmSpec = {
      ...spec,
      venues: ["pm", "futures"] as ("spot" | "futures" | "pm")[],
    };
    const c = fakeClient({
      pmPositions: async () => okData({ positions: [] }),
      discoverPmMarkets: async () =>
        okData({
          data: [
            {
              source: "Kalshi", // mixed case -> lowercased
              slug: "BTC-UP",
              title: "BTC up?",
              freshness: { status: "fresh" },
              outcomes: [
                { externalMarketId: "yes-1", name: "Yes", probability: 60 },
                { externalMarketId: "no-1", name: "No", probability: 40 },
              ],
            },
          ],
        }),
    });
    const { observation } = await observe(c, pmSpec, newState("r"));
    expect(observation.pmMarkets.length).toBe(2); // one row per quoteable outcome
    expect(observation.pmMarkets[0]).toMatchObject({
      source: "kalshi",
      slug: "btc-up",
      outcomeExternalMarketId: "yes-1",
    });
    expect(
      observation.pmMarkets.every((m) => m.outcomeExternalMarketId.length > 0),
    ).toBe(true);
  });

  it("excludes PM markets the agent already holds an open position in (anti-churn candidate filter)", async () => {
    const pmSpec = {
      ...spec,
      venues: ["pm", "futures"] as ("spot" | "futures" | "pm")[],
    };
    const c = fakeClient({
      // Held: Kalshi BTC-UP / yes-1 (API shape: source, eventSlug, outcome.externalMarketId).
      pmPositions: async () =>
        okData({
          positions: [
            {
              id: 7,
              status: "open",
              source: "Kalshi",
              eventSlug: "BTC-UP",
              outcome: { externalMarketId: "yes-1" },
              stakeMusd: 10,
            },
          ],
        }),
      discoverPmMarkets: async () =>
        okData({
          data: [
            {
              source: "Kalshi",
              slug: "BTC-UP",
              title: "BTC up?",
              freshness: { status: "fresh" },
              outcomes: [
                { externalMarketId: "yes-1", name: "Yes", probability: 60 }, // held -> filtered out
                { externalMarketId: "no-1", name: "No", probability: 40 }, // not held -> kept
              ],
            },
          ],
        }),
    });
    const { observation } = await observe(c, pmSpec, newState("r"));
    // Only the un-held outcome survives as a candidate, refs stay contiguous (pm1).
    expect(observation.pmMarkets.length).toBe(1);
    expect(observation.pmMarkets[0]).toMatchObject({
      source: "kalshi",
      slug: "btc-up",
      outcomeExternalMarketId: "no-1",
      ref: "pm1",
    });
    // The held position is still surfaced to the model as holdings context.
    expect(
      observation.pmPositions.some(
        (p) => p.outcomeExternalMarketId === "yes-1",
      ),
    ).toBe(true);
  });

  it("maps the REAL /positions/futures shape: nested coin + per-position prices (were undefined/dropped)", async () => {
    // REAL shape (probed 2026-06-25): coin is NESTED ({ucid,symbol,name}); open
    // positions also carry markPrice/liquidationPrice/sl/tp. observe used to read
    // p.coinId/p.symbol (undefined) and drop all prices, blinding the model.
    const fSpec = {
      ...spec,
      venues: ["futures"] as ("spot" | "futures" | "pm")[],
    };
    const c = fakeClient({
      futuresPositions: async () =>
        okData({
          positions: [
            {
              id: 52,
              status: "open",
              coin: { ucid: "1", symbol: "BTC", name: "Bitcoin" },
              side: "long",
              leverage: 2,
              entryPrice: 67000,
              marginMusd: 15,
              liquidationPrice: 33500,
              stopLossPrice: 64000,
              takeProfitPrice: 71000,
              markPrice: 67500,
              unrealizedPnlMusd: 1.2,
              fundingPaidMusd: -0.37,
              fundingAppliedThrough: "2026-09-21T12:34:56.000Z",
            },
          ],
        }),
    });
    const { observation } = await observe(c, fSpec, newState("r"));
    const p = observation.openPositions[0];
    expect(p).toBeDefined();
    expect(p.coinId).toBe("1"); // was undefined (read p.coinId, API returns coin.ucid)
    expect(p.symbol).toBe("BTC"); // was undefined (read p.symbol, API returns coin.symbol)
    expect(p.entryPrice).toBe(67000);
    expect(p.markPrice).toBe(67500);
    expect(p.liquidationPrice).toBe(33500);
    expect(p.stopLossPrice).toBe(64000);
    expect(p.takeProfitPrice).toBe(71000);
    expect(p.leverage).toBe(2);
    expect(p.fundingPaidMusd).toBe(-0.37);
    expect(p.fundingAppliedThrough).toBe("2026-09-21T12:34:56.000Z");
  });

  it("preserves zero funding and omits funding fields absent from legacy positions", async () => {
    const fSpec = {
      ...spec,
      venues: ["futures"] as ("spot" | "futures" | "pm")[],
    };
    const c = fakeClient({
      futuresPositions: async () =>
        okData({
          positions: [
            {
              id: 53,
              status: "open",
              coin: { ucid: "2", symbol: "ETH" },
              fundingPaidMusd: 0,
              fundingAppliedThrough: null,
            },
            { id: 54, status: "open", coin: { ucid: "3", symbol: "SOL" } },
          ],
        }),
    });
    const { observation } = await observe(c, fSpec, newState("r"));
    expect(observation.openPositions[0]).toMatchObject({
      fundingPaidMusd: 0,
      fundingAppliedThrough: null,
    });
    expect(observation.openPositions[1]).not.toHaveProperty("fundingPaidMusd");
    expect(observation.openPositions[1]).not.toHaveProperty(
      "fundingAppliedThrough",
    );
  });

  it("SCHEMA CONTRACT: /positions/pm — eventSlug + nested outcome + unrealizedPnl survive observe (dup-guard + drawdown inputs)", async () => {
    // Guards the recurring field-drift bug class: the dup-guard matches on
    // (source,slug,outcomeExternalMarketId) and the kill-switch drawdown reads
    // unrealizedPnlMusd. The REAL /positions/pm shape nests the outcome id and
    // names the unrealized `unrealizedPnl` — if observe drifts off these keys
    // again, this test fails instead of the bug going silent in production.
    const pmSpec = {
      ...spec,
      venues: ["pm", "futures"] as ("spot" | "futures" | "pm")[],
    };
    const c = fakeClient({
      discoverPmMarkets: async () => okData({ data: [] }),
      pmPositions: async () =>
        okData({
          positions: [
            {
              id: 7,
              status: "open",
              source: "polymarket",
              eventSlug: "bitcoin-up-or-down-on-june-25-2026",
              outcome: { externalMarketId: "12345", label: "Down" },
              side: "yes",
              stakeMusd: 10,
              unrealizedPnl: -3.5,
            },
          ],
        }),
    });
    const { observation } = await observe(c, pmSpec, newState("r"));
    const p = observation.pmPositions[0];
    expect(p).toBeDefined();
    expect(p.source).toBe("polymarket");
    expect(p.slug).toBe("bitcoin-up-or-down-on-june-25-2026"); // from eventSlug
    expect(p.outcomeExternalMarketId).toBe("12345"); // from nested outcome.externalMarketId
    expect(p.stakeMusd).toBe(10);
    expect(p.unrealizedPnlMusd).toBe(-3.5); // from unrealizedPnl -> kill-switch drawdown
  });

  it("SETTLEMENT FEEDBACK: surfaces /positions/pm recentlyResolved as pmResolutions (win/loss/void + pnl)", async () => {
    // The settlement-feedback loop: the /positions/pm response now carries an
    // additive `recentlyResolved` array. observe must lift it into
    // observation.pmResolutions so the model can reflect on its settled bets.
    const pmSpec = {
      ...spec,
      venues: ["pm", "futures"] as ("spot" | "futures" | "pm")[],
    };
    const c = fakeClient({
      discoverPmMarkets: async () => okData({ data: [] }),
      pmPositions: async () =>
        okData({
          positions: [],
          recentlyResolved: [
            {
              id: 11,
              eventTitle: "Will BTC top $80k in June?",
              eventSlug: "btc-80k-june",
              side: "yes",
              status: "settled_win",
              pnlMusd: 320.5,
              payoutMusd: 345.5,
              stakeMusd: 25,
              settledAt: "2026-06-30T00:00:00.000Z",
            },
            {
              id: 12,
              eventTitle: "ETH flips SOL by Friday?",
              side: "no",
              status: "settled_loss",
              pnlMusd: -100,
              stakeMusd: 100,
            },
            {
              id: 13,
              eventTitle: "Tie game?",
              side: "yes",
              status: "void_refunded",
              pnlMusd: null,
              stakeMusd: 10,
            },
          ],
        }),
    });
    const { observation } = await observe(c, pmSpec, newState("r"));
    expect(observation.pmResolutions).toHaveLength(3);
    const win = observation.pmResolutions.find((r) => r.id === 11);
    expect(win).toMatchObject({
      id: 11,
      eventTitle: "Will BTC top $80k in June?",
      slug: "btc-80k-june",
      side: "yes",
      status: "settled_win",
      pnlMusd: 320.5,
      stakeMusd: 25,
    });
    const loss = observation.pmResolutions.find((r) => r.id === 12);
    expect(loss?.status).toBe("settled_loss");
    expect(loss?.pnlMusd).toBe(-100);
    const voided = observation.pmResolutions.find((r) => r.id === 13);
    expect(voided?.status).toBe("void_refunded");
  });

  it("SETTLEMENT FEEDBACK: degrades pmResolutions to [] when the backend omits recentlyResolved (back-compat)", async () => {
    const pmSpec = {
      ...spec,
      venues: ["pm", "futures"] as ("spot" | "futures" | "pm")[],
    };
    const c = fakeClient({
      discoverPmMarkets: async () => okData({ data: [] }),
      // Older backend: positions only, no recentlyResolved key.
      pmPositions: async () => okData({ positions: [] }),
    });
    const { observation } = await observe(c, pmSpec, newState("r"));
    expect(observation.pmResolutions).toEqual([]);
  });

  it("drops outcomes the backend flagged not-openable (eligible === false) and stamps contiguous refs", async () => {
    const pmSpec = {
      ...spec,
      venues: ["pm", "futures"] as ("spot" | "futures" | "pm")[],
    };
    const c = fakeClient({
      pmPositions: async () => okData({ positions: [] }),
      discoverPmMarkets: async () =>
        okData({
          data: [
            {
              source: "polymarket",
              slug: "btc-bucket",
              title: "BTC price bucket",
              freshness: { status: "fresh" },
              eligible: true,
              outcomes: [
                {
                  externalMarketId: "a",
                  name: "60-65k",
                  probability: 40,
                  eligible: true,
                },
                {
                  externalMarketId: "b",
                  name: "65-70k",
                  probability: 35,
                  eligible: true,
                },
                {
                  externalMarketId: "z",
                  name: "0% tail",
                  probability: 0,
                  eligible: false,
                },
              ],
            },
          ],
        }),
    });
    const { observation } = await observe(c, pmSpec, newState("r"));
    // The eligible:false outcome is dropped; the two openable ones remain.
    expect(observation.pmMarkets.length).toBe(2);
    expect(
      observation.pmMarkets.some((m) => m.outcomeExternalMarketId === "z"),
    ).toBe(false);
    // Refs are contiguous pm1..pmN over the surviving rows.
    expect(observation.pmMarkets.map((m) => m.ref)).toEqual(["pm1", "pm2"]);
  });

  it("carries the event-level consensus onto every outcome row unchanged, including null and absent", async () => {
    const pmSpec = {
      ...spec,
      venues: ["pm", "futures"] as ("spot" | "futures" | "pm")[],
    };
    const c = fakeClient({
      pmPositions: async () => okData({ positions: [] }),
      discoverPmMarkets: async () =>
        okData({
          data: [
            {
              source: "kalshi",
              slug: "btc-120k-2026",
              title: "Bitcoin above $120k in 2026?",
              referenceProbability: {
                probability: 31,
                venueCount: 3,
                spreadPoints: 2,
                kind: "binary",
                outcomeName: null,
              },
              outcomes: [
                { externalMarketId: "yes", name: "Yes", probability: 40 },
                { externalMarketId: "no", name: "No", probability: 60 },
              ],
            },
            {
              source: "polymarket",
              slug: "btc-150k-2026",
              title: "Bitcoin above $150k in 2026?",
              referenceProbability: null,
              outcomes: [
                { externalMarketId: "y", name: "Yes", probability: 9 },
              ],
            },
            {
              source: "polymarket",
              slug: "btc-200k-2026",
              title: "Bitcoin above $200k in 2026?",
              outcomes: [
                { externalMarketId: "z", name: "Yes", probability: 3 },
              ],
            },
          ],
        }),
    });
    const { observation } = await observe(c, pmSpec, newState("r"));
    const byId = Object.fromEntries(
      observation.pmMarkets.map((m) => [m.outcomeExternalMarketId, m]),
    );
    const consensus = {
      prob: 0.31,
      venues: 3,
      spreadPts: 2,
      kind: "binary",
      outcome: null,
    };
    // The same event-level value on the YES and the NO row: never re-oriented
    // or complemented for the NO side.
    expect(byId.yes.consensus).toEqual(consensus);
    expect(byId.no.consensus).toEqual(consensus);
    expect(byId.y.consensus).toBeNull();
    expect(byId.z).not.toHaveProperty("consensus");
  });

  it("carries the discover row's settlement rule onto its outcome rows, and absence stays absent", async () => {
    const pmSpec = {
      ...spec,
      venues: ["pm", "futures"] as ("spot" | "futures" | "pm")[],
    };
    const c = fakeClient({
      pmPositions: async () => okData({ positions: [] }),
      discoverPmMarkets: async () =>
        okData({
          data: [
            {
              source: "kalshi",
              slug: "btc-120k-2026",
              title: "Bitcoin above $120k in 2026?",
              resolution: {
                published: true,
                rules:
                  "Resolves Yes if the CF Benchmarks BRTI is above $120,000.",
                rulesTruncated: false,
                settlementSource: null,
                settlementSources: [{ name: "CF Benchmarks", url: null }],
              },
              outcomes: [
                { externalMarketId: "yes", name: "Yes", probability: 40 },
                { externalMarketId: "no", name: "No", probability: 60 },
              ],
            },
            {
              source: "polymarket",
              slug: "btc-200k-2026",
              title: "Bitcoin above $200k in 2026?",
              outcomes: [
                { externalMarketId: "z", name: "Yes", probability: 3 },
              ],
            },
          ],
        }),
    });
    const { observation } = await observe(c, pmSpec, newState("r"));
    const byId = Object.fromEntries(
      observation.pmMarkets.map((m) => [m.outcomeExternalMarketId, m]),
    );
    const rules = {
      published: true,
      text: "Resolves Yes if the CF Benchmarks BRTI is above $120,000.",
      sources: ["CF Benchmarks"],
    };
    expect(byId.yes.rules).toEqual(rules);
    expect(byId.no.rules).toEqual(rules);
    expect(byId.z).not.toHaveProperty("rules");
    expect(byId.yes).not.toHaveProperty("outcomeRule");
  });

  it("gives each ladder line its own settlement term, and unknown stays null", async () => {
    const pmSpec = {
      ...spec,
      venues: ["pm", "futures"] as ("spot" | "futures" | "pm")[],
    };
    const cpiRule = (line: string) =>
      `If the Consumer Price Index (CPI) increases by more than ${line}% in the twelve months ending September 2026, then the market resolves to Yes.`;
    const SHARED = "Shutdown delays extend the expiration date.";
    const c = fakeClient({
      pmPositions: async () => okData({ positions: [] }),
      discoverPmMarkets: async () =>
        okData({
          data: [
            {
              source: "kalshi",
              slug: "kxcpiyoy-26sep",
              title: "Inflation in September 2026 (CPI YoY)",
              resolution: {
                published: true,
                rules: SHARED,
                rulesTruncated: false,
                settlementSource: null,
                settlementSources: [
                  { name: "Bureau of Labor Statistics", url: null },
                ],
                scope: "per_outcome",
              },
              outcomes: [
                {
                  externalMarketId: "KXCPIYOY-26SEP-T3.5",
                  name: "Above 3.5%",
                  probability: 83,
                  rules: {
                    status: "exact",
                    basis: "provider_market_rules",
                    marketId: "KXCPIYOY-26SEP-T3.5",
                    primary: cpiRule("3.5"),
                    secondary: null,
                    secondaryShared: true,
                    truncated: false,
                  },
                },
                {
                  externalMarketId: "KXCPIYOY-26SEP-T3.6",
                  name: "Above 3.6%",
                  probability: 41,
                  rules: {
                    status: "exact",
                    basis: "provider_market_rules",
                    marketId: "KXCPIYOY-26SEP-T3.6",
                    primary: cpiRule("3.6"),
                    secondary: null,
                    secondaryShared: true,
                    truncated: false,
                  },
                },
                {
                  externalMarketId: "KXCPIYOY-26SEP-T3.7",
                  name: "Above 3.7%",
                  probability: 11,
                  rules: {
                    status: "unknown",
                    basis: "provider_market_rules",
                    marketId: "KXCPIYOY-26SEP-T3.7",
                    reason: "conflicting_duplicates",
                  },
                },
              ],
            },
          ],
        }),
    });
    const { observation } = await observe(c, pmSpec, newState("r"));
    const byId = Object.fromEntries(
      observation.pmMarkets.map((m) => [m.outcomeExternalMarketId, m]),
    );
    expect(byId["KXCPIYOY-26SEP-T3.6"].rules).toMatchObject({
      scope: "per_outcome",
      text: SHARED,
    });
    expect(byId["KXCPIYOY-26SEP-T3.5"].outcomeRule).toEqual({
      primary: cpiRule("3.5"),
    });
    expect(byId["KXCPIYOY-26SEP-T3.6"].outcomeRule).toEqual({
      primary: cpiRule("3.6"),
    });
    expect(byId["KXCPIYOY-26SEP-T3.7"].outcomeRule).toEqual({
      unknown: "conflicting_duplicates",
    });
  });

  // ── crypto-targeted secondary discover (pm_ref hallucination fix) ────────────
  it("does NOT fire a second discover when the primary board already lists the top analyzed coin (budget)", async () => {
    // Conservative watchlist top coin is BTC; the board lists a Bitcoin market, so
    // the agent's sharpest-edge coin is covered — no extra call is spent.
    const pmSpec = {
      ...spec,
      venues: ["pm", "futures"] as ("spot" | "futures" | "pm")[],
    };
    const calls: Array<{ q?: string; limit?: number }> = [];
    const c = fakeClient({
      pmPositions: async () => okData({ positions: [] }),
      discoverPmMarkets: async (q: { q?: string; limit?: number }) => {
        calls.push(q);
        return okData({
          data: [
            {
              source: "kalshi",
              slug: "btc-100k",
              title: "Bitcoin above $100k?",
              freshness: { status: "fresh" },
              outcomes: [
                { externalMarketId: "btc-yes", name: "Yes", probability: 40 },
                { externalMarketId: "btc-no", name: "No", probability: 60 },
              ],
            },
          ],
        });
      },
    });
    const { observation } = await observe(c, pmSpec, newState("r"));
    expect(calls.length).toBe(1); // primary only; no Bitcoin fallback, no secondary
    expect(observation.pmMarkets.length).toBe(2);
    expect(observation.pmMarkets.map((m) => m.ref)).toEqual(["pm1", "pm2"]);
  });

  it("gives non-mechanical calibration agents a deeper board without micro-contract churn", async () => {
    const calibrationSpec = {
      ...spec,
      venues: ["pm"] as ("spot" | "futures" | "pm")[],
      objective: {
        primary: "calibration" as const,
        secondary: [],
        horizon: "7d",
      },
      model: { provider: "nvidia" as const, name: "test-model" },
    };
    const calls: Array<{ q?: string; limit?: number }> = [];
    const c = fakeClient({
      pmPositions: async () => okData({ positions: [] }),
      discoverPmMarkets: async (q: { q?: string; limit?: number }) => {
        calls.push(q);
        return okData({
          data: [
            {
              source: "kalshi",
              slug: "kxbtc15m-26jul181200",
              title: "BTC 15 min · $64,000 target",
              outcomes: [
                { externalMarketId: "fast", name: "Yes", probability: 52 },
              ],
            },
            {
              source: "polymarket",
              slug: "btc-up-or-down-daily-1784000000",
              title: "BTC Up or Down - Daily",
              outcomes: [
                { externalMarketId: "daily", name: "Up", probability: 49 },
              ],
            },
            {
              source: "forecastex",
              slug: "yxhbt-123126-100000",
              title: "Will Bitcoin exceed $100,000 in 2026?",
              outcomes: [
                { externalMarketId: "year", name: "Yes", probability: 31 },
              ],
            },
          ],
        });
      },
    });
    const { observation } = await observe(c, calibrationSpec, newState("r"));
    expect(calls[0]?.limit).toBe(30);
    expect(observation.pmMarkets.map((market) => market.slug)).toEqual([
      "yxhbt-123126-100000",
    ]);
    expect(observation.pmMarkets[0]?.ref).toBe("pm1");
  });

  it("keeps the complete discovery universe for mechanical calibration baselines", async () => {
    const mechanicalSpec = {
      ...spec,
      venues: ["pm"] as ("spot" | "futures" | "pm")[],
      objective: {
        primary: "calibration" as const,
        secondary: ["benchmark"],
        horizon: "all",
      },
      model: { provider: "mechanical" as const, name: "market-implied" },
    };
    const calls: Array<{ q?: string; limit?: number }> = [];
    const c = fakeClient({
      pmPositions: async () => okData({ positions: [] }),
      discoverPmMarkets: async (q: { q?: string; limit?: number }) => {
        calls.push(q);
        return okData({
          data: [
            {
              source: "kalshi",
              slug: "kxbtc15m-26jul181200",
              title: "BTC 15 min · $64,000 target",
              outcomes: [
                { externalMarketId: "fast", name: "Yes", probability: 52 },
              ],
            },
          ],
        });
      },
    });
    const { observation } = await observe(c, mechanicalSpec, newState("r"));
    expect(calls[0]?.limit).toBe(12);
    expect(observation.pmMarkets[0]?.slug).toBe("kxbtc15m-26jul181200");
  });

  // Churn rows were 72% of LLM PM decisions (30 days to 2026-09-29), from
  // agents of every objective, so the curated board is no longer gated on
  // objective.primary === "calibration".
  const churnBoard = () => ({
    data: [
      {
        source: "kalshi",
        slug: "kxbtc15m-26jul181200",
        title: "BTC 15 min · $64,000 target",
        outcomes: [{ externalMarketId: "fast", name: "Yes", probability: 52 }],
      },
      {
        source: "polymarket",
        slug: "bitcoin-up-or-down-september-29-4am-et",
        title: "Bitcoin Up or Down - September 29, 4AM ET",
        outcomes: [{ externalMarketId: "hour", name: "Up", probability: 50 }],
      },
      {
        source: "forecastex",
        slug: "yxhbt-123126-100000",
        title: "Will Bitcoin exceed $100,000 in 2026?",
        outcomes: [{ externalMarketId: "year", name: "Yes", probability: 31 }],
      },
    ],
  });

  it.each([
    ["realized_pnl objective", { primary: "realized_pnl" as const }],
    ["no objective", undefined],
  ])(
    "curates the board for a non-calibration LLM agent (%s)",
    async (_label, objective) => {
      const llmSpec = {
        ...spec,
        venues: ["pm"] as ("spot" | "futures" | "pm")[],
        objective: objective ? { ...objective, secondary: [] } : undefined,
        model: { provider: "anthropic" as const, name: "test-model" },
      };
      const calls: Array<{ q?: string; limit?: number }> = [];
      const c = fakeClient({
        pmPositions: async () => okData({ positions: [] }),
        discoverPmMarkets: async (q: { q?: string; limit?: number }) => {
          calls.push(q);
          return okData(churnBoard());
        },
      });
      const { observation } = await observe(c, llmSpec, newState("r"));
      expect(calls[0]?.limit).toBe(30);
      expect(observation.pmMarkets.map((m) => m.slug)).toEqual([
        "yxhbt-123126-100000",
      ]);
      expect(observation.pmMarkets[0]?.ref).toBe("pm1");
    },
  );

  it("curates the board when the model is omitted (hosted default is an LLM)", async () => {
    const llmSpec = {
      ...spec,
      venues: ["pm"] as ("spot" | "futures" | "pm")[],
      objective: undefined,
      model: undefined,
    };
    const c = fakeClient({
      pmPositions: async () => okData({ positions: [] }),
      discoverPmMarkets: async () => okData(churnBoard()),
    });
    const { observation } = await observe(c, llmSpec, newState("r"));
    expect(observation.pmMarkets.map((m) => m.slug)).toEqual([
      "yxhbt-123126-100000",
    ]);
  });

  it("keeps the unmodified universe for a non-calibration mechanical agent", async () => {
    const mechanicalSpec = {
      ...spec,
      venues: ["pm"] as ("spot" | "futures" | "pm")[],
      objective: { primary: "realized_pnl" as const, secondary: [] },
      model: { provider: "mechanical" as const, name: "market-implied" },
    };
    const calls: Array<{ q?: string; limit?: number }> = [];
    const c = fakeClient({
      pmPositions: async () => okData({ positions: [] }),
      discoverPmMarkets: async (q: { q?: string; limit?: number }) => {
        calls.push(q);
        return okData(churnBoard());
      },
    });
    const { observation } = await observe(c, mechanicalSpec, newState("r"));
    expect(calls[0]?.limit).toBe(12);
    expect(observation.pmMarkets.map((m) => m.slug)).toEqual([
      "kxbtc15m-26jul181200",
      "bitcoin-up-or-down-september-29-4am-et",
      "yxhbt-123126-100000",
    ]);
  });

  it("uses the same deeper page for the Bitcoin fallback: 30 for an LLM agent, 12 for mechanical", async () => {
    const run = async (provider: "anthropic" | "mechanical") => {
      const calls: Array<{ q?: string; limit?: number }> = [];
      const c = fakeClient({
        pmPositions: async () => okData({ positions: [] }),
        discoverPmMarkets: async (q: { q?: string; limit?: number }) => {
          calls.push(q);
          return okData(q.q === "Bitcoin" ? churnBoard() : { data: [] });
        },
      });
      await observe(
        c,
        {
          ...spec,
          venues: ["pm"] as ("spot" | "futures" | "pm")[],
          risk: { ...spec.risk, watchlist: ["SOL"] },
          model: { provider, name: "m" },
        },
        newState("r"),
      );
      return calls;
    };
    const llm = await run("anthropic");
    expect(llm[1]).toEqual({ q: "Bitcoin", limit: 30 });
    const mechanical = await run("mechanical");
    expect(mechanical[1]).toEqual({ q: "Bitcoin", limit: 12 });
  });

  it("fires ONE crypto-targeted secondary discover when the primary board lacks the top analyzed coin, merging its refs continuously", async () => {
    // Top coin is SOL. Its primary query is thin (1 event < 3) so the existing
    // Bitcoin fallback replaces the board with BTC markets — leaving SOL, the coin
    // the agent actually has a view on, absent. Without a listed SOL market an 8B
    // model invents a pmN ref (pm_ref_unknown). The fix re-queries SOL once and
    // merges a REAL sol ref into the board.
    const pmSpec = {
      ...spec,
      venues: ["pm", "futures"] as ("spot" | "futures" | "pm")[],
      risk: { ...spec.risk, watchlist: ["SOL", "BTC"] },
    };
    const calls: Array<{ q?: string; limit?: number }> = [];
    const c = fakeClient({
      pmPositions: async () => okData({ positions: [] }),
      discoverPmMarkets: async (q: { q?: string; limit?: number }) => {
        calls.push(q);
        const query = (q?.q ?? "").toLowerCase();
        if (query === "bitcoin") {
          return okData({
            data: [
              {
                source: "kalshi",
                slug: "btc-100k",
                title: "Bitcoin above $100k by 2026?",
                freshness: { status: "fresh" },
                outcomes: [
                  { externalMarketId: "btc-yes", name: "Yes", probability: 45 },
                  { externalMarketId: "btc-no", name: "No", probability: 55 },
                ],
              },
            ],
          });
        }
        if (query === "solana") {
          return okData({
            data: [
              {
                source: "polymarket",
                slug: "sol-250",
                title: "Solana above $250 by Friday?",
                freshness: { status: "fresh" },
                outcomes: [
                  { externalMarketId: "sol-yes", name: "Yes", probability: 30 },
                ],
              },
            ],
          });
        }
        return okData({ data: [] });
      },
    });
    const { observation } = await observe(c, pmSpec, newState("r"));
    // primary Solana (thin) -> Bitcoin fallback -> targeted Solana re-query.
    expect(calls.map((x) => (x.q ?? "").toLowerCase())).toEqual([
      "solana",
      "bitcoin",
      "solana",
    ]);
    expect(calls[2].limit).toBe(6); // the secondary is a small, budgeted call
    // The merged board carries a real SOL ref the model can bet instead of inventing.
    const sol = observation.pmMarkets.find((m) => m.slug === "sol-250");
    expect(sol).toBeDefined();
    expect(sol?.outcomeExternalMarketId).toBe("sol-yes");
    // Secondary rows are appended after the primary rows, refs stay contiguous 1..N.
    expect(observation.pmMarkets.map((m) => m.ref)).toEqual(
      observation.pmMarkets.map((_, i) => `pm${i + 1}`),
    );
    expect(sol?.ref).toBe(`pm${observation.pmMarkets.length}`);
  });

  it("dedupes secondary rows against the primary board by source+slug (no duplicate market)", async () => {
    // Top coin SOL. The primary board carries a sol-250 event but with an opaque
    // title (so the coverage-by-title check misses it and the secondary fires). The
    // secondary re-returns sol-250 (same source+slug) plus a genuinely new sol-300;
    // the dup must be dropped and only the new market merged.
    const pmSpec = {
      ...spec,
      venues: ["pm", "futures"] as ("spot" | "futures" | "pm")[],
      risk: { ...spec.risk, watchlist: ["SOL", "BTC"] },
    };
    const c = fakeClient({
      pmPositions: async () => okData({ positions: [] }),
      discoverPmMarkets: async (q: { q?: string; limit?: number }) => {
        // Primary (limit 12) returns 3 opaque-titled events (>=3 so no Bitcoin
        // fallback); the secondary is distinguished by its limit of 6.
        if (q.limit === 6) {
          return okData({
            data: [
              {
                source: "polymarket",
                slug: "sol-250",
                title: "Solana above $250?", // dup of primary by source+slug
                outcomes: [
                  { externalMarketId: "sol-yes", name: "Yes", probability: 30 },
                ],
              },
              {
                source: "polymarket",
                slug: "sol-300",
                title: "Solana above $300?", // genuinely new
                outcomes: [
                  {
                    externalMarketId: "sol300-yes",
                    name: "Yes",
                    probability: 20,
                  },
                ],
              },
            ],
          });
        }
        return okData({
          data: [
            {
              source: "polymarket",
              slug: "sol-250",
              title: "Opaque title A",
              outcomes: [
                { externalMarketId: "sol-yes", name: "Yes", probability: 30 },
              ],
            },
            {
              source: "kalshi",
              slug: "misc-1",
              title: "Opaque B",
              outcomes: [
                { externalMarketId: "m1", name: "Yes", probability: 50 },
              ],
            },
            {
              source: "kalshi",
              slug: "misc-2",
              title: "Opaque C",
              outcomes: [
                { externalMarketId: "m2", name: "Yes", probability: 50 },
              ],
            },
          ],
        });
      },
    });
    const { observation } = await observe(c, pmSpec, newState("r"));
    // sol-250 stays a single row (dup dropped); sol-300 is the only merged addition.
    expect(
      observation.pmMarkets.filter((m) => m.slug === "sol-250").length,
    ).toBe(1);
    expect(observation.pmMarkets.some((m) => m.slug === "sol-300")).toBe(true);
    // Refs contiguous across the merged list.
    expect(observation.pmMarkets.map((m) => m.ref)).toEqual(
      observation.pmMarkets.map((_, i) => `pm${i + 1}`),
    );
  });

  // ── news capability ─────────────────────────────────────────────────────────
  it("fetches and compacts watchlist news when the `news` capability is set", async () => {
    const newsSpec = {
      ...spec,
      capabilities: [...spec.capabilities, "news"] as typeof spec.capabilities,
    };
    let calledWith: { coins?: string } | null = null;
    const c = fakeClient({
      agentNews: async (q: { coins?: string }) => {
        calledWith = q;
        return okData({
          coins: ["bitcoin"],
          items: [
            {
              title: "BTC ETF inflows hit record",
              source: "Coindesk",
              sentiment: "bullish",
              importance: 9,
              ageMinutes: 30,
              coins: ["bitcoin"],
            },
          ],
        });
      },
    });
    const { observation } = await observe(c, newsSpec, newState("r"));
    expect(calledWith).not.toBeNull();
    expect(typeof (calledWith as { coins?: string } | null)?.coins).toBe(
      "string",
    );
    expect(observation.news?.length).toBe(1);
    expect(observation.news?.[0]).toMatchObject({
      title: "BTC ETF inflows hit record",
      sentiment: "bullish",
      importance: 9,
      ageHours: 0.5,
    });
  });

  it("news coverage includes universe_scan-DISCOVERED symbols, not just the static watchlist (pump-catalyst investigation)", async () => {
    const bothSpec = {
      ...spec,
      capabilities: [
        ...spec.capabilities,
        "news",
        "universe_scan",
      ] as typeof spec.capabilities,
    };
    let newsCoins: string | undefined;
    const c = fakeClient({
      cryptoMovers: async () =>
        okData([
          { symbol: "PUMP", name: "Pump", change24h: "45", currentPrice: "2" },
        ]),
      agentNews: async (q: { coins?: string }) => {
        newsCoins = q.coins;
        return okData({ items: [] });
      },
    });
    await observe(c, bothSpec, newState("r"));
    // The discovered mover must be in the news query — a pump the agent is
    // told to investigate is exactly the coin whose catalyst news matters.
    expect(newsCoins?.split(",")).toContain("PUMP");
    for (const s of spec.risk.watchlist) {
      expect(newsCoins?.split(",")).toContain(s);
    }
  });

  it("does not fetch news without the `news` capability", async () => {
    let called = false;
    const c = fakeClient({
      agentNews: async () => {
        called = true;
        return okData({ items: [] });
      },
    });
    const { observation } = await observe(c, spec, newState("r"));
    expect(called).toBe(false);
    expect(observation.news).toBeUndefined();
  });

  // ── indicators capability ──────────────────────────────────────────────────
  const candlesPayload = (n: number) => {
    const candles = [];
    for (let i = 0; i < n; i++) {
      const base = 60000 + i * 10;
      candles.push({
        t: 1700000000 + i * 300,
        o: base,
        h: base + 50,
        l: base - 50,
        c: base + 20,
        v: 1000,
      });
    }
    return { candles };
  };
  const indicators = ["indicators"] as ("websearch" | "indicators")[];

  it("attaches computed indicators when the agent declares the capability", async () => {
    let candleCalls = 0;
    const c = fakeClient({
      candles: async () => {
        candleCalls++;
        return okData(candlesPayload(60));
      },
    });
    const { observation } = await observe(
      c,
      { ...spec, capabilities: indicators },
      newState("r"),
    );
    expect(candleCalls).toBeGreaterThan(0);
    const entry = observation.watch.find((w) => w.coinId);
    expect(entry?.indicators).toBeDefined();
    expect(typeof entry?.indicators?.asOfClose).toBe("number");
    expect(typeof entry?.indicators?.rsi14).toBe("number");
    expect(typeof entry?.indicators?.aboveEma20).toBe("boolean");
  });

  it("does NOT fetch candles when the capability is absent", async () => {
    let candleCalls = 0;
    const c = fakeClient({
      candles: async () => {
        candleCalls++;
        return okData(candlesPayload(60));
      },
    });
    const { observation } = await observe(
      c,
      { ...spec, capabilities: [] },
      newState("r"),
    );
    expect(candleCalls).toBe(0);
    expect(observation.watch.find((w) => w.coinId)?.indicators).toBeUndefined();
  });

  it("tolerates a failed candle fetch — omits indicators, cycle proceeds", async () => {
    const c = fakeClient({
      candles: async () => ({ ok: false, status: 500, data: {} }),
    });
    const { observation, skip } = await observe(
      c,
      { ...spec, capabilities: indicators },
      newState("r"),
    );
    expect(skip).toBeUndefined();
    expect(observation.watch.find((w) => w.coinId)?.indicators).toBeUndefined();
  });
});

describe("universe_scan capability", () => {
  const scanSpec = {
    ...spec,
    capabilities: [
      ...spec.capabilities,
      "universe_scan",
    ] as typeof spec.capabilities,
  };

  it("resolves top movers into discovered watch entries and passes the rest as context", async () => {
    const c = fakeClient({
      cryptoMovers: async () =>
        okData([
          {
            symbol: "AAA",
            name: "Aaa",
            change24h: "61.0",
            currentPrice: "1.5",
          },
          {
            symbol: "BBB",
            name: "Bbb",
            change24h: "40.0",
            currentPrice: "2.5",
          },
          {
            symbol: "CCC",
            name: "Ccc",
            change24h: "30.0",
            currentPrice: "3.5",
          },
          {
            symbol: "DDD",
            name: "Ddd",
            change24h: "20.0",
            currentPrice: "4.5",
          },
          {
            symbol: "EEE",
            name: "Eee",
            change24h: "10.0",
            currentPrice: "5.5",
          },
          {
            symbol: "FFF",
            name: "Fff",
            change24h: "9.0",
            currentPrice: "6.5",
          },
          {
            symbol: "GGG",
            name: "Ggg",
            change24h: "8.0",
            currentPrice: "7.5",
          },
          {
            symbol: "HHH",
            name: "Hhh",
            change24h: "7.0",
            currentPrice: "8.5",
          },
        ]),
    });
    const { observation } = await observe(c, scanSpec, newState("r"));
    const discovered = observation.watch.filter((w) => w.discovered);
    // UNIVERSE_RESOLVE_TOP = 6: only a RESOLVED row carries indicators, and so
    // a `setups` flag. The fixture deliberately supplies more movers than the
    // bound so the overflow path stays covered as the bound changes.
    expect(discovered.map((w) => w.symbol)).toEqual([
      "AAA",
      "BBB",
      "CCC",
      "DDD",
      "EEE",
      "FFF",
    ]);
    // Remaining movers ride as compact context, not tradable entries.
    expect(observation.universeMovers?.map((m) => m.symbol)).toEqual([
      "GGG",
      "HHH",
    ]);
  });

  it("excludes watchlist and blocklist symbols from discovery", async () => {
    const watchSym = spec.risk.watchlist[0];
    const blockSpec = {
      ...scanSpec,
      risk: { ...scanSpec.risk, blocklist: ["EVIL"] },
    };
    const c = fakeClient({
      cryptoMovers: async () =>
        okData([
          { symbol: watchSym, name: "Dup", change24h: "99", currentPrice: "1" },
          { symbol: "EVIL", name: "Evil", change24h: "98", currentPrice: "1" },
          { symbol: "FINE", name: "Fine", change24h: "50", currentPrice: "1" },
        ]),
    });
    const { observation } = await observe(c, blockSpec, newState("r"));
    const discovered = observation.watch.filter((w) => w.discovered);
    expect(discovered.map((w) => w.symbol)).toEqual(["FINE"]);
  });

  it("degrades to no universe section when the movers call fails", async () => {
    const c = fakeClient({
      cryptoMovers: async () => ({ ok: false, status: 500, data: {} }),
    });
    const { observation, skip } = await observe(c, scanSpec, newState("r"));
    expect(skip).toBeUndefined();
    expect(observation.watch.some((w) => w.discovered)).toBe(false);
    expect(observation.universeMovers).toBeUndefined();
  });

  it("does nothing without the capability", async () => {
    const c = fakeClient({
      cryptoMovers: async () => {
        throw new Error("must not be called");
      },
    });
    const { observation } = await observe(c, spec, newState("r"));
    expect(observation.watch.some((w) => w.discovered)).toBe(false);
  });
});

describe("own PM calibration record (pmCalibration)", () => {
  beforeEach(() => clearPmCalibrationCache());
  afterEach(() => vi.useRealTimers());

  const pmSpec = {
    ...spec,
    venues: ["pm", "futures"] as ("spot" | "futures" | "pm")[],
    model: { provider: "anthropic" as const, name: "test-model" },
  };
  const record = (settled: number) => ({
    settled,
    brierAgent: 0.2801,
    brierMarket: 0.1834,
    meanForecastPct: 57.2,
    winRatePct: 34.4,
    bands: [
      {
        fromPct: 50,
        toPct: 60,
        n: 40,
        meanForecastPct: 55.4,
        winRatePct: 30.1,
      },
      // Invalid range and an empty band are dropped, never guessed.
      { fromPct: 90, toPct: 80, n: 3, meanForecastPct: 85, winRatePct: 60 },
      { fromPct: 60, toPct: 70, n: 0, meanForecastPct: 65, winRatePct: 0 },
    ],
  });
  const clientWith = (
    performance: (...args: unknown[]) => Promise<unknown>,
    key = "agent-a",
  ) =>
    fakeClient({
      pmPositions: async () => okData({ positions: [] }),
      discoverPmMarkets: async () => okData({ data: [] }),
      credentialFingerprint: () => key,
      performance,
    });

  it("reads once per 30 minutes per credential and compacts the record", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const t0 = Date.parse("2026-09-29T00:00:00Z");
    vi.setSystemTime(t0);
    const perf = vi.fn(async () =>
      okData({ totals: {}, pmCalibration: record(40) }),
    );
    const first = await observe(clientWith(perf), pmSpec, newState("r"));
    expect(first.skip).toBeUndefined();
    expect(first.observation.pmCalibration).toEqual({
      settled: 40,
      brierAgent: 0.28,
      brierMarket: 0.183,
      meanForecastPct: 57,
      winRatePct: 34,
      bands: [
        { fromPct: 50, toPct: 60, n: 40, meanForecastPct: 55, winRatePct: 30 },
      ],
    });
    // A new client per cycle (as the hosted scheduler does), same credential.
    const second = await observe(clientWith(perf), pmSpec, newState("r"));
    expect(second.observation.pmCalibration).toEqual(
      first.observation.pmCalibration,
    );
    vi.setSystemTime(t0 + 30 * 60_000 - 1);
    await observe(clientWith(perf), pmSpec, newState("r"));
    expect(perf).toHaveBeenCalledOnce();
    expect(perf.mock.calls[0][1]).toEqual({ timeoutMs: 5_000, maxRetries: 0 });
    // Another agent's credential has its own entry.
    await observe(clientWith(perf, "agent-b"), pmSpec, newState("r"));
    expect(perf).toHaveBeenCalledTimes(2);
    vi.setSystemTime(t0 + 30 * 60_000);
    await observe(clientWith(perf), pmSpec, newState("r"));
    expect(perf).toHaveBeenCalledTimes(3);
  });

  it("omits the block below 20 settled forecasts", async () => {
    const { observation } = await observe(
      clientWith(async () => okData({ pmCalibration: record(19) })),
      pmSpec,
      newState("r"),
    );
    expect(observation).not.toHaveProperty("pmCalibration");
  });

  it.each([
    ["an older backend without the field", async () => okData({ totals: {} })],
    ["a null block", async () => okData({ pmCalibration: null })],
    ["an HTTP failure", async () => ({ ok: false, status: 500, data: {} })],
    [
      "a rejected read",
      async () => {
        throw new Error("network down");
      },
    ],
  ])(
    "omits the block and never blocks the cycle on %s, without retrying",
    async (_label, impl) => {
      const perf = vi.fn(impl);
      const { observation, skip } = await observe(
        clientWith(perf),
        pmSpec,
        newState("r"),
      );
      expect(skip).toBeUndefined();
      expect(observation).not.toHaveProperty("pmCalibration");
      expect(perf).toHaveBeenCalledOnce();
      // The miss is cached too: no re-read in the next cycle within the TTL.
      await observe(clientWith(perf), pmSpec, newState("r"));
      expect(perf).toHaveBeenCalledOnce();
    },
  );

  it("never reads for a mechanical agent or without the PM venue", async () => {
    const perf = vi.fn(async () => okData({ pmCalibration: record(40) }));
    const mechanical = await observe(
      clientWith(perf),
      { ...pmSpec, model: { provider: "mechanical", name: "market-implied" } },
      newState("r"),
    );
    expect(mechanical.observation).not.toHaveProperty("pmCalibration");
    await observe(
      clientWith(perf),
      { ...pmSpec, venues: ["futures"] },
      newState("r"),
    );
    expect(perf).not.toHaveBeenCalled();
  });

  it("omits the block for a client without the read", async () => {
    expect(
      await readPmCalibration({} as unknown as CoinRithmClient),
    ).toBeUndefined();
  });

  it("re-reads when the clock moves backwards past the cached stamp", async () => {
    const perf = vi.fn(async () => okData({ pmCalibration: record(40) }));
    const c = clientWith(perf);
    await readPmCalibration(c, undefined, 1_000_000);
    await readPmCalibration(c, undefined, 999_999);
    expect(perf).toHaveBeenCalledTimes(2);
  });
});
