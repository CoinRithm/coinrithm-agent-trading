import { afterEach, describe, expect, it, vi } from "vitest";
import { createServer } from "node:http";
import { CoinRithmClient, DEFAULT_REQUEST_TIMEOUT_MS } from "./client.js";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});
const never = () => new Promise<never>(() => {});
const config = {
  apiKey: "offline-fixture",
  baseUrl: "https://fixture.invalid",
};

describe("API request deadlines", () => {
  it.each([0, -1, 0.5, NaN, Infinity, 2_147_483_648])(
    "rejects invalid deadlines: %s",
    (requestTimeoutMs) => {
      expect(
        () => new CoinRithmClient({ ...config, requestTimeoutMs }),
      ).toThrow("requestTimeoutMs");
    },
  );

  it("aborts stalled headers at the default deadline without retrying", async () => {
    vi.useFakeTimers();
    const fetchFn = vi.fn<typeof fetch>().mockImplementation(never);
    const result = new CoinRithmClient({ ...config, fetchFn }).portfolio();
    const signal = fetchFn.mock.calls[0][1]!.signal!;
    await vi.advanceTimersByTimeAsync(DEFAULT_REQUEST_TIMEOUT_MS - 1);
    expect(signal.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(await result).toMatchObject({
      ok: false,
      status: 0,
      data: { error: "request_timeout" },
    });
    expect(signal.aborted).toBe(true);
    expect(fetchFn).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("bounds stalled response bodies as part of the same request", async () => {
    vi.useFakeTimers();
    const response = new Response("fixture");
    vi.spyOn(response, "text").mockImplementation(never);
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(response);
    const result = new CoinRithmClient({
      ...config,
      fetchFn,
      requestTimeoutMs: 20,
    }).portfolio();
    await vi.advanceTimersByTimeAsync(20);
    expect(await result).toMatchObject({
      status: 0,
      data: { error: "request_timeout" },
    });
    expect(fetchFn.mock.calls[0][1]!.signal!.aborted).toBe(true);
    expect(fetchFn).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([new Error("body disconnected"), "body disconnected"])(
    "returns an uncertain body failure without replaying a write",
    async (error) => {
      const response = new Response("fixture");
      vi.spyOn(response, "text").mockRejectedValue(error);
      const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(response);
      const client = new CoinRithmClient({ ...config, fetchFn });
      expect(
        await client.closeFutures({
          positionId: 1,
          fraction: 1,
          idempotencyKey: "fixture",
        }),
      ).toMatchObject({
        status: 0,
        data: { error: "network_error", message: "body disconnected" },
      });
      expect(fetchFn).toHaveBeenCalledOnce();
    },
  );

  it("does not call the transport when already cancelled or disclose the cancellation reason", async () => {
    vi.useFakeTimers();
    const fetchFn = vi.fn<typeof fetch>();
    const controller = new AbortController();
    controller.abort("PRIVATE_CALLER_REASON");
    const result = await new CoinRithmClient({
      ...config,
      fetchFn,
      signal: controller.signal,
    }).me();
    expect(result).toMatchObject({
      status: 0,
      data: { error: "request_aborted", message: "API request cancelled" },
    });
    expect(JSON.stringify(result)).not.toContain("PRIVATE_CALLER_REASON");
    expect(fetchFn).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(["headers", "body", "retry"])(
    "cancels while waiting for %s and removes its listeners",
    async (stage) => {
      vi.useFakeTimers();
      const controller = new AbortController();
      const removed = vi.spyOn(controller.signal, "removeEventListener");
      const response = new Response("fixture", {
        status: stage === "retry" ? 429 : 200,
      });
      if (stage === "body")
        vi.spyOn(response, "text").mockImplementation(never);
      const fetchFn = vi
        .fn<typeof fetch>()
        .mockImplementation(stage === "headers" ? never : async () => response);
      const pending = new CoinRithmClient({
        ...config,
        fetchFn,
        signal: controller.signal,
      }).me();
      await vi.advanceTimersByTimeAsync(1);
      controller.abort();
      expect(await pending).toMatchObject({
        status: 0,
        data: { error: "request_aborted" },
      });
      await vi.advanceTimersByTimeAsync(60_000);
      expect(fetchFn).toHaveBeenCalledOnce();
      expect(removed).toHaveBeenCalledWith("abort", expect.any(Function));
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it("uses one deadline across attempts and releases the 429 body", async () => {
    vi.useFakeTimers();
    const response = new Response("limited", {
      status: 429,
      headers: { "Retry-After": "0.005" },
    });
    const cancel = vi.spyOn(response.body!, "cancel");
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockImplementationOnce(async () => {
        await new Promise((resolve) => setTimeout(resolve, 8));
        return response;
      })
      .mockImplementation(never);
    const pending = new CoinRithmClient({
      ...config,
      fetchFn,
      requestTimeoutMs: 20,
      sleepFn: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    }).me();
    await vi.advanceTimersByTimeAsync(13);
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(cancel).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(7);
    expect(await pending).toMatchObject({ data: { error: "request_timeout" } });
    expect(fetchFn.mock.calls[1][1]!.signal!.aborted).toBe(true);
  });

  it.each(["60", "999999999999999999999999999999999999999"])(
    "never shortens an excessive Retry-After: %s",
    async (header) => {
      vi.useFakeTimers();
      const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(
        new Response(null, {
          status: 429,
          headers: { "Retry-After": header },
        }),
      );
      const sleepFn = vi.fn(async () => {});
      const pending = new CoinRithmClient({
        ...config,
        fetchFn,
        sleepFn,
        requestTimeoutMs: 20,
      }).me();
      await vi.advanceTimersByTimeAsync(20);
      expect(await pending).toMatchObject({
        data: { error: "request_timeout" },
      });
      expect(fetchFn).toHaveBeenCalledOnce();
      expect(sleepFn).not.toHaveBeenCalled();
    },
  );

  it("cannot resume a retry after an injected sleep resolves late", async () => {
    vi.useFakeTimers();
    let resume!: () => void;
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(null, { status: 429, headers: { "Retry-After": "0" } }),
      );
    const pending = new CoinRithmClient({
      ...config,
      fetchFn,
      requestTimeoutMs: 20,
      sleepFn: () =>
        new Promise<void>((r) => {
          resume = r;
        }),
    }).me();
    await vi.advanceTimersByTimeAsync(20);
    expect(await pending).toMatchObject({ data: { error: "request_timeout" } });
    resume();
    await vi.advanceTimersByTimeAsync(100);
    expect(fetchFn).toHaveBeenCalledOnce();
  });

  it("cleans a completed request's timer and keeps subsequent request signals independent", async () => {
    vi.useFakeTimers();
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("{}"))
      .mockImplementationOnce(never);
    const external = new AbortController();
    const client = new CoinRithmClient({
      ...config,
      fetchFn,
      signal: external.signal,
      requestTimeoutMs: 20,
    });
    expect((await client.me()).ok).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
    const pending = client.portfolio();
    await vi.advanceTimersByTimeAsync(20);
    expect(await pending).toMatchObject({ data: { error: "request_timeout" } });
    expect(fetchFn.mock.calls[0][1]!.signal!.aborted).toBe(false);
    expect(fetchFn.mock.calls[1][1]!.signal!.aborted).toBe(true);
    expect(external.signal.aborted).toBe(false);
  });

  it("aborts a real loopback fetch whose body never completes", async () => {
    let received = 0;
    let closed = false;
    const server = createServer((_req, res) => {
      received++;
      res.on("close", () => {
        closed = true;
      });
      res.writeHead(200, { "Content-Type": "application/json" });
      res.write('{"incomplete":');
    });
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const address = server.address();
    if (!address || typeof address === "string")
      throw new Error("No fixture port");
    try {
      const client = new CoinRithmClient({
        ...config,
        baseUrl: `http://127.0.0.1:${address.port}`,
        requestTimeoutMs: 500,
      });
      expect(await client.portfolio()).toMatchObject({
        status: 0,
        data: { error: "request_timeout" },
      });
      await vi.waitFor(() => expect(closed).toBe(true));
      expect(received).toBe(1);
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
