import { describe, expect, it } from "vitest";
import { Cassette, CASSETTE_SCHEMA, RecordedResponse } from "./cassette.js";
import {
  findRecordedPmOutcome,
  NOT_RECORDED_STATUS,
  ReplayClient,
} from "./replayClient.js";
import {
  FUTURES_SYNTHETIC_FEE_BPS,
  pmSyntheticFeePoints,
  PM_SYNTHETIC_FEE_RATE_AT_MID,
  synthesizePmQuote,
} from "./costs.js";
import { fetchQuote } from "../act.js";
import { parseSkill } from "../skill.js";
import { renderFolderOfOne } from "../templates.js";
import type { Observation, ProposedAction } from "../types.js";

const spec = parseSkill(renderFolderOfOne("replay-agent", "conservative")).spec;

function rec(
  key: string,
  data: unknown,
  over: Partial<RecordedResponse> = {},
): RecordedResponse {
  const [method, rest] = key.split(" ");
  const [path] = rest.split("?");
  return {
    key,
    method,
    path,
    query: {},
    status: 200,
    ok: true,
    data,
    ...over,
  };
}

// Real discover shape: { data: [event] }, ids nested at outcomes[].
const DISCOVER = {
  data: [
    {
      source: "polymarket",
      slug: "bitcoin-above-150k-by-december",
      title: "Will Bitcoin reach $150k by December?",
      freshness: { status: "fresh" },
      outcomes: [
        { externalMarketId: "0xabc", name: "Yes", probability: 10 },
        {
          externalMarketId: "0xdead",
          name: "No",
          probability: 90,
          eligible: false,
        },
      ],
    },
    {
      source: "kalshi",
      slug: "flat-event",
      externalMarketId: "k-1",
      probability: 0,
      freshness: { status: "stale" },
    },
  ],
};

function cassette(responses: RecordedResponse[]): Cassette {
  return {
    schema: CASSETTE_SCHEMA,
    id: "c1",
    recordedAt: "2026-10-07T10:00:00.000Z",
    clockMs: 0,
    asOf: "2026-10-07T10:00:00.000Z",
    agentSpecHash: "sha256:x",
    spec,
    marketBaselineRecorded: false,
    recordCycle: { decision: "skip" },
    refusedRequests: [],
    responses,
  };
}

const CASSETTE = cassette([
  rec("GET /api/agent/me", { scopes: ["read"] }),
  rec("GET /api/agent/market/1", {
    price: { usd: 62000 },
    observation: { freshness: { status: "fresh" } },
  }),
  rec("GET /api/agent/market/2", { price: {} }),
  rec("GET /api/agent/pm/discover?limit=30&q=Bitcoin", DISCOVER),
  rec("GET /api/agent/portfolio", "plain text body"),
  rec("GET /api/agent/positions/futures", null, {
    status: 0,
    ok: false,
    transportError: true,
  }),
  rec("GET /api/agent/orders/open", "", { status: 204 }),
  rec(
    "GET /api/agent/performance",
    { error: "slow" },
    {
      status: 429,
      ok: false,
    },
  ),
]);

const OBS = {
  watch: [
    { symbol: "BTC", coinId: "1" },
    { symbol: "ETH", coinId: "2" },
    { symbol: "SOL", coinId: "9" },
  ],
} as unknown as Observation;

describe("synthetic PM cost model", () => {
  it("charges the published fee shape: largest at 50, zero at the extremes", () => {
    expect(pmSyntheticFeePoints(50)).toBeCloseTo(
      50 * PM_SYNTHETIC_FEE_RATE_AT_MID,
      10,
    );
    expect(pmSyntheticFeePoints(0)).toBe(0);
    expect(pmSyntheticFeePoints(100)).toBe(0);
  });

  it("computes the 10-point quote: cost = prob + fee, shares = stake / cost", () => {
    const q = synthesizePmQuote(10, 10)!;
    const fee = 10 * 0.018 * 4 * 0.1 * 0.9; // 0.0648 points
    expect(q.entryProbability).toBe(10);
    expect(q.feePoints).toBeCloseTo(fee, 12);
    expect(q.costPoints).toBeCloseTo(10 + fee, 12);
    expect(q.sharesEstimate).toBeCloseTo(10 / ((10 + fee) / 100), 9);
    expect(synthesizePmQuote(0, 10)).toBeUndefined();
    expect(synthesizePmQuote(100, 10)).toBeUndefined();
    expect(synthesizePmQuote(40, 0)).toBeUndefined();
  });
});

