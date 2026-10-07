// Replay side of the bench: a real CoinRithmClient whose transport serves a
// cassette instead of the network.
//
// Reads are served byte-for-byte from the cassette by canonical request key.
// A read that is NOT in the cassette is never filled in: it answers 599
// not_recorded and is counted as a missing input, so a variant that needs
// data the recording never fetched (a different watchlist, a capability the
// recorded agent lacked) shows up in the report instead of silently seeing
// an empty market.
//
// Quotes are the one thing a cassette cannot hold, because they depend on the
// action the variant proposes. They are synthesized deterministically from
// recorded evidence (costs.ts) and every one is counted. Any other non-GET is
// refused with 599 bench_write_refused: replay runs dry-run, so a write
// attempt means a runner change the bench must surface, not forward.

import { CoinRithmClient } from "../client.js";
import { asArr, asNum, asObj, asStr } from "../extract.js";
import { freshnessOf } from "../pmContext.js";
import { canonicalRequest, Cassette, RecordedResponse } from "./cassette.js";
import {
  FUTURES_SYNTHETIC_FEE_BPS,
  SPOT_SYNTHETIC_FEE_BPS,
  synthesizePmQuote,
} from "./costs.js";
import {
  FetchInit,
  FetchInput,
  jsonResponse,
  urlOf,
  writeRefusedResponse,
} from "./recordingClient.js";

export const REPLAY_BASE_URL = "https://bench-replay.invalid";
export const NOT_RECORDED_STATUS = 599;

const NULL_BODY_STATUS = new Set([204, 205, 304]);

export interface SynthesizedQuote {
  venue: "pm" | "futures" | "spot";
  /** source/slug/outcome for PM, coinId for futures and spot. */
  subject: string;
  eligible: boolean;
  /** What the price came from, or why the quote was ineligible. */
  basis: string;
}

export interface ReplayStats {
  served: number;
  /** Canonical keys of reads the cassette did not contain (in call order). */
  missing: string[];
  synthesizedQuotes: SynthesizedQuote[];
  refusedWrites: string[];
}

// Each client gets its own credential, so observe()'s per-credential
// calibration cache can never hand one cassette's read to another.
let replayNonce = 0;

interface RecordedPmOutcome {
  probability?: number;
  freshness: string;
  eligible: boolean;
}

/**
 * The chosen PM outcome as the recording's discover reads reported it. Every
 * recorded discover page is searched in key order (deterministic); the first
 * match wins. Mirrors observe()'s expandPmMarkets field fallbacks.
 */
export function findRecordedPmOutcome(
  cassette: Cassette,
  source: string,
  slug: string,
  outcomeExternalMarketId: string,
): RecordedPmOutcome | undefined {
  for (const r of cassette.responses) {
    if (r.path !== "/api/agent/pm/discover" || !r.ok) continue;
    const page = asObj(r.data);
    for (const event of asArr(page.data ?? page.markets ?? page.results)) {
      const ev = asObj(event);
      if ((asStr(ev.source) ?? "").toLowerCase() !== source) continue;
      if ((asStr(ev.slug) ?? "").toLowerCase() !== slug) continue;
      const outcomes = Object.hasOwn(ev, "outcomes")
        ? asArr(ev.outcomes)
        : [ev];
      for (const outcome of outcomes) {
        const o = asObj(outcome);
        const id =
          asStr(o.externalMarketId) ?? asStr(o.outcomeExternalMarketId);
        if (id !== outcomeExternalMarketId) continue;
        const p = asNum(o.probability);
        return {
          probability: p !== undefined && p >= 0 && p <= 100 ? p : undefined,
          freshness: freshnessOf(ev)?.status ?? "fresh",
          eligible: ev.eligible !== false && o.eligible !== false,
        };
      }
    }
  }
  return undefined;
}

/** The recorded /market price and freshness for a coin, if it was read. */
export function findRecordedPrice(
  cassette: Cassette,
  coinId: string,
): { priceUsd?: number; freshness: string } | undefined {
  const path = canonicalRequest(
    "GET",
    `${REPLAY_BASE_URL}/api/agent/market/${encodeURIComponent(coinId)}`,
  ).path;
  const hit = cassette.responses.find((r) => r.path === path && r.ok);
  if (!hit) return undefined;
  const m = asObj(hit.data);
  const price = asNum(asObj(m.price).usd);
  return {
    priceUsd: price !== undefined && price > 0 ? price : undefined,
    freshness: freshnessOf(asObj(m.observation))?.status ?? "fresh",
  };
}

interface Synthesized {
  response: Record<string, unknown>;
  evidence: SynthesizedQuote;
}

function ineligible(
  venue: SynthesizedQuote["venue"],
  subject: string,
  reason: string,
  freshness = "fresh",
): Synthesized {
  return {
    response: {
      eligible: false,
      blockReasons: [reason],
      observation: { freshness: { status: freshness } },
      synthetic: true,
    },
    evidence: { venue, subject, eligible: false, basis: reason },
  };
}

