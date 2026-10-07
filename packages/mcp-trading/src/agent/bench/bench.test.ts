import { describe, expect, it, vi } from "vitest";
import {
  actionKey,
  BASELINE_MARKET,
  BASELINE_SKIP,
  runBench,
  withReplayClock,
} from "./bench.js";
import {
  recordCassette,
  RecordingClient,
  ResponseRecorder,
} from "./recordingClient.js";
import type { Cassette } from "./cassette.js";
import { parseSkill } from "../skill.js";
import { renderFolderOfOne } from "../templates.js";
import type { Provider } from "../providers.js";
import type { AgentSpec } from "../types.js";

// Fake CoinRithm API serving the REAL response shapes observe() reads (see
// runner.test.ts / observe.test.ts fakes): one Bitcoin PM event whose "Yes"
// outcome trades at 10 points.
const EVENT = {
  source: "polymarket",
  slug: "bitcoin-above-150k-by-december",
  title: "Will Bitcoin reach $150k by December?",
  freshness: { status: "fresh" },
  volume24h: 50000,
  outcomes: [{ externalMarketId: "0xabc123", name: "Yes", probability: 10 }],
};

function fakeApi(asOf: string) {
  const routes: Record<string, unknown> = {
    "/api/agent/me": { scopes: ["read", "trade:pm"] },
    "/api/agent/portfolio": { equity: { totalUsd: 1000, availableUsd: 1000 } },
    "/api/agent/wallet": { usdt: { available: 1000 } },
    "/api/agent/positions/futures": { positions: [] },
    "/api/agent/trades": { asOf, trades: [] },
    "/api/agent/resolve": {
      match: { coinId: "1", name: "Bitcoin", slug: "bitcoin" },
    },
    "/api/agent/market/1": {
      price: { usd: 62000, change1h: 0.1, change24h: 1 },
      observation: { freshness: { status: "fresh" } },
    },
    "/api/agent/positions/pm": { positions: [], recentlyResolved: [] },
    "/api/agent/pm/discover": { data: [EVENT] },
    "/api/agent/performance": {},
  };
  const seen: string[] = [];
  const fetchFn = vi.fn(async (input: unknown, init?: { method?: string }) => {
    const url = new URL(String(input));
    seen.push(`${init?.method ?? "GET"} ${url.pathname}`);
    const body = routes[url.pathname];
    return body === undefined
      ? new Response(JSON.stringify({ error: "not_found" }), { status: 404 })
      : new Response(JSON.stringify(body), { status: 200 });
  });
  return { fetchFn: fetchFn as unknown as typeof fetch, seen };
}

function pmSpec(floor?: number, watch = "BTC"): AgentSpec {
  const spec = parseSkill(
    renderFolderOfOne("bench-agent", "conservative"),
  ).spec;
  spec.venues = ["pm"];
  spec.capabilities = [];
  spec.risk.watchlist = [watch];
  spec.risk.perTradeMarginMusd = 100;
  if (floor !== undefined) spec.risk.pmMinEntryProbabilityPct = floor;
  spec.triggerPolicy = {
    mode: "always",
    skipLlmWhenNoTrigger: false,
    alwaysManageOpenPositions: true,
    maxLlmCallsPerHour: 0,
    debounceMinutes: 0,
    pmEvalCooldownMinutes: 0,
  };
  return spec;
}

// Deterministic fake brain: always the same pm_open on the 10-point outcome.
function proposePm(): Provider {
  return {
    label: "fake",
    decide: async () => ({
      ok: true,
      text: JSON.stringify({
        decision: "act",
        confidence: 0.9,
        actions: [
          {
            type: "pm_open",
            ref: "pm1",
            stakeMusd: 10,
            forecastProbability: 30,
            confidence: 0.9,
          },
        ],
      }),
    }),
  };
}

const ASOFS = [
  "2026-10-07T10:00:00.000Z",
  "2026-10-07T11:00:00.000Z",
  "2026-10-07T12:00:00.000Z",
];

async function corpus(): Promise<Cassette[]> {
  const out: Cassette[] = [];
  for (const asOf of ASOFS) {
    const api = fakeApi(asOf);
    const clock = vi.spyOn(Date, "now").mockReturnValue(Date.parse(asOf));
    try {
      out.push(
        await recordCassette({
          spec: pmSpec(),
          mergedProse: "strategy",
          apiKey: "fixture-key",
          fetchFn: api.fetchFn,
        }),
      );
    } finally {
      clock.mockRestore();
    }
  }
  return out;
}

type Json = Record<string, any>;

