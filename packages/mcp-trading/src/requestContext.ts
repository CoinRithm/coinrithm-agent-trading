// Per-HTTP-request context for the hosted MCP (audit 2026-10-16, fresh kit
// audit P1-1). The hosted server calls the API inside the Docker network
// (http://api:4000), where the API's keyless rate limit buckets by
// cf-connecting-ip and otherwise by the socket address. Without this every
// anonymous MCP user shared the MCP container's one bucket (300 requests per
// 5 minutes), so one busy client could 429 everyone else.
//
// http.ts records the caller's Cloudflare-set address for the duration of the
// request; the client forwards it as cf-connecting-ip on upstream calls. The
// API trusts that header only because its origin accepts nothing but
// Cloudflare and this internal network; the value here is the one Cloudflare
// set on the MCP request, re-validated as an IP. stdio has no context and
// sends nothing extra.
import { AsyncLocalStorage } from "node:async_hooks";
import { isIP } from "node:net";

type RequestContext = { clientIp?: string };

const storage = new AsyncLocalStorage<RequestContext>();

export const CALLER_IP_HEADER = "cf-connecting-ip";

/** Runs `fn` with the caller's address (if it is a valid IP) in scope. */
export function runWithCaller<T>(
  rawIp: string | string[] | undefined,
  fn: () => T,
): T {
  const value = Array.isArray(rawIp) ? rawIp[0] : rawIp;
  const ip = value?.trim();
  return storage.run({ clientIp: ip && isIP(ip) ? ip : undefined }, fn);
}

/** The current request's caller address, or undefined (stdio, no header). */
export const callerIp = (): string | undefined => storage.getStore()?.clientIp;
