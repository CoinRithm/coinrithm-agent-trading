import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { resolveAgent, ResolveError } from "./resolve.js";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "cr-agent-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function write(rel: string, content: string): void {
  const p = join(dir, rel);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, content, "utf8");
}

const INLINE_AGENT = `---
spec: coinrithm.agent.v1
name: t
description: a test agent
trigger:
  cadence: 1h
model:
  provider: anthropic
  name: claude-sonnet-4-6
venues: [futures]
risk:
  maxLeverage: 3
  perTradeMarginMusd: 100
  maxConcurrentPositions: 3
  requireStopLoss: true
  watchlist: [BTC, ETH]
---
Strategy body here.`;

describe("resolveAgent — single file passthrough", () => {
  it("resolves frontmatter + body like a legacy SKILL.md", () => {
    write("agent.md", INLINE_AGENT);
    const r = resolveAgent(join(dir, "agent.md"));
    expect(r.isDirectory).toBe(false);
    expect((r.rawFrontmatter.risk as Record<string, unknown>).maxLeverage).toBe(
      3,
    );
    expect(r.mergedProse).toContain("Strategy body here.");
  });
});

describe("resolveAgent — folder equals inline", () => {
  it("a $ref'd block resolves to the same value as inline", () => {
    write("agent.md", INLINE_AGENT);
    const inline = resolveAgent(dir);

    rmSync(join(dir, "agent.md"));
    write(
      "agent.md",
      `---
spec: coinrithm.agent.v1
name: t
description: a test agent
trigger:
  cadence: 1h
model:
  provider: anthropic
  name: claude-sonnet-4-6
venues: [futures]
risk:
  $ref: character/risk.yaml
---
Strategy body here.`,
    );
    write(
      "character/risk.yaml",
      `maxLeverage: 3
perTradeMarginMusd: 100
maxConcurrentPositions: 3
requireStopLoss: true
watchlist: [BTC, ETH]`,
    );
    const refd = resolveAgent(dir);
    expect(refd.rawFrontmatter.risk).toEqual(inline.rawFrontmatter.risk);
  });
});

describe("resolveAgent — functionality pin", () => {
  it("locks functionality/coinrithm.yaml as provenance without adding it to AgentSpec", () => {
    write("agent.md", INLINE_AGENT);
    write(
      "functionality/coinrithm.yaml",
      `api:
  kind: coinrithm-agent-api
  openapiVersion: 1.4.0
`,
    );

    const r = resolveAgent(dir);
    expect(r.contentHashes["functionality/coinrithm.yaml"]).toMatch(/^sha256:/);
    expect(r.provenance.mergeOrder).toContain("functionality/coinrithm.yaml");
    expect(r.provenance.sources.functionality).toBe(
      "functionality/coinrithm.yaml",
    );
    expect(r.rawFrontmatter.functionality).toBeUndefined();
    expect(r.mergedProse).not.toContain("openapiVersion");
  });

  it("rejects secrets in functionality/coinrithm.yaml", () => {
    write("agent.md", INLINE_AGENT);
    write(
      "functionality/coinrithm.yaml",
      `api:
  kind: coinrithm-agent-api
  apiKey: crk_live_AbCdEfGh12345678_a1b2c3
`,
    );

    expect(() => resolveAgent(dir)).toThrow(ResolveError);
    try {
      resolveAgent(dir);
    } catch (e) {
      expect((e as ResolveError).issues.map((i) => i.code)).toContain(
        "secret_in_functionality",
      );
    }
  });
});

