import { describe, it, expect } from "vitest";
import { checkCapabilityDrift } from "./capabilityGuard.js";
import { mergeProseParts, isSkillProseSource } from "./resolve.js";
import { parseSkill } from "./skill.js";
import { parseDecision } from "./decision.js";
import { renderFolderOfOne } from "./templates.js";
import { ACTION_TYPES, AgentSpec, ResolvedAgent, Venue } from "./types.js";
import { actionSchema } from "./decision.js";
import { envFlag } from "./util.js";

const baseSpec = parseSkill(renderFolderOfOne("a", "conservative")).spec;
const specWith = (venues: Venue[]): AgentSpec => ({ ...baseSpec, venues });

function resolvedWith(
  parts: Array<{ source: string; text: string }>,
): ResolvedAgent {
  return {
    inputPath: "x",
    isDirectory: true,
    rawFrontmatter: {},
    mergedProse: "",
    proseParts: parts,
    provenance: { sources: {}, mergeOrder: [], includeOrder: [] },
    contentHashes: {},
  };
}

const codesFor = (
  parts: Array<{ source: string; text: string }>,
  venues: Venue[],
): string[] =>
  checkCapabilityDrift(resolvedWith(parts), specWith(venues)).map(
    (i) => i.code,
  );

const prose = (text: string) => [{ source: "character/skills/x.md", text }];

describe("checkCapabilityDrift", () => {
  it("passes clean prose with no capability identifiers", () => {
    expect(
      codesFor(
        prose("Momentum trend-following on liquid majors. Skip most cycles."),
        ["futures"],
      ),
    ).toEqual([]);
  });

  it("flags an action whose venue the agent has NOT enabled", () => {
    expect(
      codesFor(prose("When the edge is strong, take it with pm_open."), [
        "futures",
      ]),
    ).toEqual(["drift_venue_not_enabled"]);
  });

  it("accepts the same action when the venue IS enabled", () => {
    expect(
      codesFor(prose("When the edge is strong, take it with pm_open."), [
        "futures",
        "pm",
      ]),
    ).toEqual([]);
    expect(
      codesFor(prose("Place the resting bid via spot_order."), ["spot"]),
    ).toEqual([]);
  });

  it("flags an action the runner does not support at all (rot after a removal)", () => {
    // pm_close is action-shaped but not a real runner action.
    expect(
      codesFor(prose("Exit the position with pm_close."), ["futures", "pm"]),
    ).toEqual(["drift_unknown_action"]);
  });

  it("does NOT flag descriptive snake_case that isn't an action verb", () => {
    expect(
      codesFor(
        prose("Watch the spot_price and the futures_curve for divergence."),
        ["futures"],
      ),
    ).toEqual([]);
  });

  it("flags a near-miss cap name in a code span (typo/rename)", () => {
    expect(
      codesFor(prose("Respect the `maxLevrage` cap on every entry."), [
        "futures",
      ]),
    ).toEqual(["drift_unknown_cap"]);
  });

  it("accepts a real cap name in a code span", () => {
    expect(
      codesFor(
        prose(
          "Respect `maxLeverage` and `perTradeMarginMusd` and `minConfidence`.",
        ),
        ["futures"],
      ),
    ).toEqual([]);
  });

  it("does NOT flag an unrelated camelCase identifier far from any cap", () => {
    expect(
      codesFor(prose("Size to your `minEdge`, never to excitement."), [
        "futures",
      ]),
    ).toEqual([]);
  });

  it("flags a bare venue identifier in a code span when not enabled", () => {
    expect(
      codesFor(prose("This tactic only fires on the `pm` venue."), ["futures"]),
    ).toEqual(["drift_venue_not_enabled"]);
  });

  it("ignores references in runtime memory (journal/notes.md)", () => {
    // The journal records history and may recall a venue later disabled.
    const parts = [
      {
        source: "journal/notes.md",
        text: "Yesterday I used pm_open and it resolved against me.",
      },
    ];
    expect(codesFor(parts, ["futures"])).toEqual([]);
  });

  it("dedupes a repeated reference within one source", () => {
    expect(
      codesFor(prose("pm_open here, and pm_open there, and pm_open again."), [
        "futures",
      ]),
    ).toEqual(["drift_venue_not_enabled"]);
  });

  it("scans thesis/persona/keystone prose, not just skills", () => {
    const parts = [
      {
        source: "character/thesis.md",
        text: "My whole edge is the pm_open at the extreme.",
      },
    ];
    expect(codesFor(parts, ["futures"])).toEqual(["drift_venue_not_enabled"]);
  });
});

