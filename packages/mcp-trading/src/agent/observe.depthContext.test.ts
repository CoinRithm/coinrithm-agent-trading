import { describe, expect, it } from "vitest";
import { depthOf } from "./observe.js";

// Depth bounds reach every agent from the /market call the runner already
// makes (backend-v2 #150). One venue's book, bounds not exact values.

const NOW = Date.parse("2026-10-07T07:05:00.000Z");
const market = (depth: unknown) => ({ derivatives: { depth } });
const block = (over: Record<string, unknown> = {}) => ({
  venue: "hyperliquid",
  mid: 100,
  precisionPct: 0.1,
  bands: [
    { pct: 0.5, bidUsd: { lo: 400, hi: 600 }, askUsd: { lo: 450, hi: 650 } },
    { pct: 1, bidUsd: { lo: 900, hi: 1100 }, askUsd: { lo: 950, hi: 1150 } },
    { pct: 2, bidUsd: null, askUsd: null },
  ],
  asOf: "2026-10-07T07:04:30.000Z",
  ageSeconds: 30,
  stale: false,
  note: "Hyperliquid order book only",
  ...over,
});

describe("depthOf", () => {
  it("keeps bounds per band, null for an unreached band", () => {
    const d = depthOf(market(block()), NOW)!;
    expect(d).toMatchObject({
      venue: "hyperliquid",
      precisionPct: 0.1,
      stale: false,
    });
    expect(d.bands[0]).toEqual({
      pct: 0.5,
      bidUsd: { lo: 400, hi: 600 },
      askUsd: { lo: 450, hi: 650 },
    });
    expect(d.bands[2]).toEqual({ pct: 2, bidUsd: null, askUsd: null });
  });

  it("drops malformed bounds and omits a future-dated or empty block", () => {
    const bad = depthOf(
      market(
        block({
          bands: [
            {
              pct: 0.5,
              bidUsd: { lo: 700, hi: 600 },
              askUsd: { lo: -1, hi: 5 },
            },
            { pct: 1, bidUsd: { lo: 1, hi: 2 }, askUsd: null },
          ],
        }),
      ),
      NOW,
    )!;
    expect(bad.bands[0]).toEqual({ pct: 0.5, bidUsd: null, askUsd: null });
    expect(
      depthOf(market(block({ asOf: "2026-10-07T09:00:00.000Z" })), NOW),
    ).toBeUndefined();
    expect(
      depthOf(
        market(block({ bands: [{ pct: 1, bidUsd: null, askUsd: null }] })),
        NOW,
      ),
    ).toBeUndefined();
    expect(depthOf({}, NOW)).toBeUndefined();
  });

  it("treats a missing stale flag as stale", () => {
    expect(depthOf(market(block({ stale: undefined })), NOW)?.stale).toBe(true);
  });
});
