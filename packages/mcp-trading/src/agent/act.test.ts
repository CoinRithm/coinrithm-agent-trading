import { describe, it, expect, vi } from "vitest";
import { executeAction, fetchQuote } from "./act.js";
import type { CoinRithmClient } from "./client.js";
import type { Observation, ProposedAction, AgentTrace } from "./types.js";

const okData = (data: unknown) => ({ ok: true, status: 200, data });

// futures_set_sltp / spot_cancel resolve no symbol, so a bare observation is fine.
const emptyObservation = (): Observation => ({
  asOf: new Date().toISOString(),
  scopes: ["read", "trade:futures", "trade:spot"],
  cashAvailableMusd: 1000,
  equityMusd: 50000,
  openPositions: [],
  openOrders: [],
  pmPositions: [],
  pmMarkets: [],
  watch: [],
  setups: [],
  syncCursor: null,
  newClosedTrades: [],
  polledBeforeWrite: true,
});

const trace: AgentTrace = { runId: "run-1", decisionId: "dec-1" };

describe("spot quote fee evidence", () => {
  it.each([0, 1, undefined, "1", null, Number.NaN, Number.POSITIVE_INFINITY])(
    "retains only finite numeric modeled fees (%s)",
    async (estimatedFeeMusd) => {
      const obs = emptyObservation();
      obs.watch = [{ symbol: "BTC", coinId: "1" }];
      const client = {
        spotQuote: async () =>
          okData({ eligible: true, estimatedCostMusd: 100, estimatedFeeMusd }),
      } as unknown as CoinRithmClient;
      const quote = await fetchQuote(
        client,
        {
          type: "spot_order",
          symbol: "BTC",
          side: "buy",
          orderType: "market",
          quantity: 1,
        },
        obs,
      );
      expect(quote?.estimatedCostMusd).toBe(100);
      expect(quote?.estimatedFeeMusd).toBe(
        typeof estimatedFeeMusd === "number" &&
          Number.isFinite(estimatedFeeMusd)
          ? estimatedFeeMusd
          : undefined,
      );
    },
  );
});

describe("futures quote capital-cost evidence", () => {
  it.each([5, "5", null, Number.NaN, Number.POSITIVE_INFINITY])(
    "retains only numeric fee evidence (%s)",
    async (feeBps) => {
      const obs = emptyObservation();
      obs.watch = [{ symbol: "BTC", coinId: "1" }];
      const client = {
        futuresQuote: async () =>
          okData({
            eligible: true,
            executionModel: { feeBps, estimatedEntryFeeMusd: 1 },
            cashRequiredMusd: 101,
          }),
      } as unknown as CoinRithmClient;
      const q = await fetchQuote(
        client,
        {
          type: "futures_open",
          symbol: "BTC",
          side: "long",
          leverage: 2,
          marginMusd: 100,
        },
        obs,
      );
      expect(q?.futuresFeeBps).toBe(
        typeof feeBps === "number" && Number.isFinite(feeBps)
          ? feeBps
          : undefined,
      );
      expect(q?.estimatedEntryFeeMusd).toBe(1);
      expect(q?.cashRequiredMusd).toBe(101);
    },
  );
});

