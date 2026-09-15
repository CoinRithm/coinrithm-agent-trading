// Thin CoinRithm agent-API client for the runner (futures-focused v1).
//
// Auth: the user's own crk_live_ key from COINRITHM_API_KEY (env only — never
// from an agent file). 429 backs off on Retry-After; 401/403/409/422 are
// FAIL-CLOSED cycle outcomes (returned, not retried). fetch + sleep are
// injectable so tests run with no network and no real waits.

import { AgentTrace, ApiResult } from "./types.js";
import { setTimeout as sleep } from "node:timers/promises";
import { retryAfterSeconds } from "../retryAfter.js";

export const DEFAULT_BASE_URL = "https://api.coinrithm.com";
export const DEFAULT_REQUEST_TIMEOUT_MS = 30_000;

// SELF-REPORTED provenance the runner attaches to a pm/open or pm/opportunity so the
// durable artifact records WHAT RAN. Carries NO trust: the server stamps the policy
// versions + providerVerified itself (providerVerified can never be raised here). The
// runner fills only what it honestly knows (runtimeKind, packageVersion, model), and
// omits the rest.
export type ProvenanceReport = {
  runtimeKind?:
    "hosted_scheduler" | "self_host_runner" | "byo_api" | "mcp_tool";
  packageVersion?: string;
  bundleId?: string;
  bundleVersion?: string;
  skillVersions?: Record<string, string>;
  promptHash?: string;
  configHash?: string;
  modelProvider?: string;
  modelName?: string;
  evidenceRef?: { snapshotIds?: string[]; sourceCapturedAt?: string };
};

export interface ClientConfig {
  apiKey: string;
  baseUrl?: string;
  fetchFn?: typeof fetch;
  sleepFn?: (ms: number) => Promise<void>;
  maxRetries?: number;
  /** Total deadline, including response bodies and all 429 retry waits. */
  requestTimeoutMs?: number;
  /** Optional caller cancellation, applied to each request from this client. */
  signal?: AbortSignal;
  // Extra headers attached to EVERY request. CoinRithm's hosted scheduler uses
  // this to present its internal attestation channel so the backend
  // server-signs scheduler-run decisions (G5c). Self-host runs leave it unset —
  // the token never ships in a bundle or env template.
  extraHeaders?: Record<string, string>;
}

type Query = Record<string, string | number | undefined>;

function traceHeaders(trace?: AgentTrace): Record<string, string> {
  const h: Record<string, string> = {};
  if (!trace) return h;
  if (trace.runId) h["X-CoinRithm-Run-Id"] = trace.runId;
  if (trace.decisionId) h["X-CoinRithm-Decision-Id"] = trace.decisionId;
  if (trace.strategyLabel)
    h["X-CoinRithm-Strategy-Label"] = trace.strategyLabel;
  if (typeof trace.confidence === "number")
    h["X-CoinRithm-Confidence"] = String(trace.confidence);
  if (trace.observationHash)
    h["X-CoinRithm-Observation-Hash"] = trace.observationHash;
  if (trace.indicatorVersion)
    h["X-CoinRithm-Indicator-Version"] = trace.indicatorVersion;
  return h;
}