describe("ACTION_TYPES stays in lockstep with the decision schema", () => {
  // If a runner action is added/removed in decision.ts, this forces ACTION_TYPES
  // (the guard's vocabulary) to be updated too — otherwise the guard would judge
  // drift against a stale list. Each declared action must parse as a real action.
  const minimal: Record<string, Record<string, unknown>> = {
    futures_open: {
      type: "futures_open",
      symbol: "BTC",
      side: "long",
      leverage: 1,
      marginMusd: 1,
    },
    futures_close: { type: "futures_close", positionId: 1 },
    futures_set_sltp: {
      type: "futures_set_sltp",
      positionId: 1,
      stopLossPrice: 1,
    },
    spot_order: {
      type: "spot_order",
      symbol: "BTC",
      side: "buy",
      orderType: "market",
      quantity: 1,
    },
    spot_cancel: { type: "spot_cancel", orderId: 1 },
    pm_open: {
      type: "pm_open",
      source: "k",
      slug: "s",
      outcomeExternalMarketId: "o",
      stakeMusd: 1,
    },
  };

  it("every ACTION_TYPE is a parseable runner action", () => {
    for (const t of ACTION_TYPES) {
      const r = parseDecision(
        JSON.stringify({ decision: "act", actions: [minimal[t]] }),
      );
      expect(r.ok, `${t} should parse as a valid action`).toBe(true);
    }
  });

  it("has exactly one minimal fixture per declared action type", () => {
    expect(Object.keys(minimal).sort()).toEqual([...ACTION_TYPES].sort());
  });

  it("equals the decision schema's action literals exactly (necessity + sufficiency)", () => {
    // Derived from the SAME zod union the runner gates on. If an action is added
    // to or removed from decision.ts, this fails until ACTION_TYPES is updated —
    // closing the meta-drift where the guard's own vocabulary goes stale.
    const schemaTypes = actionSchema.options
      .map(
        (o) => (o as { shape: { type: { value: string } } }).shape.type.value,
      )
      .sort();
    expect(schemaTypes).toEqual([...ACTION_TYPES].sort());
  });
});

describe("skills ablation helpers", () => {
  const parts = [
    { source: "agent.md", text: "keystone body" },
    { source: "character/thesis.md", text: "the thesis" },
    { source: "character/skills/momentum.md", text: "momentum tactic" },
    { source: "journal/notes.md", text: "memory" },
  ];

  it("isSkillProseSource only matches tactic skill files", () => {
    expect(isSkillProseSource("character/skills/momentum.md")).toBe(true);
    expect(isSkillProseSource("character/thesis.md")).toBe(false);
    expect(isSkillProseSource("agent.md")).toBe(false);
  });

  it("dropping skill parts removes only the tactic prose", () => {
    const full = mergeProseParts(parts);
    const ablated = mergeProseParts(
      parts.filter((p) => !isSkillProseSource(p.source)),
    );
    expect(full).toContain("momentum tactic");
    expect(ablated).not.toContain("momentum tactic");
    expect(ablated).toContain("the thesis"); // non-skill prose survives
    expect(ablated).toContain("keystone body");
  });

  it("envFlag reads opt-in truthy values", () => {
    for (const v of ["1", "true", "TRUE", "yes", "on"])
      expect(envFlag(v)).toBe(true);
    for (const v of ["", "0", "false", "no", undefined])
      expect(envFlag(v)).toBe(false);
  });
});
