// Deterministic scorecard engine — pure math over an agent's realized track
// record. The reproducible-evaluation half of coinrithm.agent.scorecard.v1
// (see examples/agents/_shared/scorecard.metrics.yaml + DECISIONS D17).
//
// DETERMINISM CONTRACT: the same inputs always yield the same metrics AND the
// same contentHash (sha256 of the canonicalized result), mirroring
// meta/manifest.lock.json. The engine NEVER calls the network or the model — it
// reads the run-evidence ledger export + realized equity curve (fetched by the
// caller) and computes, so tuning-to-the-metric is structurally impossible
// (leakage separation, arXiv 2512.02227). Every function returns null when there
// is too little data, so a thin record reports "n/a" rather than a fake number.
//
// SCIENTIFIC BASIS: risk-adjusted ratios (Sharpe/Sortino), skill-vs-luck
// deflation (probabilistic + deflated Sharpe, Bailey & Lopez de Prado), and
// calibration (Brier/ECE) for probabilistic calls — the reproducible-evaluation
// layer the field lacks (arXiv 2605.19337).

import { createHash } from "node:crypto";

export interface ScorecardInput {
  // Per-realization realized PnL (mUSD), oldest -> newest. The basis for all
  // trade-level metrics. One entry per closed trade / settled position.
  realizedPnls: number[];
  // Cumulative realized PnL series for max drawdown. Defaults to the running sum
  // of realizedPnls when omitted.
  cumulative?: number[];
  // Per-realization return r_i = realizedPnl_i / accountValueAtOpen_i, if the
  // caller can compute it. When absent, ratio metrics fall back to realizedPnls
  // (a per-trade ratio, not a % return) — flagged via `returnsBasis` in output.
  returns?: number[];
  // sqrt(realizations-per-year) implied by cadence; 1 = report raw (stated).
  annualizationFactor?: number;
  // Number of strategy variants tested, for the deflated-Sharpe multiple-testing
  // penalty. 1 = a single track (no deflation beyond the probabilistic SR).
  trials?: number;
  // Probabilistic calls (prediction-market / confidence agents): predicted prob
  // in [0,1] + the realized binary outcome. Drives Brier + ECE.
  predictions?: Array<{ p: number; outcome: 0 | 1 }>;
  // Gate evidence (0..1 coverage, or boolean), from the run-evidence export.
  gates?: {
    stopCoverage?: number; // opened-with-stop / opened
    evidenceCoverage?: number; // cycles-with-complete-trace / cycles
    leakageClean?: boolean; // every write quoted-before-trade at a decision-time price
  };
}

export interface Scorecard {
  schema: "coinrithm.agent.scorecard.v1";
  sampleSize: number;
  returnsBasis: "returns" | "realized_pnl";
  metrics: Record<string, number | null>;
  contentHash: string;
}

const round = (n: number, d = 6): number => {
  const f = 10 ** d;
  return Math.round(n * f) / f;
};

const sum = (xs: number[]): number => xs.reduce((a, b) => a + b, 0);
const mean = (xs: number[]): number => (xs.length ? sum(xs) / xs.length : 0);

// Sample standard deviation (n-1). null for < 2 points (undefined dispersion).
function sampleStd(xs: number[]): number | null {
  if (xs.length < 2) return null;
  const m = mean(xs);
  const v = sum(xs.map((x) => (x - m) ** 2)) / (xs.length - 1);
  return Math.sqrt(v);
}

// Downside deviation about a 0 minimum-acceptable-return (Sortino denominator).
function downsideDev(xs: number[]): number | null {
  if (xs.length < 2) return null;
  const sq = xs.map((x) => (x < 0 ? x * x : 0));
  return Math.sqrt(sum(sq) / xs.length);
}

// Population moments used by the (probabilistic) Sharpe formula.
function moment(xs: number[], k: number): number {
  const m = mean(xs);
  return sum(xs.map((x) => (x - m) ** k)) / xs.length;
}