describe("ReplayClient", () => {
  it("serves recorded reads through the production client and counts what it served", async () => {
    const client = new ReplayClient(CASSETTE);
    expect(await client.me()).toMatchObject({
      ok: true,
      status: 200,
      data: { scopes: ["read"] },
    });
    expect(
      await client.discoverPmMarkets({ limit: 30, q: "Bitcoin" }),
    ).toMatchObject({ ok: true, data: DISCOVER });
    expect((await client.portfolio()).data).toBe("plain text body");
    expect(await client.openOrders()).toMatchObject({ status: 204, data: "" });
    expect(client.stats.served).toBe(4);
    expect(client.stats.missing).toEqual([]);
  });

  it("answers an unrecorded read with 599 not_recorded and reports it", async () => {
    const client = new ReplayClient(CASSETTE);
    const r = await client.wallet();
    expect(r).toMatchObject({
      ok: false,
      status: NOT_RECORDED_STATUS,
      data: { error: "not_recorded", key: "GET /api/agent/wallet" },
    });
    await client.discoverPmMarkets({ q: "Ethereum", limit: 30 });
    expect(client.stats.missing).toEqual([
      "GET /api/agent/wallet",
      "GET /api/agent/pm/discover?limit=30&q=Ethereum",
    ]);
  });

  it("replays a recorded transport failure as one, and a 429 without retrying", async () => {
    const client = new ReplayClient(CASSETTE);
    expect(await client.futuresPositions()).toMatchObject({
      ok: false,
      status: 0,
      data: { error: "network_error" },
    });
    expect(await client.performance()).toMatchObject({ status: 429 });
  });

  it("refuses every write and never synthesizes one", async () => {
    const client = new ReplayClient(CASSETTE);
    const r = await client.openPmPosition({
      source: "polymarket",
      slug: "x",
      outcomeExternalMarketId: "y",
      stakeMusd: 10,
      idempotencyKey: "k",
    });
    expect(r).toMatchObject({
      ok: false,
      status: 599,
      data: { error: "bench_write_refused" },
    });
    expect(client.stats.refusedWrites).toEqual(["POST /api/agent/pm/open"]);
    expect(client.stats.synthesizedQuotes).toEqual([]);
  });

  it("synthesizes a PM quote the runner's fetchQuote parses, from the recorded probability", async () => {
    const client = new ReplayClient(CASSETTE);
    const action = {
      type: "pm_open",
      source: "Polymarket",
      slug: "bitcoin-above-150k-by-december",
      outcomeExternalMarketId: "0xabc",
      stakeMusd: 10,
    } as ProposedAction;
    const quote = await fetchQuote(client, action, OBS, undefined, {
      pmMinEntryProbabilityPct: 20,
    });
    const expected = synthesizePmQuote(10, 10)!;
    expect(quote).toMatchObject({
      eligible: true,
      entryProbability: 10,
      stakeMusd: 10,
      freshness: { status: "fresh" },
      openBlocked: false,
    });
    expect(quote?.sharesEstimate).toBeCloseTo(expected.sharesEstimate, 9);
    expect(client.stats.synthesizedQuotes).toEqual([
      {
        venue: "pm",
        subject: "polymarket/bitcoin-above-150k-by-december/0xabc",
        eligible: true,
        basis: "recorded_discover_probability",
      },
    ]);
  });

  it("returns ineligible PM quotes when the recording cannot price the outcome", async () => {
    const client = new ReplayClient(CASSETTE);
    const pm = (source: string, slug: string, id: string) =>
      fetchQuote(
        client,
        {
          type: "pm_open",
          source,
          slug,
          outcomeExternalMarketId: id,
          stakeMusd: 10,
        } as ProposedAction,
        OBS,
      );
    expect(await pm("polymarket", "missing", "z")).toMatchObject({
      eligible: false,
      blockReasons: ["entry_price_unavailable"],
    });
    expect(
      await pm("polymarket", "bitcoin-above-150k-by-december", "0xdead"),
    ).toMatchObject({ blockReasons: ["recorded_outcome_ineligible"] });
    expect(await pm("kalshi", "flat-event", "k-1")).toMatchObject({
      blockReasons: ["synthetic_unfillable"],
      freshness: { status: "stale" },
    });
    expect(client.stats.synthesizedQuotes.map((q) => q.eligible)).toEqual([
      false,
      false,
      false,
    ]);
  });

  it("synthesizes futures and spot quotes from the recorded market price", async () => {
    const client = new ReplayClient(CASSETTE);
    const fut = await fetchQuote(
      client,
      {
        type: "futures_open",
        symbol: "BTC",
        side: "long",
        leverage: 2,
        marginMusd: 50,
      },
      OBS,
    );
    const fee = (100 * FUTURES_SYNTHETIC_FEE_BPS) / 10_000;
    expect(fut).toMatchObject({
      eligible: true,
      entryPrice: 62000,
      futuresFeeBps: FUTURES_SYNTHETIC_FEE_BPS,
      estimatedEntryFeeMusd: fee,
      cashRequiredMusd: 50 + fee,
      freshness: { status: "fresh" },
    });
    const spot = await fetchQuote(
      client,
      {
        type: "spot_order",
        symbol: "BTC",
        side: "buy",
        orderType: "market",
        quantity: 0.001,
      },
      OBS,
    );
    expect(spot).toMatchObject({ eligible: true, executionPrice: 62000 });
    expect(spot?.estimatedCostMusd).toBeCloseTo(62, 9);
    // No usable recorded price (ETH) or no recorded read at all (SOL).
    for (const symbol of ["ETH", "SOL"]) {
      expect(
        await fetchQuote(
          client,
          {
            type: "futures_open",
            symbol,
            side: "short",
            leverage: 2,
            marginMusd: 50,
          },
          OBS,
        ),
      ).toMatchObject({
        eligible: false,
        blockReasons: ["entry_price_unavailable"],
      });
    }
  });

  it("rejects an unusable synthesized size", async () => {
    const client = new ReplayClient(CASSETTE);
    expect(
      await client.futuresQuote({
        coinId: "1",
        side: "long",
        leverage: 0,
        marginMusd: 50,
      }),
    ).toMatchObject({
      data: { eligible: false, blockReasons: ["invalid_size"] },
    });
    expect(
      await client.spotQuote({ coinId: "1", side: "buy", quantity: -1 }),
    ).toMatchObject({
      data: { eligible: false, blockReasons: ["invalid_size"] },
    });
  });

  it("finds outcomes by the same fallbacks observe uses", () => {
    expect(
      findRecordedPmOutcome(CASSETTE, "kalshi", "flat-event", "k-1"),
    ).toEqual({ probability: 0, freshness: "stale", eligible: true });
    expect(
      findRecordedPmOutcome(CASSETTE, "kalshi", "flat-event", "nope"),
    ).toBeUndefined();
  });
});
