import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, statSync } from "fs";
import { join } from "path";
import {
  resolveAgent,
  hostedProseBudget,
  HOSTED_PROSE_MAX_CHARS,
} from "./resolve.js";

// Every shipped example bundle must be deployable on the HOSTED path.
//
// WHY (2026-08-19): three house bundles quietly exceeded the 8,000-char hosted
// strategy budget — contrarian-carl, olivia-calibrated-quant, mia-trend-rider.
// Nothing in the repo checked, so the breakage only surfaced in production: the
// Studio's deploy wizard pre-filled its editor with a truncated copy, and users
// forking those templates deployed agents whose strategy was cut mid-sentence.
// Measured on prod that day, 11 user agents were running such forks, each
// missing the tail of the document — which is exactly where the risk rules sit.
//
// The README calls these bundles fork-ready. A bundle that cannot round-trip
// through the hosted editor is not fork-ready, so "it fits" is part of the
// contract and belongs in the test suite, not in a reviewer's memory.
//
// If a future bundle is deliberately self-host-only (no hosted cap applies),
// add it to SELF_HOST_ONLY with a reason. Do NOT relax the assertion — the
// whole point is that the exception has to be stated out loud.
const SELF_HOST_ONLY: Record<string, string> = {};

const examplesDir = join(
  __dirname,
  "..",
  "..",
  "..",
  "..",
  "examples",
  "agents",
);

// A bundle is a directory with a keystone. `_shared/` and any future support
// directory carry no agent.md/SKILL.md and are not deployable units.
const bundleDirs = readdirSync(examplesDir).filter((name) => {
  const p = join(examplesDir, name);
  if (!statSync(p).isDirectory()) return false;
  return existsSync(join(p, "agent.md")) || existsSync(join(p, "SKILL.md"));
});

describe("example bundles stay hosted-deployable", () => {
  it("finds the example bundles (guards against a silently empty suite)", () => {
    // A path typo would make every it.each below vacuously pass.
    expect(bundleDirs.length).toBeGreaterThanOrEqual(5);
  });

  for (const name of bundleDirs) {
    const skipReason = SELF_HOST_ONLY[name];
    const label = skipReason
      ? `${name} is self-host only (${skipReason})`
      : `${name} merged prose fits the hosted budget`;

    it(label, () => {
      const resolved = resolveAgent(join(examplesDir, name));
      const budget = hostedProseBudget(resolved.mergedProse);
      if (skipReason) {
        expect(budget.used).toBeGreaterThan(0);
        return;
      }
      expect(
        budget.fits,
        `${name}: merged prose is ${budget.used} chars, ${budget.over} over the ` +
          `${HOSTED_PROSE_MAX_CHARS} hosted limit. Forking it in the Studio would ` +
          `truncate the strategy. Trim the bundle (see pia-pump-fader at ~7.9k for ` +
          `the density target) rather than raising the cap.`,
      ).toBe(true);
    });
  }
});
