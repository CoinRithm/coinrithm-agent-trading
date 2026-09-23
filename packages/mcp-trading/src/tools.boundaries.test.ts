import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CoinRithmClient } from "./client.js";
import {
  registerTools,
  compactPublicPmEvents,
  compactPublicPmEvent,
  compactPublicPmOverview,
  compactPublicPmWhales,
  compactPublicCryptoMovers,
  compactPublicPmDisagreements,
} from "./tools.js";

afterEach(() => vi.unstubAllGlobals());

describe("compact market evidence preserves missing and malformed values", () => {
  it("does not manufacture arrays or numeric evidence for partial responses", () => {
    expect(compactPublicPmEvents({ data: null })).toEqual({ data: null });
    expect(compactPublicPmOverview({ highlights: null })).toMatchObject({
      highlights: null,
    });
    expect(
      compactPublicPmOverview({
        highlights: { unavailable: null, entries: [null] },
      }),
    ).toMatchObject({ highlights: { unavailable: null, entries: [null] } });
    expect(compactPublicPmWhales({ trades: null }, 10)).toEqual({
      trades: null,
    });
    expect(compactPublicPmWhales({ trades: [null, 7] }, 10)).toEqual({
      trades: [null, 7],
    });
    expect(compactPublicPmDisagreements({ data: null })).toMatchObject({
      data: null,
    });
    expect(
      compactPublicPmDisagreements({
        data: [null, { events: null, comparisons: null }],
      }),
    ).toMatchObject({
      data: [null, { eventCount: 0, events: null, comparisons: null }],
    });
    expect(
      compactPublicCryptoMovers([
        null,
        { ucid: 1, change24h: "unknown", currentPrice: "unavailable" },
      ]),
    ).toEqual([
      null,
      {
        coinId: 1,
        change24hPct: "unknown",
        priceUsd: "unavailable",
        symbol: undefined,
        name: undefined,
        slug: undefined,
      },
    ]);
  });

  it("ranks real probabilities ahead of missing values without rewriting those values", () => {
    const outcomes = [
      null,
      { name: "blank", probability: " " },
      { name: "invalid", probability: "unknown" },
      { name: "valid", probability: "0.3" },
    ];
    const original = structuredClone(outcomes);
    expect(
      compactPublicPmEvents({
        data: [null, { source: "fixture", outcomes }, {}],
      }),
    ).toMatchObject({
      data: [
        null,
        {
          source: "fixture",
          outcomeCount: 4,
          outcomes: [outcomes[3], ...outcomes.slice(0, 3)],
        },
        { outcomeCount: 0, outcomes: [] },
      ],
    });
    expect(outcomes).toEqual(original);
  });

  it("handles partial event detail and snapshots without inventing related records", () => {
    expect(compactPublicPmEvent({ event: null })).toMatchObject({
      event: null,
      relatedEventCount: 0,
      crossSourceMatchCount: 0,
    });
    const related = Array.from({ length: 25 }, (_, i) => `item-${i}`);
    const result = compactPublicPmEvent({
      event: {
        topics: related,
        directRelatedCoins: related,
        indirectRelatedCoins: related,
      },
      snapshots: [
        null,
        { outcomes: [null, { name: "Yes", probability: 0, secret: "omit" }] },
      ],
      crossSourceMatches: [
        null,
        { confidence: null, comparison: null, event: null },
        { confidence: null, comparison: {} },
      ],
    });
    expect(result).toMatchObject({
      event: {
        topics: related.slice(0, 20),
        directRelatedCoins: related.slice(0, 20),
        indirectRelatedCoins: related.slice(0, 20),
      },
      snapshots: [
        null,
        { outcomeCount: 2, outcomes: [null, { name: "Yes", probability: 0 }] },
      ],
      crossSourceMatches: [
        null,
        { comparison: null, event: null },
        { comparison: { outcomeCount: 0, outcomes: [] } },
      ],
    });
  });

  it("keeps shared outcome comparisons separate from unmatched outcomes", () => {
    const shared = {
      key: "yes",
      presentInA: true,
      presentInB: true,
      deltaPoints: 5,
    };
    const other = {
      key: "no",
      presentInA: true,
      presentInB: false,
      deltaPoints: 70,
    };
    expect(
      compactPublicPmDisagreements({
        data: [
          {
            events: [],
            comparisons: [
              null,
              { pair: null },
              { pair: { comparison: { outcomes: [other, shared] } } },
            ],
          },
        ],
      }),
    ).toMatchObject({
      data: [
        {
          comparisons: [
            null,
            { pair: null },
            { pair: { comparison: { outcomeCount: 2, outcomes: [shared] } } },
          ],
        },
      ],
    });
  });

  it("retains malformed unshared comparisons in stable order for caller inspection", () => {
    const outcomes = [
      null,
      { key: "unknown", deltaPoints: "unknown" },
      { key: "blank", deltaPoints: " " },
      { key: "known", deltaPoints: -10 },
    ];
    expect(
      compactPublicPmEvent({
        crossSourceMatches: [{ comparison: { outcomes } }],
      }),
    ).toMatchObject({
      crossSourceMatches: [
        {
          comparison: {
            outcomeCount: 4,
            outcomes: [outcomes[3], outcomes[1], outcomes[2], null],
          },
        },
      ],
    });
  });
});

