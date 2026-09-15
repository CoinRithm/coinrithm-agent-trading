import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { stringify } from "yaml";
import { resolveAgent, ResolveError } from "./resolve.js";
import { parseFrontmatter } from "./frontmatter.js";
import { buildSpec, parseSkill } from "./skill.js";
import { ejectFiles, renderFolderOfOne } from "./templates.js";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "coinrithm-authoring-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});
function write(path: string, content: string) {
  const file = join(dir, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
}
function agent(raw: Record<string, unknown>, body = "") {
  write("agent.md", `---\n${stringify(raw)}---\n${body}`);
}
function fails(code: string, path = dir) {
  expect(() => resolveAgent(path)).toThrow(ResolveError);
  try {
    resolveAgent(path);
  } catch (error) {
    expect((error as ResolveError).issues).toContainEqual(
      expect.objectContaining({ code }),
    );
  }
}

describe("authoring boundary errors", () => {
  it.each([
    "~/risk.yaml",
    "C:/risk.yaml",
    "/risk.yaml",
    "character\\risk.yaml",
  ])("rejects unsafe reference %s", (ref) => {
    agent({ risk: { $ref: ref } });
    fails("unsafe_ref");
  });
  it("reports a missing keystone", () => {
    fails("missing_keystone");
  });
  it.each([
    "not frontmatter",
    "---\n[invalid\n---",
    "---\n[]\n---",
    "---\nnull\n---",
    "---\nvalue\n---",
  ])(
    "reports invalid frontmatter for both a directory and file: %s",
    (text) => {
      write("agent.md", text);
      fails("invalid_frontmatter");
      fails("invalid_frontmatter", join(dir, "agent.md"));
    },
  );
  it.each(["[]", "null", "plain scalar"])(
    "rejects a non-mapping extends file %s",
    (text) => {
      agent({ extends: [false, "base.yaml"] });
      write("base.yaml", text);
      fails("invalid_extends");
    },
  );
  it("rejects nested extends and missing base files", () => {
    agent({ extends: ["base.yaml", "missing.yaml"] });
    write("base.yaml", "extends: [another.yaml]\nrisk: {}\n");
    fails("nested_extends");
  });
  it("does not let soft sizing guidance impersonate an enforced risk cap", () => {
    agent({ sizing: { maxLeverage: 100 } });
    fails("sizing_enforced_key", join(dir, "agent.md"));
  });
  it("rejects duplicate skill inclusions", () => {
    agent({ include: ["fixture", "fixture"] });
    write("character/skills/fixture.md", "Fixture tactic");
    fails("duplicate_include");
  });
  it.each(["risk", "limits"])(
    "rejects a non-mapping %s tactic patch",
    (key) => {
      agent({ include: ["fixture"] });
      write(
        "character/skills/fixture.md",
        `---\n${key}: []\n---\nFixture tactic`,
      );
      fails("skill_patch_invalid");
    },
  );
  it("rejects tactic permissions outside risk and limits", () => {
    agent({ include: ["fixture"] });
    write(
      "character/skills/fixture.md",
      "---\nvenues: [pm]\n---\nFixture tactic",
    );
    fails("skill_patch_forbidden_key");
  });
  it("loads indexed tactics in declared order and keeps inline overrides", () => {
    agent({ extends: ["base.yaml"], limits: { maxTradesPerDay: 5 } });
    write(
      "base.yaml",
      "limits: {maxTradesPerDay: 9}\nmodel: {provider: mechanical, name: fixture}\n",
    );
    write("character/skills/_index.yaml", "active: [fixture, 7]\n");
    write(
      "character/skills/fixture.md",
      "---\nlimits: {maxTradesPerDay: 3}\n---\nFixture tactic",
    );
    const result = resolveAgent(dir);
    expect(result.rawFrontmatter.limits).toEqual({ maxTradesPerDay: 3 });
    expect(result.provenance.includeOrder).toEqual(["fixture"]);
    expect(result.mergedProse).toContain("Fixture tactic");
  });
  it("accepts an empty skill index", () => {
    agent({ name: "fixture" });
    write("character/skills/_index.yaml", "active: null\n");
    expect(resolveAgent(dir).provenance.includeOrder).toEqual([]);
  });
});

describe("eject preserves configuration", () => {
  it("retains safe defaults for a minimal legacy file", () => {
    const raw = {
      spec: "coinrithm.agent.v1",
      name: "fixture",
      description: "fixture",
      trigger: { cadence: "1h" },
      model: { provider: "mechanical", name: "fixture" },
      venues: ["futures"],
    };
    const { files } = ejectFiles(raw, "");
    for (const [path, content] of Object.entries(files)) write(path, content);
    expect(buildSpec(resolveAgent(dir).rawFrontmatter)).toEqual(buildSpec(raw));
    expect(files["character/thesis.md"].trim().length).toBeGreaterThan(0);
    expect(files["character/risk.yaml"]).toBeUndefined();
  });
  it("retains explicit hourly budgets and equity sizing when splitting the file", () => {
    const parsed = parseSkill(renderFolderOfOne("fixture", "conservative"));
    parsed.raw.triggerPolicy = {
      maxLlmCallsPerHour: 1,
      pmEvalCooldownMinutes: 20,
    };
    parsed.raw.capitalSizing = {
      version: "equity_fraction_v1",
      futuresRiskPct: 1,
      pmMaxLossPct: 2,
      perTicketCapitalPct: 6,
      totalCapitalPct: 40,
      cashReservePct: 20,
      minRewardRisk: 1.5,
    };
    const { files } = ejectFiles(parsed.raw, parsed.body);
    for (const [path, content] of Object.entries(files)) write(path, content);
    expect(buildSpec(resolveAgent(dir).rawFrontmatter)).toEqual(
      buildSpec(parsed.raw),
    );
    expect(parseFrontmatter(files["agent.md"]).data.capitalSizing).toEqual(
      parsed.raw.capitalSizing,
    );
  });
});
