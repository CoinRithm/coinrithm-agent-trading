import { afterEach, describe, expect, it, vi } from "vitest";
import { createClient, PRODUCTION_BASE_URL } from "../src/index.js";
import type { components } from "../src/schema.js";

afterEach(() => vi.unstubAllGlobals());

describe("TypeScript SDK request contract", () => {
  it("round-trips optional PM thesis and advisory sizing fields", () => {
    const request: components["schemas"]["PmQuoteRequest"] = {
      source: "kalshi",
      slug: "fixture",
      outcomeExternalMarketId: "yes",
      side: "no",
      stakeMusd: 25,
      forecastProbability: 42,
      bankrollMusd: 1000,
    };
    const response: components["schemas"]["PmQuoteResponse"] = {
      entryProbability: 40,
      edgeSizing: {
        basis: "fractional_kelly_capped",
        edgePoints: 2,
        suggestedStakeMusd: null,
        noEdge: false,
      },
    };
    const open: components["schemas"]["PmOpenRequest"] = {
      source: "kalshi",
      slug: "fixture",
      outcomeExternalMarketId: "yes",
      side: "no",
      stakeMusd: request.stakeMusd,
      idempotencyKey: "fixture-1",
      forecastProbability: 42,
      thesis: "Inflation cools",
    };
    expect(response.edgeSizing?.suggestedStakeMusd).toBeNull();
    expect(open.thesis).toBe("Inflation cools");
  });

  it("exposes prediction-market lifecycle, prior quote, and winner fields", () => {
    const outcome: components["schemas"]["PublicPmOutcome"] = {
      name: "Paused quote",
      probability: 0,
      normalizedProbability: null,
      lifecycle: {
        state: "unknown",
        providerAcceptingOrders: null,
        entryBlockedByLifecycle: true,
        isResult: false,
        result: null,
        basis: "unknown",
        closedAt: null,
        resolvedAt: null,
        observedAt: null,
      },
      priorProbability: null,
    };
    const event: components["schemas"]["PublicPmEvent"] = {
      id: "event-1",
      slug: "event-1",
      title: "Fixture",
      status: "closed",
      source: { id: "kalshi", name: "Kalshi" },
      outcomes: [outcome],
      resolvedOutcomeExternalMarketId: null,
      resolutionOutcomeBasis: "provider",
    };

    const state:
      "open" | "closed" | "resolved" | "voided" | "unknown" | undefined =
      outcome.lifecycle?.state;
    const winnerId: string | null | undefined =
      event.resolvedOutcomeExternalMarketId;
    expect(state).toBe("unknown");
    expect(winnerId).toBeNull();
    expect(outcome.probability).toBe(0);
    expect(outcome.normalizedProbability).toBeNull();
  });

  it("exposes futures fill estimates and audit execution evidence", () => {
    const quote: components["schemas"]["FuturesQuoteResponse"] = {
      eligible: true,
      referenceMark: 100,
      entryPrice: 100.04,
      fill: {
        model: "futures_fill_v1",
        referenceMark: 100,
        execPrice: 100.04,
        sizeCoin: 10,
        adverseBps: 4,
        adverseCostMusd: 0.4,
        impactBps: 2,
        impactBasis: "volume",
        volumeCoverage: "complete",
        unavailable: null,
      },
      executionModel: {
        fillModel: "futures_fill_v1",
        assumptions: ["slippage is embedded in fillPrice"],
      },
      perpetual: {
        listed: true,
        venue: "bybit",
        symbol: "BTCUSDT",
        fundingIntervalHours: 8,
        fetchedAt: "2026-09-22T12:00:00.000Z",
        stale: false,
      },
    };
    const position: components["schemas"]["AuditFuturesPosition"] = {
      fillModel: null,
    };
    const event: components["schemas"]["AuditFuturesEvent"] = {
      fillPrice: 100.04,
      executionVersion: null,
    };
    const unavailable: components["schemas"]["FuturesQuoteResponse"] = {
      fill: { model: "futures_fill_v1", unavailable: "price_overflow" },
    };
    const legacy: components["schemas"]["FuturesQuoteResponse"] = {
      fill: null,
    };
    expect(quote.fill?.execPrice).toBe(100.04);
    expect(quote.perpetual?.venue).toBe("bybit");
    expect(quote.perpetual?.fundingIntervalHours).toBe(8);
    expect(quote.perpetual?.fetchedAt).toBe("2026-09-22T12:00:00.000Z");
    expect(quote.perpetual?.stale).toBe(false);
    expect(quote.executionModel?.fillModel).toBe("futures_fill_v1");
    expect(position.fillModel).toBeNull();
    expect(event.fillPrice).toBe(100.04);
    expect(event.executionVersion).toBeNull();
    expect(unavailable.fill?.unavailable).toBe("price_overflow");
    expect(legacy.fill).toBeNull();
  });

  it.each([
    { status: 200, payload: { ok: true }, alreadyClosed: undefined },
    {
      status: 200,
      payload: { ok: true, alreadyClosed: true },
      alreadyClosed: true,
    },
    {
      status: 500,
      payload: { error: "cancel_failed" },
      alreadyClosed: undefined,
    },
  ])(
    "preserves the cancellation response: $payload",
    async ({ status, payload, alreadyClosed }) => {
      const transport = vi.fn<typeof fetch>().mockResolvedValue(
        new Response(JSON.stringify(payload), {
          status,
          headers: { "content-type": "application/json" },
        }),
      );
      const result = await createClient({
        apiKey: "fixture",
        fetch: transport,
      }).POST("/api/agent/spot/order/{id}/cancel", {
        params: { path: { id: 42 } },
      });
      expect(result.response.status).toBe(status);
      if (status === 200) {
        const closed: boolean | undefined = result.data?.alreadyClosed;
        expect(closed).toBe(alreadyClosed);
        expect(result.data).toEqual(payload);
      } else {
        expect(result.error).toEqual(payload);
      }
      expect((transport.mock.calls[0][0] as Request).url).toBe(
        `${PRODUCTION_BASE_URL}/api/agent/spot/order/42/cancel`,
      );
      expect(transport).toHaveBeenCalledOnce();
    },
  );

  it("uses the public base URL without inventing authentication", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response('{"status":"ok"}', {
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetch);
    const result = await createClient().GET(
      "/api/prediction-markets/sources/health",
    );
    const request = fetch.mock.calls[0][0] as Request;
    expect(request.url).toBe(
      `${PRODUCTION_BASE_URL}/api/prediction-markets/sources/health`,
    );
    expect(request.headers.has("authorization")).toBe(false);
    expect(result.data).toEqual({ status: "ok" });
  });

  it("honors an injected transport and keeps keys isolated between client instances", async () => {
    const requests: Request[] = [];
    const transport: typeof fetch = async (input) => {
      requests.push(input as Request);
      return new Response('{"error":"unauthorized"}', {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    };
    const first = createClient({
      apiKey: "fixture-a",
      baseUrl: "https://first.example.test",
      fetch: transport,
    });
    const second = createClient({
      apiKey: "fixture-b",
      baseUrl: "https://second.example.test",
      fetch: transport,
    });
    const result = await first.GET("/api/agent/me");
    await second.GET("/api/agent/me");
    expect(
      requests.map((r) => [r.url, r.headers.get("authorization")]),
    ).toEqual([
      ["https://first.example.test/api/agent/me", "Bearer fixture-a"],
      ["https://second.example.test/api/agent/me", "Bearer fixture-b"],
    ]);
    expect(result.error).toEqual({ error: "unauthorized" });
    expect(result.response.status).toBe(401);
  });

  it("serializes a paper-order body including its idempotency key exactly once", async () => {
    const transport = vi.fn<typeof fetch>().mockResolvedValue(
      new Response('{"position":{"id":7}}', {
        status: 201,
        headers: { "content-type": "application/json" },
      }),
    );
    const client = createClient({ apiKey: "fixture", fetch: transport });
    const body = {
      coinId: "1",
      side: "long" as const,
      leverage: 2,
      marginMusd: 50,
      idempotencyKey: "fixture-intent",
    };
    const result = await client.POST("/api/agent/futures/open", { body });
    const request = transport.mock.calls[0][0] as Request;
    expect(request.method).toBe("POST");
    expect(await request.json()).toEqual(body);
    expect(transport).toHaveBeenCalledOnce();
    expect(result.data).toEqual({ position: { id: 7 } });
  });

  it("returns rejected transport errors without retrying an uncertain write", async () => {
    const transport = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new Error("fixture network failure"));
    const client = createClient({ fetch: transport });
    await expect(client.GET("/api/agent/me")).rejects.toThrow(
      "fixture network failure",
    );
    expect(transport).toHaveBeenCalledOnce();
  });
});
