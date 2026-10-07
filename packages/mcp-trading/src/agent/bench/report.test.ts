import { describe, expect, it } from "vitest";
import {
  bootstrapMeanCi,
  calibrateNull,
  chronological,
  jaccard,
  mulberry32,
  roundDeep,
} from "./report.js";

// Standard normal draws from the seeded PRNG (Box-Muller), so the synthetic
// fixture below is identical on every run and every machine.
function normals(seed: number): () => number {
  const rand = mulberry32(seed);
  return () => {
    const u = Math.max(rand(), 1e-12);
    const v = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
}

describe("seeded statistics", () => {
  it("mulberry32 is deterministic per seed and stays in [0, 1)", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const xs = Array.from({ length: 1000 }, () => a());
    expect(xs).toEqual(Array.from({ length: 1000 }, () => b()));
    expect(xs.every((x) => x >= 0 && x < 1)).toBe(true);
    expect(mulberry32(43)()).not.toBe(xs[0]);
  });

  it("bootstraps a deterministic CI around the mean", () => {
    const diffs = [1, 2, 3, 4, 5, 6, 7, 8];
    const ci = bootstrapMeanCi(diffs, 7, 2000)!;
    expect(ci).toEqual(bootstrapMeanCi(diffs, 7, 2000));
    expect(ci[0]).toBeLessThan(4.5);
    expect(ci[1]).toBeGreaterThan(4.5);
    expect(ci[0]).toBeGreaterThanOrEqual(1);
    expect(ci[1]).toBeLessThanOrEqual(8);
    expect(bootstrapMeanCi([], 7, 2000)).toBeNull();
    expect(bootstrapMeanCi([3], 7, 100)).toEqual([3, 3]);
  });

  it("measures action-set overlap with Jaccard (two empty sets agree)", () => {
    expect(jaccard([], [])).toBe(1);
    expect(jaccard(["a"], [])).toBe(0);
    expect(jaccard(["a", "b"], ["b", "c"])).toBeCloseTo(1 / 3, 12);
    expect(jaccard(["a", "a"], ["a"])).toBe(1);
  });

  it("rounds numbers, drops undefined fields and nulls non-finite values", () => {
    expect(
      roundDeep({ a: 0.1 + 0.2, b: [-0.0000001, Infinity], c: undefined }),
    ).toEqual({ a: 0.3, b: [0, null] });
  });

  it("orders cassettes by asOf, then id; unparseable asOf goes last", () => {
    const order = chronological([
      { id: "b", asOf: "2026-10-07T10:00:00Z" },
      { id: "z", asOf: "garbage" },
      { id: "a", asOf: "2026-10-07T10:00:00Z" },
      { id: "c", asOf: "2026-10-06T10:00:00Z" },
    ]).map((c) => c.id);
    expect(order).toEqual(["c", "a", "b", "z"]);
  });
});

describe("calibrated null (seeded A/A resamplings)", () => {
  it("keeps the 95% CI false-positive rate near 5% on a synthetic noisy fixture", () => {
    // 40 cassettes, each with its own level (cassette heterogeneity) and 3
    // repeats of pure noise around it: no variant effect exists by design.
    const draw = normals(2026);
    const fixture = Array.from({ length: 40 }, () => {
      const level = 3 * draw();
      return [level + draw(), level + draw(), level + draw()];
    });
    const result = calibrateNull(fixture, 99, 200, 500);
    expect(result.resamplings).toBe(200);
    expect(result.usableCassettes).toBe(40);
    // Near 5%: not vacuous (some false positives happen by chance) and not
    // badly over-confident. The exact value is deterministic for this seed.
    expect(result.falsePositiveRate).toBeGreaterThan(0.01);
    expect(result.falsePositiveRate).toBeLessThan(0.15);
    expect(calibrateNull(fixture, 99, 200, 500)).toEqual(result);
  });

  it("reports zero false positives for a deterministic variant", () => {
    const flat = Array.from({ length: 10 }, () => [1, 1, 1]);
    expect(calibrateNull(flat, 1)).toEqual({
      resamplings: 200,
      usableCassettes: 10,
      falsePositives: 0,
      falsePositiveRate: 0,
    });
  });

  it("is not computed with fewer than two cassettes that have two repeats", () => {
    expect(calibrateNull([[1, 2], [3]], 1)).toEqual({
      resamplings: 0,
      usableCassettes: 1,
      falsePositives: 0,
      falsePositiveRate: null,
    });
  });
});
