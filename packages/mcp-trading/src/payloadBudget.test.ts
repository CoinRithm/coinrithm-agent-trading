import { afterEach, describe, expect, it, vi } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CoinRithmClient } from "./client.js";
import { SERVER_INSTRUCTIONS } from "./instructions.js";
import { PAPER_NOTE, registerTools } from "./tools.js";

// Audit 2026-09-29: tools/list was 114,668 bytes (about 29k tokens), with a
// ~512-character paper disclaimer repeated on 25 tools, and no server
// instructions. These checks run over the real MCP protocol in memory.

const fetchMock = vi.fn<typeof fetch>();
vi.stubGlobal("fetch", fetchMock);

afterEach(() => {
  fetchMock.mockReset();
});

async function connect() {
  const server = new McpServer(
    { name: "coinrithm-trading", version: "test" },
    { instructions: SERVER_INSTRUCTIONS },
  );
  registerTools(
    server,
    new CoinRithmClient({ baseUrl: "https://api.example.test" }),
  );
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "budget-probe", version: "1" });
  await Promise.all([
    server.connect(serverTransport),
    client.connect(clientTransport),
  ]);
  return client;
}

describe("MCP first-contact payload budget", () => {
  it("sends usage guidance once, in the initialize instructions", async () => {
    const client = await connect();
    const instructions = client.getInstructions() ?? "";
    expect(instructions).toContain("status=closed");
    expect(instructions).toContain("settings/api-keys");
    expect(instructions).toContain(PAPER_NOTE);
  });

  it("keeps tools/list under 95,000 bytes (was 115,070) and never repeats the full note", async () => {
    const client = await connect();
    const { tools } = await client.listTools();
    const bytes = Buffer.byteLength(JSON.stringify({ tools }));
    expect(tools.length).toBeGreaterThanOrEqual(40);
    // 115,070 bytes before this change, 90,013 after (same in-memory measure).
    expect(bytes).toBeLessThan(95_000);
    for (const tool of tools) {
      expect(tool.description ?? "").not.toContain(PAPER_NOTE);
    }
  });

  it("pm_data_disagreements asks for 3 clusters unless the caller sets a limit", async () => {
    fetchMock.mockImplementation(
      async () =>
        new Response(JSON.stringify({ data: [], pagination: {} }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    );
    const client = await connect();
    await client.callTool({ name: "pm_data_disagreements", arguments: {} });
    const url = new URL(String(fetchMock.mock.calls.at(-1)![0]));
    expect(url.pathname).toBe("/api/prediction-markets/matches/public");
    expect(url.searchParams.get("limit")).toBe("3");
    await client.callTool({
      name: "pm_data_disagreements",
      arguments: { limit: 10 },
    });
    expect(
      new URL(String(fetchMock.mock.calls.at(-1)![0])).searchParams.get(
        "limit",
      ),
    ).toBe("10");
  });

  it("returns compact JSON text (no pretty-print indentation)", async () => {
    fetchMock.mockImplementation(
      async () =>
        new Response(JSON.stringify({ data: [{ a: 1 }] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    );
    const client = await connect();
    const result = await client.callTool({
      name: "pm_data_sources",
      arguments: {},
    });
    const text = (result.content as Array<{ type: string; text: string }>)[0]
      .text;
    expect(text).not.toContain("\n  ");
    expect(JSON.parse(text).httpStatus).toBe(200);
  });
});