type Registered = {
  schema: Record<string, z.ZodTypeAny>;
  handler: (
    args: Record<string, unknown>,
    extra: unknown,
  ) => Promise<{
    isError: boolean;
    structuredContent: Record<string, unknown>;
  }>;
};
function fixture(body: unknown = { fixture: true }, status = 200) {
  const requests: { url: string; init?: RequestInit }[] = [];
  const fetchFn = vi.fn<typeof fetch>(async (url, init) => {
    requests.push({ url: String(url), init });
    return Response.json(body, { status });
  });
  vi.stubGlobal("fetch", fetchFn);
  const client = new CoinRithmClient({
    baseUrl: "https://fixture.invalid",
    apiKey: "fixture-default",
  });
  const handlers = new Map<string, Registered>();
  registerTools(
    {
      registerTool(
        name: string,
        config: { inputSchema: Record<string, z.ZodTypeAny> },
        handler: Registered["handler"],
      ) {
        handlers.set(name, { schema: config.inputSchema, handler });
      },
    } as unknown as McpServer,
    client,
  );
  return {
    requests,
    call: async (name: string, args: Record<string, unknown>) => {
      const tool = handlers.get(name)!;
      return tool.handler(z.object(tool.schema).parse(args), {
        requestInfo: { headers: { authorization: "Bearer fixture-caller" } },
      });
    },
  };
}

