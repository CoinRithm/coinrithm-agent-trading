#!/usr/bin/env node
// CoinRithm trading MCP server — stdio transport.
//
// Exposes paper-trading tools over the Model Context Protocol so MCP clients
// (Claude Desktop, Claude Code, and any other MCP host) can read your CoinRithm
// paper account and place simulated trades using a user-minted API key.
//
// Config (env):
//   COINRITHM_API_KEY  (required)  crk_live_… key minted in your profile.
//   COINRITHM_API_URL  (optional)  base URL; defaults to https://api.coinrithm.com
//
// stdout is the JSON-RPC channel — we log ONLY to stderr.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CoinRithmClient, loadConfig, log } from "./client.js";
import { registerTools } from "./tools.js";
import { SERVER_VERSION } from "./version.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const client = new CoinRithmClient(config);

  const server = new McpServer({
    name: "coinrithm-trading",
    version: SERVER_VERSION,
  });

  registerTools(server, client);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  log(`connected (stdio). base=${config.baseUrl}. Paper trading only — not advice.`);
}

main().catch((err) => {
  log("fatal:", err instanceof Error ? err.message : err);
  process.exit(1);
});
