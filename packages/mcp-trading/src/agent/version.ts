// Versions stamped into manifest.lock.json so a resolved agent is reproducible
// only against the exact compile that produced it.
export const RUNNER_VERSION = "0.1.0";
export const RESOLVER_VERSION = "1";
export const MANIFEST_SCHEMA = "coinrithm.manifest.v1";

// The CoinRithm execution surface a generated agent talks to. Written into
// functionality/coinrithm.yaml as a version PIN; the CLI warns when an agent's
// pin lags this, but never blocks self-host use.
export const COINRITHM_API = {
  kind: "coinrithm-agent-api",
  baseUrl: "https://api.coinrithm.com",
  mcpUrl: "https://mcp.coinrithm.com/mcp",
  openapiVersion: "1.4.0",
  mcpPackage: "@coinrithm/mcp-trading",
  mcpVersion: "0.3.0",
} as const;
