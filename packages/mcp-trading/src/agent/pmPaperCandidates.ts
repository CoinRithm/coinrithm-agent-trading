import { expandPmMarkets } from "./observe.js";

const object = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

function nativeKey(source: unknown, value: unknown): string | null {
  const native = object(value);
  if (!native || native.venue !== source || typeof native.key !== "string")
    return null;
  if (source === "polymarket" && /^polymarket:0x[0-9a-f]{64}$/.test(native.key))
    return native.key;
  if (
    source === "kalshi" &&
    /^kalshi:[A-Z0-9][A-Z0-9._-]{0,127}$/.test(native.key)
  )
    return native.key;
  return null;
}

/** Immutable entry identity excludes aliases and the opposite order side.
 * Unknown identities hold new entries, but do not block closing/replaying. */
export function pmHeldNativeMarkets(positions: readonly unknown[]) {
  const keys = new Set<string>();
  let complete = true;
  for (const row of positions) {
    const position = object(row);
    if (position?.accountingStatus === "settled") continue;
    const native = object(object(position?.entry)?.nativeIdentity);
    const value =
      native?.venue === "polymarket" && typeof native.market === "string"
        ? `polymarket:${native.market.toLowerCase()}`
        : native?.venue === "kalshi" &&
            typeof native.requestedTicker === "string"
          ? `kalshi:${native.requestedTicker}`
          : null;
    const key = nativeKey(position?.source, {
      venue: native?.venue,
      key: value,
    });
    if (key) keys.add(key);
    else complete = false;
  }
  return { keys, complete };
}

function nativeEndAt(value: unknown): number | null {
  // The v2 server normalizes native dates to ISO milliseconds. Never accept a
  // parent event date, Go zero-time, a rolled-over calendar date or local time.
  if (
    typeof value !== "string" ||
    !/^[2-9]\d{3}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)
  )
    return null;
  const at = Date.parse(value);
  return Number.isSafeInteger(at) && new Date(at).toISOString() === value
    ? at
    : null;
}

export function pmCandidateWithinHorizon(
  candidate: { nativeEndAt: string | null },
  maxEndDays: number | undefined,
  nowMs: number,
): boolean {
  if (maxEndDays === undefined) return true;
  const at = nativeEndAt(candidate.nativeEndAt);
  return (
    Number.isInteger(maxEndDays) &&
    maxEndDays >= 1 &&
    maxEndDays <= 30 &&
    Number.isSafeInteger(nowMs) &&
    at !== null &&
    at > nowMs &&
    at - nowMs <= maxEndDays * 86_400_000
  );
}

/** Dedicated v2 discovery only. Filter and deduplicate before the model cap;
 * the legacy expansion and legacy agent discovery remain unchanged. */
export function pmPaperCandidates(
  payload: unknown,
  held: ReadonlySet<string>,
  maxEndDays: number | undefined,
  nowMs: number,
) {
  const response = object(payload);
  if (
    response?.executionModel !== "pm_paper_v2" ||
    !Array.isArray(response.data)
  )
    return [];
  const seen = new Set<string>();
  const selected: Array<
    ReturnType<typeof expandPmMarkets>[number] & {
      nativeMarketKey: string;
      nativeEndAt: string | null;
      nativeEndBasis: "gamma_market_endDate" | "kalshi_market_close_time";
      settlementTimeKnown: false;
    }
  > = [];
  for (const rawEvent of response.data) {
    const event = object(rawEvent);
    if (
      !event ||
      !Array.isArray(event.outcomes) ||
      event.eligible === false ||
      object(event.quality)?.decisionEligible === false
    )
      continue;
    for (const rawOutcome of event.outcomes) {
      const outcome = object(rawOutcome);
      const key = nativeKey(event.source, outcome?.nativeMarket);
      if (
        !outcome ||
        !key ||
        held.has(key) ||
        seen.has(key) ||
        outcome.eligible === false ||
        typeof outcome.probability !== "number" ||
        !Number.isFinite(outcome.probability) ||
        outcome.probability < 0 ||
        outcome.probability > 100 ||
        typeof outcome.externalMarketId !== "string" ||
        !outcome.externalMarketId
      )
        continue;
      const basis =
        event.source === "polymarket"
          ? "gamma_market_endDate"
          : "kalshi_market_close_time";
      const timestamp =
        outcome.nativeEndBasis === basis
          ? nativeEndAt(outcome.nativeEndAt)
          : null;
      const end = timestamp === null ? null : new Date(timestamp).toISOString();
      if (!pmCandidateWithinHorizon({ nativeEndAt: end }, maxEndDays, nowMs))
        continue;
      // Expand one validated native market at a time so the legacy per-event
      // three-outcome cap cannot consume v2's independent twelve-market budget.
      const market = expandPmMarkets(
        { data: [{ ...event, outcomes: [outcome] }] },
        new Set(),
      )[0];
      if (!market) continue;
      seen.add(key);
      selected.push({
        ...market,
        nativeMarketKey: key,
        nativeEndAt: end,
        nativeEndBasis: basis,
        settlementTimeKnown: false,
        endDate: end ?? undefined,
      });
      if (selected.length === 12) return selected;
    }
  }
  return selected;
}
