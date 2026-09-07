import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
  readdirSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { stringify } from "yaml";
import { parseSkill, buildSpec, loadAgent } from "./skill.js";
import { strictLint } from "./strictLint.js";
import { ResolveError } from "./resolve.js";
import {
  validateSkill,
  validateCapitalSizingPolicy,
} from "./skillValidator.js";

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

  // Direction constraint (2026-08-24) — the side restriction that failed as
  // prose must round-trip as config, and a typo must FAIL, never silently
  // mean "unrestricted".
  it("parses risk.direction and leaves it undefined when omitted", async () => {
    const { validateSkill } = await import("./skillValidator.js");
    const parsed = parseSkill(
      `---\n${FRONT}\n  direction: short_only\n---\nbody`,
    );
    expect(parsed.spec.risk.direction).toBe("short_only");
    expect(validateSkill(parsed, "self-host").valid).toBe(true);

    expect(parseSkill(`---\n${FRONT}\n---\nbody`).spec.risk.direction).toBe(
      undefined,
    );
  });

  it("rejects an invalid risk.direction value (fail-closed)", async () => {
    const { validateSkill } = await import("./skillValidator.js");
    const parsed = parseSkill(
      `---\n${FRONT}\n  direction: shorts_only\n---\nbody`,
    );
    // The coercer refuses to guess…
    expect(parsed.spec.risk.direction).toBe(undefined);
    // …and validation makes the refusal LOUD instead of silently unrestricted.
    const result = validateSkill(parsed, "self-host");
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === "skill_risk_direction")).toBe(
      true,
    );
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

const CAPITAL_POLICY = {
  version: "equity_fraction_v1",
  futuresRiskPct: 0.75,
  pmMaxLossPct: 2,
  perTicketCapitalPct: 6,
  totalCapitalPct: 40,
  cashReservePct: 20,
  minRewardRisk: 1.5,
};

function parsedWithCapitalSizing(capitalSizing: unknown) {
  const base = parseSkill(`---\n${FRONT}\n---\nbody`);
  const raw = {
    ...base.raw,
    limits: base.spec.limits,
    abstention: base.spec.abstention,
    sync: base.spec.sync,
    killSwitch: base.spec.killSwitch,
    capitalSizing,
  };
  return { ...base, raw, spec: buildSpec(raw) };
}

