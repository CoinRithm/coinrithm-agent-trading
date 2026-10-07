import { describe, expect, it } from "vitest";
import { depthOf } from "./observe.js";

// Observed depth reaches every agent from the /market call the runner already
// makes (backend-v2 #150). One venue's book; a partial band is flagged.

const NOW = Date.parse("2026-10-07T07:05:00.000Z");
const market = (depth: unknown) => ({ derivatives: { depth } });
const block = (over: Record<string, unknown> = {}) => ({
  venue: "hyperliquid",
  mid: 100,
  bands: [
    {
      pct: 0.5,
      bid: { usd: 500, complete: true },
      ask: { usd: 550, complete: true },
    },
    {
      pct: 1,
      bid: { usd: 1000, complete: true },
      ask: { usd: 1050, complete: true },
    },
    {
      pct: 2,
      bid: { usd: 1200, complete: false },
      ask: null,
    },
  ],
  asOf: "2026-10-07T07:04:30.000Z",
  ageSeconds: 30,
  stale: false,
  note: "Hyperliquid order book only",
  ...over,
});

describe("depthOf", () => {
  it("keeps observed USD and completeness per band, null for an unknown side", () => {
    const d = depthOf(market(block()), NOW)!;
    expect(d).toMatchObject({ venue: "hyperliquid", stale: false });
    expect(d.bands[0]).toEqual({
      pct: 0.5,
      bid: { usd: 500, complete: true },
      ask: { usd: 550, complete: true },
    });
    // Partial stays partial; never upgraded to complete.
    expect(d.bands[2]).toEqual({
      pct: 2,
      bid: { usd: 1200, complete: false },
      ask: null,
    });
  });

  it("drops a malformed side and omits a future-dated or empty block", () => {
    const bad = depthOf(
      market(
        block({
          bands: [
            {
              pct: 0.5,
              bid: { usd: -1, complete: true },
              ask: { usd: 5 },
            },
            { pct: 1, bid: { usd: 2, complete: true }, ask: null },
          ],
        }),
      ),
      NOW,
    )!;
    expect(bad.bands[0]).toEqual({ pct: 0.5, bid: null, ask: null });
    expect(
      depthOf(market(block({ asOf: "2026-10-07T09:00:00.000Z" })), NOW),
    ).toBeUndefined();
    expect(
      depthOf(
        market(block({ bands: [{ pct: 1, bid: null, ask: null }] })),
        NOW,
      ),
    ).toBeUndefined();
    expect(depthOf({}, NOW)).toBeUndefined();
  });

  it("treats a missing stale flag as stale", () => {
    expect(depthOf(market(block({ stale: undefined })), NOW)?.stale).toBe(true);
  });
});
