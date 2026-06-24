import { describe, it, expect } from "vitest";
import { parseDecision } from "./decision.js";

const open = {
  type: "futures_open",
  symbol: "BTC",
  side: "long",
  leverage: 3,
  marginMusd: 100,
  stopLossPrice: 60000,
};

describe("parseDecision", () => {
  it("parses a valid futures_open decision", () => {
    const r = parseDecision(JSON.stringify({ decision: "act", confidence: 0.7, reason: "momentum", actions: [open] }));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.decision.actions[0].type).toBe("futures_open");
  });

  it("parses fenced JSON and a bare skip", () => {
    expect(parseDecision("```json\n{\"decision\":\"skip\"}\n```").ok).toBe(true);
  });

  it("fails on invalid JSON", () => {
    expect(parseDecision("not json at all").ok).toBe(false);
  });

  it("fails on an unknown action type (free-form tool/endpoint)", () => {
    expect(
      parseDecision(JSON.stringify({ decision: "act", actions: [{ type: "http_get", url: "http://x" }] })).ok,
    ).toBe(false);
  });

  it("fails on an extra unknown field in an action", () => {
    expect(parseDecision(JSON.stringify({ decision: "act", actions: [{ ...open, evilField: true }] })).ok).toBe(false);
  });

  it("fails on a missing required action field", () => {
    expect(
      parseDecision(JSON.stringify({ decision: "act", actions: [{ type: "futures_open", symbol: "BTC", side: "long" }] })).ok,
    ).toBe(false);
  });

  it("parses spot and pm actions", () => {
    expect(
      parseDecision(JSON.stringify({ decision: "act", actions: [{ type: "spot_order", symbol: "BTC", side: "buy", orderType: "market", quantity: 0.001 }] })).ok,
    ).toBe(true);
    expect(parseDecision(JSON.stringify({ decision: "act", actions: [{ type: "spot_cancel", orderId: 5 }] })).ok).toBe(true);
    expect(
      parseDecision(JSON.stringify({ decision: "act", actions: [{ type: "pm_open", source: "kalshi", slug: "x", outcomeExternalMarketId: "y", stakeMusd: 10 }] })).ok,
    ).toBe(true);
  });

  it("coerces stringified numbers from small models (the Arena positionId bug)", () => {
    const close = parseDecision(JSON.stringify({ decision: "act", actions: [{ type: "futures_close", positionId: "12345" }] }));
    expect(close.ok).toBe(true);
    if (close.ok) {
      const a = close.decision.actions[0] as { positionId: number };
      expect(a.positionId).toBe(12345);
      expect(typeof a.positionId).toBe("number");
    }
    const opened = parseDecision(
      JSON.stringify({ decision: "act", confidence: "0.8", actions: [{ ...open, leverage: "3", marginMusd: "100" }] }),
    );
    expect(opened.ok).toBe(true);
    if (opened.ok) {
      const a = opened.decision.actions[0] as { leverage: number; marginMusd: number };
      expect(a.leverage).toBe(3);
      expect(a.marginMusd).toBe(100);
      expect(opened.decision.confidence).toBe(0.8);
    }
  });

  it("still fails closed on a non-numeric string where a number is required", () => {
    expect(parseDecision(JSON.stringify({ decision: "act", actions: [{ type: "futures_close", positionId: "pos#5" }] })).ok).toBe(false);
    expect(parseDecision(JSON.stringify({ decision: "act", actions: [{ type: "futures_close", positionId: "" }] })).ok).toBe(false);
  });
});
