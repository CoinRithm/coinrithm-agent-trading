import { afterEach, describe, expect, it, vi } from "vitest";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { API_KEY_MINT_URL, CoinRithmClient } from "./client.js";
import { registerTools } from "./tools.js";

// First-contact fixes from the 2026-09-29 audit: a keyless assistant should
// get public data without a 401, a missing-key error should say where to mint
// a key, and the first events call should return open markets.

const fetchMock = vi.fn<typeof fetch>();
vi.stubGlobal("fetch", fetchMock);

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

afterEach(() => {
  fetchMock.mockReset();
});

type Handler = (args: Record<string, unknown>, extra: unknown) => unknown;

const toolHandler = (client: CoinRithmClient, name: string): Handler => {
  let found: Handler | undefined;
  const server = {
    registerTool: (toolName: string, _config: unknown, handler: unknown) => {
      if (toolName === name) found = handler as Handler;
    },
  } as unknown as McpServer;
  registerTools(server, client);
  if (!found) throw new Error(`tool ${name} not registered`);
  return found;
};

describe("arena tools are keyless", () => {
  it("serves the leaderboard without a key and never sends one", async () => {
    fetchMock.mockImplementation(async () => jsonResponse({ data: [] }));
    const keyless = new CoinRithmClient({
      baseUrl: "https://api.example.test",
    });
    const result = await keyless.getArenaLeaderboard({ pageSize: 5 });
    expect(result.ok).toBe(true);
    expect(String(fetchMock.mock.calls[0]![0])).toBe(
      "https://api.example.test/api/arena?pageSize=5",
    );

    const keyed = new CoinRithmClient({
      apiKey: "crk_live_secret",
      baseUrl: "https://api.example.test",
    });
    await keyed.getArenaAgent("a42 momentum");
    const [url, init] = fetchMock.mock.calls[1]!;
    expect(String(url)).toBe(
      "https://api.example.test/api/arena/a42%20momentum",
    );
    const headers = (init?.headers ?? {}) as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
    expect(JSON.stringify(headers)).not.toContain("crk_live_secret");
  });

  it("the get_arena_leaderboard tool succeeds for a keyless caller", async () => {
    fetchMock.mockImplementation(async () => jsonResponse({ data: [] }));
    const client = new CoinRithmClient({ baseUrl: "https://api.example.test" });
    await toolHandler(client, "get_arena_leaderboard")({}, {});
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});

describe("missing-key errors point to the key page", () => {
  it("names the mint URL", async () => {
    const client = new CoinRithmClient({ baseUrl: "https://api.example.test" });
    const result = await client.whoami();
    expect(result.ok).toBe(false);
    expect(result.status).toBe(401);
    expect(JSON.stringify(result.data)).toContain(API_KEY_MINT_URL);
    expect(API_KEY_MINT_URL).toBe(
      "https://www.coinrithm.com/en/settings/api-keys",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("pm_data_events defaults to open markets", () => {
  const urlFor = async (args: Record<string, unknown>) => {
    fetchMock.mockImplementation(async () =>
      jsonResponse({ data: [], pagination: {} }),
    );
    const client = new CoinRithmClient({ baseUrl: "https://api.example.test" });
    await toolHandler(client, "pm_data_events")(args, {});
    return new URL(String(fetchMock.mock.calls.at(-1)![0]));
  };

  it("sends status=open when the caller gives no status", async () => {
    expect((await urlFor({})).searchParams.get("status")).toBe("open");
  });

  it("passes an explicit status through (closed, all)", async () => {
    expect(
      (await urlFor({ status: "closed" })).searchParams.get("status"),
    ).toBe("closed");
    expect((await urlFor({ status: "all" })).searchParams.get("status")).toBe(
      "all",
    );
  });
});
