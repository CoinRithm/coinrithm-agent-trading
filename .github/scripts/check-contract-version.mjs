#!/usr/bin/env node
// Fails a pull request that changes the API contract (openapi.yaml outside its
// `info:` block: paths, parameters, schemas) without bumping info.version.
// The contract promises additive-only change within v1; an unversioned change
// leaves integrators unable to tell what moved (fresh audit 2026-10-16, P1-3).
// Usage: node .github/scripts/check-contract-version.mjs <base-ref>
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const FILE = "openapi.yaml";
const base = process.argv[2];
if (!base) {
  console.error("usage: check-contract-version.mjs <base-ref>");
  process.exit(2);
}

const mergeBase = execFileSync("git", ["merge-base", base, "HEAD"], {
  encoding: "utf8",
}).trim();
let before;
try {
  before = execFileSync("git", ["show", `${mergeBase}:${FILE}`], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
} catch {
  console.log(`${FILE} is new on this branch; nothing to compare.`);
  process.exit(0);
}
const after = readFileSync(FILE, "utf8");

const split = (text) => {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const start = lines.findIndex((line) => line === "info:");
  if (start < 0) throw new Error(`${FILE} has no top-level info: block`);
  let end = start + 1;
  while (end < lines.length && !/^[A-Za-z]/.test(lines[end])) end += 1;
  const info = lines.slice(start, end).join("\n");
  const version = info.match(/^ {2}version:\s*"?([^"\s]+)"?\s*$/m)?.[1];
  if (!version) throw new Error(`${FILE} info: block has no version`);
  const rest = [...lines.slice(0, start), ...lines.slice(end)].join("\n");
  return { version, rest };
};

const old = split(before);
const now = split(after);
if (old.rest === now.rest) {
  console.log(`Contract body unchanged (info.version ${now.version}).`);
} else if (old.version === now.version) {
  console.error(
    `${FILE} changed outside info: but info.version is still ${now.version}. ` +
      "Bump info.version and add a CHANGELOG.md entry for the change.",
  );
  process.exit(1);
} else {
  console.log(`Contract changed with info.version ${old.version} -> ${now.version}.`);
}
