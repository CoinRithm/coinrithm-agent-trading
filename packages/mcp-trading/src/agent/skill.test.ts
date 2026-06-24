import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { parseSkill, buildSpec, loadAgent } from "./skill.js";
import { strictLint } from "./strictLint.js";
import { ResolveError } from "./resolve.js";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "cr-skill-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});
function write(rel: string, content: string): void {
  const p = join(dir, rel);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, content, "utf8");
}

const FRONT = `spec: coinrithm.agent.v1
name: t
description: d
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
  watchlist: [BTC, ETH]`;

describe("buildSpec — defaults and new blocks", () => {
  it("defaults the policy blocks and capabilities", () => {
    const spec = parseSkill(`---\n${FRONT}\n---\nbody`).spec;
    expect(spec.limits.maxTradesPerDay).toBeGreaterThan(0);
    expect(spec.abstention.onStaleData).toBe(true);
    expect(spec.capabilities).toEqual([]);
    expect(spec.objective).toBeUndefined();
  });

  it("parses objective + reserved capabilities", () => {
    const parsed = parseSkill(
      `---\n${FRONT}\nobjective:\n  primary: realized_pnl\n  secondary: [drawdown_control]\n  horizon: 7d\ncapabilities: [indicators]\n---\nbody`,
    );
    const spec = buildSpec(parsed.raw);
    expect(spec.objective?.primary).toBe("realized_pnl");
    expect(spec.capabilities).toEqual(["indicators"]);
  });

  it("parses a triggerPolicy block (OKF v2) and defaults it when omitted", () => {
    const dflt = parseSkill(`---\n${FRONT}\n---\nbody`).spec;
    expect(dflt.triggerPolicy?.mode).toBe("event_driven");
    expect(dflt.triggerPolicy?.alwaysManageOpenPositions).toBe(true);
    expect(dflt.triggerPolicy?.pmEvalCooldownMinutes).toBeGreaterThan(0);

    const spec = parseSkill(
      `---\n${FRONT}\ntriggerPolicy:\n  mode: always\n  maxLlmCallsPerHour: 4\n  debounceMinutes: 30\n  pmEvalCooldownMinutes: 0\n---\nbody`,
    ).spec;
    expect(spec.triggerPolicy?.mode).toBe("always");
    expect(spec.triggerPolicy?.maxLlmCallsPerHour).toBe(4);
    expect(spec.triggerPolicy?.debounceMinutes).toBe(30);
    expect(spec.triggerPolicy?.pmEvalCooldownMinutes).toBe(0);
  });
});

describe("loadAgent — folder $ref yields the same AgentSpec as all-inline", () => {
  it("equal specs", () => {
    write("agent.md", `---\n${FRONT}\n---\nbody`);
    const inline = loadAgent(dir).spec;

    rmSync(join(dir, "agent.md"));
    write(
      "agent.md",
      `---\nspec: coinrithm.agent.v1\nname: t\ndescription: d\ntrigger:\n  cadence: 1h\nmodel:\n  provider: anthropic\n  name: claude-sonnet-4-6\nvenues: [futures]\nrisk:\n  $ref: character/risk.yaml\n---\nbody`,
    );
    write(
      "character/risk.yaml",
      `maxLeverage: 3\nperTradeMarginMusd: 100\nmaxConcurrentPositions: 3\nrequireStopLoss: true\nwatchlist: [BTC, ETH]`,
    );
    const refd = loadAgent(dir).spec;
    expect(refd).toEqual(inline);
  });
});

describe("strictLint — no silent coercion", () => {
  it("flags a typo'd key with a suggestion", () => {
    const issues = strictLint({ risk: { maxLevrage: 3 } });
    const unknown = issues.find((i) => i.code === "unknown_key");
    expect(unknown).toBeTruthy();
    expect(unknown?.message).toContain("maxLeverage");
  });

  it("flags a bad enum", () => {
    const issues = strictLint({ model: { provider: "groqq", name: "x" } });
    expect(issues.map((i) => i.code)).toContain("bad_enum");
  });

  it("hosted mode fails closed on an unknown key; self-host does not throw", () => {
    write(
      "agent.md",
      `---\n${FRONT}\n  maxLevrage: 9\n---\nbody`, // typo nested under risk
    );
    expect(() => loadAgent(dir, "hosted")).toThrow(ResolveError);
    const selfHost = loadAgent(dir, "self-host");
    expect(selfHost.lint.length).toBeGreaterThan(0); // surfaced as advisory
  });
});
