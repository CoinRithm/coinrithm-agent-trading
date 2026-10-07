// Synthetic execution costs for the bench's replayed quotes.
//
// A quote depends on the action the agent proposes (which outcome, which stake,
// which leverage), so it can never be recorded ahead of time: a cassette only
// holds the READ inputs of a cycle. On replay the bench therefore synthesizes
// every quote from recorded evidence (the discover probability of the chosen PM
// outcome, the recorded market price of a coin) plus the cost model below. Every
// synthesized quote is counted in the report; it is a fidelity limit, not a
// silent substitute for the paper engine.
//
// What the cost model covers and what it leaves out, stated plainly:
//   - PM: the published fee SHAPE only. openapi.yaml ("Paper Execution Realism
//     v1") documents a Polymarket-shaped taker fee of about 1.8% near a 50%
//     price and about 0 at the extremes. That is modelled as
//     PM_SYNTHETIC_FEE_RATE_AT_MID * 4p(1-p) of the price paid. The ask spread
//     and the size-scaled slippage the paper engine adds are NOT modelled, so a
//     synthesized PM cost is slightly optimistic (cheaper than a real quote).
//   - Futures and spot: a flat taker fee on notional. The paper engine discloses
//     its own feeBps per quote, which a cassette cannot contain, so the bench
//     uses the runner's own conservative pre-quote estimate
//     (CAPITAL_FEE_BUFFER_BPS). Funding, spread and slippage are not modelled.

import { CAPITAL_FEE_BUFFER_BPS } from "../capitalSizing.js";

/** Fee fraction of the price paid at a 50% PM price (openapi.yaml: ~1.8%). */
export const PM_SYNTHETIC_FEE_RATE_AT_MID = 0.018;
/** Flat futures taker fee (bps of notional) used for synthesized quotes. */
export const FUTURES_SYNTHETIC_FEE_BPS = CAPITAL_FEE_BUFFER_BPS;
/** Flat spot taker fee (bps of notional) used for synthesized quotes. */
export const SPOT_SYNTHETIC_FEE_BPS = CAPITAL_FEE_BUFFER_BPS;

/**
 * Synthetic PM fee in probability POINTS for an outcome priced at
 * `probabilityPoints` (0..100). Zero at the extremes, largest at 50.
 */
export function pmSyntheticFeePoints(probabilityPoints: number): number {
  const p = probabilityPoints / 100;
  return probabilityPoints * PM_SYNTHETIC_FEE_RATE_AT_MID * 4 * p * (1 - p);
}

export interface SyntheticPmQuote {
  /** Raw chosen-outcome probability in points: the value the floor checks. */
  entryProbability: number;
  feePoints: number;
  /** Fee-inclusive break-even cost in points (entry + fee). */
  costPoints: number;
  stakeMusd: number;
  /** Net shares: stake / (cost / 100). One share pays 1 mUSD on a win. */
  sharesEstimate: number;
}

/**
 * The PM quote the bench serves for a recorded outcome probability. Returns
 * undefined for a probability the paper engine could not fill (0, 100, or not
 * a finite number in range) or a non-positive stake, so the caller reports an
 * ineligible quote instead of dividing by zero.
 */
export function synthesizePmQuote(
  probabilityPoints: number,
  stakeMusd: number,
): SyntheticPmQuote | undefined {
  if (
    !Number.isFinite(probabilityPoints) ||
    probabilityPoints <= 0 ||
    probabilityPoints >= 100 ||
    !Number.isFinite(stakeMusd) ||
    stakeMusd <= 0
  ) {
    return undefined;
  }
  const feePoints = pmSyntheticFeePoints(probabilityPoints);
  const costPoints = probabilityPoints + feePoints;
  return {
    entryProbability: probabilityPoints,
    feePoints,
    costPoints,
    stakeMusd,
    sharesEstimate: stakeMusd / (costPoints / 100),
  };
}
