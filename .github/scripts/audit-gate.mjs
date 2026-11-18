#!/usr/bin/env node
// Dependency audit gate: fails on any high or critical npm advisory that is
// not listed in ALLOWED below. It replaces a bare `npm audit
// --audit-level=high`, which cannot pass while an advisory has no patched
// release and so blocked every pull request (2026-11-18).
//
// Every exception names one advisory, why it is acceptable in this repository,
// and a date. After that date the gate fails again, so an exception can only
// be kept by reviewing it. Anything not listed fails exactly as before.
//
// Run from a package directory: node ../../.github/scripts/audit-gate.mjs
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

export const ALLOWED = {
  "GHSA-fc5q-39xc-vjpf": {
    package: "picomatch",
    expires: "2026-12-18",
    reason:
      "No patched release exists (latest 4.0.7 is affected). Development tooling only (vitest, typescript-eslint); the trigger is an attacker-supplied glob pattern and nothing here passes outside input to it. Not in the published package's runtime dependencies.",
  },
  "GHSA-mrhx-c7xc-m3w5": {
    package: "zod",
    expires: "2026-12-02",
    reason:
      "The only patched release is zod 4, a major upgrade of the decision parser every agent uses; it needs its own reviewed change. The trigger is a large array sent to an array schema without a length limit. The one such schema here parses model output capped at 1,024 output tokens; no MCP tool input uses an array schema, and HTTP bodies are capped at 100 kB.",
  },
};

const BLOCKING = new Set(["high", "critical"]);

const advisoryId = (url) =>
  typeof url === "string" ? (url.split("/").pop() ?? "") : "";

/**
 * Pure decision: which blocking advisories are present, which are excused.
 * `today` is an ISO date (YYYY-MM-DD); an exception is valid through `expires`.
 */
export function evaluate(report, allowed, today) {
  if (!report || typeof report !== "object" || report.error)
    return { ok: false, unusable: true, blocking: [], excused: [] };
  if (!report.vulnerabilities || typeof report.vulnerabilities !== "object")
    return { ok: false, unusable: true, blocking: [], excused: [] };
  const seen = new Map();
  for (const entry of Object.values(report.vulnerabilities)) {
    for (const via of entry.via ?? []) {
      // A string names another vulnerable package; its own entry carries the
      // advisory, so only advisory objects are counted here.
      if (!via || typeof via !== "object") continue;
      if (!BLOCKING.has(via.severity)) continue;
      const id = advisoryId(via.url) || `unknown:${via.name}:${via.source}`;
      if (!seen.has(id))
        seen.set(id, {
          id,
          package: via.name,
          severity: via.severity,
          title: via.title,
        });
    }
  }
  const blocking = [];
  const excused = [];
  for (const advisory of seen.values()) {
    const rule = allowed[advisory.id];
    if (!rule) blocking.push({ ...advisory, why: "not in the allowlist" });
    else if (rule.package !== advisory.package)
      blocking.push({
        ...advisory,
        why: `allowlisted for ${rule.package}, found in ${advisory.package}`,
      });
    else if (today > rule.expires)
      blocking.push({
        ...advisory,
        why: `exception expired on ${rule.expires}`,
      });
    else excused.push({ ...advisory, expires: rule.expires });
  }
  return { ok: blocking.length === 0, unusable: false, blocking, excused };
}

function readAudit() {
  try {
    return execFileSync("npm", ["audit", "--json"], {
      encoding: "utf8",
      shell: process.platform === "win32",
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch (error) {
    // npm exits non-zero when it finds anything; the report is still on stdout.
    return typeof error.stdout === "string" ? error.stdout : "";
  }
}

function main() {
  let report;
  try {
    report = JSON.parse(readAudit());
  } catch {
    report = undefined;
  }
  const result = evaluate(
    report,
    ALLOWED,
    new Date().toISOString().slice(0, 10),
  );
  if (result.unusable) {
    console.error("audit gate: npm audit gave no usable report; failing.");
    process.exit(1);
  }
  for (const a of result.excused)
    console.log(
      `excused until ${a.expires}: ${a.severity} ${a.package} ${a.id} (${a.title})`,
    );
  for (const a of result.blocking)
    console.error(
      `BLOCKING: ${a.severity} ${a.package} ${a.id} (${a.title}): ${a.why}`,
    );
  if (!result.ok) process.exit(1);
  console.log(
    `audit gate: no unexcused high or critical advisory (${result.excused.length} excused).`,
  );
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) main();
