import { EventEmitter } from "node:events";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { NextFunction, Request, Response } from "express";
import { clientKey, createMcpAdmission } from "./httpLimits.js";
import { CoinRithmClient, UPSTREAM_TIMEOUT_MS } from "./client.js";

const req = (headers: Record<string, string> = {}, ip = "10.0.0.9") =>
  ({ headers, socket: { remoteAddress: ip } }) as unknown as Request;

const res = () => {
  const emitter = new EventEmitter() as EventEmitter & {
    statusCode?: number;
    body?: unknown;
    headers: Record<string, string>;
  };
  emitter.headers = {};
  const r = Object.assign(emitter, {
    setHeader(k: string, v: string) {
      emitter.headers[k] = v;
    },
    status(code: number) {
      emitter.statusCode = code;
      return r;
    },
    json(b: unknown) {
      emitter.body = b;
      return r;
    },
  });
  return r as unknown as Response & typeof emitter;
};

describe("hosted MCP admission", () => {
  it("keys clients by Cloudflare IP, then X-Forwarded-For, then socket", () => {
    expect(
      clientKey(
        req({ "cf-connecting-ip": "1.1.1.1", "x-forwarded-for": "2.2.2.2" }),
      ),
    ).toBe("1.1.1.1");
    expect(clientKey(req({ "x-forwarded-for": "2.2.2.2, 10.0.0.1" }))).toBe(
      "2.2.2.2",
    );
    expect(clientKey(req({}, "3.3.3.3"))).toBe("3.3.3.3");
  });

  it("allows a client's per-minute budget, then answers 429 with Retry-After", () => {
    let t = 1_000_000;
    const admit = createMcpAdmission({ perClientPerMinute: 3, now: () => t });
    const next = vi.fn() as unknown as NextFunction;
    const a = req({ "cf-connecting-ip": "9.9.9.9" });
    for (let i = 0; i < 3; i += 1) {
      const r = res();
      admit(a, r, next);
      r.emit("finish");
    }
    expect(next).toHaveBeenCalledTimes(3);
    const blocked = res();
    t += 15_000;
    admit(a, blocked, next);
    expect(blocked.statusCode).toBe(429);
    expect(blocked.headers["Retry-After"]).toBe("45");
    expect((blocked.body as { error: { code: number } }).error.code).toBe(
      -32000,
    );
    // Another client is unaffected; a new window resets the first.
    admit(req({ "cf-connecting-ip": "8.8.8.8" }), res(), next);
    expect(next).toHaveBeenCalledTimes(4);
    t += 60_000;
    admit(a, res(), next);
    expect(next).toHaveBeenCalledTimes(5);
  });

  it("caps requests in flight and frees a slot when a response ends", () => {
    const admit = createMcpAdmission({
      maxInFlight: 2,
      perClientPerMinute: 100,
    });
    const next = vi.fn() as unknown as NextFunction;
    const first = res();
    admit(req({}, "1.0.0.1"), first, next);
    admit(req({}, "1.0.0.2"), res(), next);
    const busy = res();
    admit(req({}, "1.0.0.3"), busy, next);
    expect(busy.statusCode).toBe(503);
    first.emit("close");
    first.emit("finish"); // released once only
    const ok = res();
    admit(req({}, "1.0.0.4"), ok, next);
    expect(ok.statusCode).toBeUndefined();
    expect(next).toHaveBeenCalledTimes(3);
  });
});

describe("upstream timeout", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("passes an abort signal and reports a timeout as upstream_timeout", async () => {
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      expect(init.signal).toBeInstanceOf(AbortSignal);
      const e = new Error("The operation was aborted due to timeout");
      e.name = "TimeoutError";
      throw e;
    });
    vi.stubGlobal("fetch", fetchMock);
    const client = new CoinRithmClient({ baseUrl: "http://127.0.0.1:9" });
    const out = await client.getPublicPmSources();
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(out.ok).toBe(false);
    expect((out.data as { error: string }).error).toBe("upstream_timeout");
    expect(UPSTREAM_TIMEOUT_MS).toBe(35_000);
  });
});
