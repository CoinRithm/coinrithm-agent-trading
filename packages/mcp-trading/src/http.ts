#!/usr/bin/env node
// CoinRithm trading MCP server — Streamable HTTP transport (MULTI-USER, hosted).
//
// This is the entry behind https://mcp.coinrithm.com/mcp. It is multi-tenant:
// many users point their MCP client at the SAME URL, each sending THEIR OWN
// key in the request's Authorization header when they call tools:
//
//     Authorization: Bearer crk_live_…
//
// Smithery reserves the Authorization header for its gateway, so it may send:
//
//     X-CoinRithm-API-Key: Bearer crk_live_…
//
// There is NO global COINRITHM_API_KEY here. Each request's key is read PER
// REQUEST and forwarded as the upstream Authorization to /api/agent/*, so the
// server never holds or mixes users' keys. (The single-user env-key path lives
// in src/index.ts / stdio and is unchanged.)
//
// How the per-request key reaches the tool handlers:
//   - The MCP SDK's StreamableHTTPServerTransport surfaces the incoming HTTP
//     request's headers to tool handlers via `extra.requestInfo.headers`
//     (see tools.ts → requestKey()). That is the primary, SDK-native path.
//   - We ALSO attach the parsed token to `req.auth` below, which the transport
//     forwards as `extra.authInfo`, giving requestKey() a second source. Either
//     way the caller's own key — and only that key — is used for their tool call.
//   - Unauthenticated MCP initialization and tool-list introspection are allowed
//     so registries can verify the server. Actual tool calls without a key return
//     a structured 401 from CoinRithmClient before any upstream request is made.
//
// Config (env):
//   COINRITHM_API_URL  (optional)  upstream base URL (default production).
//   PORT               (optional)  HTTP port (default 8787).
//
// Transport is stateless: a fresh McpServer + transport per request, which is
// the correct isolation model for a multi-user, per-request-keyed surface — no
// session state is shared between users.

import express, { type Request } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  CoinRithmClient,
  bearerFromHeader,
  loadHttpConfig,
  log,
} from "./client.js";
import { registerTools } from "./tools.js";
import { SERVER_VERSION } from "./version.js";

// The SDK reads `req.auth` (AuthInfo) off the Node request if present and threads
// it to handlers as `extra.authInfo`. We populate a minimal AuthInfo carrying the
// raw bearer token as a fallback to the `requestInfo.headers` path.
type AuthedRequest = Request & {
  auth?: { token: string; clientId: string; scopes: string[] };
};

async function main(): Promise<void> {
  const config = loadHttpConfig(); // no global key — keys arrive per request
  const client = new CoinRithmClient(config); // constructed WITHOUT a default key
  const app = express();
  app.use(express.json());

  // Lightweight, unauthenticated liveness probe (handy for Coolify/uptime checks).
  app.get("/healthz", (_req, res) => {
    res.json({ ok: true, service: "coinrithm-mcp", transport: "streamable-http" });
  });

  app.post("/mcp", async (req: AuthedRequest, res) => {
    // Per-request auth: read THIS caller's key from the Authorization header,
    // or from Smithery's non-reserved forwarding header.
    // It is optional at the transport layer so registries can initialize the
    // server and list tool schemas. Tool handlers still require a key and return
    // a structured 401 if one is missing.
    const apiKey =
      bearerFromHeader(req.headers.authorization) ??
      bearerFromHeader(req.headers["x-coinrithm-api-key"]);

    // Belt-and-suspenders: also expose the token via the SDK's authInfo channel.
    // The primary path is extra.requestInfo.headers.authorization (always set by
    // StreamableHTTPServerTransport); this gives requestKey() a second source.
    if (apiKey) {
      req.auth = { token: apiKey, clientId: "coinrithm-key", scopes: [] };
    }

    const server = new McpServer({
      name: "coinrithm-trading",
      version: SERVER_VERSION,
    });
    registerTools(server, client);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // stateless: no cross-request/user state
    });
    res.on("close", () => {
      void transport.close();
      void server.close();
    });
    try {
      await server.connect(transport);
      // The transport reads req.headers (→ extra.requestInfo) and req.auth
      // (→ extra.authInfo); tools.ts picks up the caller's key from there.
      await transport.handleRequest(req, res, req.body);
    } catch (err) {
      log("http request error:", err);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32603, message: "Internal server error" },
          id: null,
        });
      }
    }
  });

  const port = Number(process.env.PORT) || 8787;
  app.listen(port, () => {
    log(
      `HTTP MCP listening on :${port}/mcp (multi-user, per-request key). ` +
        `upstream=${config.baseUrl}. Paper only.`,
    );
  });
}

main().catch((err) => {
  log("fatal:", err instanceof Error ? err.message : err);
  process.exit(1);
});
