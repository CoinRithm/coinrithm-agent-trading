import { describe, expect, it } from "vitest";
import { buildSpec } from "./skill.js";
import { buildAgentDefinitionSnapshot } from "./definitionSnapshot.js";
import { COINRITHM_API } from "./version.js";

describe("compiled agent definition", () => {
  it("binds exact prose, effective caps, model policy and declared versions", () => {
    const spec = buildSpec({ name: "baseline" });
    const baseline = buildAgentDefinitionSnapshot(spec, "Watch BTC.\n");
    expect(baseline.definitionHash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(baseline.engine.packageVersion).toBe(COINRITHM_API.mcpVersion);
    expect(buildAgentDefinitionSnapshot(spec, "Watch BTC.\n")).toEqual(
      baseline,
    );
    expect(
      buildAgentDefinitionSnapshot(spec, "Watch BTC.").definitionHash,
    ).not.toBe(baseline.definitionHash);
    const changed = structuredClone(spec);
    changed.risk.maxLeverage += 1;
    expect(
      buildAgentDefinitionSnapshot(changed, baseline.mergedProse)
        .definitionHash,
    ).not.toBe(baseline.definitionHash);
    changed.risk.maxLeverage = spec.risk.maxLeverage;
    changed.pinnedModel = true;
    expect(
      buildAgentDefinitionSnapshot(changed, baseline.mergedProse)
        .definitionHash,
    ).not.toBe(baseline.definitionHash);
  });

  it("ignores object key order and detaches nested data from the caller", () => {
    const spec = buildSpec({ name: "baseline" });
    const snapshot = buildAgentDefinitionSnapshot(spec, "strategy");
    const reordered = Object.fromEntries(Object.entries(spec).reverse());
    expect(
      buildAgentDefinitionSnapshot(reordered as typeof spec, "strategy"),
    ).toEqual(snapshot);
    spec.risk.watchlist.push("ADDED");
    expect(snapshot.spec.risk.watchlist).not.toContain("ADDED");
    expect(
      buildAgentDefinitionSnapshot(spec, "strategy").definitionHash,
    ).not.toBe(snapshot.definitionHash);
  });
});
