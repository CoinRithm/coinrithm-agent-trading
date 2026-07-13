// Thin HTTP client for the CoinRithm agent surface (/api/agent/*).
//
// Auth: a user-minted API key (crk_live_…) passed as `Authorization: Bearer …`.
//
// Two auth modes:
//   - stdio (single-user, local): the key comes from COINRITHM_API_KEY at
//     startup and is the client's default for every request.
//   - Streamable HTTP (multi-user, hosted at mcp.coinrithm.com): each request
//     carries the *caller's own* key in its Authorization header. The HTTP entry
//     reads that header per request and passes it to every client call as a
//     per-request override, so one shared server serves many users without a
//     global key. COINRITHM_API_KEY is NOT used (and need not be set) in this mode.
//
// Config comes from the environment:
//   - COINRITHM_API_KEY  (stdio only) — the crk_live_… key.
//   - COINRITHM_API_URL  (optional)   — base URL; defaults to production.
//
// IMPORTANT: this module must NEVER write to stdout (stdout is the MCP JSON-RPC
// channel). All diagnostics go to stderr via the logger below.

export const DEFAULT_BASE_URL = "https://api.coinrithm.com";

export function log(...args: unknown[]): void {
  // stderr only — stdout is reserved for the MCP protocol.
  console.error("[coinrithm-mcp]", ...args);
}

export interface ClientConfig {
  // Default key for the single-user stdio path. Omitted in the multi-user HTTP
  // path, where each request supplies its own key as a per-call override.
  apiKey?: string;
  baseUrl: string;
}

export interface AgentTrace {
  runId?: string;
  decisionId?: string;
  strategyLabel?: string;
  confidence?: number;
  rationaleSummary?: string;
}

function resolveBaseUrl(): string {
  return (process.env.COINRITHM_API_URL?.trim() || DEFAULT_BASE_URL).replace(
    /\/+$/,
    "",
  );
}

// stdio path: a startup key is REQUIRED (single user).
export function loadConfig(): ClientConfig {
  const apiKey = process.env.COINRITHM_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "COINRITHM_API_KEY is not set. Mint a key in CoinRithm → Profile → API Keys " +
        "and expose it to this MCP server as the COINRITHM_API_KEY environment variable.",
    );
  }
  if (!apiKey.startsWith("crk_live_")) {
    log(
      "warning: COINRITHM_API_KEY does not start with 'crk_live_' — it will likely be rejected.",
    );
  }
  return { apiKey, baseUrl: resolveBaseUrl() };
}

// HTTP (multi-user) path: NO startup key. Each request brings its own.
// COINRITHM_API_KEY is intentionally ignored here even if present.
export function loadHttpConfig(): ClientConfig {
  return { baseUrl: resolveBaseUrl() };
}

// Extract a bare crk_live_… token from an incoming `Authorization` header value.
// Accepts "Bearer <key>" (case-insensitive scheme) or a raw key. Header values
// from the SDK's IsomorphicHeaders may be string | string[] | undefined.
export function bearerFromHeader(
  value: string | string[] | undefined,
): string | undefined {
  const raw = (Array.isArray(value) ? value[0] : value)?.trim();
  if (!raw) return undefined;
  const m = /^bearer\s+(.+)$/i.exec(raw);
  const token = (m ? m[1] : raw).trim();
  return token || undefined;
}

export interface ApiResult {
  ok: boolean;
  status: number;
  ledgerEventId?: string | null;
  ledgerStatus?: string | null;
  // Parsed JSON body when available, else raw text.
  data: unknown;
}

type TraceableBody<T extends Record<string, unknown>> = T & {
  agentTrace?: AgentTrace;
};

// SELF-REPORTED provenance a caller MAY attach to a pm/open or pm/opportunity so the
// durable artifact records WHAT RAN. All fields carry NO trust: the server always
// stamps executionPolicyVersion / evaluationPolicyVersion / providerVerified itself
// (providerVerified can never be raised by a caller) and validates/caps/hex-checks
// these. promptHash / configHash MUST be sha256 hex (64 chars) — hashes only, never
// raw prompt or config text. Sending any block (even {}) makes the row schemaVersion 2.
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

