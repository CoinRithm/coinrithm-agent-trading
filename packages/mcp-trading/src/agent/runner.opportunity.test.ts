import { describe, it, expect, vi, afterEach } from "vitest";
import {
  runCycle,
  RunnerDeps,
  buildSkipOpportunity,
  agentOpportunityCaptureEnabled,
} from "./runner.js";
import type { Decision, PmMarket } from "./types.js";
import { parseSkill } from "./skill.js";
import { renderFolderOfOne } from "./templates.js";
import { newState } from "./state.js";
import { CoinRithmClient } from "./client.js";
import { Provider } from "./providers.js";

const okData = (data: unknown) => ({ ok: true, status: 200, data });
const failData = (status: number, data: unknown) => ({
  ok: false,
  status,
  data,
});

// A PM-focused client: two discovered markets + a spy on reportPmOpportunity.
function pmClient(over: Record<string, unknown> = {}) {
  return {
    me: async () => okData({ scopes: ["read", "trade:pm"] }),
    portfolio: async () =>
      okData({ equity: { totalUsd: 50000, availableUsd: 1000 } }),
    wallet: async () => okData({ usdt: { available: 1000 } }),
    futuresPositions: async () => okData({ positions: [] }),
    openOrders: async () => okData({ orders: [] }),
    trades: async () => okData({ asOf: "T1", trades: [] }),
    resolve: async (q: string) => okData({ match: { coinId: "1", name: q } }),
    market: async () =>
      okData({
        price: { usd: 1 },
        observation: { freshness: { status: "fresh" } },
      }),
    pmPositions: async () => okData({ positions: [] }),
    discoverPmMarkets: async () =>
      okData({
        data: [
          {
            source: "kalshi",
            slug: "btc-up",
            title: "BTC up?",
            freshness: { status: "fresh" },
            outcomes: [
              { externalMarketId: "yes-1", name: "Yes", probability: 0.6 },
            ],
          },
          {
            source: "polymarket",
            slug: "eth-up",
            title: "ETH up?",
            freshness: { status: "fresh" },
            outcomes: [
              { externalMarketId: "yes-2", name: "Yes", probability: 0.4 },
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
    openPmPosition: vi.fn(async () => okData({ position: { id: 9 } })),
    reportPmOpportunity: vi.fn(async () =>
      okData({ decisionUuid: "u", opportunityKind: "abstained" }),
    ),
    exportRunEvidence: vi.fn(async () => okData({})),
    ...over,
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
  client = pmClient(),
  prov = provider({ decision: "skip", reason: "no edge" }),
): RunnerDeps {
  const spec = parseSkill(renderFolderOfOne("a", "conservative")).spec;
  spec.venues = ["pm"];
  spec.risk.perTradeMarginMusd = 100;
  spec.abstention.minConfidence = 0;
  spec.limits.maxWritesPerCycle = 5;
  spec.limits.maxTradesPerDay = 50;
  spec.objective = { primary: "calibration", secondary: [], horizon: "7d" };
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

afterEach(() => {
  delete process.env.AGENT_OPPORTUNITY_CAPTURE_ENABLED;
  vi.restoreAllMocks();
});

/* ------------------------- pure helpers ------------------------- */

const markets: PmMarket[] = [
  {
    source: "kalshi",
    slug: "btc-up",
    outcomeExternalMarketId: "yes-1",
    outcomeName: "Yes",
    probability: 0.6,
  },
  {
    source: "polymarket",
    slug: "eth-up",
    outcomeExternalMarketId: "yes-2",
    outcomeName: "Yes",
    probability: 0.4,
  },
];

const skip = (over: Partial<Decision> = {}): Decision => ({
  decision: "skip",
  reason: "no edge",
  actions: [],
  ...over,
});

describe("buildSkipOpportunity", () => {
  it("returns null when there is no PM universe to report on", () => {
    expect(buildSkipOpportunity(skip(), [], true)).toBeNull();
  });

  it("builds an abstained opportunity on the top market with the universe size", () => {
    const o = buildSkipOpportunity(skip(), markets, true);
    expect(o).toEqual({
      kind: "abstained",
      source: "kalshi",
      slug: "btc-up",
      outcomeExternalMarketId: "yes-1",
      universeSize: 2,
      marketProbability: 60, // 0.6 → points
      reasonCode: "no edge",
    });
  });

  it("becomes forecast_only when the decision carries a pm_open forecast", () => {
    const o = buildSkipOpportunity(
      skip({
        actions: [
          {
            type: "pm_open",
            source: "polymarket",
            slug: "eth-up",
            outcomeExternalMarketId: "yes-2",
            stakeMusd: 10,
            forecastProbability: 65,
          },
        ],
      }),
      markets,
      true,
    );
    expect(o?.kind).toBe("forecast_only");
    expect(o?.forecastProbability).toBe(65);
    expect(o?.slug).toBe("eth-up"); // subject = the forecasted market
    expect(o?.marketProbability).toBe(40);
    expect(o?.universeSize).toBe(2);
  });

  it("stays abstained when forecasting is disabled (forecast never leaks in)", () => {
    const o = buildSkipOpportunity(
      skip({
        actions: [
          {
            type: "pm_open",
            source: "polymarket",
            slug: "eth-up",
            outcomeExternalMarketId: "yes-2",
            stakeMusd: 10,
            forecastProbability: 65,
          },
        ],
      }),
      markets,
      false,
    );
    expect(o?.kind).toBe("abstained");
    expect(o?.forecastProbability).toBeUndefined();
  });
});

describe("agentOpportunityCaptureEnabled", () => {
  it("defaults ON and honors the kill-switch env", () => {
    delete process.env.AGENT_OPPORTUNITY_CAPTURE_ENABLED;
    expect(agentOpportunityCaptureEnabled()).toBe(true);
    for (const off of ["false", "0", "no", "off", "OFF"]) {
      process.env.AGENT_OPPORTUNITY_CAPTURE_ENABLED = off;
      expect(agentOpportunityCaptureEnabled()).toBe(false);
    }
    process.env.AGENT_OPPORTUNITY_CAPTURE_ENABLED = "true";
    expect(agentOpportunityCaptureEnabled()).toBe(true);
  });
});

/* ------------------------- runCycle integration ------------------------- */

describe("runCycle opportunity emission", () => {
  it("posts an abstained opportunity when the model skips while PM markets were listed (live)", async () => {
    const client = pmClient();
    const r = await runCycle(deps({ live: true }, client));
    expect(r.decision).toBe("skip");
    expect(client.reportPmOpportunity).toHaveBeenCalledTimes(1);
    const body = client.reportPmOpportunity.mock.calls[0][0];
    expect(body.kind).toBe("abstained");
    expect(body.source).toBe("kalshi");
    expect(body.cohort).toEqual({ universeSize: 2, horizon: "7d" });
    expect(body.decisionId).toBeTruthy();
    expect(r.opportunity?.kind).toBe("abstained");
  });

  it("never posts on a dry-run (dry-run never writes)", async () => {
    const client = pmClient();
    const r = await runCycle(deps({ live: false }, client));
    expect(client.reportPmOpportunity).not.toHaveBeenCalled();
    expect(r.opportunity).toBeUndefined();
  });

  it("never posts when the capture kill-switch is off", async () => {
    process.env.AGENT_OPPORTUNITY_CAPTURE_ENABLED = "false";
    const client = pmClient();
    const r = await runCycle(deps({ live: true }, client));
    expect(client.reportPmOpportunity).not.toHaveBeenCalled();
    expect(r.opportunity).toBeUndefined();
  });

  it("does not post when there were no PM markets to weigh", async () => {
    const client = pmClient({
      discoverPmMarkets: async () => okData({ data: [] }),
    });
    const r = await runCycle(deps({ live: true }, client));
    expect(client.reportPmOpportunity).not.toHaveBeenCalled();
    expect(r.opportunity).toBeUndefined();
  });

  it("posts a quote_expired opportunity when a validated pm_open is rejected 422 at act time", async () => {
    const client = pmClient({
      openPmPosition: vi.fn(async () =>
        failData(422, {
          error: "mock_entry_blocked",
          blockReasons: ["quote_dead"],
        }),
      ),
    });
    const act = {
      decision: "act",
      confidence: 0.9,
      actions: [
        {
          type: "pm_open",
          source: "kalshi",
          slug: "btc-up",
          outcomeExternalMarketId: "yes-1",
          stakeMusd: 15,
          confidence: 0.9,
        },
      ],
    };
    const r = await runCycle(deps({ live: true }, client, provider(act)));
    expect(client.openPmPosition).toHaveBeenCalledTimes(1);
    expect(client.reportPmOpportunity).toHaveBeenCalledTimes(1);
    const body = client.reportPmOpportunity.mock.calls[0][0];
    expect(body.kind).toBe("quote_expired");
    expect(body.source).toBe("kalshi");
    expect(body.reasonCode).toBe("quote_dead");
    expect(r.opportunity?.kind).toBe("quote_expired");
  });

  it("does NOT post quote_expired on a non-entry-blocked failure (e.g. 500)", async () => {
    const client = pmClient({
      openPmPosition: vi.fn(async () => failData(500, { error: "boom" })),
    });
    const act = {
      decision: "act",
      confidence: 0.9,
      actions: [
        {
          type: "pm_open",
          source: "kalshi",
          slug: "btc-up",
          outcomeExternalMarketId: "yes-1",
          stakeMusd: 15,
          confidence: 0.9,
        },
      ],
    };
    await runCycle(deps({ live: true }, client, provider(act)));
    expect(client.reportPmOpportunity).not.toHaveBeenCalled();
  });

  it("caps at ONE opportunity post per cycle even when multiple pm_opens expire", async () => {
    const client = pmClient({
      openPmPosition: vi.fn(async () =>
        failData(422, {
          error: "mock_entry_blocked",
          blockReasons: ["quote_dead"],
        }),
      ),
    });
    const act = {
      decision: "act",
      confidence: 0.9,
      actions: [
        {
          type: "pm_open",
          source: "kalshi",
          slug: "btc-up",
          outcomeExternalMarketId: "yes-1",
          stakeMusd: 15,
          confidence: 0.9,
        },
        {
          type: "pm_open",
          source: "polymarket",
          slug: "eth-up",
          outcomeExternalMarketId: "yes-2",
          stakeMusd: 15,
          confidence: 0.9,
        },
      ],
    };
    await runCycle(deps({ live: true }, client, provider(act)));
    expect(client.openPmPosition).toHaveBeenCalledTimes(2); // both attempted
    expect(client.reportPmOpportunity).toHaveBeenCalledTimes(1); // but ONE report
  });

  it("a failed opportunity post never throws or breaks the cycle", async () => {
    const client = pmClient({
      reportPmOpportunity: vi.fn(async () => {
        throw new Error("network down");
      }),
    });
    const r = await runCycle(deps({ live: true }, client));
    expect(r.decision).toBe("skip"); // cycle still completes
    expect(client.reportPmOpportunity).toHaveBeenCalledTimes(1);
  });
});
