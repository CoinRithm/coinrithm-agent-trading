// Run from a clean installation of the archives, never the source checkout.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { join, dirname } from "node:path";
import { writeFileSync, readFileSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { createClient } from "@coinrithm/sdk";
import * as engine from "@coinrithm/mcp-trading/engine";
import * as legacy from "@coinrithm/mcp-trading/dist/agent/engine.js";

assert.equal(engine.runCycle, legacy.runCycle);
const require = createRequire(import.meta.url);
const root = dirname(require.resolve("@coinrithm/mcp-trading/package.json"));
const cli = spawnSync(
  process.execPath,
  [join(root, "dist/agent/index.js"), "--help"],
  {
    encoding: "utf8",
    timeout: 15_000,
    windowsHide: true,
  },
);
assert.equal(cli.status, 0, cli.stderr);
assert.match(cli.stdout, /coinrithm-agent/);

const stateFile = join(process.cwd(), "persisted state.json");
const state = engine.newState("compatibility");
state.disabled = true;
state.riskIncreasesToday = 3;
engine.saveState(stateFile, state);
writeFileSync(
  "reload.mjs",
  `
  import assert from 'node:assert/strict';
  import { loadState, saveState } from '@coinrithm/mcp-trading/engine';
  const state = loadState(process.argv[2], 'fallback');
  assert.equal(state.disabled, true);
  assert.equal(state.riskIncreasesToday, 3);
  state.cyclesRun = 7;
  saveState(process.argv[2], state);
`,
);
const reload = spawnSync(process.execPath, ["reload.mjs", stateFile], {
  encoding: "utf8",
  timeout: 15_000,
  windowsHide: true,
});
assert.equal(reload.status, 0, reload.stderr);
assert.equal(engine.loadState(stateFile, "fallback").cyclesRun, 7);
assert.equal(
  readdirSync(".").filter((name) => name.endsWith(".tmp")).length,
  0,
);
writeFileSync(stateFile, "{bad json");
assert.throws(() => engine.loadState(stateFile, "fallback"));
assert.equal(readFileSync(stateFile, "utf8"), "{bad json");

let calls = 0;
const sdk = createClient({
  apiKey: "offline-fixture",
  baseUrl: "https://fixture.invalid",
  fetch: async (request) => {
    calls++;
    assert.equal(
      request.headers.get("Authorization"),
      "Bearer offline-fixture",
    );
    return new Response(JSON.stringify({ error: "fixture" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  },
});
const result = await sdk.GET("/api/prediction-markets/sources/health");
assert.equal(result.error.error, "fixture");
assert.equal(calls, 1);

const transport = new StdioClientTransport({
  command: process.execPath,
  args: [join(root, "dist/index.js")],
  env: {
    ...process.env,
    COINRITHM_API_KEY: "offline-fixture",
    COINRITHM_API_URL: "http://127.0.0.1:1",
  },
});
const mcp = new Client({ name: "package-smoke", version: "1.0.0" });
try {
  await mcp.connect(transport);
  const { tools } = await mcp.listTools();
  assert.equal(tools.length, 38);
  assert.equal(new Set(tools.map((tool) => tool.name)).size, tools.length);
} finally {
  await mcp.close();
}
console.log(
  `Installed package smoke passed: ${process.platform}, Node ${process.version}`,
);
