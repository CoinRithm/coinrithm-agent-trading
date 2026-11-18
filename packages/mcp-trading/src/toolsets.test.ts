import { describe, it, expect, vi } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CoinRithmClient } from "./client.js";
import {
  TOOLSETS,
  parseToolsets,
  registerTools,
  toolsetOf,
  type Toolset,
} from "./tools.js";

// The full tools/list is about 21,000 tokens of model context. Toolsets let a
// client load part of it. These checks run over the real MCP protocol in
// memory, like payloadBudget.test.ts.

vi.stubGlobal("fetch", vi.fn<typeof fetch>());

async function listTools(toolsets?: ReadonlySet<Toolset>) {
  const server = new McpServer({ name: "coinrithm-trading", version: "test" });
  registerTools(
    server,
    new CoinRithmClient({ baseUrl: "https://api.example.test" }),
    { toolsets },
  );
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "toolset-probe", version: "1" });
  await Promise.all([
    server.connect(serverTransport),
    client.connect(clientTransport),
  ]);
  const { tools } = await client.listTools();
  return tools;
}
const names = (tools: Array<{ name: string }>) =>
  tools.map((t) => t.name).sort();
const bytes = (tools: unknown) => Buffer.byteLength(JSON.stringify({ tools }));

describe("MCP toolsets", () => {
  it("no selection, or an empty one, loads every tool exactly as before", async () => {
    const all = await listTools();
    expect(all.length).toBeGreaterThanOrEqual(49);
    expect(names(await listTools(undefined))).toEqual(names(all));
    expect(parseToolsets(undefined)).toBeUndefined();
    expect(parseToolsets("")).toBeUndefined();
    expect(parseToolsets("everything, nope")).toBeUndefined();
  });

  it("data loads the 23 keyless tools and under a third of the full list", async () => {
    const all = await listTools();
    const data = await listTools(new Set<Toolset>(["data"]));
    expect(data).toHaveLength(23);
    expect(data.filter((t) => t.name.startsWith("pm_data_"))).toHaveLength(17);
    expect(names(data)).toEqual(
      expect.arrayContaining([
        "crypto_price",
        "get_arena_agent",
        "get_arena_leaderboard",
        "get_crypto_movers",
        "instrument_markets",
        "tradfi_references",
      ]),
    );
    // Every data tool is read-only, and none is an account or trading tool.
    for (const tool of data) expect(tool.annotations?.readOnlyHint).toBe(true);
    expect(names(data)).not.toContain("whoami");
    expect(bytes(data)).toBeLessThan(bytes(all) / 2);
  });

  it("the three toolsets split the full list with no overlap and nothing left out", async () => {
    const all = names(await listTools());
    const parts = await Promise.all(
      TOOLSETS.map((set) => listTools(new Set<Toolset>([set]))),
    );
    const union = parts.flatMap((tools) => names(tools));
    expect(union).toHaveLength(all.length);
    expect([...new Set(union)].sort()).toEqual(all);
  });

  it("trading holds every write plus the three quotes; account holds no write", async () => {
    const trading = await listTools(new Set<Toolset>(["trading"]));
    const account = await listTools(new Set<Toolset>(["account"]));
    expect(names(trading)).toEqual(
      expect.arrayContaining([
        "spot_quote",
        "futures_quote",
        "pm_quote",
        "place_spot_order",
        "open_futures_position",
        "close_futures_position",
        "open_pm_position",
      ]),
    );
    for (const tool of account)
      expect(tool.annotations?.readOnlyHint).toBe(true);
    expect(names(account)).toEqual(
      expect.arrayContaining(["whoami", "get_portfolio", "resolve_symbol"]),
    );
  });

  it("a combined selection is the union of its parts", async () => {
    const both = await listTools(parseToolsets("data,account"));
    const data = await listTools(new Set<Toolset>(["data"]));
    const account = await listTools(new Set<Toolset>(["account"]));
    expect(names(both)).toEqual([...names(data), ...names(account)].sort());
  });

  it("parses lists, case, spaces and repeated query values, ignoring unknown names", () => {
    expect([...parseToolsets("data")!]).toEqual(["data"]);
    expect([...parseToolsets(" Data , TRADING ,x")!].sort()).toEqual([
      "data",
      "trading",
    ]);
    expect([...parseToolsets(["data", "account"])!].sort()).toEqual([
      "account",
      "data",
    ]);
    expect(parseToolsets({ toolsets: "data" })).toBeUndefined();
    expect(toolsetOf("pm_data_events", true)).toBe("data");
    expect(toolsetOf("spot_quote", true)).toBe("trading");
    expect(toolsetOf("place_spot_order", false)).toBe("trading");
    expect(toolsetOf("get_portfolio", true)).toBe("account");
  });
});
