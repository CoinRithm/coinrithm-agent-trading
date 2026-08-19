// Versions stamped into manifest.lock.json so a resolved agent is reproducible
// only against the exact compile that produced it.
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

export const RUNNER_VERSION = "0.1.0";
export const RESOLVER_VERSION = "1";
export const MANIFEST_SCHEMA = "coinrithm.manifest.v1";

// The published package version, read from package.json at runtime (same
// createRequire pattern as src/version.ts) so the API pin's mcpVersion can never
// drift from the real published version again. package.json lives outside
// rootDir=src; at runtime dist/agent/version.js resolves ../../package.json to
// the package root in both the repo and the published tarball.
const PACKAGE_VERSION: string = (
  require("../../package.json") as { version: string }
).version;

// The CoinRithm execution surface a generated agent talks to. Written into
// functionality/coinrithm.yaml as a version PIN; the CLI warns when an agent's
// pin lags this, but never blocks self-host use.
export const COINRITHM_API = {
  kind: "coinrithm-agent-api",
  baseUrl: "https://api.coinrithm.com",
  mcpUrl: "https://mcp.coinrithm.com/mcp",
  // The API CONTRACT version (openapi.yaml info.version). Versioned independently
  // from the npm package below — hand-bump this when the OpenAPI contract changes.
  openapiVersion: "1.7.0",
  mcpPackage: "@coinrithm/mcp-trading",
  mcpVersion: PACKAGE_VERSION,
} as const;