// Standard normal CDF via an Abramowitz & Stegun erf approximation (max err ~1e-7).
function normalCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989422804014327 * Math.exp(-(z * z) / 2);
  const p =
    d *
    t *
    (0.31938153 +
      t *
        (-0.356563782 +
          t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return z >= 0 ? 1 - p : p;
}

// Max peak-to-trough drawdown (mUSD, >= 0) on a cumulative series.
function maxDrawdown(cumulative: number[]): number {
  let peak = -Infinity;
  let maxDd = 0;
  for (const c of cumulative) {
    if (!Number.isFinite(c)) continue;
    peak = Math.max(peak, c);
    maxDd = Math.max(maxDd, peak - c);
  }
  return Number.isFinite(maxDd) ? maxDd : 0;
}

// Per-observation Sharpe (mean/std), the basis for the probabilistic SR test.
function rawSharpe(rs: number[]): number | null {
  const sd = sampleStd(rs);
  if (sd == null || sd === 0) return null;
  return mean(rs) / sd;
}

// Probabilistic / deflated Sharpe (Bailey & Lopez de Prado, approximated).
// PSR(SR0) = Phi( (SR - SR0) * sqrt(n-1) / sqrt(1 - skew*SR + ((kurt-1)/4)*SR^2) ).
// Deflation: SR0 = sqrt(2*ln(trials)) / sqrt(n) — the expected max per-obs Sharpe
// of `trials` random strategies (extreme-value heuristic). trials=1 -> SR0=0, so
// it reduces to the probabilistic Sharpe (already penalizing short, skewed tracks).
function deflatedSharpe(rs: number[], trials: number): number | null {
  const n = rs.length;
  if (n < 3) return null;
  const sr = rawSharpe(rs);
  if (sr == null) return null;
  const m2 = moment(rs, 2);
  if (m2 === 0) return null;
  const skew = moment(rs, 3) / m2 ** 1.5;
  const kurt = moment(rs, 4) / m2 ** 2; // 3 for a normal distribution
  const denom = Math.sqrt(
    Math.max(1e-9, 1 - skew * sr + ((kurt - 1) / 4) * sr * sr),
  );
  const sr0 = Math.sqrt(2 * Math.log(Math.max(1, trials))) / Math.sqrt(n);
  const z = ((sr - sr0) * Math.sqrt(n - 1)) / denom;
  return normalCdf(z);
}

// Brier score: mean((p - outcome)^2). Lower = better-calibrated.
function brier(preds: Array<{ p: number; outcome: 0 | 1 }>): number | null {
  if (preds.length === 0) return null;
  return mean(preds.map((x) => (x.p - x.outcome) ** 2));
}

// Expected calibration error over 10 equal-width probability buckets.
function ece(preds: Array<{ p: number; outcome: 0 | 1 }>): number | null {
  if (preds.length === 0) return null;
  const buckets = 10;
  let total = 0;
  for (let b = 0; b < buckets; b += 1) {
    const lo = b / buckets;
    const hi = (b + 1) / buckets;
    const inB = preds.filter((x) =>
      b === buckets - 1 ? x.p >= lo && x.p <= hi : x.p >= lo && x.p < hi,
    );
    if (inB.length === 0) continue;
    const avgP = mean(inB.map((x) => x.p));
    const avgO = mean(inB.map((x) => x.outcome));
    total += (inB.length / preds.length) * Math.abs(avgP - avgO);
  }
  return total;
}

export function computeScorecard(input: ScorecardInput): Scorecard {
  const pnls = input.realizedPnls.filter(Number.isFinite);
  const n = pnls.length;
  const wins = pnls.filter((x) => x > 0);
  const losses = pnls.filter((x) => x < 0);
  const decided = wins.length + losses.length;

  const grossWin = sum(wins);
  const grossLoss = Math.abs(sum(losses));
  const avgWin = wins.length ? grossWin / wins.length : 0;
  const avgLoss = losses.length ? grossLoss / losses.length : 0;
  const pWin = decided ? wins.length / decided : null;

  const rs =
    input.returns && input.returns.length
      ? input.returns.filter(Number.isFinite)
      : pnls;
  const returnsBasis: Scorecard["returnsBasis"] =
    input.returns && input.returns.length ? "returns" : "realized_pnl";
  const ann = input.annualizationFactor ?? 1;
  const cumulative =
    input.cumulative && input.cumulative.length
      ? input.cumulative
      : pnls.reduce<number[]>((acc, x) => {
          acc.push((acc.length ? acc[acc.length - 1]! : 0) + x);
          return acc;
        }, []);

  const sd = sampleStd(rs);
  const dd = downsideDev(rs);
  const sharpe = sd && sd !== 0 ? (mean(rs) / sd) * ann : null;
  const sortino = dd && dd !== 0 ? (mean(rs) / dd) * ann : null;

  const metrics: Record<string, number | null> = {
    realized_pnl_musd: round(sum(pnls)),
    trade_count: n,
    decided_count: decided,
    win_rate: pWin == null ? null : round(pWin),
    expectancy_musd:
      pWin == null ? null : round(pWin * avgWin - (1 - pWin) * avgLoss),
    profit_factor:
      grossLoss > 0 ? round(grossWin / grossLoss) : grossWin > 0 ? null : 0, // null = ∞ (no losses)
    reward_to_risk: avgLoss > 0 ? round(avgWin / avgLoss) : null,
    sharpe: sharpe == null ? null : round(sharpe),
    sortino: sortino == null ? null : round(sortino),
    deflated_sharpe: round0(deflatedSharpe(rs, input.trials ?? 1)),
    max_drawdown_musd: round(maxDrawdown(cumulative)),
    brier_score: round0(brier(input.predictions ?? [])),
    calibration_error: round0(ece(input.predictions ?? [])),
    stop_coverage: input.gates?.stopCoverage ?? null,
    evidence_coverage: input.gates?.evidenceCoverage ?? null,
    leakage_clean:
      input.gates?.leakageClean == null
        ? null
        : input.gates.leakageClean
          ? 1
          : 0,
  };

  // Canonicalize (sorted keys) and hash, so the report card carries a stable,
  // verifiable fingerprint — a scorecard whose hash does not reproduce is not trusted.
  const canonical = JSON.stringify(
    Object.keys(metrics)
      .sort()
      .map((k) => [k, metrics[k]]),
  );
  const contentHash = createHash("sha256").update(canonical).digest("hex");

  return {
    schema: "coinrithm.agent.scorecard.v1",
    sampleSize: n,
    returnsBasis,
    metrics,
    contentHash,
  };
}

function round0(n: number | null): number | null {
  return n == null ? null : round(n);
}