describe("MCP tool requests use the declared contract", () => {
  it.each([
    ["get_positions", { venue: "futures" }, "/api/agent/positions/futures"],
    ["get_positions", { venue: "pm" }, "/api/agent/positions/pm"],
  ])("routes %s %j to the chosen venue", async (name, args, path) => {
    const f = fixture();
    expect(
      await f.call(String(name), args as Record<string, unknown>),
    ).toMatchObject({
      isError: false,
      structuredContent: { body: { fixture: true } },
    });
    expect(new URL(f.requests[0]!.url).pathname).toBe(path);
    expect(new Headers(f.requests[0]!.init?.headers).get("authorization")).toBe(
      "Bearer fixture-caller",
    );
  });
  it.each([{}, { stopLossPrice: 50000, takeProfitPrice: 70000 }])(
    "preserves optional open protections %j",
    async (protection) => {
      const f = fixture();
      await f.call("open_futures_position", {
        coinId: "1",
        side: "long",
        leverage: 2,
        marginMusd: 100,
        idempotencyKey: "fixture-order",
        ...protection,
      });
      const body = JSON.parse(String(f.requests[0]!.init?.body));
      expect(body).toEqual({
        coinId: "1",
        side: "long",
        leverage: 2,
        marginMusd: 100,
        idempotencyKey: "fixture-order",
        ...protection,
      });
    },
  );
  it.each([
    {},
    { stopLossPrice: null, takeProfitPrice: null },
    { stopLossPrice: 50000, takeProfitPrice: 70000 },
  ])(
    "distinguishes unchanged, cleared and set protection %j",
    async (protection) => {
      const f = fixture();
      await f.call("set_futures_sl_tp", { positionId: 7, ...protection });
      expect(JSON.parse(String(f.requests[0]!.init?.body))).toEqual({
        positionId: 7,
        ...protection,
      });
    },
  );
  it.each(["full", "summary"])(
    "returns %s market evidence without authentication",
    async (detail) => {
      const body = { event: { id: "fixture", description: "x".repeat(3000) } };
      const f = fixture(body);
      const response = await f.call("pm_data_event", {
        source: "polymarket",
        slug: "fixture",
        detail,
      });
      expect(response.structuredContent.body).toEqual(
        detail === "full" ? body : compactPublicPmEvent(body),
      );
      expect(
        new Headers(f.requests[0]!.init?.headers).has("authorization"),
      ).toBe(false);
    },
  );
  it("marks a successful explicitly viewed open event in the background", async () => {
    const f = fixture({ event: { status: "open", slug: "fixture" } });
    const response = await f.call("pm_data_event", {
      source: "polymarket",
      slug: "fixture",
    });
    expect(response.isError).toBe(false);
    await vi.waitFor(() => expect(f.requests).toHaveLength(2));
    expect(f.requests[1]!.init?.method).toBe("POST");
    expect(new URL(f.requests[1]!.url).pathname).toBe(
      "/api/prediction-markets/events/polymarket/fixture/view",
    );
  });

  it("does not mark closed events or detail failures", async () => {
    const closed = fixture({ event: { status: "closed" } });
    await closed.call("pm_data_event", {
      source: "polymarket",
      slug: "closed",
    });
    expect(closed.requests).toHaveLength(1);

    const failed = fixture({ error: "unavailable" }, 503);
    await failed.call("pm_data_event", {
      source: "polymarket",
      slug: "failed",
    });
    expect(failed.requests).toHaveLength(1);
  });
  it("retains errors without compacting away rejection details", async () => {
    const body = { error: "upstream unavailable", diagnostic: "fixture" };
    const f = fixture(body, 503);
    expect(
      await f.call("pm_data_event", { source: "polymarket", slug: "fixture" }),
    ).toMatchObject({
      isError: true,
      structuredContent: { httpStatus: 503, body },
    });
  });
  it.each([undefined, 2])(
    "bounds whale payloads with limit %s",
    async (limit) => {
      const f = fixture({
        trades: Array.from({ length: 12 }, (_, i) => ({ usdValue: i })),
      });
      const response = await f.call("pm_data_whales", { limit });
      expect(response.structuredContent.body).toMatchObject({
        trades: Array.from({ length: limit ?? 10 }, (_, i) => ({
          usdValue: i,
        })),
      });
    },
  );
  it("exposes bounded identifiable whale-wallet context without a key", async () => {
    const f = fixture({
      window: "7d",
      venues: ["polymarket"],
      wallets: [
        { address: "0x1", traderName: "A", totalUsd: 10 },
        { address: "0x2", traderName: "B", totalUsd: 9 },
        { address: "0x3", traderName: "C", totalUsd: 8 },
      ],
    });
    const response = await f.call("pm_data_whale_wallets", {
      limit: 2,
      window: "30d",
    });
    expect(response.structuredContent.body.wallets).toHaveLength(2);
    expect(response.structuredContent.body.wallets[0]).toMatchObject({
      address: "0x1",
      totalUsd: 10,
    });
    expect(f.requests[0]!.url).toContain(
      "/api/prediction-markets/whales/wallets",
    );
    expect(f.requests[0]!.url).toContain("window=30d");
    expect(new Headers(f.requests[0]!.init?.headers).has("authorization")).toBe(
      false,
    );
  });
  it("preserves bounded wallet movement provenance and distinguishes API errors", async () => {
    const f = fixture({
      source: "polymarket",
      wallet: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      summary30d: { basis: "trade_notional", tradeCount: 2 },
      recentFills: Array.from({ length: 25 }, (_, i) => ({
        side: i % 2 ? "SELL" : "BUY",
        usdValue: i + 1,
        evidenceType: "public_matched_trade",
        event: {
          source: "polymarket",
          slug: `event-${i}`,
          title: "Q",
          status: "open",
        },
        ignored: true,
      })),
    });
    const response = await f.call("pm_data_whale_wallet", {
      source: "polymarket",
      wallet: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    });
    expect(response.structuredContent.body.recentFills).toHaveLength(20);
    expect(response.structuredContent.body.recentFills[0]).toMatchObject({
      side: "BUY",
      evidenceType: "public_matched_trade",
      event: { slug: "event-0" },
    });
    expect(
      response.structuredContent.body.recentFills[0].ignored,
    ).toBeUndefined();

    const failed = fixture({ error: "wallet unavailable" }, 404);
    const error = await failed.call("pm_data_whale_wallet", {
      source: "polymarket",
      wallet: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    });
    expect(error.isError).toBe(true);
    expect(error.structuredContent).toMatchObject({ httpStatus: 404 });
  });
  it.each([{}, { direction: "losers", limit: 3 }])(
    "uses crypto discovery defaults only when omitted %j",
    async (args) => {
      const f = fixture([]);
      await f.call("get_crypto_movers", args);
      expect(f.requests).toHaveLength(1);
      expect(
        new Headers(f.requests[0]!.init?.headers).has("authorization"),
      ).toBe(false);
      expect(f.requests[0]!.url).toContain(args.direction ?? "gainers");
      expect(f.requests[0]!.url).toContain(String(args.limit ?? 20));
    },
  );
});
