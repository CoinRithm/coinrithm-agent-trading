import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

// Truth tripwires (2026-07-08 cross-audit): the root README drifted to
// "currently 0.4.0" while npm was at 0.7.1, and tool copy said "seven
// venues" after the 8th venue shipped. These guards fail the suite when
// public docs drift from the code they describe — update the DOC (or both,
// consciously), never delete the guard.

const pkgRoot = join(__dirname, "..");
const repoRoot = join(pkgRoot, "..", "..");

describe("public docs stay truthful", () => {
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

  it("pm_data_events tool description names all eight venues", () => {
    const tools = readFileSync(join(__dirname, "tools.ts"), "utf-8");
    // Canonical venue list (prod overview bySource, 2026-07-08). If a venue
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
    ];
    expect(tools).toContain("ALL nine");
    expect(tools).not.toMatch(/ALL (seven|eight)/i);
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
    }
  });

  it("README never claims a minimum decided-trades Arena gate", () => {
    const readme = readFileSync(join(repoRoot, "README.md"), "utf-8");
    expect(readme).not.toMatch(/needs? (\d+|three|ten) decided trades/i);
    expect(readme).toContain("first decided trade");
  });
});
