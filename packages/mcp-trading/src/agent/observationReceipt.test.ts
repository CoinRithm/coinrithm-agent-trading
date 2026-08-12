import { describe, expect, it } from "vitest";
import type { Observation } from "./types.js";
import { INDICATOR_VERSION } from "./indicators.js";
import { buildObservationReceipt } from "./observationReceipt.js";

const observation = (): Observation => ({
  asOf: "2026-08-12T06:00:00.000Z",
  scopes: ["read", "trade"],
  cashAvailableMusd: 100_000,
  equityMusd: 100_000,
  openPositions: [],
  openOrders: [],
  pmPositions: [],
  pmResolutions: [],
  pmMarkets: [],
  watch: [],
  setups: [],
  syncCursor: null,
  newClosedTrades: [],
  polledBeforeWrite: true,
});

describe("observation receipt", () => {
  it("is deterministic for the same structured input", () => {
    expect(buildObservationReceipt(observation())).toEqual(
      buildObservationReceipt(observation()),
    );
  });

  it("changes when any model-visible observation field changes", () => {
    const first = buildObservationReceipt(observation());
    const changed = buildObservationReceipt({
      ...observation(),
      cashAvailableMusd: 99_999,
    });

    expect(first.observationHash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(changed.observationHash).not.toBe(first.observationHash);
    expect(first.indicatorVersion).toBe(INDICATOR_VERSION);
  });
});
