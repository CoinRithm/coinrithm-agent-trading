import { describe, expect, it } from "vitest";
import { depthOf } from "./observe.js";

// Observed depth reaches every agent from the /market call the runner already
// makes (backend-v2 #150): one venue's visible book, per side usd + reach +
// level count + whether the side was seen whole.

const NOW = Date.parse("2026-10-07T07:05:00.000Z");
const market = (depth: unknown) => ({ derivatives: { depth } });
const block = (over: Record<string, unknown> = {}) => ({
  venue: "hyperliquid",
  mid: 118.72,
  bid: { usd: 4498035, reachPct: 0.164, levels: 20, complete: false },
  ask: { usd: 21000, reachPct: 0.9, levels: 7, complete: true },
  asOf: "2026-10-07T07:04:30.000Z",
  ageSeconds: 30,
  stale: false,
  note: "Hyperliquid order book only",
  ...over,
});

describe("depthOf", () => {
  it("keeps usd, reach, levels and coverage per side", () => {
    expect(depthOf(market(block()), NOW)).toEqual({
      venue: "hyperliquid",
      bid: { usd: 4498035, reachPct: 0.164, levels: 20, complete: false },
      ask: { usd: 21000, reachPct: 0.9, levels: 7, complete: true },
      asOf: "2026-10-07T07:04:30.000Z",
      stale: false,
    });
  });

  it("drops a malformed or contradictory side and omits a future-dated or empty block", () => {
    const oneBad = depthOf(
      market(
        block({ bid: { usd: 1, reachPct: 0.1, levels: 20, complete: true } }),
      ),
      NOW,
    )!;
    expect(oneBad.bid).toBeNull();
    expect(oneBad.ask).not.toBeNull();
    expect(
      depthOf(
        market(
          block({
            bid: { usd: -1, reachPct: 0.1, levels: 3, complete: true },
            ask: { usd: 5, reachPct: 0.1, levels: 21, complete: false },
          }),
        ),
        NOW,
      ),
    ).toBeUndefined();
    expect(
      depthOf(market(block({ asOf: "2026-10-07T09:00:00.000Z" })), NOW),
    ).toBeUndefined();
    expect(depthOf({}, NOW)).toBeUndefined();
  });

  it("treats a missing stale flag as stale", () => {
    expect(depthOf(market(block({ stale: undefined })), NOW)?.stale).toBe(true);
  });
});
