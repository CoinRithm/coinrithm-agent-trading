// Thin CoinRithm agent-API client for the runner (futures-focused v1).
//
// Auth: the user's own crk_live_ key from COINRITHM_API_KEY (env only — never
// from an agent file). 429 backs off on Retry-After; 401/403/409/422 are
// FAIL-CLOSED cycle outcomes (returned, not retried). fetch + sleep are
// injectable so tests run with no network and no real waits.

import { AgentTrace, ApiResult } from "./types.js";
import { sleep as realSleep } from "./util.js";

export const DEFAULT_BASE_URL = "https://api.coinrithm.com";

export interface ClientConfig {
  apiKey: string;
  baseUrl?: string;
  fetchFn?: typeof fetch;
  sleepFn?: (ms: number) => Promise<void>;
  maxRetries?: number;
}

type Query = Record<string, string | number | undefined>;

function traceHeaders(trace?: AgentTrace): Record<string, string> {
  const h: Record<string, string> = {};
  if (!trace) return h;
  if (trace.runId) h["X-CoinRithm-Run-Id"] = trace.runId;
  if (trace.decisionId) h["X-CoinRithm-Decision-Id"] = trace.decisionId;
  if (trace.strategyLabel) h["X-CoinRithm-Strategy-Label"] = trace.strategyLabel;
  if (typeof trace.confidence === "number") h["X-CoinRithm-Confidence"] = String(trace.confidence);
  return h;
}

export class CoinRithmClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchFn: typeof fetch;
  private readonly sleepFn: (ms: number) => Promise<void>;
  private readonly maxRetries: number;
  // Every 429 seen this session (read or write, retried or not) — feeds the
  // rate-limit-pressure kill-switch, which a write-only counter would miss.
  rateLimitHits = 0;

  constructor(cfg: ClientConfig) {
    this.apiKey = cfg.apiKey;
    this.baseUrl = (cfg.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.fetchFn = cfg.fetchFn ?? fetch;
    this.sleepFn = cfg.sleepFn ?? realSleep;
    this.maxRetries = cfg.maxRetries ?? 3;
  }

  private async request(
    method: "GET" | "POST",
    path: string,
    opts: { query?: Query; body?: unknown; trace?: AgentTrace } = {},
  ): Promise<ApiResult> {
    const url = new URL(this.baseUrl + path);
    if (opts.query) {
      for (const [k, v] of Object.entries(opts.query)) {
        if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
      }
    }
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      Accept: "application/json",
      ...traceHeaders(opts.trace),
    };
    if (opts.body !== undefined) headers["Content-Type"] = "application/json";

    for (let attempt = 0; ; attempt++) {
      let res: Response;
      try {
        res = await this.fetchFn(url.toString(), {
          method,
          headers,
          body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
        });
      } catch (err) {
        return {
          ok: false,
          status: 0,
          data: { error: "network_error", message: err instanceof Error ? err.message : String(err) },
        };
      }

      const retryAfter = Number(res.headers.get("retry-after"));
      if (res.status === 429) this.rateLimitHits += 1;
      if (res.status === 429 && attempt < this.maxRetries) {
        await this.sleepFn((Number.isFinite(retryAfter) ? retryAfter : 5) * 1000);
        continue;
      }

      const text = await res.text();
      let data: unknown = text;
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          /* leave as text */
        }
      }
      return {
        ok: res.ok,
        status: res.status,
        data,
        retryAfterSeconds: res.status === 429 && Number.isFinite(retryAfter) ? retryAfter : undefined,
        rateLimitRemaining: Number(res.headers.get("ratelimit-remaining")) || undefined,
        ledgerEventId: res.headers.get("x-coinrithm-ledger-event-id"),
      };
    }
  }

  // ── reads ──────────────────────────────────────────────────────────────────
  me(trace?: AgentTrace) {
    return this.request("GET", "/api/agent/me", { trace });
  }
  portfolio(trace?: AgentTrace) {
    return this.request("GET", "/api/agent/portfolio", { trace });
  }
  wallet(query?: { coinId?: string }, trace?: AgentTrace) {
    return this.request("GET", "/api/agent/wallet", { query, trace });
  }
  resolve(q: string, trace?: AgentTrace) {
    return this.request("GET", "/api/agent/resolve", { query: { q }, trace });
  }
  market(coinId: string, trace?: AgentTrace) {
    return this.request("GET", `/api/agent/market/${encodeURIComponent(coinId)}`, { trace });
  }
  candles(coinId: string, range: string, trace?: AgentTrace) {
    return this.request("GET", `/api/agent/market/${encodeURIComponent(coinId)}/candles`, {
      query: { range },
      trace,
    });
  }
  trades(query?: { venue?: string; limit?: number; updatedSince?: string }, trace?: AgentTrace) {
    return this.request("GET", "/api/agent/trades", { query, trace });
  }
  futuresPositions(query?: { updatedSince?: string }, trace?: AgentTrace) {
    return this.request("GET", "/api/agent/positions/futures", { query, trace });
  }
  futuresQuote(
    body: { coinId: string; side: string; leverage: number; marginMusd: number },
    trace?: AgentTrace,
  ) {
    return this.request("POST", "/api/agent/futures/quote", { body: { ...body, agentTrace: trace } });
  }

  // ── writes ─────────────────────────────────────────────────────────────────
  openFutures(body: {
    coinId: string;
    side: string;
    leverage: number;
    marginMusd: number;
    idempotencyKey: string;
    stopLossPrice?: number | null;
    takeProfitPrice?: number | null;
    agentTrace?: AgentTrace;
  }) {
    return this.request("POST", "/api/agent/futures/open", { body });
  }
  closeFutures(body: {
    positionId: number;
    fraction?: number;
    idempotencyKey: string;
    agentTrace?: AgentTrace;
  }) {
    return this.request("POST", "/api/agent/futures/close", { body });
  }
  setFuturesSlTp(body: {
    positionId: number;
    stopLossPrice?: number | null;
    takeProfitPrice?: number | null;
    agentTrace?: AgentTrace;
  }) {
    return this.request("POST", "/api/agent/futures/sl-tp", { body });
  }

  // Run-evidence export — runId is URL-encoded into the query.
  exportRunEvidence(runId: string) {
    return this.request("GET", "/api/agent/ledger/export", { query: { runId } });
  }
}

// 401/403/409/422 are terminal, fail-closed outcomes for a cycle (auth/scope,
// conflict, or a risk-gate rejection) — never retried as if transient.
export function isFailClosed(status: number): boolean {
  return status === 401 || status === 403 || status === 409 || status === 422;
}
