import { describe, it, expect } from "vitest";
import { observe } from "./observe.js";
import { parseSkill } from "./skill.js";
import { renderFolderOfOne } from "./templates.js";
import { newState } from "./state.js";
import { CoinRithmClient } from "./client.js";

const okData = (data: unknown) => ({ ok: true, status: 200, data });
const spec = parseSkill(renderFolderOfOne("a", "conservative")).spec;

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
                { externalMarketId: "yes-1", name: "Yes" },
                { externalMarketId: "no-1", name: "No" },
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
                { externalMarketId: "yes-1", name: "Yes" }, // held -> filtered out
                { externalMarketId: "no-1", name: "No" }, // not held -> kept
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