const applyAgentTraceHeaders = (
  headers: Record<string, string>,
  trace: AgentTrace | undefined,
): void => {
  if (!trace) return;
  if (trace.runId) headers["X-CoinRithm-Run-Id"] = trace.runId;
  if (trace.decisionId) headers["X-CoinRithm-Decision-Id"] = trace.decisionId;
  if (trace.strategyLabel) {
    headers["X-CoinRithm-Strategy-Label"] = trace.strategyLabel;
  }
  if (typeof trace.confidence === "number") {
    headers["X-CoinRithm-Confidence"] = String(trace.confidence);
  }
};

const traceFromBody = (body: unknown): AgentTrace | undefined =>
  body && typeof body === "object" && "agentTrace" in body
    ? (body as { agentTrace?: AgentTrace }).agentTrace
    : undefined;

export class CoinRithmClient {
  // Default key for the stdio (single-user) path. Undefined in the multi-user
  // HTTP path, where every call must pass a per-request `apiKey` override.
  private readonly defaultApiKey?: string;
  private readonly baseUrl: string;

  constructor(config: ClientConfig) {
    this.defaultApiKey = config.apiKey;
    this.baseUrl = config.baseUrl;
  }

  private async request(
    method: "GET" | "POST",
    path: string,
    opts: {
      query?: Record<string, string | number | undefined>;
      body?: unknown;
      agentTrace?: AgentTrace;
      // Per-request key (multi-user HTTP). Falls back to the constructor key
      // (single-user stdio). One of the two MUST be present.
      apiKey?: string;
    } = {},
  ): Promise<ApiResult> {
    const apiKey = opts.apiKey ?? this.defaultApiKey;
    if (!apiKey) {
      return {
        ok: false,
        status: 401,
        data: {
          error: "missing_api_key",
          message:
            "No API key for this request. On the hosted MCP, send " +
            "`Authorization: Bearer crk_live_…` with your own key.",
        },
      };
    }

    const url = new URL(this.baseUrl + path);
    if (opts.query) {
      for (const [k, v] of Object.entries(opts.query)) {
        if (v !== undefined && v !== null && v !== "") {
          url.searchParams.set(k, String(v));
        }
      }
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    };
    applyAgentTraceHeaders(
      headers,
      opts.agentTrace ?? traceFromBody(opts.body),
    );
    if (opts.body !== undefined) headers["Content-Type"] = "application/json";

    let res: Response;
    try {
      res = await fetch(url.toString(), {
        method,
        headers,
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      });
    } catch (err) {
      log(`network error calling ${method} ${path}:`, err);
      return {
        ok: false,
        status: 0,
        data: {
          error: "network_error",
          message: err instanceof Error ? err.message : String(err),
        },
      };
    }

    const text = await res.text();
    let data: unknown = text;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        // leave as text
      }
    }
    if (res.status === 429) {
      // Surface the back-off contract so an agent can pace itself instead of
      // hammering: 120 req/min per key baseline, 20 trade-writes/min.
      const retryAfter = Number(res.headers.get("retry-after"));
      data = {
        ...(typeof data === "object" && data !== null
          ? data
          : { error: String(data) }),
        retryAfterSeconds: Number.isFinite(retryAfter) ? retryAfter : null,
        hint: "Rate limited. Wait retryAfterSeconds (or the Retry-After header) before retrying; pace future calls using the RateLimit-Remaining response header.",
      };
    }
    return {
      ok: res.ok,
      status: res.status,
      ledgerEventId: res.headers.get("x-coinrithm-ledger-event-id"),
      ledgerStatus: res.headers.get("x-coinrithm-ledger-status"),
      data,
    };
  }

  // Public, keyless GET against the free cross-venue data API
  // (/api/prediction-markets/*). No Authorization header is ever attached:
  // these endpoints require no key, and the caller's trading key must not
  // leak into them. No ledger headers exist on this surface either.
  private async publicRequest(
    path: string,
    query?: Record<string, string | number | undefined>,
  ): Promise<ApiResult> {
    const url = new URL(this.baseUrl + path);
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined && v !== null && v !== "") {
          url.searchParams.set(k, String(v));
        }
      }
    }

    let res: Response;
    try {
      res = await fetch(url.toString(), {
        method: "GET",
        headers: { Accept: "application/json" },
      });
    } catch (err) {
      log(`network error calling GET ${path}:`, err);
      return {
        ok: false,
        status: 0,
        data: {
          error: "network_error",
          message: err instanceof Error ? err.message : String(err),
        },
      };
    }

    const text = await res.text();
    let data: unknown = text;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        // leave as text
      }
    }
    return { ok: res.ok, status: res.status, data };
  }

  // ---- public PM data (no key required) ----
  getPublicPmOverview(query?: { fiat?: string }) {
    return this.publicRequest("/api/prediction-markets/overview", query);
  }
  listPublicPmEvents(query?: {
    q?: string;
    source?: string;
    status?: string;
    sort?: string;
    limit?: number;
    offset?: number;
    fiat?: string;
  }) {
    return this.publicRequest("/api/prediction-markets/events", query);
  }
  getPublicPmEvent(source: string, slug: string, query?: { fiat?: string }) {
    return this.publicRequest(
      `/api/prediction-markets/events/${encodeURIComponent(source)}/${encodeURIComponent(slug)}`,
      query,
    );
  }
  getPublicPmWhales() {
    return this.publicRequest("/api/prediction-markets/whales");
  }

  // Every method takes an optional trailing `apiKey` (the per-request key for
  // the multi-user HTTP path). When omitted, the constructor key (stdio) is used.

  // ---- reads (scope: read) ----
  whoami(apiKey?: string, agentTrace?: AgentTrace) {
    return this.request("GET", "/api/agent/me", { apiKey, agentTrace });
  }
  getPortfolio(
    query?: { fiat?: string; locale?: string },
    apiKey?: string,
    agentTrace?: AgentTrace,
  ) {
    return this.request("GET", "/api/agent/portfolio", {
      query,
      apiKey,
      agentTrace,
    });
  }
  getWallet(
    query?: { coinId?: string },
    apiKey?: string,
    agentTrace?: AgentTrace,
  ) {
    return this.request("GET", "/api/agent/wallet", {
      query,
      apiKey,
      agentTrace,
    });
  }
  resolveSymbol(
    query: { q: string },
    apiKey?: string,
    agentTrace?: AgentTrace,
  ) {
    return this.request("GET", "/api/agent/resolve", {
      query,
      apiKey,
      agentTrace,
    });
  }
  getEquityCurve(
    query?: { days?: number; granularity?: "daily" | "realized" },
    apiKey?: string,
    agentTrace?: AgentTrace,
  ) {
    return this.request("GET", "/api/agent/equity-curve", {
      query,
      apiKey,
      agentTrace,
    });
  }
  getMyTrades(
    query?: { venue?: string; limit?: number; updatedSince?: string },
    apiKey?: string,
    agentTrace?: AgentTrace,
  ) {
    return this.request("GET", "/api/agent/trades", {
      query,
      apiKey,
      agentTrace,
    });
  }
  getMarketContext(coinId: string, apiKey?: string, agentTrace?: AgentTrace) {
    return this.request(
      "GET",
      `/api/agent/market/${encodeURIComponent(coinId)}`,
      { apiKey, agentTrace },
    );
  }
  getCandles(
    coinId: string,
    query?: { range?: "1H" | "1D" | "1W" | "1M" | "3M"; fiat?: string },
    apiKey?: string,
    agentTrace?: AgentTrace,
  ) {
    return this.request(
      "GET",
      `/api/agent/market/${encodeURIComponent(coinId)}/candles`,
      { query, apiKey, agentTrace },
    );
  }
  discoverPmMarkets(
    query?: {
      q?: string;
      source?: "all" | "kalshi" | "polymarket";
      limit?: number;
      offset?: number;
      sort?: string;
    },
    apiKey?: string,
    agentTrace?: AgentTrace,
  ) {
    return this.request("GET", "/api/agent/pm/discover", {
      query,
      apiKey,
      agentTrace,
    });
  }
  getPerformance(apiKey?: string, agentTrace?: AgentTrace) {
    return this.request("GET", "/api/agent/performance", {
      apiKey,
      agentTrace,
    });
  }
  getLedger(
    query?: {
      venue?: string;
      eventType?: string;
      runId?: string;
      decisionId?: string;
      status?: string;
      from?: string;
      to?: string;
      limit?: number;
      offset?: number;
    },
    apiKey?: string,
    agentTrace?: AgentTrace,
  ) {
    return this.request("GET", "/api/agent/ledger", {
      query,
      apiKey,
      agentTrace,
    });
  }
  exportLedger(
    query?: {
      venue?: string;
      eventType?: string;
      runId?: string;
      decisionId?: string;
      status?: string;
      from?: string;
      to?: string;
    },
    apiKey?: string,
    agentTrace?: AgentTrace,
  ) {
    return this.request("GET", "/api/agent/ledger/export", {
      query,
      apiKey,
      agentTrace,
    });
  }
  // Agent Arena (public leaderboard). The key is sent but ignored by these
  // endpoints — they expose only public agent names + realized performance.
  getArenaLeaderboard(
    query?: {
      page?: number;
      pageSize?: number;
      window?: "7d" | "30d" | "all";
    },
    apiKey?: string,
  ) {
    return this.request("GET", "/api/arena", { query, apiKey });
  }
  getArenaAgent(handle: string, apiKey?: string) {
    return this.request("GET", `/api/arena/${encodeURIComponent(handle)}`, {
      apiKey,
    });
  }
  listOpenOrders(
    query?: { coinId?: string; limit?: number; updatedSince?: string },
    apiKey?: string,
    agentTrace?: AgentTrace,
  ) {
    return this.request("GET", "/api/agent/orders/open", {
      query,
      apiKey,
      agentTrace,
    });
  }
  getFuturesPositions(
    query?: { updatedSince?: string },
    apiKey?: string,
    agentTrace?: AgentTrace,
  ) {
    return this.request("GET", "/api/agent/positions/futures", {
      query,
      apiKey,
      agentTrace,
    });
  }
  getPmPositions(
    query?: { updatedSince?: string },
    apiKey?: string,
    agentTrace?: AgentTrace,
  ) {
    return this.request("GET", "/api/agent/positions/pm", {
      query,
      apiKey,
      agentTrace,
    });
  }
  futuresQuote(
    body: {
      coinId: string;
      side: string;
      leverage: number;
      marginMusd: number;
    } & { agentTrace?: AgentTrace },
    apiKey?: string,
  ) {
    return this.request("POST", "/api/agent/futures/quote", { body, apiKey });
  }
  pmQuote(
    body: {
      source: string;
      slug: string;
      outcomeExternalMarketId: string;
      // Optional: omitted => yes (the backend default). NO fills at 100 minus the
      // outcome probability and pays out if the outcome resolves false.
      side?: "yes" | "no";
      stakeMusd: number;
    } & { agentTrace?: AgentTrace },
    apiKey?: string,
  ) {
    return this.request("POST", "/api/agent/pm/quote", { body, apiKey });
  }
  spotQuote(
    body: {
      coinId: string;
      side: string;
      quantity: number;
    } & { agentTrace?: AgentTrace },
    apiKey?: string,
  ) {
    return this.request("POST", "/api/agent/spot/quote", { body, apiKey });
  }

  // ---- writes (scope: trade:<venue>) ----
  placeSpotOrder(
    body: TraceableBody<{
      coinId: string;
      side: string;
      orderType: string;
      quantity: number;
      limitPrice?: number;
      stopPrice?: number;
      // REQUIRED for API-key callers (server 400s without it). Unique per
      // intent; reusing it replays the original result (idempotentReplay).
      idempotencyKey: string;
    }>,
    apiKey?: string,
  ) {
    return this.request("POST", "/api/agent/spot/order", { body, apiKey });
  }
  cancelSpotOrder(orderId: number, apiKey?: string, agentTrace?: AgentTrace) {
    return this.request("POST", `/api/agent/spot/order/${orderId}/cancel`, {
      apiKey,
      agentTrace,
    });
  }
  openFuturesPosition(
    body: TraceableBody<{
      coinId: string;
      side: string;
      leverage: number;
      marginMusd: number;
      idempotencyKey: string;
      stopLossPrice?: number | null;
      takeProfitPrice?: number | null;
    }>,
    apiKey?: string,
  ) {
    return this.request("POST", "/api/agent/futures/open", { body, apiKey });
  }
  setFuturesSlTp(
    body: TraceableBody<{
      positionId: number;
      stopLossPrice?: number | null;
      takeProfitPrice?: number | null;
    }>,
    apiKey?: string,
  ) {
    return this.request("POST", "/api/agent/futures/sl-tp", { body, apiKey });
  }
  closeFuturesPosition(
    body: TraceableBody<{
      positionId: number;
      fraction?: number;
      idempotencyKey: string;
    }>,
    apiKey?: string,
  ) {
    return this.request("POST", "/api/agent/futures/close", { body, apiKey });
  }
  openPmPosition(
    body: TraceableBody<{
      source: string;
      slug: string;
      outcomeExternalMarketId: string;
      // Optional: omitted => yes (the backend default). NO fills at 100 minus the
      // outcome probability and pays out if the outcome resolves false.
      side?: "yes" | "no";
      stakeMusd: number;
      idempotencyKey: string;
      // Optional: the agent's OWN estimated probability (0-100, exclusive) that
      // the chosen side wins. Recorded separately from the market price for the
      // agent's public calibration record. Omit if not forecasting.
      forecastProbability?: number;
      // Optional SELF-REPORTED provenance (WHAT RAN). Sending it (even {}) makes the
      // artifact schemaVersion 2. The server stamps policy versions + providerVerified.
      provenance?: ProvenanceReport;
    }>,
    apiKey?: string,
  ) {
    return this.request("POST", "/api/agent/pm/open", { body, apiKey });
  }

  // Report a NON-opened opportunity (scope: read — it is EVIDENCE, not a trade, so
  // it never moves a wallet or a position). Captures the model ABSTAINING while
  // markets were listed, forecasting WITHOUT trading (forecast_only), or a validated
  // open whose quote EXPIRED at act time (quote_expired), so the public evaluation
  // is not selection-biased toward opened trades. Idempotent by (key, decisionId).
  reportPmOpportunity(
    body: TraceableBody<{
      kind: "abstained" | "forecast_only" | "quote_expired";
      source?: string;
      slug?: string;
      outcomeExternalMarketId?: string;
      // REQUIRED by the server for forecast_only: the agent's OWN probability
      // (1-99) that the chosen side wins. Omit for the other kinds.
      forecastProbability?: number;
      // The market price the agent observed (0-100). Optional.
      marketProbability?: number;
      reasonCode?: string;
      // Cohort breadth — universeSize (how many markets were weighed) + horizon —
      // so one report captures the whole opportunity cohort, never one per market.
      cohort?: { universeSize?: number; horizon?: string };
      // Idempotency key WITHIN this API key (the server dedupes on it). Optional.
      decisionId?: string;
      runId?: string;
      // Optional SELF-REPORTED provenance (WHAT RAN). Sending it (even {}) makes the
      // artifact schemaVersion 2. The server stamps policy versions + providerVerified.
      provenance?: ProvenanceReport;
    }>,
    apiKey?: string,
  ) {
    return this.request("POST", "/api/agent/pm/opportunity", { body, apiKey });
  }
}
