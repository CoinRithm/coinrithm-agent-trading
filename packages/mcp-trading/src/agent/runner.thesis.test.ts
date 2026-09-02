// Slice 2 (2026-09-02): thesis exits through the REAL cycle. The runner binds
// the thesis an open was made on, re-evaluates it every cycle, closes a futures
// position whose thesis broke (live), plans it (dry-run), and only ever
// SURFACES a broken PM thesis. Fixtures follow the probed API shapes.

import { describe, it, expect, vi } from "vitest";
import { runCycle, RunnerDeps } from "./runner.js";
import { parseSkill } from "./skill.js";
import { renderFolderOfOne } from "./templates.js";
import { newState } from "./state.js";
import { thesisKey } from "./thesis.js";
import { CoinRithmClient } from "./client.js";
import { Provider } from "./providers.js";
import type { PositionThesis } from "./types.js";

const okData = (data: unknown) => ({ ok: true, status: 200, data });
const minutesAgo = (m: number) =>
  new Date(Date.now() - m * 60_000).toISOString();

// REAL /positions/futures row shape (nested coin, per-position prices, openedAt).
const heldBtc = (over: Record<string, unknown> = {}) => ({
  id: 52,
  status: "open",
  coin: { ucid: "1", symbol: "BTC", name: "Bitcoin" },
  side: "long",
  leverage: 2,
  entryPrice: 67000,
  marginMusd: 2000,
  liquidationPrice: 33500,
  stopLossPrice: 60000,
  takeProfitPrice: 71000,
  markPrice: 67500,
  unrealizedPnlMusd: 15,
  openedAt: minutesAgo(30),
  ...over,
});

function baseClient(over: Record<string, unknown> = {}) {
  return {
    me: async () => okData({ scopes: ["read", "trade:futures", "trade:pm"] }),
    portfolio: async () =>
      okData({ equity: { totalUsd: 50000, availableUsd: 10000 } }),
    wallet: async () => okData({ usdt: { available: 10000 } }),
    futuresPositions: async () => okData({ positions: [] }),
    trades: async () =>
      okData({ asOf: "2026-09-02T12:00:00.000Z", trades: [] }),
    resolve: async (q: string) =>
      okData({ match: { coinId: "1", slug: "bitcoin", name: q } }),
    market: async () =>
      okData({
        price: { usd: 67000, change1h: 1, change24h: 2 },
        observation: { freshness: { status: "fresh" } },
      }),
    futuresQuote: vi.fn(async () =>
      okData({
        eligible: true,
        entryPrice: 67000,
        liquidationPrice: 60000,
        observation: { freshness: { status: "fresh" } },
      }),
    ),
    // REAL /futures/open envelope: { position: {...} } (201 new / 200 add).
    openFutures: vi.fn(async () =>
      okData({
        position: {
          id: 99,
          status: "open",
          side: "long",
          entryPrice: 67000,
          openedAt: "2026-09-02T10:00:00.000Z",
        },
      }),
    ),
    closeFutures: vi.fn(async () =>
      okData({ position: { id: 52, status: "closed", realizedPnlMusd: -20 } }),
    ),
    setFuturesSlTp: vi.fn(async () => okData({})),
    openOrders: async () => okData({ orders: [] }),
    pmPositions: async () => okData({ positions: [] }),
    discoverPmMarkets: async () =>
      okData({
        data: [
          {
            source: "polymarket",
            slug: "btc-above-80k",
            title: "BTC above 80k by Dec?",
            endDate: "2026-12-31T00:00:00.000Z",
            freshness: { status: "fresh" },
            volume24h: 999,
            liquidity: 12345.6,
            outcomes: [
              { externalMarketId: "12345", name: "Yes", probability: 42 },
            ],
          },
        ],
      }),
    pmQuote: vi.fn(async () =>
      okData({
        eligible: true,
        observation: { freshness: { status: "fresh" } },
      }),
    ),
    // REAL /pm/open envelope.
    openPmPosition: vi.fn(async () =>
      okData({
        position: {
          id: 9,
          status: "open",
          side: "yes",
          entryProbability: 42,
          openedAt: "2026-09-02T11:00:00.000Z",
        },
      }),
    ),
    exportRunEvidence: vi.fn(async () => okData({})),
    ...over,
  };
}

// A provider that captures the user prompt it was shown and answers `skip`.
function capturingProvider(): Provider & { user: () => string } {
  let captured = "";
  return {
    label: "capture",
    user: () => captured,
    decide: async ({ user }) => {
      captured = user;
      return { ok: true, text: JSON.stringify({ decision: "skip" }) };
    },
  };
}

