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
  // Keep `/healthz` as the deployment contract and expose `/health` as a
  // compatibility alias for agents and generic uptime monitors.
  app.get(["/health", "/healthz"], (_req, res) => {
    res.json({
      ok: true,
      service: "coinrithm-mcp",
      transport: "streamable-http",
    });
  });

  // Self-describing landing for humans and validate-before-recommend agents.
  // GET / and GET /mcp used to 404, which reads as a dead service to anyone
  // probing the published URL (GEO audit 2026-07-07). The MCP endpoint itself
  // is POST-only streamable HTTP — say so instead of 404ing.
  app.get("/", (_req, res) => {
    res.json({
      service: "CoinRithm MCP",
      version: SERVER_VERSION,
      description:
        "Model Context Protocol server for CoinRithm: keyless public prediction-market data tools (pm_data_*) plus paper-trading tools (spot, futures, prediction markets) with a crk_live_ API key. Paper only — never real money.",
      endpoint: {
        url: "https://mcp.coinrithm.com/mcp",
        method: "POST",
        transport: "streamable-http",
      },
      connect:
        "Point any MCP client at the endpoint above. Data tools need no key; trading tools take Authorization: Bearer crk_live_… (mint one at coinrithm.com → Settings → API Keys).",
      localAlternative: "npx -y @coinrithm/mcp-trading",
      docs: {
        quickstart: "https://www.coinrithm.com/en/agentic-trading",
        openapi: "https://www.coinrithm.com/openapi.yaml",
        repo: "https://github.com/CoinRithm/coinrithm-agent-trading",
        dataApi: "https://www.coinrithm.com/en/prediction-markets/api",
      },
    });
  });

  // robots.txt for THIS host. robots.txt is per-HOST, so www.coinrithm.com's
  // file never governed mcp.coinrithm.com — a separate origin that had no
  // route of its own. The origin 404'd and Cloudflare answered with its
  // managed content-signals boilerplate: 1,248 bytes of comments carrying ZERO
  // User-agent/Disallow/Allow lines, which a crawler reads as "crawl
  // everything". That is the identical failure that cost api.coinrithm.com
  // 15.4% of the site's 90-day crawl budget (4,468 of 29,100 GSC requests)
  // before it was closed on 2026-08-20.
  //
  // Nothing here is indexable: GET / is a JSON service descriptor, GET /mcp is
  // a 405, and the real surface is POST-only streamable HTTP. The human-facing
  // documentation crawlers should index lives on www.coinrithm.com
  // (/en/agentic-trading, /en/prediction-markets/api), which links here.
  //
  // SAFE FOR MCP CLIENTS AND REGISTRIES: robots.txt is advisory to CRAWLERS
  // only. MCP clients, Smithery and the MCP registry POST /mcp or GET /healthz
  // directly and never consult robots.txt, so this cannot gate discovery,
  // initialization or tool listing. Do not "fix" a registry problem here.
  app.get("/robots.txt", (_req, res) => {
    res.type("text/plain").send("User-agent: *\nDisallow: /\n");
  });

  app.get("/mcp", (_req, res) => {
    res.status(405).json({
      error: "method_not_allowed",
      message:
        "This is a POST-only streamable-HTTP MCP endpoint. Connect with an MCP client, or GET / for service info.",
    });
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
