import { afterEach, describe, expect, it } from "vitest";
import { createServer, type Server } from "node:http";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { CoinRithmClient } from "./client.js";
import { createHttpApp, MALFORMED_MCP_LINK } from "./http.js";

// The observed family (2026-09-25 Traefik log, 408 Claude-User GETs): a
// markdown link whose "](https://…)" suffix ended up in the request path.
const OBSERVED = "/mcp](https:/mcp.coinrithm.com/mcp)";

const servers: Server[] = [];
afterEach(async () => {
  await Promise.all(
    servers
      .splice(0)
      .map(
        (server) =>
          new Promise<void>((resolve) => server.close(() => resolve())),
      ),
  );
});

async function start() {
  // Unreachable upstream: none of these requests should need the REST API.
  const app = createHttpApp(
    new CoinRithmClient({ baseUrl: "http://127.0.0.1:9" }),
  );
  const server = createServer(app);
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("No localhost listener");
  return `http://127.0.0.1:${address.port}`;
}

describe("malformed MCP link recovery", () => {
  it("matches only the pasted-markdown family", () => {
    expect(MALFORMED_MCP_LINK.test(OBSERVED)).toBe(true);
    expect(
      MALFORMED_MCP_LINK.test("/mcp%5D(https://mcp.coinrithm.com/mcp)"),
    ).toBe(true);
    expect(MALFORMED_MCP_LINK.test("/mcp%5D%28https%3A%2F%2Fx")).toBe(true);
    for (const path of [
      "/mcp",
      "/mcp/",
      "/mcpx",
      "/mcp)",
      "/mcp]",
      "/",
      "/x/mcp](y",
    ]) {
      expect(MALFORMED_MCP_LINK.test(path), path).toBe(false);
    }
  });

  it("redirects GET and HEAD of the observed path to the service descriptor", async () => {
    const base = await start();
    for (const method of ["GET", "HEAD"]) {
      const res = await fetch(base + OBSERVED, { method, redirect: "manual" });
      expect(res.status, method).toBe(302);
      expect(res.headers.get("location"), method).toBe("/");
    }
    const encoded = await fetch(
      `${base}/mcp%5D(https://mcp.coinrithm.com/mcp)`,
      { redirect: "manual" },
    );
    expect(encoded.status).toBe(302);
    const followed = await fetch(base + OBSERVED);
    expect(followed.status).toBe(200);
    expect((await followed.json()).service).toBe("CoinRithm MCP");
  });

  it("leaves POST on that path, GET /mcp and ordinary unknown paths unchanged", async () => {
    const base = await start();
    const post = await fetch(base + OBSERVED, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
      redirect: "manual",
    });
    expect(post.status).toBe(404);
    expect((await fetch(`${base}/mcp`, { redirect: "manual" })).status).toBe(
      405,
    );
    for (const path of [
      "/mcpx",
      "/mcp)",
      "/unknown",
      "/.well-known/glama.json",
    ]) {
      const res = await fetch(base + path, { redirect: "manual" });
      expect(res.status, path).toBe(404);
    }
  });

  it("still serves MCP initialize and tool listing on POST /mcp", async () => {
    const base = await start();
    const client = new Client({
      name: "malformed-link-test",
      version: "0.0.0",
    });
    const transport = new StreamableHTTPClientTransport(new URL(`${base}/mcp`));
    await client.connect(transport);
    const { tools } = await client.listTools();
    expect(tools.length).toBeGreaterThan(0);
    await client.close();
  });
});