describe("capitalSizing — explicit opt-in, strict contract", () => {
  it.each([
    CAPITAL_POLICY,
    null,
    {},
    { ...CAPITAL_POLICY, minRewardRisk: undefined },
    { ...CAPITAL_POLICY, minRewardRisk: Infinity },
    { ...CAPITAL_POLICY, unknown: 1 },
  ])("uses the same standalone policy checks as runtime %#", (value) => {
    expect(validateCapitalSizingPolicy(value)).toEqual(
      validateSkill(parsedWithCapitalSizing(value)).issues.filter((issue) =>
        issue.code?.startsWith("skill_capital_sizing"),
      ),
    );
  });
  it("round-trips all configured fields and is valid in both hosting modes", () => {
    const parsed = parsedWithCapitalSizing(CAPITAL_POLICY);
    expect(parsed.spec.capitalSizing).toEqual(CAPITAL_POLICY);
    expect(strictLint(parsed.raw)).toEqual([]);
    expect(validateSkill(parsed, "self-host").valid).toBe(true);
    expect(validateSkill(parsed, "hosted").valid).toBe(true);
  });

  it("does not activate from absent optional config or legacy soft sizing (including mechanical)", () => {
    for (const provider of ["anthropic", "mechanical"]) {
      const parsed = parseSkill(
        `---\n${FRONT.replace("provider: anthropic", `provider: ${provider}`)}\nsizing:\n  riskPerTradePct: 2\n---\nbody`,
      );
      expect(parsed.spec).not.toHaveProperty("capitalSizing");
      expect(validateSkill(parsed).valid).toBe(true);
    }
  });

  it.each([null, [], "equity_fraction_v1", 0, true])(
    "rejects non-object policy %j",
    (raw) => {
      expect(
        validateSkill(parsedWithCapitalSizing(raw)).issues.map(
          (issue) => issue.code,
        ),
      ).toContain("skill_capital_sizing");
    },
  );

  it.each(Object.keys(CAPITAL_POLICY))("requires %s when opted in", (key) => {
    const raw: Record<string, unknown> = { ...CAPITAL_POLICY };
    delete raw[key];
    expect(validateSkill(parsedWithCapitalSizing(raw)).valid).toBe(false);
  });

  it.each(["equity_fraction_v2", "", null, 1])(
    "rejects unsupported policy version %j",
    (version) => {
      const parsed = parsedWithCapitalSizing({ ...CAPITAL_POLICY, version });
      expect(validateSkill(parsed).issues.map((issue) => issue.code)).toContain(
        "skill_capital_sizing_version",
      );
      expect(strictLint(parsed.raw)).toContainEqual(
        expect.objectContaining({
          code: "bad_enum",
          path: "capitalSizing.version",
        }),
      );
    },
  );

  it.each([
    "futuresRiskPct",
    "pmMaxLossPct",
    "perTicketCapitalPct",
    "totalCapitalPct",
  ])("checks finite numeric percentage range for %s", (key) => {
    for (const value of [0, -1, 100.01, NaN, Infinity, "2", null]) {
      expect(
        validateSkill(
          parsedWithCapitalSizing({ ...CAPITAL_POLICY, [key]: value }),
        ).valid,
      ).toBe(false);
    }
  });

  it("checks reserve, reward/risk and combined-cap boundaries", () => {
    for (const cashReservePct of [-1, 100, Infinity, "20", null]) {
      expect(
        validateSkill(
          parsedWithCapitalSizing({ ...CAPITAL_POLICY, cashReservePct }),
        ).valid,
      ).toBe(false);
    }
    for (const minRewardRisk of [0, 0.99, NaN, Infinity, "1.5", null]) {
      expect(
        validateSkill(
          parsedWithCapitalSizing({ ...CAPITAL_POLICY, minRewardRisk }),
        ).valid,
      ).toBe(false);
    }
    expect(
      validateSkill(
        parsedWithCapitalSizing({ ...CAPITAL_POLICY, perTicketCapitalPct: 41 }),
      ).issues.map((issue) => issue.code),
    ).toContain("skill_capital_sizing_ticket_cap");
    expect(
      validateSkill(
        parsedWithCapitalSizing({ ...CAPITAL_POLICY, totalCapitalPct: 81 }),
      ).issues.map((issue) => issue.code),
    ).toContain("skill_capital_sizing_total_reserve");
    expect(
      validateSkill(
        parsedWithCapitalSizing({
          ...CAPITAL_POLICY,
          cashReservePct: 0,
          totalCapitalPct: 100,
          perTicketCapitalPct: 100,
          minRewardRisk: 1,
        }),
      ).valid,
    ).toBe(true);
    expect(
      validateSkill(
        parsedWithCapitalSizing({ ...CAPITAL_POLICY, totalCapitalPct: 80 }),
      ).valid,
    ).toBe(true);
  });

  it("rejects unknown policy keys in both hosted and self-host validation", () => {
    const parsed = parsedWithCapitalSizing({
      ...CAPITAL_POLICY,
      cashResrevePct: 20,
    });
    expect(strictLint(parsed.raw)).toContainEqual(
      expect.objectContaining({
        code: "unknown_key",
        path: "capitalSizing.cashResrevePct",
        message: expect.stringContaining("cashReservePct"),
      }),
    );
    for (const mode of ["hosted", "self-host"] as const) {
      expect(
        validateSkill(parsed, mode).issues.map((issue) => issue.code),
      ).toContain("skill_capital_sizing_unknown_key");
    }
  });

  it("resolves $ref policy identically to inline, with provenance but no prose injection", () => {
    const parsed = parsedWithCapitalSizing(CAPITAL_POLICY);
    write("agent.md", `---\n${stringify(parsed.raw)}---\nbody`);
    const inline = loadAgent(dir, "hosted");
    write(
      "agent.md",
      `---\n${stringify({ ...parsed.raw, capitalSizing: { $ref: "character/capital-sizing.yaml" } })}---\nbody`,
    );
    write("character/capital-sizing.yaml", stringify(CAPITAL_POLICY));
    const referenced = loadAgent(dir, "hosted");
    expect(referenced.spec).toEqual(inline.spec);
    expect(referenced.resolved.provenance.sources.capitalSizing).toBe(
      "character/capital-sizing.yaml",
    );
    expect(referenced.body).not.toContain("futuresRiskPct");
    expect(
      referenced.resolved.contentHashes["character/capital-sizing.yaml"],
    ).toMatch(/^sha256:/);
  });

  it("opts in exactly the five original house examples, not Pia or other variants", () => {
    const root = fileURLToPath(
      new URL("../../../../examples/agents/", import.meta.url),
    );
    const optedIn: string[] = [];
    for (const entry of readdirSync(root, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name.startsWith("_")) continue;
      const agent = loadAgent(join(root, entry.name));
      if (agent.spec.capitalSizing) {
        optedIn.push(entry.name);
        expect(agent.spec.capitalSizing).toEqual(CAPITAL_POLICY);
        expect(
          validateSkill(
            { spec: agent.spec, raw: agent.raw, body: agent.body },
            "hosted",
          ).valid,
        ).toBe(true);
      }
    }
    expect(optedIn.sort()).toEqual([
      "contrarian-carl",
      "leo-breakout-hunter",
      "mia-trend-rider",
      "olivia-calibrated-quant",
      "sam-risk-managed-swinger",
    ]);
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

  it("hosted mode ACCEPTS risk.direction (known key, not a typo)", () => {
    // Guards the strictLint known-keys list: without "direction" there, a
    // hosted bundle carrying the constraint would be rejected at load — the
    // exact bundle shape the 2026-08-24 incident needs to upload.
    write("agent.md", `---\n${FRONT}\n  direction: short_only\n---\nbody`);
    const hosted = loadAgent(dir, "hosted");
    expect(hosted.spec.risk.direction).toBe("short_only");
  });
});
