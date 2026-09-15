import { describe, it, expect, vi } from "vitest";
import { CoinRithmClient, isFailClosed } from "./client.js";

function responder(responses: Response[]) {
  let i = 0;
  return vi.fn(async () => responses[Math.min(i++, responses.length - 1)]);
}

describe("CoinRithmClient", () => {
  it.each([null, "", "nonsense", "-1"])(
    "backs off five seconds for missing/invalid Retry-After: %s",
    async (header) => {
      const fetchFn = vi.fn(
        async () =>
          new Response("limited", {
            status: 429,
            headers: header == null ? {} : { "retry-after": header },
          }),
      );
      const sleepFn = vi.fn(async () => {});
      const c = new CoinRithmClient({
        apiKey: "fixture",
        fetchFn,
        sleepFn,
        maxRetries: 2,
      });
      const result = await c.me();
      expect(fetchFn).toHaveBeenCalledTimes(3);
      expect(sleepFn.mock.calls).toEqual([[5000], [5000]]);
      expect(result).toMatchObject({
        ok: false,
        status: 429,
        retryAfterSeconds: undefined,
      });
      expect(c.rateLimitHits).toBe(3);
    },
  );

  it("honors an HTTP-date delay while preserving one write's idempotency key", async () => {
    const now = Date.parse("Tue, 15 Sep 2026 00:00:00 GMT");
    const clock = vi.spyOn(Date, "now").mockReturnValue(now);
    try {
      const fetchFn = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(
          new Response("limited", {
            status: 429,
            headers: { "retry-after": "Tue, 15 Sep 2026 00:00:10 GMT" },
          }),
        )
        .mockResolvedValueOnce(new Response('{"position":{"id":1}}'));
      const sleepFn = vi.fn(async () => {});
      const c = new CoinRithmClient({ apiKey: "fixture", fetchFn, sleepFn });
      await c.closeFutures({
        positionId: 1,
        fraction: 1,
        idempotencyKey: "fixture-intent",
      });
      expect(sleepFn).toHaveBeenCalledWith(10_000);
      expect(fetchFn.mock.calls[0][1]?.body).toBe(
        fetchFn.mock.calls[1][1]?.body,
      );
      expect(
        JSON.parse(String(fetchFn.mock.calls[1][1]?.body)).idempotencyKey,
      ).toBe("fixture-intent");
    } finally {
      clock.mockRestore();
    }
  });

  it.each([new Error("fixture network error"), "fixture network error"])(
    "does not retry an uncertain transport failure",
    async (error) => {
      const fetchFn = vi.fn<typeof fetch>().mockRejectedValue(error);
      const c = new CoinRithmClient({ apiKey: "fixture", fetchFn });
      expect(await c.me()).toMatchObject({
        status: 0,
        data: { error: "network_error", message: "fixture network error" },
      });
      expect(fetchFn).toHaveBeenCalledOnce();
      expect(isFailClosed(200)).toBe(false);
    },
  );
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

  it("attaches extraHeaders on every request and never lets them clobber auth", async () => {
    let seen: Record<string, string> | undefined;
    const fetchFn = vi.fn(async (_url: string, init?: RequestInit) => {
      seen = init?.headers as Record<string, string>;
      return new Response(JSON.stringify({ userId: 1 }), { status: 200 });
    });
    const c = new CoinRithmClient({
      apiKey: "crk_live_x",
      fetchFn: fetchFn as unknown as typeof fetch,
      extraHeaders: {
        "x-internal-write-token": "tok",
        Authorization: "Bearer evil",
      },
    });
    const r = await c.me();
    expect(r.ok).toBe(true);
    expect(seen?.["x-internal-write-token"]).toBe("tok");
    expect(seen?.Authorization).toBe("Bearer crk_live_x");
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
