import { afterEach, describe, expect, it, vi } from "vitest";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { CoinRithmClient, type AgentTrace } from "./client.js";
import { registerTools } from "./tools.js";

type Registered = {
  config: {
    description: string;
    inputSchema: z.ZodRawShape;
    annotations: { readOnlyHint: boolean; destructiveHint: boolean };
  };
  handler: (
    args: { coinId: string; agentTrace?: AgentTrace },
    extra: unknown,
  ) => Promise<{
    isError: boolean;
    structuredContent: { httpStatus: number; ok: boolean; body: unknown };
  }>;
};
function inventory(
  client = new CoinRithmClient({ baseUrl: "https://fixture.test" }),
) {
  const tools = new Map<string, Registered>();
  registerTools(
    {
      registerTool: (
        name: string,
        config: Registered["config"],
        handler: Registered["handler"],
      ) => tools.set(name, { config, handler }),
    } as unknown as McpServer,
    client,
  );
  return tools;
}
function enabled(client?: CoinRithmClient) {
  vi.stubEnv("COINRITHM_SPOT_REFERENCE_TOOLS_ENABLED", "true");
  return inventory(client).get("get_spot_reference")!;
}
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

// API4b210 DTO: reference units/times are independent, including stale fallback.
const reference = {
  version: 1,
  policyVersion: "binance_spot_reference_v1",
  coin: { coinId: "1", symbol: "BTC", name: "Bitcoin" },
  evaluatedAt: "2026-10-10T06:00:05.000Z",
  referenceOnly: true,
  preferredSource: "binance_stream",
  stream: {
    status: "available",
    reason: null,
    observation: {
      venue: "binance",
      market: "spot",
      basis: "24h_ticker_last",
      pair: "BTCUSDT",
      base: "BTC",
      quoteCurrency: "USDT",
      price: 61000.125,
      quoteVolume24h: 5000000.25,
      eventAt: "2026-10-10T06:00:03.000Z",
      statisticsCloseAt: "2026-10-10T06:00:02.999Z",
      receivedAt: "2026-10-10T06:00:03.050Z",
      lastTradeAt: null,
      localPriceChangedAt: "2026-10-10T06:00:01.000Z",
      capturedAt: "2026-10-10T06:00:04.000Z",
      expiresAt: "2026-10-10T06:00:12.999Z",
      universeVerifiedAt: "2026-10-10T05:58:00.000Z",
      universeRevision: "a".repeat(64),
      connectionGeneration: 2,
    },
  },
  fallback: {
    basis: "stored_rest_consensus",
    currency: "USD",
    status: "stale",
    priceUsd: 60890,
    priceTiming: {
      rowWrittenAt: "2026-10-10T05:57:00.000Z",
      sourceObservedAt: null,
      sourceAgeSeconds: null,
      writeLagSeconds: null,
      coverage: "not_recorded",
      basis: "venue_snapshot_time",
    },
    expiresAt: "2026-10-10T05:59:00.000Z",
  },
  verification: {
    identityCheckedAt: "2026-10-10T06:00:04.990Z",
    mappingUpdatedAt: "2026-10-09T00:00:00.000Z",
    policyUpdatedAt: null,
    policyMode: null,
  },
};

