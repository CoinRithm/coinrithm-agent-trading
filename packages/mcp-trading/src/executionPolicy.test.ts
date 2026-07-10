import { describe, expect, it } from "vitest";
import {
  EXECUTION_POLICY_SUMMARY,
  PAPER_EXECUTION_VERSION,
} from "./executionPolicy.js";
import { PAPER_NOTE } from "./tools.js";

// The stale-text regression this guards: a served/tool description that claims
// paper execution charges nothing while the backend charges real modeled costs.
// "costless" is allowed ONLY in the "not costless" affirmation (lookbehind).
const COSTLESS_RE =
  /no fees|no commission|no slippage|without fees|(?<!not )costless|frictionless (?:mid )?fill|free of (?:fees|charge)/i;

describe("execution-policy cost honesty (drift + contract guard)", () => {
  it("pins the mirrored version to paper_execution_v1", () => {
    expect(PAPER_EXECUTION_VERSION).toBe("paper_execution_v1");
  });

  // One contract check per served/generated cost surface in this package: it must
  // NAME the versioned policy and NEVER match the costless regex.
  const surfaces: Array<[string, string]> = [
    ["EXECUTION_POLICY_SUMMARY", EXECUTION_POLICY_SUMMARY],
    ["PAPER_NOTE (served on MCP tool descriptions)", PAPER_NOTE],
  ];
  for (const [name, text] of surfaces) {
    it(`${name}: names the versioned policy and is never costless`, () => {
      expect(text).toContain(PAPER_EXECUTION_VERSION);
      expect(text).not.toMatch(COSTLESS_RE);
    });
  }
});