function provider(decision: unknown): Provider {
  return {
    label: "fake",
    decide: async () => ({ ok: true, text: JSON.stringify(decision) }),
  };
}

function deps(
  over: Partial<RunnerDeps>,
  client = baseClient(),
  prov: Provider = capturingProvider(),
): RunnerDeps {
  const spec = parseSkill(renderFolderOfOne("a", "conservative")).spec;
  spec.triggerPolicy = {
    mode: "always",
    skipLlmWhenNoTrigger: false,
    alwaysManageOpenPositions: true,
    maxLlmCallsPerHour: 0,
    debounceMinutes: 0,
    pmEvalCooldownMinutes: 0,
  };
  return {
    client: client as unknown as CoinRithmClient,
    provider: prov,
    spec,
    mergedProse: "strategy",
    state: newState("run-1"),
    live: false,
    ...over,
  };
}

const btcThesis = (over: Partial<PositionThesis> = {}): PositionThesis => ({
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

const OPEN_WITH_THESIS = {
  decision: "act",
  confidence: 0.8,
  actions: [
    {
      type: "futures_open",
      symbol: "BTC",
      side: "long",
      leverage: 2,
      marginMusd: 50,
      stopLossPrice: 60000,
      confidence: 0.8,
      thesis: {
        summary: "Momentum agrees on both timescales, pullback entry",
        // priceAbove is wrong-side for a long; 5 minutes is below the floor.
        invalidation: {
          priceBelow: 60500,
          priceAbove: 70000,
          maxHoldMinutes: 5,
        },
      },
    },
  ],
};

describe("runCycle: thesis binding on open", () => {
  it("open-with-thesis: a live futures_open binds its sanitized thesis to the returned position id", async () => {
    const client = baseClient();
    const logs: string[] = [];
    const d = deps(
      { live: true, log: (l) => logs.push(l) },
      client,
      provider(OPEN_WITH_THESIS),
    );
    const r = await runCycle(d);
    expect(r.planned[0].executed).toBe(true);
    const bound = d.state.theses?.[thesisKey("futures", 99)];
    expect(bound).toBeDefined();
    expect(bound).toMatchObject({
      venue: "futures",
      positionId: 99,
      symbol: "BTC",
      side: "long",
      entryPrice: 67000,
      openedAt: "2026-09-02T10:00:00.000Z", // the server's clock, not ours
      summary: "Momentum agrees on both timescales, pullback entry",
    });
    expect(bound?.invalidation).toEqual({
      priceBelow: 60500,
      maxHoldMinutes: 60,
    });
    expect(logs.some((l) => /thesis bound to futures:99/.test(l))).toBe(true);
    expect(logs.some((l) => /dropped priceAbove/.test(l))).toBe(true);
    // The journal remembers WHY the position exists.
    expect(d.state.journal?.at(-1)?.did).toMatch(/on thesis: Momentum agrees/);
  });

  it("an open without a thesis still executes; the gap is logged, nothing is invented", async () => {
    const client = baseClient();
    const logs: string[] = [];
    const noThesis = {
      ...OPEN_WITH_THESIS,
      actions: [{ ...OPEN_WITH_THESIS.actions[0], thesis: undefined }],
    };
    const d = deps(
      { live: true, log: (l) => logs.push(l) },
      client,
      provider(noThesis),
    );
    const r = await runCycle(d);
    expect(r.planned[0].executed).toBe(true);
    expect(d.state.theses).toBeUndefined();
    expect(logs.some((l) => /none stated for futures:99/.test(l))).toBe(true);
  });

  it("an add to a held position that already carries a thesis keeps the ORIGINAL", async () => {
    // Held #99 is a WINNER with room (the duplicate_intent guard allows a
    // scale-in) and the add carries no SL/TP (the server rejects those on an
    // add), so the open executes and the server answers with position 99.
    const client = baseClient({
      futuresPositions: async () =>
        okData({
          positions: [
            heldBtc({ id: 99, marginMusd: 50, unrealizedPnlMusd: 40 }),
          ],
        }),
    });
    const logs: string[] = [];
    const add = {
      ...OPEN_WITH_THESIS,
      actions: [
        {
          ...OPEN_WITH_THESIS.actions[0],
          stopLossPrice: undefined,
          thesis: {
            summary: "LOOSER RESTATEMENT",
            invalidation: { priceBelow: 50000 },
          },
        },
      ],
    };
    const d = deps(
      { live: true, log: (l) => logs.push(l) },
      client,
      provider(add),
    );
    d.spec.risk.requireStopLoss = false;
    d.spec.risk.maxConcurrentPositions = 3;
    d.spec.limits.maxOpenMarginMusd = 100000;
    d.state.theses = {
      [thesisKey("futures", 99)]: btcThesis({
        positionId: 99,
        summary: "ORIGINAL",
      }),
    };
    const r = await runCycle(d);
    expect(r.planned.at(-1)?.executed).toBe(true);
    expect(d.state.theses?.["futures:99"]?.summary).toBe("ORIGINAL");
    expect(d.state.theses?.["futures:99"]?.invalidation.priceBelow).toBe(64000);
    expect(logs.some((l) => /keeps its original thesis/.test(l))).toBe(true);
  });

  it("PM: a live pm_open binds a thesis keyed to the returned PM position, side-aware", async () => {
    const client = baseClient();
    const d = deps(
      { live: true },
      client,
      provider({
        decision: "act",
        confidence: 0.8,
        actions: [
          {
            type: "pm_open",
            ref: "pm1",
            stakeMusd: 20,
            confidence: 0.8,
            thesis: {
              summary: "market underprices the catalyst",
              invalidation: { probabilityBelow: 30, probabilityAbove: 70 },
            },
          },
        ],
      }),
    );
    d.spec.venues = ["futures", "pm"];
    const r = await runCycle(d);
    expect(r.planned[0].executed).toBe(true);
    expect(d.state.theses?.[thesisKey("pm", 9)]).toMatchObject({
      venue: "pm",
      positionId: 9,
      side: "yes",
      source: "polymarket",
      slug: "btc-above-80k",
      outcomeExternalMarketId: "12345",
      entryProbability: 42,
      invalidation: { probabilityBelow: 30 }, // probabilityAbove dropped for a YES
    });
  });
});

describe("runCycle: thesis evaluation and exits", () => {
  it("hold-while-valid: an intact thesis is shown to the model and nothing is closed", async () => {
    const client = baseClient({
      futuresPositions: async () => okData({ positions: [heldBtc()] }),
    });
    const prov = capturingProvider();
    const d = deps({ live: true }, client, prov);
    d.state.theses = { [thesisKey("futures", 52)]: btcThesis() };
    const r = await runCycle(d);
    expect(client.closeFutures).not.toHaveBeenCalled();
    expect(r.planned).toEqual([]);
    expect(prov.user()).toContain('"status":"intact"');
    expect(prov.user()).toContain('"holdMinutes":30');
    expect(prov.user()).not.toContain("INVALIDATED this cycle");
    expect(d.state.theses?.["futures:52"]).toBeDefined();
  });

  it("exit-on-invalidation (live): a breached price level closes the position BEFORE the model runs", async () => {
    const client = baseClient({
      futuresPositions: async () =>
        okData({
          positions: [heldBtc({ markPrice: 63900, unrealizedPnlMusd: -90 })],
        }),
    });
    const prov = capturingProvider();
    const logs: string[] = [];
    const d = deps({ live: true, log: (l) => logs.push(l) }, client, prov);
    d.state.theses = { [thesisKey("futures", 52)]: btcThesis() };
    const r = await runCycle(d);
    expect(client.closeFutures).toHaveBeenCalledTimes(1);
    expect(client.closeFutures.mock.calls[0][0]).toMatchObject({
      positionId: 52,
      idempotencyKey: expect.stringContaining("close:52:full"),
      agentTrace: expect.objectContaining({
        rationaleSummary: expect.stringMatching(
          /Thesis exit: .*priceBelow 64000/,
        ),
        observationHash: expect.stringMatching(/^sha256:/),
      }),
    });
    // The exit rides in the cycle result even though the model chose skip.
    expect(r.decision).toBe("skip");
    expect(r.planned).toHaveLength(1);
    expect(r.planned[0]).toMatchObject({
      accepted: true,
      executed: true,
      code: "thesis_invalidated",
      action: { type: "futures_close", positionId: 52 },
    });
    // State: thesis forgotten, write counted, journal remembers the exit.
    expect(d.state.theses?.["futures:52"]).toBeUndefined();
    expect(d.state.writesToday).toBe(1);
    expect(d.state.journal?.at(-1)?.did).toMatch(
      /thesis exit: closed long BTC pos#52/,
    );
    expect(d.state.intentSeq["close:52:full"]).toBe(1);
    // The model saw the book AFTER the exit: no position left to manage.
    expect(prov.user()).toContain("You currently hold NO open positions");
    expect(prov.user()).not.toContain('"id":52');
    expect(
      logs.some((l) => /executed thesis exit on long BTC pos#52/.test(l)),
    ).toBe(true);
  });

  it("exit on the time stop: a stale idea is closed even with the price fine", async () => {
    const client = baseClient({
      futuresPositions: async () =>
        okData({ positions: [heldBtc({ openedAt: minutesAgo(300) })] }),
    });
    const d = deps({ live: true }, client);
    d.state.theses = { [thesisKey("futures", 52)]: btcThesis() };
    const r = await runCycle(d);
    expect(client.closeFutures).toHaveBeenCalledTimes(1);
    expect(r.planned[0].reason).toMatch(/time stop 240m/);
  });

  it("dry-run: the exit is planned, never written, and the model still sees the broken thesis", async () => {
    const client = baseClient({
      futuresPositions: async () =>
        okData({ positions: [heldBtc({ markPrice: 63900 })] }),
    });
    const prov = capturingProvider();
    const d = deps({ live: false }, client, prov);
    d.state.theses = { [thesisKey("futures", 52)]: btcThesis() };
    const r = await runCycle(d);
    expect(client.closeFutures).not.toHaveBeenCalled();
    expect(r.planned[0]).toMatchObject({
      accepted: true,
      executed: false,
      code: "thesis_invalidated",
    });
    expect(d.state.theses?.["futures:52"]).toBeDefined();
    expect(prov.user()).toContain(
      "## Positions whose thesis is INVALIDATED this cycle",
    );
    expect(prov.user()).toMatch(
      /futures pos#52 long BTC: .*close it with futures_close/,
    );
    expect(prov.user()).toContain('"status":"invalidated"');
  });

  it("a failed live close keeps the thesis (and the position) for next cycle", async () => {
    const client = baseClient({
      futuresPositions: async () =>
        okData({ positions: [heldBtc({ markPrice: 63900 })] }),
      closeFutures: vi.fn(async () => ({
        ok: false,
        status: 503,
        data: { error: "contention" },
      })),
    });
    const d = deps({ live: true }, client);
    d.state.theses = { [thesisKey("futures", 52)]: btcThesis() };
    const r = await runCycle(d);
    expect(r.planned[0]).toMatchObject({
      code: "thesis_invalidated",
      executed: false,
    });
    expect(d.state.theses?.["futures:52"]).toBeDefined();
    expect(d.state.intentSeq["close:52:full"]).toBeUndefined(); // key replays next cycle
  });

  it("PM: an invalidated PM thesis is surfaced to the model, never closed", async () => {
    const client = baseClient({
      // REAL /positions/pm row shape (eventSlug, nested outcome, currentProbability).
      pmPositions: async () =>
        okData({
          positions: [
            {
              id: 7,
              status: "open",
              source: "polymarket",
              eventSlug: "btc-above-80k",
              eventTitle: "BTC above 80k by Dec?",
              outcome: { externalMarketId: "12345", label: "Yes" },
              side: "yes",
              stakeMusd: 500,
              entryProbability: 42,
              currentProbability: 30,
              unrealizedPnl: -140,
              openedAt: minutesAgo(90),
            },
          ],
        }),
    });
    const prov = capturingProvider();
    const d = deps({ live: true }, client, prov);
    d.spec.venues = ["futures", "pm"];
    d.state.theses = {
      [thesisKey("pm", 7)]: {
        summary: "market underprices the catalyst",
        invalidation: { probabilityBelow: 35 },
        venue: "pm",
        positionId: 7,
        side: "yes",
        openedAt: minutesAgo(90),
        entryProbability: 42,
      },
    };
    const r = await runCycle(d);
    expect(client.closeFutures).not.toHaveBeenCalled();
    expect(r.planned).toEqual([]);
    expect(prov.user()).toMatch(
      /PM pos#7 "BTC above 80k by Dec\?": .*do NOT add/,
    );
    expect(prov.user()).toContain('"currentProbability":30');
    expect(d.state.theses?.["pm:7"]).toBeDefined(); // surfaced, not forgotten
  });

  it("a thesis whose position is gone is pruned from the state", async () => {
    const d = deps({ live: true }, baseClient());
    d.state.theses = { [thesisKey("futures", 52)]: btcThesis() }; // no such position
    await runCycle(d);
    expect(d.state.theses?.["futures:52"]).toBeUndefined();
  });

  it("a tripped kill-switch never runs a thesis exit (disabled agents do not act)", async () => {
    const client = baseClient({
      futuresPositions: vi.fn(async () =>
        okData({ positions: [heldBtc({ markPrice: 63900 })] }),
      ),
    });
    const d = deps({ live: true }, client);
    d.spec.killSwitch.maxConsecutiveRejects = 1;
    d.state.consecutiveRejectCycles = 5;
    d.state.theses = { [thesisKey("futures", 52)]: btcThesis() };
    const r = await runCycle(d);
    expect(r.disabled).toBe(true);
    expect(client.closeFutures).not.toHaveBeenCalled();
    expect(client.futuresPositions).not.toHaveBeenCalled();
  });
});