function synthesizePm(
  cassette: Cassette,
  body: Record<string, unknown>,
): Synthesized {
  const source = (asStr(body.source) ?? "").toLowerCase();
  const slug = (asStr(body.slug) ?? "").toLowerCase();
  const outcome = asStr(body.outcomeExternalMarketId) ?? "";
  const subject = `${source}/${slug}/${outcome}`;
  const found = findRecordedPmOutcome(cassette, source, slug, outcome);
  if (!found || found.probability === undefined)
    return ineligible("pm", subject, "entry_price_unavailable");
  if (!found.eligible)
    return ineligible("pm", subject, "recorded_outcome_ineligible");
  // NOTE: the server also applies minEntryProbabilityPct inside the quote
  // (blockReasons entry_below_floor). The synthesized quote does not, so the
  // runner's own validator applies the same floor and reports
  // pm_entry_below_floor where production reports quote_ineligible. Both
  // reject the same action.
  const quote = synthesizePmQuote(
    found.probability,
    asNum(body.stakeMusd) ?? 0,
  );
  if (!quote)
    return ineligible("pm", subject, "synthetic_unfillable", found.freshness);
  const freshness = { status: found.freshness };
  return {
    response: {
      eligible: true,
      blockReasons: [],
      fillBasis: "outcome_probability",
      side: "yes",
      entryProbability: quote.entryProbability,
      stakeMusd: quote.stakeMusd,
      sharesEstimate: quote.sharesEstimate,
      maxPayout: quote.sharesEstimate,
      minStake: 10,
      freshness,
      observation: { freshness },
      openBlocked: false,
      openBlockReasons: [],
      synthetic: true,
    },
    evidence: {
      venue: "pm",
      subject,
      eligible: true,
      basis: "recorded_discover_probability",
    },
  };
}

function synthesizeCoin(
  venue: "futures" | "spot",
  cassette: Cassette,
  body: Record<string, unknown>,
): Synthesized {
  const coinId = asStr(body.coinId) ?? "";
  const found = findRecordedPrice(cassette, coinId);
  if (!found || found.priceUsd === undefined)
    return ineligible(venue, coinId, "entry_price_unavailable");
  const freshness = { status: found.freshness };
  const evidence: SynthesizedQuote = {
    venue,
    subject: coinId,
    eligible: true,
    basis: "recorded_market_price",
  };
  const price = found.priceUsd;
  if (venue === "spot") {
    const quantity = asNum(body.quantity);
    if (quantity === undefined || quantity <= 0)
      return ineligible(venue, coinId, "invalid_size", found.freshness);
    const cost = price * quantity;
    return {
      response: {
        eligible: true,
        blockReasons: [],
        executionPrice: price,
        estimatedCostMusd: cost,
        estimatedFeeMusd: (cost * SPOT_SYNTHETIC_FEE_BPS) / 10_000,
        observation: { freshness },
        synthetic: true,
      },
      evidence,
    };
  }
  const margin = asNum(body.marginMusd);
  const leverage = asNum(body.leverage);
  if (
    margin === undefined ||
    leverage === undefined ||
    margin <= 0 ||
    leverage <= 0
  )
    return ineligible(venue, coinId, "invalid_size", found.freshness);
  const entryFee = (margin * leverage * FUTURES_SYNTHETIC_FEE_BPS) / 10_000;
  return {
    response: {
      eligible: true,
      blockReasons: [],
      entryPrice: price,
      executionModel: {
        version: "bench_synthetic_v1",
        feeBps: FUTURES_SYNTHETIC_FEE_BPS,
        estimatedEntryFeeMusd: entryFee,
      },
      cashRequiredMusd: margin + entryFee,
      observation: { freshness },
      synthetic: true,
    },
    evidence,
  };
}

function bodyOf(init?: FetchInit): Record<string, unknown> {
  const body = init?.body;
  if (typeof body !== "string") return {};
  try {
    return asObj(JSON.parse(body));
  } catch {
    return {};
  }
}

function replayResponse(hit: RecordedResponse): Response {
  const text =
    typeof hit.data === "string" ? hit.data : JSON.stringify(hit.data);
  return new Response(NULL_BODY_STATUS.has(hit.status) ? null : text, {
    status: hit.status,
    headers: { "content-type": "application/json" },
  });
}

/** A production CoinRithmClient that answers from one cassette. */
export class ReplayClient extends CoinRithmClient {
  readonly stats: ReplayStats;

  constructor(cassette: Cassette) {
    const stats: ReplayStats = {
      served: 0,
      missing: [],
      synthesizedQuotes: [],
      refusedWrites: [],
    };
    const index = new Map(cassette.responses.map((r) => [r.key, r]));
    const replay = async (
      input: FetchInput,
      init?: FetchInit,
    ): Promise<Response> => {
      const req = canonicalRequest(init?.method ?? "GET", urlOf(input));
      if (req.method === "GET") {
        const hit = index.get(req.key);
        if (!hit) {
          stats.missing.push(req.key);
          return jsonResponse(NOT_RECORDED_STATUS, {
            error: "not_recorded",
            key: req.key,
          });
        }
        // Reproduce a recorded transport failure as one (the client maps it
        // to status 0 network_error, exactly as it did while recording).
        if (hit.transportError) throw new TypeError("recorded transport error");
        stats.served += 1;
        return replayResponse(hit);
      }
      const venue =
        req.path === "/api/agent/pm/quote"
          ? "pm"
          : req.path === "/api/agent/futures/quote"
            ? "futures"
            : req.path === "/api/agent/spot/quote"
              ? "spot"
              : undefined;
      if (!venue) {
        stats.refusedWrites.push(req.key);
        return writeRefusedResponse();
      }
      const synthesized =
        venue === "pm"
          ? synthesizePm(cassette, bodyOf(init))
          : synthesizeCoin(venue, cassette, bodyOf(init));
      stats.synthesizedQuotes.push(synthesized.evidence);
      return jsonResponse(200, synthesized.response);
    };
    replayNonce += 1;
    super({
      apiKey: `bench-replay-${replayNonce}`,
      baseUrl: REPLAY_BASE_URL,
      fetchFn: replay as typeof fetch,
      // A recorded 429 is replayed once, never retried with real waits.
      maxRetries: 0,
      sleepFn: async () => {},
    });
    this.stats = stats;
  }
}
