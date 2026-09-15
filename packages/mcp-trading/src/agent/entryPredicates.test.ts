import { describe, it, expect } from "vitest";
import {
  entryPredicateIssues,
  checkEntryPredicates,
  type EntryPredicate,
} from "./entryPredicates.js";
import { buildSpec, parseSkill } from "./skill.js";
import { validateSkill } from "./skillValidator.js";
import { renderFolderOfOne } from "./templates.js";
import type { Observation, ProposedAction } from "./types.js";

const rule: EntryPredicate = {
  side: "short",
  metric: "change1h",
  operator: "gte",
  threshold: 2,
  maxAgeSeconds: 60,
};
const action: ProposedAction = {
  type: "futures_open",
  side: "short",
  symbol: "BTC",
  leverage: 1,
  marginMusd: 10,
};
function check(
  rules: unknown = [rule],
  watch: unknown = {
    symbol: "BTC",
    change1h: 2,
    change24h: -2,
    freshness: { status: "fresh", ageSeconds: 0 },
  },
  asOf = new Date().toISOString(),
  proposed = action,
) {
  const spec = buildSpec({ risk: { entryPredicates: rules } });
  return checkEntryPredicates(proposed, spec, {
    asOf,
    watch: watch ? [watch] : [],
  } as Observation);
}
describe("entry conditions", () => {
  it.each([
    null,
    {},
    [],
    Array(17).fill(rule),
    [null],
    [[]],
    [{ ...rule, extra: 1 }],
    [{ ...rule, side: "both" }],
    [{ ...rule, metric: "modelConfidence" }],
    [{ ...rule, operator: "gt" }],
    [{ ...rule, threshold: "2" }],
    [{ ...rule, threshold: NaN }],
    [{ ...rule, maxAgeSeconds: "60" }],
    [{ ...rule, maxAgeSeconds: Infinity }],
    [{ ...rule, maxAgeSeconds: 0 }],
  ])("fails closed on malformed explicit rules: %j", (raw) => {
    expect(entryPredicateIssues(raw).length).toBeGreaterThan(0);
    expect(check(raw).code).toBe("entry_predicate_config");
  });
  it("validates explicit policies at load time and preserves them in the compiled spec", () => {
    const parsed = parseSkill(renderFolderOfOne("predicate", "conservative"));
    (parsed.raw.risk as Record<string, unknown>).entryPredicates = [rule];
    expect(validateSkill(parsed).valid).toBe(true);
    expect(buildSpec(parsed.raw).risk.entryPredicates).toEqual([rule]);
    (parsed.raw.risk as Record<string, unknown>).entryPredicates = [
      { ...rule, threshold: "2" },
    ];
    expect(
      validateSkill(parsed).issues.some(
        (issue) => issue.code === "entry_predicate_config",
      ),
    ).toBe(true);
  });
  it("ANDs matching predicates, with inclusive signed percentage boundaries", () => {
    expect(check().valid).toBe(true);
    expect(
      check([{ ...rule, metric: "change24h", operator: "lte", threshold: -2 }])
        .valid,
    ).toBe(true);
    expect(check([rule, { ...rule, threshold: 3 }]).code).toBe(
      "entry_predicate_false",
    );
    expect(check([{ ...rule, operator: "lte", threshold: 1 }]).code).toBe(
      "entry_predicate_false",
    );
  });
  it.each([
    null,
    { symbol: "ETH" },
    { symbol: "BTC" },
    {
      symbol: "BTC",
      change1h: 2,
      freshness: { status: "stale", ageSeconds: 0 },
    },
    ...[undefined, NaN, -1, 61].map((ageSeconds) => ({
      symbol: "BTC",
      change1h: 2,
      freshness: { status: "fresh", ageSeconds },
    })),
    ...[undefined, "2", NaN].map((change1h) => ({
      symbol: "BTC",
      change1h,
      freshness: { status: "fresh", ageSeconds: 0 },
    })),
  ])("requires finite fresh evidence: %j", (watch) => {
    expect(check([rule], watch).code).toBe("entry_predicate_evidence");
  });
  it("ages evidence while inference runs and rejects unknown observation time", () => {
    expect(check([rule], undefined, "invalid").code).toBe(
      "entry_predicate_evidence",
    );
    expect(
      check([rule], undefined, new Date(Date.now() - 61_000).toISOString())
        .code,
    ).toBe("entry_predicate_evidence");
  });
  it("applies long conditions to spot buys; leaves unmatched directions and risk reduction alone", () => {
    expect(check([{ ...rule, side: "long", threshold: 3 }]).valid).toBe(true);
    expect(
      check([{ ...rule, side: "long", threshold: 3 }], undefined, undefined, {
        type: "spot_order",
        side: "buy",
        symbol: "BTC",
        orderType: "market",
        quantity: 1,
      }).code,
    ).toBe("entry_predicate_false");
    expect(
      check(null, null, "invalid", { type: "futures_close", positionId: 1 })
        .valid,
    ).toBe(true);
    expect(
      check(null, null, "invalid", {
        type: "spot_order",
        side: "sell",
        symbol: "BTC",
        orderType: "market",
        quantity: 1,
      }).valid,
    ).toBe(true);
    expect(
      checkEntryPredicates(action, buildSpec({}), {} as Observation).valid,
    ).toBe(true);
  });
});
