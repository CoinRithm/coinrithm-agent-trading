import { describe, it, expect } from "vitest";
import { computeScorecard } from "./scorecard.js";

// Golden fixture — a known 5-trade record. These exact values are the
// reproducibility contract: a change here must be a deliberate metric change.
const GOLDEN = [100, -50, 200, -30, 80];

describe("computeScorecard — golden fixture", () => {
  const sc = computeScorecard({ realizedPnls: GOLDEN });

  it("counts trades, wins, losses", () => {
    expect(sc.sampleSize).toBe(5);
    expect(sc.metrics.trade_count).toBe(5);
    expect(sc.metrics.decided_count).toBe(5);
  });

  it("sums realized PnL and win rate", () => {
    expect(sc.metrics.realized_pnl_musd).toBe(300);
    expect(sc.metrics.win_rate).toBeCloseTo(0.6, 6);
  });

  it("profit factor, reward-to-risk, expectancy", () => {
    expect(sc.metrics.profit_factor).toBeCloseTo(4.75, 6); // 380 / 80
    expect(sc.metrics.reward_to_risk).toBeCloseTo(380 / 3 / 40, 5);
    expect(sc.metrics.expectancy_musd).toBeCloseTo(60, 6); // .6*126.67 - .4*40
  });

  it("max drawdown from the implied cumulative curve", () => {
    expect(sc.metrics.max_drawdown_musd).toBe(50); // peak 100 -> trough 50
  });

  it("Sharpe is mean/std of the series (annualizationFactor 1)", () => {
    // mean 60, sample std sqrt(10450) ~= 102.2252 -> ~0.5869
    expect(sc.metrics.sharpe).toBeCloseTo(0.58694, 4);
  });

  it("deflated Sharpe is a probability in [0,1]", () => {
    const v = sc.metrics.deflated_sharpe as number;
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThanOrEqual(1);
  });

  it("emits a 64-hex content hash", () => {
    expect(sc.contentHash).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("computeScorecard — determinism", () => {
  it("same input -> identical hash; different input -> different hash", () => {
    const a = computeScorecard({ realizedPnls: GOLDEN });
    const b = computeScorecard({ realizedPnls: [...GOLDEN] });
    const c = computeScorecard({ realizedPnls: [...GOLDEN, 1] });
    expect(a.contentHash).toBe(b.contentHash);
    expect(a.contentHash).not.toBe(c.contentHash);
  });
});

describe("computeScorecard — edges", () => {
  it("empty record yields n/a metrics, not fake numbers", () => {
    const sc = computeScorecard({ realizedPnls: [] });
    expect(sc.sampleSize).toBe(0);
    expect(sc.metrics.win_rate).toBeNull();
    expect(sc.metrics.sharpe).toBeNull();
    expect(sc.metrics.realized_pnl_musd).toBe(0);
  });

  it("no losses -> profit factor null (infinite) and no reward-to-risk", () => {
    const sc = computeScorecard({ realizedPnls: [10, 20, 5] });
    expect(sc.metrics.profit_factor).toBeNull();
    expect(sc.metrics.reward_to_risk).toBeNull();
  });

  it("calibration: Brier + ECE from probabilistic calls", () => {
    const preds: Array<{ p: number; outcome: 0 | 1 }> = [
      { p: 0.9, outcome: 1 },
      { p: 0.8, outcome: 1 },
      { p: 0.2, outcome: 0 },
      { p: 0.1, outcome: 0 },
    ];
    const sc = computeScorecard({ realizedPnls: [1, -1], predictions: preds });
    expect(sc.metrics.brier_score).toBeCloseTo(0.025, 6); // mean of .01,.04,.04,.01
    expect(sc.metrics.calibration_error as number).toBeGreaterThanOrEqual(0);
    expect(sc.metrics.calibration_error as number).toBeLessThanOrEqual(1);
  });

  it("gates pass through from run evidence", () => {
    const sc = computeScorecard({
      realizedPnls: [5],
      gates: { stopCoverage: 1, evidenceCoverage: 0.97, leakageClean: true },
    });
    expect(sc.metrics.stop_coverage).toBe(1);
    expect(sc.metrics.evidence_coverage).toBe(0.97);
    expect(sc.metrics.leakage_clean).toBe(1);
  });

  it("uses explicit returns + annualization when provided", () => {
    const sc = computeScorecard({
      realizedPnls: [10, -5, 8],
      returns: [0.01, -0.005, 0.008],
      annualizationFactor: 2,
    });
    expect(sc.returnsBasis).toBe("returns");
    expect(sc.metrics.sharpe).not.toBeNull();
  });
});
