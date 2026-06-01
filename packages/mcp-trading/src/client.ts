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
  // eslint-disable-next-line no-console
  console.error("[coinrithm-mcp]", ...args);
}

export interface ClientConfig {
  // Default key for the single-user stdio path. Omitted in the multi-user HTTP
  // path, where each request supplies its own key as a per-call override.
  apiKey?: string;
  baseUrl: string;
}

function resolveBaseUrl(): string {
  return (process.env.COINRITHM_API_URL?.trim() || DEFAULT_BASE_URL).replace(/\/+$/, "");
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
  // Parsed JSON body when available, else raw text.
  data: unknown;
}

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
    return { ok: res.ok, status: res.status, data };
  }

  // Every method takes an optional trailing `apiKey` (the per-request key for
  // the multi-user HTTP path). When omitted, the constructor key (stdio) is used.

  // ---- reads (scope: read) ----
  whoami(apiKey?: string) {
    return this.request("GET", "/api/agent/me", { apiKey });
  }
  getPortfolio(query?: { fiat?: string; locale?: string }, apiKey?: string) {
    return this.request("GET", "/api/agent/portfolio", { query, apiKey });
  }
  getWallet(query?: { coinId?: string }, apiKey?: string) {
    return this.request("GET", "/api/agent/wallet", { query, apiKey });
  }
  resolveSymbol(query: { q: string }, apiKey?: string) {
    return this.request("GET", "/api/agent/resolve", { query, apiKey });
  }
  getEquityCurve(query?: { days?: number }, apiKey?: string) {
    return this.request("GET", "/api/agent/equity-curve", { query, apiKey });
  }
  listOpenOrders(query: { coinId: string; limit?: number }, apiKey?: string) {
    return this.request("GET", "/api/agent/orders/open", { query, apiKey });
  }
  getFuturesPositions(apiKey?: string) {
    return this.request("GET", "/api/agent/positions/futures", { apiKey });
  }
  getPmPositions(apiKey?: string) {
    return this.request("GET", "/api/agent/positions/pm", { apiKey });
  }
  futuresQuote(
    body: {
      coinId: string;
      side: string;
      leverage: number;
      marginMusd: number;
    },
    apiKey?: string,
  ) {
    return this.request("POST", "/api/agent/futures/quote", { body, apiKey });
  }
  pmQuote(
    body: {
      source: string;
      slug: string;
      outcomeExternalMarketId: string;
      stakeMusd: number;
    },
    apiKey?: string,
  ) {
    return this.request("POST", "/api/agent/pm/quote", { body, apiKey });
  }

  // ---- writes (scope: trade:<venue>) ----
  placeSpotOrder(
    body: {
      coinId: string;
      side: string;
      orderType: string;
      quantity: number;
      limitPrice?: number;
      stopPrice?: number;
    },
    apiKey?: string,
  ) {
    return this.request("POST", "/api/agent/spot/order", { body, apiKey });
  }
  cancelSpotOrder(orderId: number, apiKey?: string) {
    return this.request("POST", `/api/agent/spot/order/${orderId}/cancel`, { apiKey });
  }
  openFuturesPosition(
    body: {
      coinId: string;
      side: string;
      leverage: number;
      marginMusd: number;
      idempotencyKey: string;
    },
    apiKey?: string,
  ) {
    return this.request("POST", "/api/agent/futures/open", { body, apiKey });
  }
  closeFuturesPosition(
    body: {
      positionId: number;
      fraction?: number;
      idempotencyKey: string;
    },
    apiKey?: string,
  ) {
    return this.request("POST", "/api/agent/futures/close", { body, apiKey });
  }
  openPmPosition(
    body: {
      source: string;
      slug: string;
      outcomeExternalMarketId: string;
      stakeMusd: number;
      idempotencyKey: string;
    },
    apiKey?: string,
  ) {
    return this.request("POST", "/api/agent/pm/open", { body, apiKey });
  }
}
