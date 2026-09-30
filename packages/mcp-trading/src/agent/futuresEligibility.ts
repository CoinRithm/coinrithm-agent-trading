// Futures entry eligibility (API >= backend-v2 #106): GET /api/agent/market/{coinId}
// carries `futuresEntryEligibility`, what the server entry gate's own
// perpetual-reference rule says about a NEW futures open on the coin. Before it,
// universe_scan surfaced coins with no supported perpetual reference (tokenized
// ETFs such as SLVON/NAKA) and the runner spent a futures quote only to be
// refused with perpetual_reference_unavailable (J-74). The server gate stays
// authoritative: eligibility can change between observation and execution.

import { asObj, asStr } from "./extract.js";
import { baseSymbol } from "./setups.js";
import type { Observation, ProposedAction } from "./types.js";

export type FuturesEntryEligibilityStatus =
  "eligible" | "reference_stale" | "reference_unavailable";

export interface FuturesEntryEligibility {
  status: FuturesEntryEligibilityStatus;
  /** Whether the server gate currently requires a reference for NEW opens. */
  referenceRequired: boolean;
  venue: string | null;
  symbol: string | null;
  referenceFetchedAt: string | null;
  maxReferenceAgeHours: number;
  evaluatedAt: string;
}

const STATUSES: readonly FuturesEntryEligibilityStatus[] = [
  "eligible",
  "reference_stale",
  "reference_unavailable",
];

// A zoned ISO 8601 date-time (the contract's `format: date-time`):
// YYYY-MM-DDTHH:MM[:SS[.fraction]] with Z or a +/-HH:MM offset. Date-only,
// zone-less and bare numbers ("0") are rejected even though Date.parse
// accepts them.
const ZONED_DATE_TIME =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:\d{2})$/;
const isIsoDate = (v: unknown): v is string =>
  typeof v === "string" &&
  ZONED_DATE_TIME.test(v) &&
  Number.isFinite(Date.parse(v));

/**
 * Strict parse of the market context field against its contract (backend-v2
 * #106). Anything missing or malformed (an older API, a partial response, an
 * unknown status, a non-boolean referenceRequired, a missing or invalid
 * evaluatedAt, a non-positive or non-finite maxReferenceAgeHours, or a present
 * but invalid referenceFetchedAt) is `undefined` = UNKNOWN. Unknown never
 * blocks: the runner keeps today's behaviour and the server gate decides.
 */
export function futuresEntryEligibilityOf(
  marketContext: unknown,
): FuturesEntryEligibility | undefined {
  const raw = asObj(asObj(marketContext).futuresEntryEligibility);
  const status = asStr(raw.status) as FuturesEntryEligibilityStatus | undefined;
  if (!status || !STATUSES.includes(status)) return undefined;
  if (typeof raw.referenceRequired !== "boolean") return undefined;
  const hours = raw.maxReferenceAgeHours;
  if (typeof hours !== "number" || !Number.isFinite(hours) || hours <= 0)
    return undefined;
  if (!isIsoDate(raw.evaluatedAt)) return undefined;
  const fetchedAt = raw.referenceFetchedAt;
  if (fetchedAt != null && !isIsoDate(fetchedAt)) return undefined;
  return {
    status,
    referenceRequired: raw.referenceRequired,
    venue: asStr(raw.venue) ?? null,
    symbol: asStr(raw.symbol) ?? null,
    referenceFetchedAt: fetchedAt ?? null,
    maxReferenceAgeHours: hours,
    evaluatedAt: raw.evaluatedAt,
  };
}

export interface FuturesEntryPreflightRejection {
  code: "futures_reference_unavailable" | "futures_reference_stale";
  reason: string;
}

/**
 * Pre-quote check for a NEW futures open. Returns a rejection only when the
 * observation EXPLICITLY reports that the server gate requires a reference and
 * has none (or only a stale one) for this coin. Everything else passes:
 * - non-futures_open actions (spot, PM, futures_close / futures_set_sltp);
 * - any open futures position on the same coin (the open is an add or position
 *   management, which the server never refuses for the reference);
 * - unknown eligibility (field absent on an older API);
 * - referenceRequired false.
 */
export function futuresEntryPreflight(
  action: ProposedAction,
  observation: Observation,
): FuturesEntryPreflightRejection | null {
  if (action.type !== "futures_open") return null;
  const base = baseSymbol(action.symbol);
  const holdsCoin = (observation.openPositions ?? []).some(
    (p) =>
      p.venue === "futures" &&
      (p.status ?? "open") === "open" &&
      baseSymbol(p.symbol) === base,
  );
  if (holdsCoin) return null;
  const entry = observation.watch.find((w) => baseSymbol(w.symbol) === base);
  const e = entry?.futuresEntryEligibility;
  if (!e || !e.referenceRequired || e.status === "eligible") return null;
  const when = ` at ${e.evaluatedAt}`;
  if (e.status === "reference_stale") {
    return {
      code: "futures_reference_stale",
      reason: `${action.symbol}: the perpetual reference${e.venue ? ` (${e.venue})` : ""} is stale or unusable for a NEW futures open${when} (too old, or its refresh time is missing, invalid or in the future); the server would refuse it (perpetual_reference_stale). Trade another coin or wait for a fresh reference.`,
    };
  }
  return {
    code: "futures_reference_unavailable",
    reason: `${action.symbol}: CoinRithm has no supported perpetual reference for this coin${when}, so the server refuses a NEW futures open (perpetual_reference_unavailable). Use spot for it, or another coin for futures.`,
  };
}