describe("recording", () => {
  it("records every read, refuses every write, and never calls a model", async () => {
    const api = fakeApi(ASOFS[0]);
    const c = await recordCassette({
      spec: { ...pmSpec(), model: { provider: "anthropic", name: "x" } },
      mergedProse: "strategy",
      apiKey: "fixture-key",
      fetchFn: api.fetchFn,
    });
    // Only GETs ever reached the transport.
    expect(api.seen.every((s) => s.startsWith("GET "))).toBe(true);
    // The market-implied pass asked for a quote: refused, never forwarded.
    expect(c.refusedRequests).toEqual(["POST /api/agent/pm/quote"]);
    expect(c.marketBaselineRecorded).toBe(true);
    expect(c.asOf).toBe(c.recordedAt);
    expect(Date.parse(c.asOf)).toBe(c.clockMs);
    expect(c.id).toMatch(/^[0-9TZ-]+-[0-9a-f]{12}$/);
    expect(c.agentSpecHash).toMatch(/^sha256:/);
    // The recording brain skips without any model call.
    expect(c.recordCycle).toEqual({
      decision: "skip",
      decisionType: "skip",
      skipReason: "bench_no_model",
    });
    const keys = c.responses.map((r) => r.key);
    expect(keys).toEqual([...keys].sort());
    expect(keys).toEqual(
      expect.arrayContaining([
        "GET /api/agent/me",
        "GET /api/agent/trades?limit=1&venue=futures",
        "GET /api/agent/resolve?q=BTC",
        "GET /api/agent/pm/discover?limit=30&q=Bitcoin",
        // The uncurated board only the mechanical baseline reads.
        "GET /api/agent/pm/discover?limit=12&q=Bitcoin",
        "GET /api/agent/performance",
      ]),
    );
    expect(JSON.stringify(c)).not.toContain("fixture-key");
  });

  it("refuses a Request object's POST without forwarding it", async () => {
    const inner = vi.fn(async () => new Response("{}"));
    const recorder = new ResponseRecorder(inner as typeof fetch, "");
    const response = await recorder.fetch(
      new Request("https://api.example.test/api/agent/pm/open", {
        method: "POST",
        body: "{}",
      }),
    );
    expect(response.status).toBe(599);
    expect(inner).not.toHaveBeenCalled();
    expect(recorder.refused).toEqual(["POST /api/agent/pm/open"]);
  });

  it("starts scoring after baseline-only reads, never at the earlier trades cursor", async () => {
    let now = Date.parse(ASOFS[0]);
    const clock = vi.spyOn(Date, "now").mockImplementation(() => now);
    const api = fakeApi(ASOFS[0]);
    try {
      const c = await recordCassette({
        spec: pmSpec(),
        mergedProse: "strategy",
        apiKey: "fixture-key",
        fetchFn: (async (input, init) => {
          now += 1000;
          return api.fetchFn(input, init);
        }) as typeof fetch,
      });
      expect(c.marketBaselineRecorded).toBe(true);
      expect(c.clockMs).toBe(now);
      expect(c.asOf).toBe(new Date(now).toISOString());
      expect(Date.parse(c.asOf)).toBeGreaterThan(Date.parse(ASOFS[0]));
    } finally {
      clock.mockRestore();
    }
  });

  it("records a transport failure and keeps the first pass's answers", async () => {
    let calls = 0;
    const flaky = vi.fn(async () => {
      calls += 1;
      if (calls === 1) throw new TypeError("socket hang up");
      return new Response(JSON.stringify({ n: calls }), { status: 200 });
    });
    const client = new RecordingClient({
      apiKey: "k",
      baseUrl: "https://api.example.test/base/",
      fetchFn: flaky as unknown as typeof fetch,
    });
    expect(await client.me()).toMatchObject({ ok: false, status: 0 });
    client.recorder.freeze();
    expect(await client.me()).toMatchObject({ ok: true, data: { n: 2 } });
    expect(await client.portfolio()).toMatchObject({ ok: true });
    expect(client.recorder.responses()).toEqual([
      expect.objectContaining({
        key: "GET /api/agent/me",
        status: 0,
        transportError: true,
      }),
      expect.objectContaining({
        key: "GET /api/agent/portfolio",
        data: { n: 3 },
      }),
    ]);
  });
});