describe("resolveAgent — fail-closed", () => {
  it("a secret in a prose body fails", () => {
    write(
      "agent.md",
      `---\nspec: coinrithm.agent.v1\nname: t\ndescription: d\n---\nbody`,
    );
    write(
      "character/thesis.md",
      "My key is crk_live_AbCdEfGh12345678_a1b2c3 do not share",
    );
    expect(() => resolveAgent(dir)).toThrow(ResolveError);
    try {
      resolveAgent(dir);
    } catch (e) {
      expect((e as ResolveError).issues.map((i) => i.code)).toContain(
        "secret_in_prose",
      );
    }
  });

  it("a missing $ref fails", () => {
    write(
      "agent.md",
      `---\nspec: coinrithm.agent.v1\nname: t\ndescription: d\nrisk:\n  $ref: character/risk.yaml\n---\nbody`,
    );
    expect(() => resolveAgent(dir)).toThrow(/missing_ref|agent resolve failed/);
  });

  it("a path-traversal $ref fails", () => {
    write(
      "agent.md",
      `---\nspec: coinrithm.agent.v1\nname: t\ndescription: d\nrisk:\n  $ref: ../escape.yaml\n---\nbody`,
    );
    expect(() => resolveAgent(dir)).toThrow(
      /path_traversal|agent resolve failed/,
    );
  });

  it("an absolute / URL $ref fails", () => {
    write(
      "agent.md",
      `---\nspec: coinrithm.agent.v1\nname: t\ndescription: d\nrisk:\n  $ref: "https://evil.test/risk.yaml"\n---\nbody`,
    );
    expect(() => resolveAgent(dir)).toThrow(/unsafe_ref|agent resolve failed/);
  });

  it("a cyclic $ref fails", () => {
    write(
      "agent.md",
      `---\nspec: coinrithm.agent.v1\nname: t\ndescription: d\nrisk:\n  $ref: a.yaml\n---\nbody`,
    );
    write("a.yaml", `$ref: b.yaml`);
    write("b.yaml", `$ref: a.yaml`);
    expect(() => resolveAgent(dir)).toThrow(
      /include_cycle|agent resolve failed/,
    );
  });

  it("invalid YAML in a part-file fails", () => {
    write(
      "agent.md",
      `---\nspec: coinrithm.agent.v1\nname: t\ndescription: d\nrisk:\n  $ref: character/risk.yaml\n---\nbody`,
    );
    write("character/risk.yaml", `maxLeverage: [1, 2`); // unclosed flow seq
    expect(() => resolveAgent(dir)).toThrow(
      /invalid_yaml|agent resolve failed/,
    );
  });

  it("a tactic that WIDENS a cap fails", () => {
    write(
      "agent.md",
      `---\nspec: coinrithm.agent.v1\nname: t\ndescription: d\nvenues: [futures]\ninclude: [momentum]\nrisk:\n  maxLeverage: 3\n  perTradeMarginMusd: 100\n  maxConcurrentPositions: 3\n  requireStopLoss: true\n  watchlist: [BTC]\n---\nbody`,
    );
    write(
      "character/skills/momentum.md",
      `---\nrisk:\n  maxLeverage: 10\n---\nmomentum tactic`,
    );
    expect(() => resolveAgent(dir)).toThrow(
      /skill_patch_widens_cap|agent resolve failed/,
    );
  });

  it("a tactic that TIGHTENS a cap passes and applies the tighter value", () => {
    write(
      "agent.md",
      `---\nspec: coinrithm.agent.v1\nname: t\ndescription: d\nvenues: [futures]\ninclude: [momentum]\nrisk:\n  maxLeverage: 5\n  perTradeMarginMusd: 100\n  maxConcurrentPositions: 3\n  requireStopLoss: true\n  watchlist: [BTC]\n---\nbody`,
    );
    write(
      "character/skills/momentum.md",
      `---\nrisk:\n  maxLeverage: 2\n---\nmomentum tactic`,
    );
    const r = resolveAgent(dir);
    expect((r.rawFrontmatter.risk as Record<string, unknown>).maxLeverage).toBe(
      2,
    );
    expect(r.provenance.includeOrder).toEqual(["momentum"]);
    expect(r.mergedProse).toContain("momentum tactic");
  });

  it("allows descriptive metadata in tactic frontmatter without granting power", () => {
    write(
      "agent.md",
      `---\nspec: coinrithm.agent.v1\nname: t\ndescription: d\nvenues: [futures]\ninclude: [momentum]\nrisk:\n  maxLeverage: 5\n  perTradeMarginMusd: 100\n  maxConcurrentPositions: 3\n  requireStopLoss: true\n  watchlist: [BTC]\n---\nbody`,
    );
    write(
      "character/skills/momentum.md",
      `---\ntype: coinrithm.agent.skill\ntitle: Momentum\ndescription: Test tactic\ntags: [skill]\nrisk:\n  maxLeverage: 2\n---\nmomentum tactic`,
    );
    const r = resolveAgent(dir);
    expect((r.rawFrontmatter.risk as Record<string, unknown>).maxLeverage).toBe(
      2,
    );
    expect(r.rawFrontmatter.type).toBeUndefined();
  });

  it("rejects a symlinked $ref (where symlinks can be created)", () => {
    write("real.yaml", `maxLeverage: 3`);
    let made = true;
    try {
      symlinkSync(join(dir, "real.yaml"), join(dir, "link.yaml"));
    } catch {
      made = false; // Windows non-admin / restricted FS — skip
    }
    if (!made) return;
    write(
      "agent.md",
      `---\nspec: coinrithm.agent.v1\nname: t\ndescription: d\nrisk:\n  $ref: link.yaml\n---\nbody`,
    );
    expect(() => resolveAgent(dir)).toThrow(/symlink|agent resolve failed/);
  });
});
