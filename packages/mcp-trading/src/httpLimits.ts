// Admission limits for the hosted multi-user MCP (POST /mcp).
//
// Audit 2026-10-16: POST /mcp had no rate limit and no concurrency cap, and
// keyless pm_data_* tools reach the internal API directly (past Cloudflare),
// so one anonymous client could drive unbounded load into the single-host API.
// Measured before choosing the numbers (container logs, 24 h to 2026-10-16
// 01:30 UTC): 3,861 requests, peak about 16 per minute across ALL clients.
// A per-client allowance of 120 per minute (the API's own per-key baseline)
// leaves ordinary agents untouched; the in-flight cap bounds a burst.
//
// In-memory and per-process on purpose: the service runs as one container.
// No dependency is added for this (supply-chain surface of an npx package).

import type { NextFunction, Request, Response } from "express";

export type McpLimitOptions = {
  perClientPerMinute?: number;
  maxInFlight?: number;
  now?: () => number;
};

export const DEFAULT_PER_CLIENT_PER_MINUTE = 120;
export const DEFAULT_MAX_IN_FLIGHT = 64;
const WINDOW_MS = 60_000;

const firstHeader = (value: string | string[] | undefined): string | null => {
  const raw = Array.isArray(value) ? value[0] : value;
  const first = raw?.split(",")[0]?.trim();
  return first ? first : null;
};

// Behind Cloudflare and Traefik: Cloudflare's connecting-IP header names the
// real client; X-Forwarded-For is the fallback; the socket address last.
export function clientKey(req: Request): string {
  return (
    firstHeader(req.headers["cf-connecting-ip"]) ??
    firstHeader(req.headers["x-forwarded-for"]) ??
    req.socket?.remoteAddress ??
    "unknown"
  );
}

const rpcError = (
  res: Response,
  status: number,
  retryAfterSeconds: number,
  message: string,
) => {
  res.setHeader("Retry-After", String(retryAfterSeconds));
  res.status(status).json({
    jsonrpc: "2.0",
    error: { code: -32000, message, data: { retryAfterSeconds } },
    id: null,
  });
};

export function createMcpAdmission(options: McpLimitOptions = {}) {
  const perClient = options.perClientPerMinute ?? DEFAULT_PER_CLIENT_PER_MINUTE;
  const maxInFlight = options.maxInFlight ?? DEFAULT_MAX_IN_FLIGHT;
  const now = options.now ?? Date.now;
  let windowStart = now();
  let counts = new Map<string, number>();
  let inFlight = 0;

  return function mcpAdmission(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    const t = now();
    if (t - windowStart >= WINDOW_MS) {
      // Fixed window: dropping the whole map bounds memory to one minute of
      // distinct clients.
      windowStart = t;
      counts = new Map();
    }
    const key = clientKey(req);
    const used = (counts.get(key) ?? 0) + 1;
    counts.set(key, used);
    if (used > perClient) {
      const retry = Math.max(
        1,
        Math.ceil((windowStart + WINDOW_MS - t) / 1000),
      );
      rpcError(
        res,
        429,
        retry,
        `Rate limited: at most ${perClient} MCP requests per minute per client. Retry after ${retry} s.`,
      );
      return;
    }
    if (inFlight >= maxInFlight) {
      rpcError(
        res,
        503,
        2,
        "Server busy: too many MCP requests in flight. Retry shortly.",
      );
      return;
    }
    inFlight += 1;
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      inFlight -= 1;
    };
    res.on("finish", release);
    res.on("close", release);
    next();
  };
}
