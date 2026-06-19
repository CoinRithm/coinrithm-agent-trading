import { describe, it, expect } from "vitest";
import { RateBudget, usesSharedBrain } from "./rateBudget.js";

describe("RateBudget", () => {
  it("starts full and depletes one token per acquire", () => {
    const b = new RateBudget(3, 0);
    expect(b.available(0)).toBe(3);
    expect(b.tryAcquire(0)).toBe(true);
    expect(b.tryAcquire(0)).toBe(true);
    expect(b.tryAcquire(0)).toBe(true);
    // Over budget with no time elapsed -> denied (graceful skip).
    expect(b.tryAcquire(0)).toBe(false);
    expect(b.available(0)).toBe(0);
  });

  it("refills proportionally over time", () => {
    const b = new RateBudget(60, 0); // 60/min == 1/sec
    for (let i = 0; i < 60; i++) b.tryAcquire(0);
    expect(b.tryAcquire(0)).toBe(false);
    // 1 second later -> ~1 token back.
    expect(b.tryAcquire(1000)).toBe(true);
    expect(b.tryAcquire(1000)).toBe(false);
  });

  it("never exceeds capacity even after a long idle", () => {
    const b = new RateBudget(40, 0);
    expect(b.available(60 * 60_000)).toBe(40);
  });

  it("ignores backward / zero time deltas (no negative refill)", () => {
    const b = new RateBudget(5, 1000);
    expect(b.tryAcquire(1000)).toBe(true);
    expect(b.available(500)).toBe(4); // clock went backward -> unchanged
  });
});

describe("usesSharedBrain", () => {
  it("only nvidia WITHOUT a BYO key draws from the shared pool", () => {
    expect(usesSharedBrain("nvidia", false)).toBe(true);
    expect(usesSharedBrain("nvidia", true)).toBe(false); // BYO nvidia key
    expect(usesSharedBrain("anthropic", false)).toBe(false);
    expect(usesSharedBrain("openai", true)).toBe(false);
    expect(usesSharedBrain("groq", false)).toBe(false);
  });
});
