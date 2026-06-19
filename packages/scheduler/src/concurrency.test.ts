import { describe, it, expect } from "vitest";
import { withConcurrency } from "./concurrency.js";

describe("withConcurrency", () => {
  it("runs every item exactly once", async () => {
    const seen: number[] = [];
    await withConcurrency([1, 2, 3, 4, 5], 2, async (n) => {
      seen.push(n);
    });
    expect(seen.sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5]);
  });

  it("never exceeds the concurrency limit", async () => {
    let active = 0;
    let maxActive = 0;
    const items = Array.from({ length: 20 }, (_, i) => i);
    await withConcurrency(items, 3, async () => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((r) => setTimeout(r, 5));
      active -= 1;
    });
    expect(maxActive).toBeLessThanOrEqual(3);
    expect(maxActive).toBeGreaterThan(1); // actually parallelized
  });

  it("handles empty input without spawning workers", async () => {
    let called = 0;
    await withConcurrency([], 4, async () => {
      called += 1;
    });
    expect(called).toBe(0);
  });

  it("propagates a throwing task (contract: fn must not throw)", async () => {
    await expect(
      withConcurrency([1], 1, async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
  });
});