export class CoinRithmClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchFn: typeof fetch;
  private readonly sleepFn?: (ms: number) => Promise<void>;
  private readonly maxRetries: number;
  private readonly requestTimeoutMs: number;
  private readonly signal?: AbortSignal;
  private readonly extraHeaders?: Record<string, string>;
  // Every 429 seen this session (read or write, retried or not) — feeds the
  // rate-limit-pressure kill-switch, which a write-only counter would miss.
  rateLimitHits = 0;

  constructor(cfg: ClientConfig) {
    this.apiKey = cfg.apiKey;
    this.baseUrl = (cfg.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.fetchFn = cfg.fetchFn ?? fetch;
    this.sleepFn = cfg.sleepFn;
    this.maxRetries = cfg.maxRetries ?? 3;
    this.requestTimeoutMs = cfg.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
    if (
      !Number.isSafeInteger(this.requestTimeoutMs) ||
      this.requestTimeoutMs < 1 ||
      this.requestTimeoutMs > 2_147_483_647
    ) {
      throw new Error(
        "requestTimeoutMs must be an integer between 1 and 2147483647",
      );
    }
    this.signal = cfg.signal;
    this.extraHeaders = cfg.extraHeaders;
  }

  private async request(
    method: "GET" | "POST",
    path: string,
    opts: { query?: Query; body?: unknown; trace?: AgentTrace } = {},
  ): Promise<ApiResult> {
    const url = new URL(this.baseUrl + path);
    if (opts.query) {
      for (const [k, v] of Object.entries(opts.query)) {
        if (v !== undefined && v !== null && v !== "")
          url.searchParams.set(k, String(v));
      }
    }
    // extraHeaders first: auth, accept and trace can never be clobbered by it.
    const headers: Record<string, string> = {
      ...this.extraHeaders,
      Authorization: `Bearer ${this.apiKey}`,
      Accept: "application/json",
      ...traceHeaders(opts.trace),
    };
    if (opts.body !== undefined) headers["Content-Type"] = "application/json";

    const controller = new AbortController();
    let timedOut = false;
    const cancel = () => controller.abort(new Error("API request cancelled"));
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort(new Error("API request deadline exceeded"));
    }, this.requestTimeoutMs);
    this.signal?.addEventListener("abort", cancel, { once: true });
    if (this.signal?.aborted) cancel();

    let rejectAborted!: () => void;
    const aborted = new Promise<never>((_, reject) => {
      rejectAborted = () => reject(controller.signal.reason);
      controller.signal.addEventListener("abort", rejectAborted, {
        once: true,
      });
      if (controller.signal.aborted) rejectAborted();
    });
    const perform = async (): Promise<ApiResult> => {
      for (let attempt = 0; ; attempt++) {
        controller.signal.throwIfAborted();
        const res = await this.fetchFn(url.toString(), {
          method,
          headers,
          body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
          signal: controller.signal,
        });
        controller.signal.throwIfAborted();

        const retryAfter = retryAfterSeconds(res.headers.get("retry-after"));
        if (res.status === 429) this.rateLimitHits += 1;
        if (res.status === 429 && attempt < this.maxRetries) {
          // Release this response before waiting so retries do not retain sockets.
          void res.body?.cancel().catch(() => {});
          const delayMs = (retryAfter ?? 5) * 1000;
          // Never shorten a provider's Retry-After or overflow a Node timer.
          if (delayMs >= this.requestTimeoutMs) await aborted;
          else if (this.sleepFn) await this.sleepFn(delayMs);
          else await sleep(delayMs, undefined, { signal: controller.signal });
          continue;
        }

        const text = await res.text();
        controller.signal.throwIfAborted();
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
          retryAfterSeconds: res.status === 429 ? retryAfter : undefined,
          rateLimitRemaining:
            Number(res.headers.get("ratelimit-remaining")) || undefined,
          ledgerEventId: res.headers.get("x-coinrithm-ledger-event-id"),
        };
      }
    };
    try {
      // The race also bounds injected transports that do not honor AbortSignal.
      return await Promise.race([perform(), aborted]);
    } catch (err) {
      return {
        ok: false,
        status: 0,
        data: {
          error: timedOut
            ? "request_timeout"
            : controller.signal.aborted
              ? "request_aborted"
              : "network_error",
          message: timedOut
            ? `API request exceeded ${this.requestTimeoutMs}ms deadline`
            : controller.signal.aborted
              ? "API request cancelled"
              : err instanceof Error
                ? err.message
                : String(err),
        },
      };
    } finally {
      clearTimeout(timer);
      this.signal?.removeEventListener("abort", cancel);
      controller.signal.removeEventListener("abort", rejectAborted);
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
  // Keyless public universe scan (top 24h movers). The Bearer header rides
  // along harmlessly — the /api/coins routes are public and ignore it.
  cryptoMovers(
    direction: "gainers" | "losers",
    limit: number,
    trace?: AgentTrace,
  ) {
    return this.request(
      "GET",
      direction === "losers"
        ? "/api/coins/top-losers"
        : "/api/coins/top-gainers",
      { query: { limit }, trace },
    );
  }
  market(coinId: string, trace?: AgentTrace) {
    return this.request(
      "GET",
      `/api/agent/market/${encodeURIComponent(coinId)}`,
      { trace },
    );
  }
  candles(coinId: string, range: string, trace?: AgentTrace) {
    return this.request(
      "GET",
      `/api/agent/market/${encodeURIComponent(coinId)}/candles`,
      {
        query: { range },
        trace,
      },
    );
  }
  trades(
    query?: { venue?: string; limit?: number; updatedSince?: string },
    trace?: AgentTrace,
  ) {
    return this.request("GET", "/api/agent/trades", { query, trace });
  }
  futuresPositions(query?: { updatedSince?: string }, trace?: AgentTrace) {
    return this.request("GET", "/api/agent/positions/futures", {
      query,
      trace,
    });
  }
  futuresQuote(
    body: {
      coinId: string;
      side: string;
      leverage: number;
      marginMusd: number;
    },
    trace?: AgentTrace,
  ) {
    return this.request("POST", "/api/agent/futures/quote", {
      body: { ...body, agentTrace: trace },
    });
  }
  // ── spot ─────────────────────────────────────────────────────────────────
  openOrders(
    query?: { coinId?: string; updatedSince?: string },
    trace?: AgentTrace,
  ) {
    return this.request("GET", "/api/agent/orders/open", { query, trace });
  }
  spotQuote(
    body: { coinId: string; side: string; quantity: number },
    trace?: AgentTrace,
  ) {
    return this.request("POST", "/api/agent/spot/quote", {
      body: { ...body, agentTrace: trace },
    });
  }
  // ── prediction markets ───────────────────────────────────────────────────
  discoverPmMarkets(
    query?: { q?: string; source?: string; limit?: number },
    trace?: AgentTrace,
  ) {
    return this.request("GET", "/api/agent/pm/discover", { query, trace });
  }
  agentNews(
    query: {
      coins: string;
      limit?: number;
      hours?: number;
      minImportance?: number;
    },
    trace?: AgentTrace,
  ) {
    return this.request("GET", "/api/agent/news", { query, trace });
  }
  // GET /api/agent/positions/pm. Response (data: unknown — parsed defensively in
  // observe): { positions: [...open + unrealized mark...], recentlyResolved: [...
  // the caller's OWN bets that settled win/loss/void with realized pnl since the
  // delta cursor; settlement-feedback loop...], updatedSince, asOf }. The
  // `recentlyResolved` array is ADDITIVE (older backends omit it → observe degrades
  // to []); the open `positions` shape is unchanged.
  pmPositions(query?: { updatedSince?: string }, trace?: AgentTrace) {
    return this.request("GET", "/api/agent/positions/pm", { query, trace });
  }
  pmQuote(
    body: {
      source: string;
      slug: string;
      outcomeExternalMarketId: string;
      stakeMusd: number;
    },
    trace?: AgentTrace,
  ) {
    return this.request("POST", "/api/agent/pm/quote", {
      body: { ...body, agentTrace: trace },
    });
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
    idempotencyKey?: string;
    agentTrace?: AgentTrace;
  }) {
    return this.request("POST", "/api/agent/futures/sl-tp", { body });
  }
  placeSpotOrder(body: {
    coinId: string;
    side: string; // buy | sell
    orderType: string; // market | limit | stop
    quantity: number;
    limitPrice?: number;
    stopPrice?: number;
    idempotencyKey: string;
    agentTrace?: AgentTrace;
  }) {
    return this.request("POST", "/api/agent/spot/order", { body });
  }
  cancelSpotOrder(
    orderId: number,
    idempotencyKey?: string,
    trace?: AgentTrace,
  ) {
    return this.request("POST", `/api/agent/spot/order/${orderId}/cancel`, {
      body: idempotencyKey !== undefined ? { idempotencyKey } : undefined,
      trace,
    });
  }
  openPmPosition(body: {
    source: string;
    slug: string;
    outcomeExternalMarketId: string;
    stakeMusd: number;
    idempotencyKey: string;
    // Optional: the agent's OWN estimated probability (1..99) that the backed side
    // wins, recorded separately from the market price for its public calibration
    // record. Omitted entirely when the agent isn't forecasting.
    forecastProbability?: number;
    // Optional SELF-REPORTED provenance (WHAT RAN). Makes the artifact schemaVersion 2.
    provenance?: ProvenanceReport;
    agentTrace?: AgentTrace;
  }) {
    return this.request("POST", "/api/agent/pm/open", { body });
  }

  // Report a NON-opened PM opportunity (abstained / forecast_only / quote_expired)
  // so the public evaluation captures the FULL opportunity universe, not only
  // opened trades. EVIDENCE, not a trade: needs only the read scope and does not
  // move a wallet/position. Best-effort at the call site — a failure never affects
  // the cycle. decisionId is the per-cycle idempotency key (server dedupes on
  // (apiKeyId, decisionId)).
  reportPmOpportunity(
    body: {
      kind: "abstained" | "forecast_only" | "quote_expired";
      source?: string;
      slug?: string;
      outcomeExternalMarketId?: string;
      // The agent's OWN probability (1..99); REQUIRED by the server for
      // forecast_only, omitted otherwise.
      forecastProbability?: number;
      // The market price the agent observed (0..100).
      marketProbability?: number;
      reasonCode?: string;
      // Cohort/universe breadth — the field that carries the opportunity universe
      // so the runner posts ONCE per cycle, never per-market.
      cohort?: { universeSize?: number; horizon?: string };
      decisionId?: string | null;
      runId?: string | null;
      // Optional SELF-REPORTED provenance (WHAT RAN). Makes the artifact schemaVersion 2.
      provenance?: ProvenanceReport;
    },
    trace?: AgentTrace,
  ) {
    return this.request("POST", "/api/agent/pm/opportunity", {
      body: { ...body, agentTrace: trace },
    });
  }

  // Run-evidence export — runId is URL-encoded into the query.
  exportRunEvidence(runId: string) {
    return this.request("GET", "/api/agent/ledger/export", {
      query: { runId },
    });
  }
}

// 401/403/409/422 are terminal, fail-closed outcomes for a cycle (auth/scope,
// conflict, or a risk-gate rejection) — never retried as if transient.
export function isFailClosed(status: number): boolean {
  return status === 401 || status === 403 || status === 409 || status === 422;
}
