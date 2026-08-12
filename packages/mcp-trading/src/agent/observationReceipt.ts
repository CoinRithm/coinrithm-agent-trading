// A compact, privacy-safe receipt for the exact structured observation used by
// one decision. We persist the digest, never the full prompt or model output.

import type { Observation } from "./types.js";
import { INDICATOR_VERSION } from "./indicators.js";
import { sha256, stableStringify } from "./util.js";

export interface ObservationReceipt {
  observationHash: string;
  indicatorVersion: string;
}

export function buildObservationReceipt(
  observation: Observation,
): ObservationReceipt {
  return {
    observationHash: sha256(stableStringify(observation)),
    indicatorVersion: INDICATOR_VERSION,
  };
}
