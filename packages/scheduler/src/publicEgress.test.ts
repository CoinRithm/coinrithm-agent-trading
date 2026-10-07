import { describe, expect, it, vi } from "vitest";
import { EventEmitter } from "node:events";
import {
  createPublicFetch,
  EgressBlockedError,
  isPublicAddress,
  publicOnlyLookup,
} from "./publicEgress.js";
import { modelFetchFor } from "./runtime.js";

// Hosted BYO endpoints reach only the public internet (root review #132).
// No real network: resolvers are injected and only refusal paths run.

describe("isPublicAddress (mirror of backend-v2)", () => {
  it.each(["8.8.8.8", "2606:4700:4700::1111", "::ffff:8.8.8.8"])(
    "allows %s",
    (ip) => expect(isPublicAddress(ip)).toBe(true),
  );
  it.each([
    "127.0.0.1",
    "10.0.0.1",
    "169.254.169.254",
    "192.168.0.1",
    "::1",
    "fd00::1",
    "fe80::1",
    "::ffff:127.0.0.1",
    "64:ff9b::a9fe:a9fe",
    "64:ff9b:1::a9fe:a9fe", // local-use NAT64
    "fec0::1", // deprecated site-local
    "2001:2::1", // benchmarking
    "3fff::1", // documentation
  ])("blocks %s", (ip) => expect(isPublicAddress(ip)).toBe(false));
});

describe("publicOnlyLookup", () => {
  it("refuses when any DNS answer is private", async () => {
    const err = await new Promise<Error | null>((resolve) =>
      publicOnlyLookup((_h, cb) =>
        cb(null, [
          { address: "104.18.32.7", family: 4 },
          { address: "10.0.0.5", family: 4 },
        ]),
      )("api.example.com", { all: true }, (e) => resolve(e)),
    );
    expect(err).toBeInstanceOf(EgressBlockedError);
  });
});

describe("createPublicFetch", () => {
  it("never connects when DNS answers metadata", async () => {
    const f = createPublicFetch(((
      _h: string,
      cb: (e: null, a: unknown[]) => void,
    ) => cb(null, [{ address: "169.254.169.254", family: 4 }])) as never);
    await expect(
      f("https://rebind.example/v1/chat/completions"),
    ).rejects.toThrow(/non-public address/);
  });
  it("refuses http and literal private hosts before any lookup", async () => {
    const resolver = vi.fn();
    const f = createPublicFetch(resolver as never);
    await expect(f("http://api.example.com/v1")).rejects.toThrow(/https only/);
    await expect(f("https://10.0.0.1/v1")).rejects.toThrow(/non-public/);
    expect(resolver).not.toHaveBeenCalled();
  });
});

describe("modelFetchFor", () => {
  it("guards only user-chosen (BYO) custom endpoints", () => {
    expect(
      modelFetchFor({
        modelProvider: "openai-compatible",
        modelBaseUrl: "https://llm.example/v1",
        brainKeyEnc: "enc",
      }),
    ).not.toBe(fetch);
    expect(
      modelFetchFor({
        modelProvider: "nvidia",
        modelBaseUrl: null,
        brainKeyEnc: "enc",
      }),
    ).toBe(fetch);
    expect(
      modelFetchFor({
        modelProvider: "nvidia",
        modelBaseUrl: "https://integrate.api.nvidia.com/v1",
        brainKeyEnc: null,
      }),
    ).toBe(fetch);
  });
});

// Socket stub standing in for https.request (mirror of the backend-v2 tests).
function stubRequest(
  status: number,
  chunks: string[],
  headers: Record<string, string> = {},
) {
  const seen: { destroyed?: unknown; lookup?: unknown } = {};
  const impl = vi.fn(
    (
      _url: unknown,
      opts: { lookup?: unknown },
      cb: (res: EventEmitter) => void,
    ) => {
      seen.lookup = opts.lookup;
      return Object.assign(new EventEmitter(), {
        write: () => true,
        destroy: (e?: unknown) => {
          seen.destroyed = e ?? true;
        },
        end: () => {
          const res = Object.assign(new EventEmitter(), {
            statusCode: status,
            headers,
          });
          cb(res);
          setImmediate(() => {
            for (const c of chunks) res.emit("data", Buffer.from(c));
            res.emit("end");
          });
        },
      });
    },
  );
  return { impl, seen };
}
const publicResolver = (
  _h: string,
  cb: (e: null, a: Array<{ address: string; family: number }>) => void,
) => cb(null, [{ address: "104.18.32.7", family: 4 }]);
const URL_OK = "https://api.example.com/v1/chat/completions";

describe("createPublicFetch response handling (socket stub)", () => {
  it("returns the answer with the connect-time lookup attached", async () => {
    const { impl, seen } = stubRequest(200, ['{"ok":', "true}"]);
    const f = createPublicFetch(publicResolver as never, impl as never);
    const res = await f(URL_OK, { method: "POST", body: "{}" });
    expect(await res.json()).toEqual({ ok: true });
    expect(typeof seen.lookup).toBe("function");
  });

  it.each([204, 205, 304])(
    "answers %s without a body instead of throwing",
    async (status) => {
      const { impl } = stubRequest(status, ["ignored"]);
      const f = createPublicFetch(publicResolver as never, impl as never);
      expect((await f(URL_OK)).status).toBe(status);
    },
  );

  it("rejects and destroys the request past the body cap", async () => {
    const { impl, seen } = stubRequest(200, ["12345678", "90123"]);
    const f = createPublicFetch(publicResolver as never, impl as never, 10);
    await expect(f(URL_OK)).rejects.toThrow(/exceeds 10 bytes/);
    expect(seen.destroyed).toBeInstanceOf(EgressBlockedError);
  });

  it("returns a redirect as-is and never follows it", async () => {
    const { impl } = stubRequest(302, [], {
      location: "https://169.254.169.254/",
    });
    const f = createPublicFetch(publicResolver as never, impl as never);
    expect((await f(URL_OK)).status).toBe(302);
    expect(impl).toHaveBeenCalledTimes(1);
  });
});
