import { afterEach, describe, expect, it, vi } from "vitest";
import { CoinRithmClient } from "./client.js";

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

describe("public PM data client (keyless)", () => {
  it("never attaches the API key to public data requests", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ stats: {} }));
    const client = new CoinRithmClient({
      apiKey: "crk_live_secret",
      baseUrl: "https://api.example.test",
    });

    const result = await client.getPublicPmOverview({ fiat: "usd" });

    expect(result.ok).toBe(true);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toBe(
      "https://api.example.test/api/prediction-markets/overview?fiat=usd",
    );
    const headers = (init?.headers ?? {}) as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
    expect(JSON.stringify(headers)).not.toContain("crk_live_secret");
  });

  it("builds the event-detail path with encoded source and slug", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ event: {} }));
    const client = new CoinRithmClient({ baseUrl: "https://api.example.test" });

    await client.getPublicPmEvent("kalshi", "kxwc/advance 26");

    const [url] = fetchMock.mock.calls[0]!;
    expect(String(url)).toBe(
      "https://api.example.test/api/prediction-markets/events/kalshi/kxwc%2Fadvance%2026",
    );
  });

  it("passes search filters as query params and surfaces non-2xx as ok:false", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ error: "not_found" }, 404),
    );
    const client = new CoinRithmClient({ baseUrl: "https://api.example.test" });

    const result = await client.listPublicPmEvents({
      q: "world cup",
      source: "smarkets",
      limit: 5,
    });

    expect(result.ok).toBe(false);
    expect(result.status).toBe(404);
    const [url] = fetchMock.mock.calls[0]!;
    const parsed = new URL(String(url));
    expect(parsed.pathname).toBe("/api/prediction-markets/events");
    expect(parsed.searchParams.get("q")).toBe("world cup");
    expect(parsed.searchParams.get("source")).toBe("smarkets");
    expect(parsed.searchParams.get("limit")).toBe("5");
  });

  it("fails soft with status 0 on network errors", async () => {
    fetchMock.mockRejectedValueOnce(new Error("boom"));
    const client = new CoinRithmClient({ baseUrl: "https://api.example.test" });

    const result = await client.getPublicPmWhales();

    expect(result.ok).toBe(false);
    expect(result.status).toBe(0);
    expect(result.data).toMatchObject({ error: "network_error" });
  });
});
