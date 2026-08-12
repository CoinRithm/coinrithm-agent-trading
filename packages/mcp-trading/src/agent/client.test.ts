import { describe, it, expect, vi } from "vitest";
import { CoinRithmClient, isFailClosed } from "./client.js";

function responder(responses: Response[]) {
  let i = 0;
  return vi.fn(async () => responses[Math.min(i++, responses.length - 1)]);
}

describe("CoinRithmClient", () => {
  it("backs off on 429 (Retry-After) then succeeds", async () => {
    const fetchFn = responder([
      new Response("rate limited", {
        status: 429,
        headers: { "retry-after": "0" },
      }),
      new Response(JSON.stringify({ userId: 1 }), { status: 200 }),
    ]);
    const sleepFn = vi.fn(async () => {});
    const c = new CoinRithmClient({
      apiKey: "crk_live_x",
      fetchFn: fetchFn as unknown as typeof fetch,
      sleepFn,
    });
    const r = await c.me();
    expect(r.ok).toBe(true);
    expect(sleepFn).toHaveBeenCalledTimes(1);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("treats 401/403/409/422 as fail-closed (not retried)", async () => {
    for (const status of [401, 403, 409, 422]) {
      const fetchFn = responder([new Response("no", { status })]);
      const c = new CoinRithmClient({
        apiKey: "k",
        fetchFn: fetchFn as unknown as typeof fetch,
        sleepFn: async () => {},
      });
      const r = await c.portfolio();
      expect(r.ok).toBe(false);
      expect(r.status).toBe(status);
      expect(isFailClosed(r.status)).toBe(true);
      expect(fetchFn).toHaveBeenCalledTimes(1);
    }
  });

  it("URL-encodes the runId on ledger export", async () => {
    let calledUrl = "";
    const fetchFn = vi.fn(async (url: string) => {
      calledUrl = url;
      return new Response("{}", { status: 200 });
    });
    const c = new CoinRithmClient({
      apiKey: "k",
      fetchFn: fetchFn as unknown as typeof fetch,
    });
    await c.exportRunEvidence("run id/with?weird=chars");
    expect(calledUrl).toContain("runId=");
    expect(calledUrl).toContain("%2F"); // the slash is encoded
    expect(calledUrl).not.toContain("with?weird"); // raw query chars not leaked
  });

  it("sends the observation receipt as trace headers", async () => {
    let headers: HeadersInit | undefined;
    const fetchFn = vi.fn(async (_url: string, init?: RequestInit) => {
      headers = init?.headers;
      return new Response("{}", { status: 200 });
    });
    const c = new CoinRithmClient({
      apiKey: "k",
      fetchFn: fetchFn as unknown as typeof fetch,
    });

    await c.me({
      observationHash: `sha256:${"a".repeat(64)}`,
      indicatorVersion: "coinrithm.indicators.v1",
    });

    expect(headers).toMatchObject({
      "X-CoinRithm-Observation-Hash": `sha256:${"a".repeat(64)}`,
      "X-CoinRithm-Indicator-Version": "coinrithm.indicators.v1",
    });
  });
});