describe("runBench", () => {
  it("A/B: a pure code dial changes the trade set deterministically across repeats", async () => {
    const cassettes = await corpus();
    const report = (await runBench({
      cassettes,
      repeats: 3,
      variants: [
        {
          name: "a",
          spec: pmSpec(20),
          mergedProse: "strategy",
          provider: proposePm(),
        },
        {
          name: "b",
          spec: pmSpec(5),
          mergedProse: "strategy",
          provider: proposePm(),
        },
      ],
    })) as Json;

    const a = report.variants.a.all;
    const b = report.variants.b.all;
    expect(a.cycles).toBe(9);
    expect(a.actions).toEqual({
      proposed: 9,
      accepted: 0,
      rejected: 9,
      rejectCodes: { pm_entry_below_floor: 9 },
    });
    expect(b.actions).toEqual({
      proposed: 9,
      accepted: 9,
      rejected: 0,
      rejectCodes: {},
    });
    expect(a.repeatConsistency).toBe(1);
    expect(b.repeatConsistency).toBe(1);
    expect(a.cyclesWithMissingInputs).toBe(0);
    expect(b.cyclesWithMissingInputs).toBe(0);
    expect(b.synthesizedQuotes).toBe(9);
    expect(b.labelled.unlabelledOpens).toBe(9);
    expect(b.pnlExcludedCycles).toBe(9);

    const ab = report.comparisons.find((c: Json) => c.a === "a" && c.b === "b");
    expect(ab.all.metrics.labelledPnlMusd).toMatchObject({
      n: 0,
      meanDiff: null,
      ci95: null,
    });
    expect(ab.all.actionOverlapJaccard).toBe(0);
    expect(ab.all.metrics.acceptedActions).toMatchObject({
      n: 3,
      meanA: 0,
      meanB: 1,
      meanDiff: -1,
      ci95: [-1, -1],
      excludesZero: true,
    });
    // Chronological split: 70% of 3 cassettes -> 2 tune, 1 holdout.
    expect(report.corpus.split.tune).toHaveLength(2);
    expect(report.corpus.split.holdout).toEqual([cassettes[2].id]);
    expect(ab.holdout.pairedCassettes).toBe(1);
    // A deterministic brain has no repeat noise: the calibrated null is 0.
    expect(
      report.variants.a.nullCalibration.metrics.acceptedActions,
    ).toMatchObject({ falsePositiveRate: 0, usableCassettes: 3 });

    // Baselines ran on the same inputs.
    expect(report.variants[BASELINE_SKIP].all.actions.proposed).toBe(0);
    const market = report.variants[BASELINE_MARKET].all;
    expect(market.cycles).toBe(3);
    expect(market.actions.accepted).toBe(3);
    expect(market.cyclesWithMissingInputs).toBe(0);
    expect(report.assumptions.pmFee.constant).toBe(
      "PM_SYNTHETIC_FEE_RATE_AT_MID",
    );
    expect(report.contentHash).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  it("A/A: identical variants differ by nothing, and the report hash is stable", async () => {
    const cassettes = await corpus();
    const run = async () =>
      (await runBench({
        cassettes,
        repeats: 2,
        variants: [
          {
            name: "a",
            spec: pmSpec(20),
            mergedProse: "strategy",
            provider: proposePm(),
          },
          {
            name: "a2",
            spec: pmSpec(20),
            mergedProse: "strategy",
            provider: proposePm(),
          },
        ],
      })) as Json;
    const first = await run();
    const second = await run();
    expect(second.contentHash).toBe(first.contentHash);
    const aa = first.comparisons.find((c: Json) => c.a === "a" && c.b === "a2");
    expect(aa.all.actionOverlapJaccard).toBe(1);
    for (const metric of Object.values(aa.all.metrics) as Json[]) {
      if (metric.n === 0) continue;
      expect(metric.meanDiff).toBe(0);
      expect(metric.ci95).toEqual([0, 0]);
      expect(metric.excludesZero).toBe(false);
    }
  });

  it("scores labelled opens and compares them with the market baseline", async () => {
    const cassettes = await corpus();
    const labels = Object.fromEntries(
      cassettes.map((c) => [
        c.id,
        {
          pm: {
            "polymarket/bitcoin-above-150k-by-december/0xabc123": {
              settled: 0 as const,
            },
          },
        },
      ]),
    );
    const report = (await runBench({
      cassettes,
      labels,
      repeats: 1,
      variants: [
        { name: "b", spec: pmSpec(5), mergedProse: "s", provider: proposePm() },
      ],
    })) as Json;
    const b = report.variants.b.all.labelled;
    expect(b.pmOpens).toBe(3);
    expect(b.pmBrierMean).toBeCloseTo(0.09, 9);
    expect(b.pmMarketBrierMean).toBeCloseTo(0.01, 9);
    expect(b.pmReturnOnStakeMean).toBe(-1);
    expect(b.labelledPnlMusd).toBe(-30);
    const market = report.variants[BASELINE_MARKET].all.labelled;
    expect(market.pmBrierMean).toBeCloseTo(0.01, 9);
    // Not trading beat trading here: skip made 0, b lost 10 per cassette.
    const vsSkip = report.comparisons.find(
      (c: Json) => c.a === "b" && c.b === BASELINE_SKIP,
    );
    expect(vsSkip.all.metrics.labelledPnlMusd.meanDiff).toBe(-10);
    expect(report.variants.b.nullCalibration).toBeNull();
  });

  it("reports missing inputs instead of filling them, and keeps crashes as results", async () => {
    const cassettes = (await corpus()).slice(0, 1);
    const crash: Provider = {
      label: "crash",
      decide: async () => {
        throw new Error("boom");
      },
    };
    const report = (await runBench({
      cassettes,
      repeats: 1,
      baselines: false,
      variants: [
        {
          name: "eth",
          spec: pmSpec(5, "ETH"),
          mergedProse: "s",
          provider: proposePm(),
        },
        { name: "crash", spec: pmSpec(5), mergedProse: "s", provider: crash },
      ],
    })) as Json;
    const eth = report.variants.eth.all;
    expect(eth.cyclesWithMissingInputs).toBe(1);
    expect(eth.missingInputKeys).toEqual(
      expect.arrayContaining([
        "GET /api/agent/resolve?q=ETH",
        "GET /api/agent/pm/discover?limit=30&q=Ethereum",
      ]),
    );
    // Like production, observe fell back to the (recorded) Bitcoin board.
    expect(eth.missingInputKeys).not.toContain(
      "GET /api/agent/pm/discover?limit=30&q=Bitcoin",
    );
    const crashed = report.variants.crash.all;
    expect(crashed.runtimeErrors).toBe(1);
    expect(crashed.decisionMix.runtime_error).toBe(1);
    expect(report.variants[BASELINE_SKIP]).toBeUndefined();
    const row = report.cycles.find((r: Json) => r.variant === "crash");
    expect(row.runtimeError).toBe("boom");
  });

  it("validates its options", async () => {
    const cassettes = (await corpus()).slice(0, 1);
    const v = {
      name: "a",
      spec: pmSpec(),
      mergedProse: "",
      provider: proposePm(),
    };
    await expect(
      runBench({ cassettes, variants: [v], repeats: 0 }),
    ).rejects.toThrow(/repeats/);
    await expect(runBench({ cassettes, variants: [] })).rejects.toThrow(
      /at least one variant/,
    );
    await expect(
      runBench({ cassettes, variants: [{ ...v, name: "baseline:x" }] }),
    ).rejects.toThrow(/variant name/);
    await expect(runBench({ cassettes, variants: [v, v] })).rejects.toThrow(
      /duplicate/,
    );
    await expect(runBench({ cassettes: [], variants: [v] })).rejects.toThrow(
      /no cassettes/,
    );
  });
});

describe("bench helpers", () => {
  it("keys actions by what was done, not how much", () => {
    expect(
      actionKey({
        type: "pm_open",
        source: "PolyMarket",
        slug: "Slug",
        outcomeExternalMarketId: "0xA",
        stakeMusd: 10,
      }),
    ).toBe("pm_open:polymarket/slug/0xA");
    expect(
      actionKey({
        type: "futures_open",
        symbol: "btc",
        side: "long",
        leverage: 2,
        marginMusd: 5,
      }),
    ).toBe("futures_open:BTC:long");
    expect(actionKey({ type: "futures_close", positionId: 4 })).toBe(
      "futures_close:4",
    );
    expect(actionKey({ type: "futures_set_sltp", positionId: 4 })).toBe(
      "futures_set_sltp:4",
    );
    expect(
      actionKey({
        type: "spot_order",
        symbol: "eth",
        side: "buy",
        orderType: "limit",
        quantity: 1,
      }),
    ).toBe("spot_order:ETH:buy:limit");
    expect(actionKey({ type: "spot_cancel", orderId: 7 })).toBe(
      "spot_cancel:7",
    );
  });

  it("shifts Date.now to the recording clock and always restores it", async () => {
    const real = Date.now;
    const seen = await withReplayClock(1_000_000, async () => Date.now());
    expect(seen).toBeGreaterThanOrEqual(1_000_000);
    expect(seen).toBeLessThan(1_000_000 + 60_000);
    expect(Date.now).toBe(real);
    await expect(
      withReplayClock(5, async () => {
        throw new Error("x");
      }),
    ).rejects.toThrow("x");
    expect(Date.now).toBe(real);
  });
});
