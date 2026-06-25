// Resolve a short pm ref (pm1…pmN) on a pm_open action back to the canonical
// {source, slug, outcomeExternalMarketId} triple, using the cycle's discovered
// pmMarkets. This is the reliability fix for prediction-market trading: small
// free models (Llama 3.1 8B) reliably copy a 3-char ref but mis-copy the long
// outcomeExternalMarketId, which previously made every PM open fail closed with
// pm_market_not_discovered. The prompt now asks the model for a ref; the runner
// resolves it here BEFORE validation so the validator/act phase still see the
// full triple they require.
//
// Back-compat: a model that sends the full triple (no ref) passes through
// unchanged. Robustness: a model that drops the ref into one of the id fields
// (a common 8B mistake) is still detected and resolved.

import { PmMarket, ProposedAction } from "./types.js";

type PmOpen = Extract<ProposedAction, { type: "pm_open" }>;

export type PmRefResolution =
  | { ok: true; action: PmOpen }
  | { ok: false; code: string; reason: string };

const REF_RE = /^pm\d+$/i;

const trimLower = (v: unknown): string =>
  typeof v === "string" ? v.trim().toLowerCase() : "";

// Find a pmN-shaped token the model may have placed in `ref` or — for sloppy
// small models — in one of the id fields. Real Kalshi/Polymarket ids are long
// hex/uuid strings and never match /^pm\d+$/, so this can't false-positive on a
// genuine id.
function extractRef(action: PmOpen): string | undefined {
  const candidates = [
    action.ref,
    action.outcomeExternalMarketId,
    action.slug,
    action.source,
  ];
  for (const c of candidates) {
    const t = trimLower(c);
    if (REF_RE.test(t)) return t;
  }
  return undefined;
}

export function resolvePmRef(
  action: PmOpen,
  pmMarkets: PmMarket[],
): PmRefResolution {
  const ref = extractRef(action);

  if (ref) {
    const mkt = pmMarkets.find((m) => trimLower(m.ref) === ref);
    if (!mkt) {
      const known = pmMarkets.length
        ? `pm1..pm${pmMarkets.length}`
        : "(none discovered this cycle)";
      return {
        ok: false,
        code: "pm_ref_unknown",
        reason: `ref ${ref} is not one of this cycle's listed PM markets ${known}`,
      };
    }
    // Canonicalise: take the triple from the matched market, drop the ref.
    return {
      ok: true,
      action: {
        ...action,
        ref: undefined,
        source: mkt.source,
        slug: mkt.slug,
        outcomeExternalMarketId: mkt.outcomeExternalMarketId,
      },
    };
  }

  // No ref: require the full back-compat triple. Empty/missing → reject with a
  // clear, model-actionable message rather than a downstream crash.
  if (action.source && action.slug && action.outcomeExternalMarketId) {
    return { ok: true, action };
  }
  return {
    ok: false,
    code: "pm_ref_missing",
    reason:
      "pm_open needs a ref (pmN) copied from one observation.pmMarkets entry, or the full source+slug+outcomeExternalMarketId",
  };
}
