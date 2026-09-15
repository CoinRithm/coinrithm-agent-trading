import { afterEach, describe, expect, it, vi } from "vitest";
import { createClient, PRODUCTION_BASE_URL } from "../src/index.js";

afterEach(() => vi.unstubAllGlobals());

describe("TypeScript SDK request contract", () => {
  it("uses the public base URL without inventing authentication", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(
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
    const transport = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
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
