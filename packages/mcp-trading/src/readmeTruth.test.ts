import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { ALLOWED_CAPABILITIES } from "./agent/types.js";

// Truth tripwires (2026-07-08 cross-audit): the root README drifted to
// "currently 0.4.0" while npm was at 0.7.1, and tool copy said "seven
// venues" after the 8th venue shipped. These guards fail the suite when
// public docs drift from the code they describe — update the DOC (or both,
// consciously), never delete the guard.

const pkgRoot = join(__dirname, "..");
const repoRoot = join(pkgRoot, "..", "..");

describe("public docs stay truthful", () => {
  it("llms.txt tool count matches the registered MCP surface", () => {
    const tools = readFileSync(join(__dirname, "tools.ts"), "utf-8");
    const llms = readFileSync(
      join(repoRoot, ".well-known", "llms.txt"),
      "utf-8",
    );
    const registered = tools.match(/server\.registerTool\(/g)?.length ?? 0;
    const claim = llms.match(/\b(\d+) tools\b/);
    expect(claim, "llms.txt tool-count claim missing").not.toBeNull();
    expect(Number(claim![1])).toBe(registered);
    expect(llms).toContain("pm_data_overview");
    expect(llms).toContain("pm_data_event");
  });

  it("root README's package-version claim matches package.json", () => {
    const pkg = JSON.parse(
      readFileSync(join(pkgRoot, "package.json"), "utf-8"),
    ) as { version: string };
    const readme = readFileSync(join(repoRoot, "README.md"), "utf-8");
    const claim = readme.match(
      /`@coinrithm\/mcp-trading`, currently \*\*([\d.]+)\*\*/,
    );
    expect(claim, "README version-clarity sentence missing").not.toBeNull();
    expect(claim![1]).toBe(pkg.version);
  });

  it("root README's API-contract-version claim matches openapi.yaml", () => {
    const readme = readFileSync(join(repoRoot, "README.md"), "utf-8");
    const openapi = readFileSync(join(repoRoot, "openapi.yaml"), "utf-8");
    const apiClaim = readme.match(
      /`info\.version` in `openapi\.yaml` \(currently \*\*([\d.]+)\*\*\)/,
    );
    const actual = openapi.match(/^\s{2}version:\s*["']?([\d.]+)["']?/m);
    expect(apiClaim, "README API-version sentence missing").not.toBeNull();
    expect(actual, "openapi.yaml info.version missing").not.toBeNull();
    expect(apiClaim![1]).toBe(actual![1]);
  });

  it("runner, changelog, spec note, and example bundles pin the served contract", () => {
    const openapi = readFileSync(join(repoRoot, "openapi.yaml"), "utf-8");
    const actual = openapi.match(/^\s{2}version:\s*["']?([\d.]+)["']?/m);
    expect(actual, "openapi.yaml info.version missing").not.toBeNull();
    const version = actual![1];

    const runner = readFileSync(
      join(__dirname, "agent", "version.ts"),
      "utf-8",
    );
    const changelog = readFileSync(join(pkgRoot, "CHANGELOG.md"), "utf-8");
    expect(runner).toContain(`openapiVersion: "${version}"`);
    expect(changelog).toContain(`currently \`${version}\``);
    expect(openapi).toContain(`\`info.version\` (${version})`);

    const examples = [
      "quant-reference",
      "leo-breakout-hunter",
      "mia-trend-rider",
      "sam-risk-managed-swinger",
      "contrarian-carl",
      "olivia-calibrated-quant",
      "momentum-futures-decomposed",
    ];
    for (const example of examples) {
      const manifest = readFileSync(
        join(
          repoRoot,
          "examples",
          "agents",
          example,
          "functionality",
          "coinrithm.yaml",
        ),
        "utf-8",
      );
      expect(manifest, `${example} contract pin drifted`).toContain(
        `openapiVersion: ${version}`,
      );
    }
  });

  it("pm_data_events tool description names all twelve venues", () => {
    const tools = readFileSync(join(__dirname, "tools.ts"), "utf-8");
    const packageReadme = readFileSync(join(pkgRoot, "README.md"), "utf-8");
    // Canonical venue list (prod overview bySource; Gemini added migration
    // 179, list refreshed 2026-08-06 — the backbone audit caught this test
    // asserting 'ALL 12' wording while enumerating only eleven). If a venue
    // is added or removed, update the tool description AND this list.
    const venues = [
      "Polymarket",
      "Kalshi",
      "Rothera",
      "Limitless",
      "Smarkets",
      "Manifold",
      "Metaculus",
      "PredictIt",
      "Futuur",
      "Myriad",
      "ForecastEx",
      "Gemini",
    ];
    expect(venues).toHaveLength(12);
    expect(tools).toContain("ALL 12");
    expect(tools).not.toMatch(/ALL (seven|eight|nine|ten|7|8|9|10)/i);
    expect(packageReadme).toContain("12 venues");
    expect(packageReadme).toContain("ForecastEx");
    expect(packageReadme).not.toContain("10 venues");
    for (const venue of venues) {
      expect(tools, `tool copy missing venue ${venue}`).toContain(venue);
    }
    // A PARTIAL enumeration is the sneaky failure mode (pm_data_overview
    // shipped a seven-venue list while pm_data_events was correct, and the
    // whole-file venue check above still passed): any run of "Polymarket,
    // Kalshi, ..." must include Rothera before it closes.
    // Normalize TS string-concatenation seams ("..." + "...") first so an
    // enumeration split across literals is checked as ONE semantic run —
    // otherwise a fragment boundary can hide a missing venue.
    const joined = tools.replace(/"\s*\+\s*"/g, "");
    const enumerations = joined.match(/Polymarket,[^)."]{0,200}/g) ?? [];
    expect(enumerations.length).toBeGreaterThan(0);
    for (const run of enumerations) {
      expect(run, `stale venue enumeration: "${run}"`).toContain("Rothera");
      expect(run, `stale venue enumeration: "${run}"`).toContain("Futuur");
      expect(run, `stale venue enumeration: "${run}"`).toContain("Myriad");
      expect(run, `stale venue enumeration: "${run}"`).toContain("ForecastEx");
    }
  });

  it("README states the versioned Arena qualification truth", () => {
    const readme = readFileSync(join(repoRoot, "README.md"), "utf-8");
    expect(readme).toContain("`arena-ranking-v1`");
    expect(readme).toContain("five decided trades qualify");
    expect(readme).toContain("95% Wilson win-confidence lower bound");
    expect(readme).not.toContain("Ranking starts from the first decided trade");
  });

  // server.json is the MCP-registry listing (published separately from npm via
  // mcp-publisher). It had NO guard, and duly drifted: it sat at 0.7.1 claiming
  // "8 venues" long after package.json/README were corrected, because nothing
  // failed when it went stale. These tripwires bind it to the same truth.
  describe("server.json (MCP registry listing) stays truthful", () => {
    const serverJson = () =>
      JSON.parse(readFileSync(join(repoRoot, "server.json"), "utf-8")) as {
        version: string;
        description: string;
        packages: { identifier: string; version: string }[];
      };
    const pkgVersion = () =>
      (
        JSON.parse(readFileSync(join(pkgRoot, "package.json"), "utf-8")) as {
          version: string;
        }
      ).version;

    it("top-level version matches package.json", () => {
      expect(serverJson().version).toBe(pkgVersion());
    });

    it("npm package entry pins the same published version", () => {
      const npmPkg = serverJson().packages.find(
        (p) => p.identifier === "@coinrithm/mcp-trading",
      );
      expect(npmPkg, "npm package entry missing").toBeDefined();
      expect(npmPkg!.version).toBe(pkgVersion());
    });

    it("description states the current venue count, never a stale one", () => {
      const { description } = serverJson();
      expect(description).toContain("12 venues");
      expect(description).not.toMatch(
        /\b(7|8|9|10|seven|eight|nine|ten)\s+venues\b/i,
      );
    });
  });
});

describe("capability docs tripwire (audit rank 9)", () => {
  it("docs/agent-runner.md documents every ALLOWED_CAPABILITY by name", () => {
    // The capability system shipped fully undocumented once (universe_scan
    // invisible in every user surface, audit 2026-08-19). This tripwire makes
    // adding a capability without documenting it a test failure.
    const doc = readFileSync(join(repoRoot, "docs/agent-runner.md"), "utf8");
    for (const cap of ALLOWED_CAPABILITIES) {
      expect(doc).toContain(cap);
    }
  });
});

describe("tool-surface docs tripwire (publish audit 2026-08-19)", () => {
  // The published skill claimed "all 30 tools" against 38 registered and
  // omitted the ENTIRE keyless pm_data_* family plus get_crypto_movers and
  // report_pm_opportunity — an agent loading it would never learn CoinRithm's
  // cross-venue dataset exists. Counting is not enough on its own: the count
  // was wrong AND the omissions were the differentiating tools, so assert both
  // the number and per-tool presence in every surface that enumerates tools.
  const registeredTools = (): string[] => {
    const src = readFileSync(join(__dirname, "tools.ts"), "utf8");
    // \s already spans the newline prettier inserts after the open paren.
    return [...src.matchAll(/server\.registerTool\(\s*"([a-z0-9_]+)"/g)].map(
      (m) => m[1]!,
    );
  };

  it("every registered tool is named in the package README", () => {
    const readme = readFileSync(join(pkgRoot, "README.md"), "utf8");
    for (const tool of registeredTools()) {
      expect(readme, `README missing tool ${tool}`).toContain(`\`${tool}\``);
    }
  });

  it("every registered tool is named in the published skill", () => {
    const skill = readFileSync(
      join(repoRoot, "skills", "coinrithm-trader", "SKILL.md"),
      "utf8",
    );
    for (const tool of registeredTools()) {
      expect(skill, `SKILL.md missing tool ${tool}`).toContain(`\`${tool}\``);
    }
  });

  it("the skill's tool-count claim matches the registered surface", () => {
    const skill = readFileSync(
      join(repoRoot, "skills", "coinrithm-trader", "SKILL.md"),
      "utf8",
    );
    const claim = skill.match(/Tool playbook \(all (\d+) tools\)/);
    expect(claim, "SKILL.md tool-count heading missing").not.toBeNull();
    expect(Number(claim![1])).toBe(registeredTools().length);
  });
});
