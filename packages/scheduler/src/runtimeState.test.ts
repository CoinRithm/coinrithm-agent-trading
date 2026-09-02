import { describe, expect, it } from "vitest";
import { hydrateState } from "./runtime.js";
import { newState } from "@coinrithm/mcp-trading/dist/agent/engine.js";

// Slice 2 (2026-09-02): the thesis each open position was opened on rides in
// the same agent_runtime.agent_state JSON the scheduler already persists. The
// DB round trip (JSON.stringify -> jsonb -> hydrate) must keep it intact so a
// hosted agent's thesis exits survive every cycle boundary.
describe("hydrateState keeps persisted theses", () => {
  it("round-trips theses through the stored JSON", () => {
    const state = newState("run-1");
    state.theses = {
      "futures:52": {
        summary: "BTC broke its recent20 high",
        invalidation: { priceBelow: 64000, maxHoldMinutes: 240 },
        venue: "futures",
        positionId: 52,
        symbol: "BTC",
        side: "long",
        openedAt: "2026-09-02T10:00:00.000Z",
        entryPrice: 67000,
      },
    };
    const stored = JSON.parse(JSON.stringify(state)) as unknown;
    const hydrated = hydrateState(stored, "run-2");
    expect(hydrated.runId).toBe("run-1");
    expect(hydrated.theses).toEqual(state.theses);
    // A fresh agent (no stored state) starts without any thesis map.
    expect(hydrateState(null, "run-3").theses).toBeUndefined();
  });

  it("still fails closed on corrupt stored state", () => {
    expect(() => hydrateState([] as unknown, "run-1")).toThrow(/corrupt/);
  });
});
