import { describe, it, expect, vi } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CoinRithmClient } from "./client.js";
import { registerTools } from "./tools.js";

// What clients read in tools/list, held steady across the zod 3 -> 4 upgrade
// (2026-11-18). zod 4's converter would otherwise publish a required `body`,
// drop `additionalProperties: false` from plain input objects, and add the
// safe-integer range to every result envelope. Compared on the serialized
// list, which is what a client receives.

vi.stubGlobal("fetch", vi.fn<typeof fetch>());

type Json = Record<string, unknown>;

async function listSerializedTools(): Promise<Json[]> {
  const server = new McpServer({ name: "coinrithm-trading", version: "test" });
  registerTools(
    server,
    new CoinRithmClient({ baseUrl: "https://api.example.test" }),
  );
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "contract-probe", version: "1" });
  await Promise.all([
    server.connect(serverTransport),
    client.connect(clientTransport),
  ]);
  const { tools } = await client.listTools();
  return JSON.parse(JSON.stringify(tools)) as Json[];
}

/** Every object schema that declares properties, at any depth. */
function objectSchemas(node: unknown, path: string, out: [string, Json][]) {
  if (Array.isArray(node)) {
    node.forEach((child, i) => objectSchemas(child, `${path}[${i}]`, out));
    return;
  }
  if (!node || typeof node !== "object") return;
  const schema = node as Json;
  const properties = schema.properties as Json | undefined;
  if (schema.type === "object" && properties && Object.keys(properties).length)
    out.push([path, schema]);
  for (const [key, child] of Object.entries(schema))
    objectSchemas(child, `${path}.${key}`, out);
}

describe("tools/list published contract", () => {
  it("closes every input object that declares properties", async () => {
    const tools = await listSerializedTools();
    const open: string[] = [];
    let checked = 0;
    for (const tool of tools) {
      const found: [string, Json][] = [];
      objectSchemas(
        tool.inputSchema,
        `${String(tool.name)}.inputSchema`,
        found,
      );
      for (const [path, schema] of found) {
        checked += 1;
        if (schema.additionalProperties !== false) open.push(path);
      }
    }
    expect(open).toEqual([]);
    // 46 tools take arguments; nested objects add to that.
    expect(checked).toBeGreaterThanOrEqual(46);
  });

  it("keeps the result envelope: optional body, plain integer status", async () => {
    const tools = await listSerializedTools();
    expect(tools.length).toBeGreaterThanOrEqual(49);
    for (const tool of tools) {
      const output = tool.outputSchema as Json;
      const properties = output.properties as Record<string, Json>;
      expect(output.required, String(tool.name)).toEqual(["httpStatus", "ok"]);
      expect(properties.httpStatus, String(tool.name)).toEqual({
        type: "integer",
      });
      expect(properties.body, String(tool.name)).toEqual({});
      expect(output.additionalProperties, String(tool.name)).toBe(false);
    }
  });
});