describe("fetchQuote PM execution-cost evidence", () => {
  const action: ProposedAction = {
    type: "pm_open",
    source: "polymarket",
    slug: "btc-up",
    outcomeExternalMarketId: "yes-1",
    stakeMusd: 20,
    confidence: 0.7,
  };
  const payload = {
    eligible: true,
    entryProbability: 60,
    stakeMusd: 20,
    sharesEstimate: 20 / 0.7107812967,
    executionModel: { effectiveProbability: 70.0035 },
    observation: { freshness: { status: "fresh", ageMinutes: 0.5 } },
  };
  const quoteFrom = async (data: unknown) => {
    const pmQuote = vi.fn(async (_params: unknown) => okData(data));
    const client = { pmQuote } as unknown as CoinRithmClient;
    return {
      quote: await fetchQuote(client, action, emptyObservation(), trace),
      pmQuote,
    };
  };

  it("retains the raw mid separately from stake and fee-adjusted shares", async () => {
    const { quote, pmQuote } = await quoteFrom(payload);
    expect(pmQuote).toHaveBeenCalledWith(
      {
        source: action.source,
        slug: action.slug,
        outcomeExternalMarketId: action.outcomeExternalMarketId,
        stakeMusd: 20,
      },
      trace,
    );
    expect(quote).toMatchObject({
      eligible: true,
      entryProbability: 60,
      stakeMusd: 20,
      sharesEstimate: payload.sharesEstimate,
      freshness: { status: "fresh", ageSeconds: 30 },
    });
    expect((100 * quote!.stakeMusd!) / quote!.sharesEstimate!).toBeCloseTo(
      71.07812967,
      8,
    );
  });

  it.each([0.5, 1])("does not rescale a raw mid of %s points", async (mid) => {
    const { quote } = await quoteFrom({ ...payload, entryProbability: mid });
    expect(quote?.entryProbability).toBe(mid);
  });

  it.each(["20", "", null, false, Number.NaN, Number.POSITIVE_INFINITY])(
    "does not coerce malformed stake or shares %s into valid numbers",
    async (value) => {
      const { quote } = await quoteFrom({
        ...payload,
        stakeMusd: value,
        sharesEstimate: value,
      });
      expect(Number.isFinite(quote?.stakeMusd)).toBe(false);
      expect(Number.isFinite(quote?.sharesEstimate)).toBe(false);
    },
  );

  it("does not manufacture cost inputs for legacy quotes", async () => {
    const { quote } = await quoteFrom({
      eligible: true,
      entryProbability: 60,
      observation: { freshness: { status: "fresh" } },
    });
    expect(quote?.stakeMusd).toBeUndefined();
    expect(quote?.sharesEstimate).toBeUndefined();
  });

  it.each<ProposedAction>([
    { type: "futures_close", positionId: 7, fraction: 1 },
    { type: "futures_set_sltp", positionId: 7, stopLossPrice: 60000 },
    { type: "spot_cancel", orderId: 42 },
  ])(
    "does not fetch any quote for a reducing action $type",
    async (reducing) => {
      const pmQuote = vi.fn();
      const futuresQuote = vi.fn();
      const spotQuote = vi.fn();
      const client = {
        pmQuote,
        futuresQuote,
        spotQuote,
      } as unknown as CoinRithmClient;
      expect(
        await fetchQuote(client, reducing, emptyObservation(), trace),
      ).toBeUndefined();
      expect(pmQuote).not.toHaveBeenCalled();
      expect(futuresQuote).not.toHaveBeenCalled();
      expect(spotQuote).not.toHaveBeenCalled();
    },
  );
});

// A retried cycle re-issues the SAME deterministic idempotency key the runner
// computed for the intent — these two mutating ops must carry it through so a
// retry can't double-send, consistent with open/close/place.
describe("executeAction idempotency-key wiring", () => {
  it("passes the idempotency key to setFuturesSlTp", async () => {
    const setFuturesSlTp = vi.fn(async () => okData({}));
    const client = { setFuturesSlTp } as unknown as CoinRithmClient;
    const action: ProposedAction = {
      type: "futures_set_sltp",
      positionId: 42,
      stopLossPrice: 100,
      takeProfitPrice: 200,
    };
    await executeAction(
      client,
      action,
      emptyObservation(),
      trace,
      "run-1:sltp:42:0",
    );
    expect(setFuturesSlTp).toHaveBeenCalledTimes(1);
    expect(setFuturesSlTp.mock.calls[0][0]).toMatchObject({
      positionId: 42,
      idempotencyKey: "run-1:sltp:42:0",
    });
  });

  it("passes the idempotency key to cancelSpotOrder", async () => {
    const cancelSpotOrder = vi.fn(async () => okData({ ok: true }));
    const client = { cancelSpotOrder } as unknown as CoinRithmClient;
    const action: ProposedAction = { type: "spot_cancel", orderId: 7 };
    await executeAction(
      client,
      action,
      emptyObservation(),
      trace,
      "run-1:cancel:7:0",
    );
    expect(cancelSpotOrder).toHaveBeenCalledTimes(1);
    // signature: (orderId, idempotencyKey?, trace?)
    expect(cancelSpotOrder.mock.calls[0][0]).toBe(7);
    expect(cancelSpotOrder.mock.calls[0][1]).toBe("run-1:cancel:7:0");
  });
});
