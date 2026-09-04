import { describe, expect, it } from "vitest";
import { agentPinsModel } from "./runtime.js";

// `spec` is jsonb written by the studio and can be anything. A malformed spec
// must never silently pin an agent, because a pinned agent skips a cycle rather
// than failing over, and stranding a live agent is worse than a mixed model.
describe("agentPinsModel", () => {
  it("pins only on an explicit true", () => {
    expect(agentPinsModel({ pinnedModel: true })).toBe(true);
  });

  it("does not pin on anything truthy-but-not-true", () => {
    for (const v of ["true", 1, {}, [], "yes"]) {
      expect(agentPinsModel({ pinnedModel: v })).toBe(false);
    }
  });

  it("does not pin on a missing, null or non-object spec", () => {
    for (const v of [undefined, null, "", 0, "pinnedModel", 42]) {
      expect(agentPinsModel(v)).toBe(false);
    }
    expect(agentPinsModel({})).toBe(false);
  });
});