describe("explicit spot-reference tool", () => {
  it.each([undefined, "false", "TRUE", "1", " true "])(
    "is absent for non-opt-in flag %s",
    (flag) => {
      vi.stubEnv("COINRITHM_SPOT_REFERENCE_TOOLS_ENABLED", flag);
      vi.stubEnv("COINRITHM_PM_PAPER_V2_TOOLS_ENABLED", undefined);
      const tools = inventory();
      expect(tools.size).toBe(41);
      expect(tools.has("get_spot_reference")).toBe(false);
    },
  );
  it.each([false, true])(
    "adds only one definition without changing existing tools (PM opt-in %s)",
    (pm) => {
      vi.stubEnv(
        "COINRITHM_PM_PAPER_V2_TOOLS_ENABLED",
        pm ? "true" : undefined,
      );
      vi.stubEnv("COINRITHM_SPOT_REFERENCE_TOOLS_ENABLED", undefined);
      const before = inventory();
      vi.stubEnv("COINRITHM_SPOT_REFERENCE_TOOLS_ENABLED", "true");
      const after = inventory();
      expect(after.size).toBe(before.size + 1);
      expect([...after.keys()].filter((name) => !before.has(name))).toEqual([
        "get_spot_reference",
      ]);
      for (const [name, tool] of before)
        expect(JSON.stringify(after.get(name)!.config)).toBe(
          JSON.stringify(tool.config),
        );
      expect(after.get("get_spot_reference")!.config.annotations).toMatchObject(
        { readOnlyHint: true, destructiveHint: false },
      );
    },
  );
  it("validates exact coin identity rather than accepting paths or query parameters", () => {
    const schema = z.object(enabled().config.inputSchema);
    for (const coinId of ["1", "coin_1-a"])
      expect(schema.safeParse({ coinId }).success).toBe(true);
    for (const coinId of [
      "",
      "../1",
      "1?price=live",
      "BTC/USDT",
      "1 2",
      "a".repeat(65),
    ])
      expect(schema.safeParse({ coinId }).success).toBe(false);
  });
  it("preserves complete units, provenance and expiry through the real keyed client", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify(reference)));
    vi.stubGlobal("fetch", fetch);
    const tool = enabled(
      new CoinRithmClient({
        baseUrl: "https://fixture.test",
        apiKey: "stdio-fixture",
      }),
    );
    const response = await tool.handler(
      { coinId: "1", agentTrace: { runId: "reference-fixture" } },
      { requestInfo: { headers: { authorization: "Bearer request-fixture" } } },
    );
    expect(response).toMatchObject({
      isError: false,
      structuredContent: { httpStatus: 200, ok: true, body: reference },
    });
    expect(response.structuredContent.body).toEqual(reference);
    expect(fetch).toHaveBeenCalledExactlyOnceWith(
      "https://fixture.test/api/agent/spot/reference/1",
      expect.objectContaining({
        method: "GET",
        body: undefined,
        headers: {
          Authorization: "Bearer request-fixture",
          Accept: "application/json",
          "X-CoinRithm-Run-Id": "reference-fixture",
        },
      }),
    );
  });
  it.each([
    "disabled",
    "expired_observation",
    "mapping_suppressed",
    "redis_unavailable",
  ])("retains unavailable reason %s with stale fallback", async (reason) => {
    const body = {
      ...reference,
      preferredSource: "rest_consensus",
      stream: { status: "unavailable", reason, observation: null },
    };
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(body)));
    vi.stubGlobal("fetch", fetch);
    const response = await enabled(
      new CoinRithmClient({
        baseUrl: "https://fixture.test",
        apiKey: "stdio-fixture",
      }),
    ).handler({ coinId: "1" }, {});
    expect(response).toMatchObject({
      isError: false,
      structuredContent: { body },
    });
    expect(response.structuredContent.body).toEqual(body);
    expect(fetch.mock.lastCall?.[1].headers.Authorization).toBe(
      "Bearer stdio-fixture",
    );
  });
  it.each([401, 403, 404, 503])(
    "retains HTTP %s refusal without retry or invented reference",
    async (status) => {
      const body = { error: "fixture refusal" };
      const fetch = vi
        .fn()
        .mockResolvedValue(new Response(JSON.stringify(body), { status }));
      vi.stubGlobal("fetch", fetch);
      const response = await enabled(
        new CoinRithmClient({
          baseUrl: "https://fixture.test",
          apiKey: "stdio-fixture",
        }),
      ).handler({ coinId: "1" }, {});
      expect(response).toMatchObject({
        isError: true,
        structuredContent: { httpStatus: status, ok: false, body },
      });
      expect(fetch).toHaveBeenCalledTimes(1);
    },
  );
  it("requires a key and cannot invoke the public alias implicitly", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const response = await enabled().handler({ coinId: "1" }, {});
    expect(response).toMatchObject({
      isError: true,
      structuredContent: { httpStatus: 401 },
    });
    expect(fetch).not.toHaveBeenCalled();
  });
});
