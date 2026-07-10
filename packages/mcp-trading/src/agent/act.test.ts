import { describe, it, expect, vi } from "vitest";
import { executeAction } from "./act.js";
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
