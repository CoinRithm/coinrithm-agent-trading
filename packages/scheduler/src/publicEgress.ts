// Public-network-only egress for user-supplied endpoints. Mirror of
// backend-v2 src/lib/publicEgress.ts (root review of #132, Codex 56731): the
// hosted scheduler calls a BYO "openai-compatible" base URL the user chose, so
// it gets the same guard as the backend's key probe. Self-host runners do NOT
// use this (a local model on localhost is a legitimate self-host setup).
// It must never be steered at loopback, private, link-local or cloud-metadata
// addresses, through any DNS answer or any redirect.
//
// Design (no new dependency):
// - HTTPS only, default or explicit port, no credentials in the URL.
// - The address check runs INSIDE the socket's DNS lookup hook, on every
//   address the resolver returns, so the address checked is the address
//   connected to (no check-then-fetch with a second, different resolution;
//   DNS rebinding cannot swap the target after validation).
// - Literal IP hosts go through the same classifier.
// - Redirects are never followed: a 3xx is returned as-is (status, no body
//   follow), so a public endpoint cannot bounce the request inward.
// - Exposed as a fetch-compatible function so existing callers that take a
//   fetchImpl use it unchanged.

import { request as httpsRequest } from "node:https";
import { lookup as dnsLookup, type LookupAddress } from "node:dns";
import { isIP } from "node:net";

const v4ToInt = (ip: string): number =>
  ip.split(".").reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0;

const V4_BLOCKED: Array<[string, number]> = [
  ["0.0.0.0", 8], // this network
  ["10.0.0.0", 8], // private
  ["100.64.0.0", 10], // carrier-grade NAT
  ["127.0.0.0", 8], // loopback
  ["169.254.0.0", 16], // link-local, cloud metadata (169.254.169.254)
  ["172.16.0.0", 12], // private
  ["192.0.0.0", 24], // IETF protocol assignments
  ["192.0.2.0", 24], // documentation
  ["192.88.99.0", 24], // 6to4 relay anycast
  ["192.168.0.0", 16], // private
  ["198.18.0.0", 15], // benchmarking
  ["198.51.100.0", 24], // documentation
  ["203.0.113.0", 24], // documentation
  ["224.0.0.0", 4], // multicast
  ["240.0.0.0", 4], // reserved, broadcast
];

function isPublicV4(ip: string): boolean {
  const n = v4ToInt(ip);
  return !V4_BLOCKED.some(([base, bits]) => {
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
    return (n & mask) >>> 0 === (v4ToInt(base) & mask) >>> 0;
  });
}

/** Expand an IPv6 literal into eight 16-bit groups (embedded v4 allowed). */
function v6Groups(ip: string): number[] | null {
  let s = ip.toLowerCase();
  const zone = s.indexOf("%");
  if (zone >= 0) return null; // zoned (link-local) literals are never public
  const v4Tail = s.match(/(\d+\.\d+\.\d+\.\d+)$/);
  if (v4Tail) {
    const n = v4ToInt(v4Tail[1]!);
    s =
      s.slice(0, -v4Tail[1]!.length) +
      `${(n >>> 16).toString(16)}:${(n & 0xffff).toString(16)}`;
  }
  const halves = s.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const fill = halves.length === 2 ? 8 - head.length - tail.length : 0;
  const groups = [...head, ...Array(Math.max(fill, 0)).fill("0"), ...tail];
  if (groups.length !== 8) return null;
  const out = groups.map((g) => Number.parseInt(g || "0", 16));
  return out.every((g) => Number.isInteger(g) && g >= 0 && g <= 0xffff)
    ? out
    : null;
}

function isPublicV6(ip: string): boolean {
  const g = v6Groups(ip);
  if (!g) return false;
  const embeddedV4 = () =>
    `${g[6]! >> 8}.${g[6]! & 255}.${g[7]! >> 8}.${g[7]! & 255}`;
  if (g.every((x) => x === 0)) return false; // ::
  if (g.slice(0, 7).every((x) => x === 0) && g[7] === 1) return false; // ::1
  // IPv4-mapped ::ffff:a.b.c.d and IPv4-compatible ::a.b.c.d: judge the v4.
  if (g.slice(0, 5).every((x) => x === 0) && (g[5] === 0xffff || g[5] === 0))
    return isPublicV4(embeddedV4());
  // NAT64 64:ff9b::/96: judge the embedded v4.
  if (g[0] === 0x64 && g[1] === 0xff9b && g.slice(2, 6).every((x) => x === 0))
    return isPublicV4(embeddedV4());
  const first = g[0]!;
  // Allowlist, not blocklist: only 2000::/3 is global unicast. Everything
  // else (unique local fc00::/7, link-local fe80::/10, deprecated site-local
  // fec0::/10, multicast, local-use NAT64 64:ff9b:1::/48, discard 100::/64)
  // is refused without having to enumerate it.
  if ((first & 0xe000) !== 0x2000) return false;
  // Non-global ranges inside 2000::/3.
  if (first === 0x2001 && g[1]! < 0x0200) return false; // 2001::/23 IETF special (Teredo, ORCHID, benchmarking)
  if (first === 0x2001 && g[1] === 0x0db8) return false; // documentation
  if (first === 0x2002) return false; // 6to4 (embeds arbitrary v4)
  if (first === 0x3fff && g[1]! < 0x1000) return false; // 3fff::/20 documentation
  return true;
}

