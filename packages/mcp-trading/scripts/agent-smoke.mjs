#!/usr/bin/env node
// Smoke test the built agent CLI end-to-end with NO keys: scaffolds + validates
// + inspects + ejects + locks in a temp dir, and confirms `run` fails closed
// without credentials. No network, no model, no live calls. Run after build.

import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const CLI = join(here, "..", "dist", "agent", "index.js");

function run(args, envOverride = {}) {
  return spawnSync(process.execPath, [CLI, ...args], {
    encoding: "utf8",
    env: { ...process.env, ...envOverride },
  });
}

function assert(cond, msg) {
  if (!cond) {
    console.error(`SMOKE FAIL: ${msg}`);
    process.exit(1);
  }
  console.log(`ok: ${msg}`);
}

if (!existsSync(CLI)) {
  console.error(`SMOKE FAIL: ${CLI} not found — run \`npm run build\` first`);
  process.exit(1);
}

const help = run([]);
assert(help.status === 0 && /coinrithm-agent/.test(help.stdout), "help prints usage");

const tmp = mkdtempSync(join(tmpdir(), "cr-agent-smoke-"));
try {
  const agent = join(tmp, "demo");
  assert(run(["new", agent, "--preset", "conservative"]).status === 0, "new scaffolds an agent");
  assert(existsSync(join(agent, "agent.md")), "agent.md was created");
  assert(run(["validate", agent]).status === 0, "validate (self-host) passes");
  assert(run(["validate", agent, "--hosted"]).status === 0, "validate --hosted passes");
  assert(run(["inspect", agent, "--json"]).status === 0, "inspect --json works");
  assert(run(["eject", agent]).status === 0, "eject preserves the spec");
  assert(run(["lock", agent]).status === 0, "lock writes the manifest");
  assert(existsSync(join(agent, "meta", "manifest.lock.json")), "manifest.lock.json exists");

  const r = run(["run", agent, "--once", "--dry-run"], { COINRITHM_API_KEY: "" });
  assert(
    r.status === 1 && /COINRITHM_API_KEY/.test(`${r.stdout}${r.stderr}`),
    "run fails closed without COINRITHM_API_KEY",
  );

  console.log("SMOKE OK");
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
