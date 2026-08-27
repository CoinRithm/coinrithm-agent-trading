import { describe, it, expect } from "vitest";
import { DECISION_JSON_SCHEMA, parseDecision } from "./decision.js";

const open = {
  type: "futures_open",
  symbol: "BTC",
  side: "long",
  leverage: 3,
  marginMusd: 100,
  stopLossPrice: 60000,
};

describe("parseDecision", () => {
  it("publishes a provider contract that makes act-without-actions impossible", () => {
    const conditions = DECISION_JSON_SCHEMA.allOf;
    expect(conditions[0].then.properties.actions.minItems).toBe(1);
    expect(conditions[1].then.properties.actions.maxItems).toBe(0);
    expect(DECISION_JSON_SCHEMA.properties.actions.items.oneOf).toHaveLength(6);
  });

  it("parses a valid futures_open decision", () => {
    const r = parseDecision(
      JSON.stringify({
        decision: "act",
        confidence: 0.7,
        reason: "momentum",
        actions: [open],
      }),
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.decision.actions[0].type).toBe("futures_open");
  });

  it("normalizes decision-verb synonyms (manage/trade -> act, hold/wait -> skip)", () => {
    // Weak/instruct models answer with a natural-language verb instead of the
    // strict enum, which used to fail-closed the WHOLE cycle (live: Carl /
    // Nemotron returning "manage" repeatedly).
    const manage = parseDecision(
      JSON.stringify({ decision: "manage", actions: [open] }),
    );
    expect(manage.ok).toBe(true);
    if (manage.ok) {
      expect(manage.decision.decision).toBe("act");
      expect(manage.decision.actions[0].type).toBe("futures_open");
    }
    for (const verb of ["trade", "MANAGE", "adjust", "open"]) {
      const r = parseDecision(
        JSON.stringify({ decision: verb, actions: [open] }),
      );
      expect(r.ok && r.decision.decision).toBe("act");
    }
    for (const verb of ["hold", "wait", "monitor", "NOTHING"]) {
      const r = parseDecision(JSON.stringify({ decision: verb, actions: [] }));
      expect(r.ok && r.decision.decision).toBe("skip");
    }
  });

  it("still rejects an unrecognised decision verb (no silent coercion)", () => {
    expect(
      parseDecision(JSON.stringify({ decision: "yolo", actions: [] })).ok,
    ).toBe(false);
  });

  it("parses fenced JSON and a bare skip", () => {
    expect(parseDecision('```json\n{"decision":"skip"}\n```').ok).toBe(true);
  });

  it("fails on invalid JSON", () => {
    expect(parseDecision("not json at all").ok).toBe(false);
  });

  it("fails on an unknown action type (free-form tool/endpoint)", () => {
    expect(
      parseDecision(
        JSON.stringify({
          decision: "act",
          actions: [{ type: "http_get", url: "http://x" }],
        }),
      ).ok,
    ).toBe(false);
  });

  it("fails on an extra unknown field in an action", () => {
    expect(
      parseDecision(
        JSON.stringify({
          decision: "act",
          actions: [{ ...open, evilField: true }],
        }),
      ).ok,
    ).toBe(false);
  });

  it("fails on a missing required action field", () => {
    expect(
      parseDecision(
        JSON.stringify({
          decision: "act",
          actions: [{ type: "futures_open", symbol: "BTC", side: "long" }],
        }),
      ).ok,
    ).toBe(false);
  });

  it("parses spot and pm actions", () => {
    expect(
      parseDecision(
        JSON.stringify({
          decision: "act",
          actions: [
            {
              type: "spot_order",
              symbol: "BTC",
              side: "buy",
              orderType: "market",
              quantity: 0.001,
            },
          ],
        }),
      ).ok,
    ).toBe(true);
    expect(
      parseDecision(
        JSON.stringify({
          decision: "act",
          actions: [{ type: "spot_cancel", orderId: 5 }],
        }),
      ).ok,
    ).toBe(true);
    expect(
      parseDecision(
        JSON.stringify({
          decision: "act",
          actions: [
            {
              type: "pm_open",
              source: "kalshi",
              slug: "x",
              outcomeExternalMarketId: "y",
              stakeMusd: 10,
            },
          ],
        }),
      ).ok,
    ).toBe(true);
    // ref-only pm_open (the new short-ref form) parses — the runner resolves the ref.
    expect(
      parseDecision(
        JSON.stringify({
          decision: "act",
          actions: [{ type: "pm_open", ref: "pm3", stakeMusd: 10 }],
        }),
      ).ok,
    ).toBe(true);
  });

  it("coerces stringified numbers from small models (the Arena positionId bug)", () => {
    const close = parseDecision(
      JSON.stringify({
        decision: "act",
        actions: [{ type: "futures_close", positionId: "12345" }],
      }),
    );
    expect(close.ok).toBe(true);
    if (close.ok) {
      const a = close.decision.actions[0] as { positionId: number };
      expect(a.positionId).toBe(12345);
      expect(typeof a.positionId).toBe("number");
    }
    const opened = parseDecision(
      JSON.stringify({
        decision: "act",
        confidence: "0.8",
        actions: [{ ...open, leverage: "3", marginMusd: "100" }],
      }),
    );
    expect(opened.ok).toBe(true);
    if (opened.ok) {
      const a = opened.decision.actions[0] as {
        leverage: number;
        marginMusd: number;
      };
      expect(a.leverage).toBe(3);
      expect(a.marginMusd).toBe(100);
      expect(opened.decision.confidence).toBe(0.8);
    }
  });

  it("still fails closed on a non-numeric string where a number is required", () => {
    expect(
      parseDecision(
        JSON.stringify({
          decision: "act",
          actions: [{ type: "futures_close", positionId: "pos#5" }],
        }),
      ).ok,
    ).toBe(false);
    expect(
      parseDecision(
        JSON.stringify({
          decision: "act",
          actions: [{ type: "futures_close", positionId: "" }],
        }),
      ).ok,
    ).toBe(false);
  });

  describe("pm_open forecastProbability (independent forecast, tolerant parse)", () => {
    const pm = (extra: Record<string, unknown>) =>
      parseDecision(
        JSON.stringify({
          decision: "act",
          actions: [{ type: "pm_open", ref: "pm2", stakeMusd: 10, ...extra }],
        }),
      );

    it("parses a numeric forecastProbability onto the pm_open action", () => {
      const r = pm({ forecastProbability: 62 });
      expect(r.ok).toBe(true);
      if (r.ok) {
        const a = r.decision.actions[0] as { forecastProbability?: number };
        expect(a.forecastProbability).toBe(62);
      }
    });

    it("coerces a stringified forecastProbability from weak models", () => {
      const r = pm({ forecastProbability: "62.5" });
      expect(r.ok).toBe(true);
      if (r.ok) {
        const a = r.decision.actions[0] as { forecastProbability?: number };
        expect(a.forecastProbability).toBe(62.5);
      }
    });

    it("tolerates a non-numeric forecast: field omitted, action STILL parses (never blocks the trade)", () => {
      const r = pm({ forecastProbability: "not-a-number" });
      expect(r.ok).toBe(true);
      if (r.ok) {
        const a = r.decision.actions[0] as { forecastProbability?: number };
        expect(a.forecastProbability).toBeUndefined();
        // the trade itself is intact
        expect(a).toMatchObject({ type: "pm_open", stakeMusd: 10 });
      }
    });

    it("passes an out-of-range forecast THROUGH (the runner clamps, not the parser)", () => {
      const r = pm({ forecastProbability: 150 });
      expect(r.ok).toBe(true);
      if (r.ok) {
        const a = r.decision.actions[0] as { forecastProbability?: number };
        expect(a.forecastProbability).toBe(150);
      }
    });

    it("omits the field entirely when the model does not forecast", () => {
      const r = pm({});
      expect(r.ok).toBe(true);
      if (r.ok) {
        const a = r.decision.actions[0] as { forecastProbability?: number };
        expect(a.forecastProbability).toBeUndefined();
      }
    });
  });
});

describe("action confidence tolerance (fleet fail-closed fix, 2026-08-19)", () => {
  it("accepts the confidence key on futures_set_sltp and spot_cancel instead of fail-closing the whole decision", () => {
    // Exact observed failing shape: the contract asks for per-action
    // confidence, models copy it onto EVERY action, and the two schemas
    // without the key discarded the entire decision under .strict().
    const out = parseDecision(
      JSON.stringify({
        decision: "act",
        confidence: 0.7,
        reason: "manage",
        actions: [
          {
            type: "futures_set_sltp",
            positionId: 12,
            stopLossPrice: 100,
            confidence: 0.7,
          },
          { type: "spot_cancel", orderId: 4, confidence: "0.6" },
        ],
      }),
    );
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.decision.actions).toHaveLength(2);
      expect(out.decision.actions[0].type).toBe("futures_set_sltp");
      expect(out.decision.actions[1].type).toBe("spot_cancel");
    }
  });
});