/** True only for a publicly routable unicast address. */
export function isPublicAddress(ip: string): boolean {
  const family = isIP(ip);
  if (family === 4) return isPublicV4(ip);
  if (family === 6) return isPublicV6(ip);
  return false;
}

export class EgressBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EgressBlockedError";
  }
}

type Resolver = (
  hostname: string,
  cb: (err: NodeJS.ErrnoException | null, addresses: LookupAddress[]) => void,
) => void;

const systemResolver: Resolver = (hostname, cb) =>
  dnsLookup(hostname, { all: true, verbatim: true }, cb);

/**
 * A socket lookup hook that resolves ALL addresses and refuses the
 * connection unless every one is public. Node calls it at connect time, so
 * the validated address is the connected address.
 */
export function publicOnlyLookup(resolver: Resolver = systemResolver) {
  return (
    hostname: string,
    options: { all?: boolean } | number | undefined,
    callback: (
      err: NodeJS.ErrnoException | null,
      address: string | LookupAddress[],
      family?: number,
    ) => void,
  ): void => {
    const literal = isIP(hostname)
      ? [{ address: hostname, family: isIP(hostname) }]
      : null;
    const finish = (
      err: NodeJS.ErrnoException | null,
      addrs: LookupAddress[],
    ) => {
      if (err) return callback(err, "", 0);
      if (!addrs.length)
        return callback(
          new EgressBlockedError(`no address for ${hostname}`),
          "",
          0,
        );
      const bad = addrs.find((a) => !isPublicAddress(a.address));
      if (bad)
        return callback(
          new EgressBlockedError(
            `${hostname} resolves to a non-public address`,
          ),
          "",
          0,
        );
      const wantsAll = typeof options === "object" && options?.all === true;
      if (wantsAll) return callback(null, addrs);
      callback(null, addrs[0]!.address, addrs[0]!.family);
    };
    if (literal) return finish(null, literal);
    resolver(hostname, finish);
  };
}

/** Parse and pre-check a user-supplied base URL (fast, non-authoritative). */
export function checkPublicHttpsUrl(raw: string): URL {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new EgressBlockedError("not a valid URL");
  }
  if (u.protocol !== "https:") throw new EgressBlockedError("https only");
  if (u.username || u.password)
    throw new EgressBlockedError("credentials in the URL are not allowed");
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (isIP(host) && !isPublicAddress(host))
    throw new EgressBlockedError("non-public address");
  if (/^(localhost|.*\.localhost|.*\.local|.*\.internal)$/i.test(host))
    throw new EgressBlockedError("non-public hostname");
  return u;
}

/** Upper bound on a response body read from a user-chosen endpoint. */
export const MAX_PUBLIC_RESPONSE_BYTES = 2 * 1024 * 1024;

// Statuses the Response constructor refuses a body for.
const NULL_BODY_STATUSES = new Set([101, 103, 204, 205, 304]);

/**
 * fetch-compatible request to a PUBLIC https endpoint only. Every DNS answer
 * is checked at connect time; redirects are returned, never followed; the
 * body is capped and the request destroyed on overflow; nothing a chosen
 * endpoint answers can throw outside the returned promise.
 */
export function createPublicFetch(
  resolver: Resolver = systemResolver,
  requestImpl: typeof httpsRequest = httpsRequest,
  maxBytes: number = MAX_PUBLIC_RESPONSE_BYTES,
): typeof fetch {
  const lookup = publicOnlyLookup(resolver);
  return (async (input: string | URL | Request, init: RequestInit = {}) => {
    const url = checkPublicHttpsUrl(
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url,
    );
    const headers: Record<string, string> = {};
    new Headers(init.headers ?? {}).forEach((v, k) => {
      headers[k] = v;
    });
    const body =
      typeof init.body === "string" || init.body == null
        ? init.body
        : String(init.body);
    return await new Promise<Response>((resolve, reject) => {
      let settled = false;
      const fail = (err: unknown) => {
        if (settled) return;
        settled = true;
        reject(err);
      };
      const req = requestImpl(
        url,
        {
          method: init.method ?? "GET",
          headers,
          lookup: lookup as never,
          signal: init.signal ?? undefined,
        },
        (res) => {
          const chunks: Buffer[] = [];
          let size = 0;
          res.on("data", (c: Buffer) => {
            if (settled) return;
            size += c.length;
            if (size > maxBytes) {
              const err = new EgressBlockedError(
                `response exceeds ${maxBytes} bytes`,
              );
              fail(err);
              req.destroy(err);
              return;
            }
            chunks.push(c);
          });
          res.on("end", () => {
            if (settled) return;
            try {
              const raw = res.statusCode ?? 0;
              const status = raw >= 200 && raw <= 599 ? raw : 502;
              const outHeaders = new Headers();
              for (const [k, v] of Object.entries(res.headers))
                if (typeof v === "string") outHeaders.set(k, v);
              const response = new Response(
                NULL_BODY_STATUSES.has(status) ? null : Buffer.concat(chunks),
                { status, headers: outHeaders },
              );
              settled = true;
              resolve(response);
            } catch (err) {
              fail(err);
            }
          });
          res.on("error", fail);
        },
      );
      req.on("error", fail);
      if (body) req.write(body);
      req.end();
    });
  }) as typeof fetch;
}

/** Process-wide instance for production callers. */
export const publicFetch: typeof fetch = createPublicFetch();
