import { afterEach, describe, expect, it } from "vitest";
import { createServer, type Server } from "node:http";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { CoinRithmClient } from "./client.js";
import { createHttpApp } from "./http.js";

// `?toolsets=` on the hosted endpoint, over real HTTP: the selection reaches
// tools/list, and a URL without it is unchanged.

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
  // Unreachable upstream: listing tools never calls the REST API.
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

async function toolNames(url: string) {
  const client = new Client({ name: "toolset-http-probe", version: "0.0.0" });
  await client.connect(new StreamableHTTPClientTransport(new URL(url)));
  try {
    return (await client.listTools()).tools.map((tool) => tool.name);
  } finally {
    await client.close();
  }
}

async function instructions(url: string) {
  const client = new Client({ name: "toolset-http-probe", version: "0.0.0" });
  await client.connect(new StreamableHTTPClientTransport(new URL(url)));
  try {
    return client.getInstructions() ?? "";
  } finally {
    await client.close();
  }
}

describe("hosted MCP ?toolsets=", () => {
  it("serves the selected toolsets and leaves the plain URL unchanged", async () => {
    const base = await start();
    const all = await toolNames(`${base}/mcp`);
    const data = await toolNames(`${base}/mcp?toolsets=data`);
    const dataAccount = await toolNames(`${base}/mcp?toolsets=data,account`);
    const typo = await toolNames(`${base}/mcp?toolsets=dta`);

    expect(all.length).toBeGreaterThanOrEqual(49);
    expect(data).toHaveLength(23);
    expect(data).toContain("pm_data_events");
    expect(data).not.toContain("whoami");
    expect(dataAccount).toContain("whoami");
    expect(dataAccount).not.toContain("place_spot_order");
    expect(dataAccount.length).toBeLessThan(all.length);
    // An unknown selection falls back to every tool, never to none.
    expect([...typo].sort()).toEqual([...all].sort());
  });

  it("says which toolsets are loaded only when a selection was made", async () => {
    const base = await start();
    const plain = await instructions(`${base}/mcp`);
    const selected = await instructions(`${base}/mcp?toolsets=trading,data`);
    expect(plain).not.toContain("Loaded toolsets");
    expect(selected.startsWith(plain)).toBe(true);
    expect(selected).toContain("Loaded toolsets: data, trading.");
    expect(await instructions(`${base}/mcp?toolsets=dta`)).toBe(plain);
  });
});
