import { afterEach, describe, expect, it } from "vitest";
import { createServer, type RequestListener, type Server } from "node:http";
import { CoinRithmClient } from "./client.js";
import { createHttpApp } from "./http.js";
import { callerIp, runWithCaller } from "./requestContext.js";

const servers: Server[] = [];
afterEach(async () => {
  await Promise.all(
    servers.splice(0).map((s) => new Promise<void>((r) => s.close(() => r()))),
  );
});

async function listen(handler: RequestListener) {
  const server = createServer(handler);
  servers.push(server);
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("no listener");
  return `http://127.0.0.1:${address.port}`;
}

async function callTool(headers: Record<string, string>) {
  const seen: Array<string | undefined> = [];
  const upstream = await listen((req, res) => {
    seen.push(req.headers["cf-connecting-ip"] as string | undefined);
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ sources: [] }));
  });
  const app = createHttpApp(new CoinRithmClient({ baseUrl: upstream }));
  app.set("env", "test");
  const base = await listen(app);
  const response = await fetch(`${base}/mcp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      ...headers,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name: "pm_data_sources", arguments: {} },
    }),
  });
  await response.text();
  return seen;
}

describe("caller address on upstream calls", () => {
  it("forwards the caller's Cloudflare address to the API on keyless tools", async () => {
    expect(await callTool({ "cf-connecting-ip": "203.0.113.7" })).toEqual([
      "203.0.113.7",
    ]);
  });

  it("drops a value that is not an IP and sends nothing without one", async () => {
    expect(await callTool({ "cf-connecting-ip": "not-an-ip" })).toEqual([
      undefined,
    ]);
    expect(await callTool({})).toEqual([undefined]);
  });

  it("scopes the address to one request", () => {
    expect(runWithCaller("2001:db8::1", () => callerIp())).toBe("2001:db8::1");
    expect(callerIp()).toBeUndefined();
  });
});
