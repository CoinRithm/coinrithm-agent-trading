import { describe, expect, it, vi } from "vitest";
import type { z } from "zod";
import { registerTools } from "./tools.js";
import type { CoinRithmClient } from "./client.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// get_news wraps the documented, keyed GET /api/agent/news (scope read). Before
// it, MCP users had no news at all, while get_crypto_movers told them to read
// news from get_market_context, which carries none.
type Registered = {
  name: string;
  config: {
    inputSchema: Record<string, z.ZodTypeAny>;
    description?: string;
    annotations?: { readOnlyHint?: boolean; destructiveHint?: boolean };
  };
  handler: (args: Record<string, unknown>, extra: unknown) => unknown;
};

const capture = (client: Partial<CoinRithmClient>): Registered[] => {
  const tools: Registered[] = [];
  const server = {
    registerTool: (name: string, config: unknown, handler: unknown) => {
      tools.push({
        name,
        config: config as Registered["config"],
        handler: handler as Registered["handler"],
      });
    },
  } as unknown as McpServer;
  registerTools(server, client as unknown as CoinRithmClient);
  return tools;
};

// Shape served by backend-v2 controllers/agent/news.ts; values from the
// 2026-09-29 replica probe (bitcoin: 36 scored stories in 48h).
const SERVED = {
  coins: ["bitcoin"],
  asOf: "2026-09-29T08:30:55.000Z",
  items: [
    {
      title:
        "Bitcoin Falls Lower as Trump's Iran Snub Sends Oil, Yields Higher",
      source: "Decrypt",
      url: "https://decrypt.co/example",
      publishedAt: "2026-09-28T15:26:28.000Z",
      ageMinutes: 1024,
      category: "macro",
      sentiment: "bearish",
      sentimentConfidence: 0.8,
      importance: 5,
      coins: ["bitcoin"],
    },
  ],
};

describe("get_news", () => {
  it("is a read-only tool that says it needs a key and that scoring can lag", () => {
    const tool = capture({}).find((t) => t.name === "get_news");
    expect(tool).toBeDefined();
    expect(tool!.config.annotations?.readOnlyHint).toBe(true);
    expect(tool!.config.annotations?.destructiveHint).toBe(false);
    expect(tool!.config.description).toContain("Needs an API key");
    expect(tool!.config.description).toContain("Scoring can lag");
  });

  it("calls GET /api/agent/news with the caller's key and only the given filters", async () => {
    const getNews = vi
      .fn()
      .mockResolvedValue({ ok: true, status: 200, data: SERVED });
    const tool = capture({
      getNews,
    } as unknown as Partial<CoinRithmClient>).find(
      (t) => t.name === "get_news",
    )!;
    const result = (await tool.handler(
      { coins: "BTC", hours: 48 },
      { requestInfo: { headers: { authorization: "Bearer fixture-caller" } } },
    )) as { structuredContent?: { body?: unknown; ok?: boolean } };

    expect(getNews).toHaveBeenCalledWith(
      { coins: "BTC", limit: undefined, hours: 48, minImportance: undefined },
      "fixture-caller",
      undefined,
    );
    expect(result.structuredContent?.ok).toBe(true);
    expect(result.structuredContent?.body).toEqual(SERVED);
  });

  it("bounds its inputs the way the endpoint does", () => {
    const schema = capture({}).find((t) => t.name === "get_news")!.config
      .inputSchema;
    expect(schema.coins!.safeParse("").success).toBe(false);
    expect(schema.limit!.safeParse(26).success).toBe(false);
    expect(schema.hours!.safeParse(169).success).toBe(false);
    expect(schema.minImportance!.safeParse(11).success).toBe(false);
    expect(schema.minImportance!.safeParse(8).success).toBe(true);
  });

  it("stops pointing movers at get_market_context for news", () => {
    const movers = capture({}).find((t) => t.name === "get_crypto_movers");
    expect(movers!.config.description).toContain("get_news");
    expect(movers!.config.description).not.toContain("(sentiment, news)");
  });
});
