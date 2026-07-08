// Registers the CoinRithm trading tools on an MCP server instance.
//
// Every tool wraps exactly one /api/agent/* call. Tool results return the raw
// JSON body as text so the model sees the real server response (incl. error
// shapes like { error, blockReasons }). HTTP-level failures are surfaced as
// isError results rather than thrown so the model can react.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type {
  ServerNotification,
  ServerRequest,
  ToolAnnotations,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { CoinRithmClient, bearerFromHeader, type ApiResult } from "./client.js";

const PAPER_NOTE =
  "Paper trading only — virtual funds (50,000 mUSD). Not financial advice. " +
  "Paper fills apply a disclosed execution cost folded into realized PnL: " +
  "spot/futures pay a taker fee (spot market orders also pay half-spread + " +
  "slippage); PM fills at the ask with size-based slippage and a Polymarket-" +
  "shaped taker fee, with entryProbability kept at the mid for calibration. " +
  "See the executionModel in quote/trade results — a rehearsal cost, not an " +
  "exchange fill guarantee.";

const API_RESULT_OUTPUT_SCHEMA = {
  httpStatus: z
    .number()
    .int()
    .describe("HTTP status returned by CoinRithm, or 0 for network errors."),
  ok: z
    .boolean()
    .describe("True when CoinRithm returned a successful 2xx response."),
  ledgerEventId: z
    .string()
    .nullable()
    .optional()
    .describe("Private AgentActionEvent id returned by /api/agent/*, when present."),
  ledgerStatus: z
    .string()
    .nullable()
    .optional()
    .describe("Ledger write status header returned by CoinRithm, when present."),
  body: z
    .unknown()
    .describe(
      "Parsed CoinRithm response body, or raw text when the response is not JSON.",
    ),
};

const AGENT_TRACE_SCHEMA = z
  .object({
    runId: z.string().min(1).optional().describe("Agent run id for grouping."),
    decisionId: z
      .string()
      .min(1)
      .optional()
      .describe("Agent decision id for quote/write attribution."),
    strategyLabel: z
      .string()
      .min(1)
      .max(120)
      .optional()
      .describe("Short strategy label, self-reported by the caller."),
    confidence: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .describe("Optional confidence score from 0 to 1."),
    rationaleSummary: z
      .string()
      .min(1)
      .max(1200)
      .optional()
      .describe(
        "Optional concise rationale summary. Do not include chain-of-thought, secrets, or account identity.",
      ),
  })
  .optional()
  .describe("Optional private trace metadata stored in the caller's ledger.");

function readOnlyAnnotations(title: string): ToolAnnotations {
  return {
    title,
    readOnlyHint: true,
    destructiveHint: false,
    openWorldHint: true,
  };
}

function mutatingAnnotations(
  title: string,
  opts: { destructive?: boolean; idempotent?: boolean } = {},
): ToolAnnotations {
  return {
    title,
    readOnlyHint: false,
    destructiveHint: opts.destructive ?? false,
    idempotentHint: opts.idempotent ?? false,
    openWorldHint: true,
  };
}

// The `extra` argument the SDK passes to every tool handler.
type ToolExtra = RequestHandlerExtra<ServerRequest, ServerNotification>;

// Per-request key resolution (multi-user HTTP).
//
// On the Streamable-HTTP transport the SDK surfaces the incoming HTTP request's
// headers on `extra.requestInfo.headers` (StreamableHTTPServerTransport builds
// `requestInfo` from the Node request and threads it through to handlers). We
// read the caller's own `Authorization: Bearer crk_live_…` from there and pass
// it as the per-request key for this one call. Smithery cannot forward the
// reserved Authorization header, so we also accept X-CoinRithm-API-Key.
//
// On the stdio transport there is no HTTP request, so `extra.requestInfo` is
// undefined and this returns undefined — the client then falls back to the
// COINRITHM_API_KEY it was constructed with. `authInfo.token` is also honoured
// in case a future auth middleware populates it.
function requestKey(extra: ToolExtra): string | undefined {
  const fromHeader = bearerFromHeader(
    extra.requestInfo?.headers?.authorization,
  );
  if (fromHeader) return fromHeader;
  const fromSmitheryHeader = bearerFromHeader(
    extra.requestInfo?.headers?.["x-coinrithm-api-key"],
  );
  if (fromSmitheryHeader) return fromSmitheryHeader;
  const token = extra.authInfo?.token?.trim();
  return token || undefined;
}

function present(result: ApiResult) {
  const payload = {
    httpStatus: result.status,
    ok: result.ok,
    ledgerEventId: result.ledgerEventId ?? null,
    ledgerStatus: result.ledgerStatus ?? null,
    body: result.data,
  };
  return {
    content: [
      { type: "text" as const, text: JSON.stringify(payload, null, 2) },
    ],
    structuredContent: payload,
    isError: !result.ok,
  };
}

export function registerTools(
  server: McpServer,
  client: CoinRithmClient,
): void {
  // ---------------- identity ----------------
  server.registerTool(
    "whoami",
    {
      title: "Who am I (CoinRithm)",
      description:
        "Return the identity behind the configured API key: userId, keyId, " +
        "granted scopes, plus the key's agentName and agentModel (both null " +
        "until set in Profile -> API Keys; agentModel is the self-reported " +
        "model/runtime label shown on the public Agent Arena when opted in). " +
        "Use this first to confirm what the key is allowed to do. " +
        PAPER_NOTE,
      inputSchema: {
        agentTrace: AGENT_TRACE_SCHEMA,
      },
      outputSchema: API_RESULT_OUTPUT_SCHEMA,
      annotations: readOnlyAnnotations("Who am I (CoinRithm)"),
    },
    async ({ agentTrace }, extra) =>
      present(await client.whoami(requestKey(extra), agentTrace)),
  );

  // ---------------- reads ----------------
  server.registerTool(
    "get_portfolio",
    {
      title: "Get portfolio",
      description:
        "Get the lean, PII-free paper account summary: walletId, equity " +
        "(equity.totalUsd plus available/frozen/frozenPm/frozenFutures/" +
        "cashTotal cash partitions), period PnL (pnl.24hUsd … allTimePct), " +
        "open spot orders, and a progression block (league/XP). " +
        PAPER_NOTE,
      inputSchema: {
        fiat: z
          .string()
          .optional()
          .describe(
            "Display fiat code (default USD). Equity stays USD-denominated.",
          ),
        locale: z.string().optional().describe("Locale (default en)."),
        agentTrace: AGENT_TRACE_SCHEMA,
      },
      outputSchema: API_RESULT_OUTPUT_SCHEMA,
      annotations: readOnlyAnnotations("Get portfolio"),
    },
    async ({ fiat, locale, agentTrace }, extra) =>
      present(
        await client.getPortfolio({ fiat, locale }, requestKey(extra), agentTrace),
      ),
  );

  server.registerTool(
    "get_wallet",
    {
      title: "Get wallet",
      description:
        "Get raw cash balances: USDT available plus the three frozen partitions " +
        "(frozen = spot orders, frozenPm = PM, frozenFutures = futures margin). " +
        "Optionally include one coin asset. " +
        PAPER_NOTE,
      inputSchema: {
        coinId: z
          .string()
          .optional()
          .describe('Coin UCID (e.g. "1" = BTC) to also return that asset.'),
        agentTrace: AGENT_TRACE_SCHEMA,
      },
      outputSchema: API_RESULT_OUTPUT_SCHEMA,
      annotations: readOnlyAnnotations("Get wallet"),
    },
    async ({ coinId, agentTrace }, extra) =>
      present(await client.getWallet({ coinId }, requestKey(extra), agentTrace)),
  );

  server.registerTool(
    "list_open_orders",
    {
      title: "List open spot orders",
      description:
        "List open (resting) spot orders. Omit coinId for ALL open orders " +
        "across coins, or pass one to filter. Response includes asOf — pass it " +
        "back as updatedSince on the next call to poll only rows that changed " +
        "(delta polling). " +
        PAPER_NOTE,
      inputSchema: {
        coinId: z
          .string()
          .min(1)
          .optional()
          .describe("Coin UCID filter. Omit to list ALL open orders."),
        limit: z
          .number()
          .int()
          .min(1)
          .max(200)
          .optional()
          .describe("Max rows (1-200, default 100)."),
        updatedSince: z
          .string()
          .optional()
          .describe(
            "ISO 8601 cursor: only orders whose row changed since this " +
              "instant. Pass the previous response's asOf back here.",
          ),
        agentTrace: AGENT_TRACE_SCHEMA,
      },
      outputSchema: API_RESULT_OUTPUT_SCHEMA,
      annotations: readOnlyAnnotations("List open spot orders"),
    },
    async ({ coinId, limit, updatedSince, agentTrace }, extra) =>
      present(
        await client.listOpenOrders(
          { coinId, limit, updatedSince },
          requestKey(extra),
          agentTrace,
        ),
      ),
  );

  server.registerTool(
    "get_positions",
    {
      title: "Get positions",
      description:
        "List open + historical positions for a venue. venue='futures' returns " +
        "mock futures positions (with unrealized PnL + liquidation distance on " +
        "open ones); venue='pm' returns mock prediction-market positions (with " +
        "unrealized mark on open ones). Response includes asOf — pass it back " +
        "as updatedSince on the next call to poll only positions that changed " +
        "(catches worker-fired SL/TP, liquidations, and settlements). " +
        PAPER_NOTE,
      inputSchema: {
        venue: z
          .enum(["futures", "pm"])
          .describe("Which venue's positions to list."),
        updatedSince: z
          .string()
          .optional()
          .describe(
            "ISO 8601 cursor: only positions whose row changed since this " +
              "instant. Pass the previous response's asOf back here.",
          ),
        agentTrace: AGENT_TRACE_SCHEMA,
      },
      outputSchema: API_RESULT_OUTPUT_SCHEMA,
      annotations: readOnlyAnnotations("Get positions"),
    },
    async ({ venue, updatedSince, agentTrace }, extra) =>
      present(
        venue === "futures"
          ? await client.getFuturesPositions(
              { updatedSince },
              requestKey(extra),
              agentTrace,
            )
          : await client.getPmPositions(
              { updatedSince },
              requestKey(extra),
              agentTrace,
            ),
      ),
  );

  server.registerTool(
    "resolve_symbol",
    {
      title: "Resolve symbol -> coinId",
      description:
        "Resolve a human symbol / slug / name (e.g. 'BTC', 'ethereum') to a " +
        "CoinRithm coinId (UCID) plus disambiguating alternatives, each with its " +
        "CoinGecko category tags. Use this FIRST to get the coinId that the " +
        "wallet / quote / order tools need — don't guess UCIDs (symbols are not " +
        "unique). " +
        PAPER_NOTE,
      inputSchema: {
        q: z
          .string()
          .min(1)
          .describe("Symbol, slug, or name (e.g. BTC, bitcoin, Ethereum)."),
        agentTrace: AGENT_TRACE_SCHEMA,
      },
      outputSchema: API_RESULT_OUTPUT_SCHEMA,
      annotations: readOnlyAnnotations("Resolve symbol to coinId"),
    },
    async ({ q, agentTrace }, extra) =>
      present(await client.resolveSymbol({ q }, requestKey(extra), agentTrace)),
  );

  server.registerTool(
    "get_equity_curve",
    {
      title: "Get equity curve",
      description:
        "Wallet equity time series for the paper account — the basis for " +
        "reviewing performance over time and narrating results. " +
        "granularity='daily' (default) returns one {date, usdValue} point per " +
        "day; granularity='realized' returns an intraday point per realized-" +
        "PnL event (spot sells, futures closes/liquidations, PM settlements) " +
        "with a cumulative running total — use it for active intraday agents. " +
        "days = look-back window (1-365, default 30). " +
        PAPER_NOTE,
      inputSchema: {
        days: z
          .number()
          .int()
          .min(1)
          .max(365)
          .optional()
          .describe("Look-back window in days (1-365, default 30)."),
        granularity: z
          .enum(["daily", "realized"])
          .optional()
          .describe(
            "daily (default) = one point per day; realized = intraday point " +
              "per realized-PnL event with cumulative total.",
          ),
        agentTrace: AGENT_TRACE_SCHEMA,
      },
      outputSchema: API_RESULT_OUTPUT_SCHEMA,
      annotations: readOnlyAnnotations("Get equity curve"),
    },
    async ({ days, granularity, agentTrace }, extra) =>
      present(
        await client.getEquityCurve(
          { days, granularity },
          requestKey(extra),
          agentTrace,
        ),
      ),
  );

  server.registerTool(
    "get_my_trades",
    {
      title: "Get my trades",
      description:
        "Unified realized-PnL log of CLOSED trades across venues (spot fills, " +
        "closed/liquidated futures, settled prediction-markets), most-recent " +
        "first — the agent's memory of what it did and what won/lost. Use it to " +
        "review performance before deciding the next move. Response includes " +
        "asOf — pass it back as updatedSince on the next call to fetch only " +
        "NEW closes since your last poll (how you discover worker-fired " +
        "stop-loss/take-profit, liquidations, and PM settlements). " +
        PAPER_NOTE,
      inputSchema: {
        venue: z
          .enum(["all", "spot", "futures", "pm"])
          .optional()
          .describe("Filter by venue (default all)."),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe("Max rows (1-100, default 25)."),
        updatedSince: z
          .string()
          .optional()
          .describe(
            "ISO 8601 cursor: only trades closed/settled since this instant. " +
              "Pass the previous response's asOf back here.",
          ),
        agentTrace: AGENT_TRACE_SCHEMA,
      },
      outputSchema: API_RESULT_OUTPUT_SCHEMA,
      annotations: readOnlyAnnotations("Get my trades"),
    },
    async ({ venue, limit, updatedSince, agentTrace }, extra) =>
      present(
        await client.getMyTrades(
          { venue, limit, updatedSince },
          requestKey(extra),
          agentTrace,
        ),
      ),
  );

  server.registerTool(
    "get_market_context",
    {
      title: "Get market context",
      description:
        "Compact factual context for ONE coin to form a thesis: price + " +
        "1h/24h/7d change + market cap, the coin's CoinGecko category tags, " +
        "per-coin sentiment votes, the global Fear & Greed value, up to 3 " +
        "directly-related OPEN prediction markets — each with its leading " +
        "outcome + probability, 24h volume, liquidity, and decisionSupport " +
        "(quality/liquidity/volume/spread tiers + flags) so you can gauge a " +
        "market's depth/tradability — and up to 6 similar coins (shared category " +
        "/ market-cap peers). Facts only — no generated thesis. Call " +
        "resolve_symbol first to get the coinId. " +
        PAPER_NOTE,
      inputSchema: {
        coinId: z
          .string()
          .min(1)
          .describe(
            'Coin UCID (e.g. "1" = BTC). Use resolve_symbol to find it.',
          ),
        agentTrace: AGENT_TRACE_SCHEMA,
      },
      outputSchema: API_RESULT_OUTPUT_SCHEMA,
      annotations: readOnlyAnnotations("Get market context"),
    },
    async ({ coinId, agentTrace }, extra) =>
      present(
        await client.getMarketContext(coinId, requestKey(extra), agentTrace),
      ),
  );

  server.registerTool(
    "get_candles",
    {
      title: "Get OHLCV candles",
      description:
        "OHLCV candles for indicator/momentum strategies (RSI, moving " +
        "averages, breakouts) — resolve_symbol first to get the coinId. " +
        "range picks both the lookback and the per-candle resolution: " +
        "1H=60x1-minute, 1D=288x5-minute, 1W=672x15-minute, 1M=720x1-hour, " +
        "3M=540x4-hour candles. Candles are oldest to newest with t in unix " +
        "SECONDS; o/h/l/c in fiat (default USD), v always in USD. " +
        PAPER_NOTE,
      inputSchema: {
        coinId: z
          .string()
          .min(1)
          .describe(
            'Coin UCID (e.g. "1" = BTC). Use resolve_symbol to find it.',
          ),
        range: z
          .enum(["1H", "1D", "1W", "1M", "3M"])
          .optional()
          .describe(
            "Lookback + resolution (default 1D = 288 five-minute candles).",
          ),
        fiat: z
          .string()
          .optional()
          .describe("Quote currency for o/h/l/c (default USD)."),
        agentTrace: AGENT_TRACE_SCHEMA,
      },
      outputSchema: API_RESULT_OUTPUT_SCHEMA,
      annotations: readOnlyAnnotations("Get OHLCV candles"),
    },
    async ({ coinId, range, fiat, agentTrace }, extra) =>
      present(
        await client.getCandles(
          coinId,
          { range, fiat },
          requestKey(extra),
          agentTrace,
        ),
      ),
  );

  server.registerTool(
    "discover_pm_markets",
    {
      title: "Discover prediction markets",
      description:
        "Find active-open, quote-ready-first prediction markets on the mock-PM " +
        "sources (Kalshi + Polymarket by default). Returns source, slug, " +
        "quoteable outcome externalMarketIds, freshness, volume/liquidity/spread, " +
        "and decisionSupport. This is discovery only — call pm_quote with one " +
        "returned outcomeExternalMarketId before open_pm_position because pm_quote " +
        "is the final eligibility source. " +
        PAPER_NOTE,
      inputSchema: {
        q: z
          .string()
          .optional()
          .describe(
            "Optional search text (title, outcome, topic, or related coin).",
          ),
        source: z
          .enum(["all", "kalshi", "polymarket"])
          .optional()
          .describe("Source filter (default all = Kalshi + Polymarket)."),
        limit: z
          .number()
          .int()
          .min(1)
          .max(50)
          .optional()
          .describe("Max rows (1-50, default 20)."),
        offset: z
          .number()
          .int()
          .min(0)
          .optional()
          .describe("Pagination offset (default 0)."),
        sort: z
          .enum([
            "best",
            "volume24h_desc",
            "priceChange24h_desc",
            "priceChange24h_asc",
            "endDate_desc",
            "trending",
          ])
          .optional()
          .describe("Prediction-market sort (default best)."),
        agentTrace: AGENT_TRACE_SCHEMA,
      },
      outputSchema: API_RESULT_OUTPUT_SCHEMA,
      annotations: readOnlyAnnotations("Discover prediction markets"),
    },
    async ({ q, source, limit, offset, sort, agentTrace }, extra) =>
      present(
        await client.discoverPmMarkets(
          { q, source, limit, offset, sort },
          requestKey(extra),
          agentTrace,
        ),
      ),
  );

  server.registerTool(
    "get_performance",
    {
      title: "Get my performance",
      description:
        "The calling key's own realized performance: total + per-venue realized " +
        "PnL (mUSD), trade count, win/loss/neutral counts, and win rate (null " +
        "until there are decided trades). Closed trades only — the scorecard for " +
        "this agent. " +
        PAPER_NOTE,
      inputSchema: {
        agentTrace: AGENT_TRACE_SCHEMA,
      },
      outputSchema: API_RESULT_OUTPUT_SCHEMA,
      annotations: readOnlyAnnotations("Get my performance"),
    },
    async ({ agentTrace }, extra) =>
      present(await client.getPerformance(requestKey(extra), agentTrace)),
  );

  server.registerTool(
    "get_agent_ledger",
    {
      title: "Get private agent ledger",
      description:
        "List this API key's private execution ledger: reads, quotes, writes, " +
        "rejects, idempotent replays, latency, sanitized summaries, and optional " +
        "run/decision trace metadata. Only rows for the calling key are returned. " +
        "Use this to audit a reproducible paper-trading run. " +
        PAPER_NOTE,
      inputSchema: {
        venue: z.string().optional().describe("Optional venue filter."),
        eventType: z.string().optional().describe("Optional event type filter."),
        runId: z.string().optional().describe("Optional run id filter."),
        decisionId: z
          .string()
          .optional()
          .describe("Optional decision id filter."),
        status: z
          .string()
          .optional()
          .describe("Optional ledgerStatus filter."),
        from: z.string().optional().describe("Optional ISO start timestamp."),
        to: z.string().optional().describe("Optional ISO end timestamp."),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe("Rows to return (1-100, default 25)."),
        offset: z
          .number()
          .int()
          .min(0)
          .optional()
          .describe("Pagination offset (default 0)."),
        agentTrace: AGENT_TRACE_SCHEMA,
      },
      outputSchema: API_RESULT_OUTPUT_SCHEMA,
      annotations: readOnlyAnnotations("Get private agent ledger"),
    },
    async (
      {
        venue,
        eventType,
        runId,
        decisionId,
        status,
        from,
        to,
        limit,
        offset,
        agentTrace,
      },
      extra,
    ) =>
      present(
        await client.getLedger(
          { venue, eventType, runId, decisionId, status, from, to, limit, offset },
          requestKey(extra),
          agentTrace,
        ),
      ),
  );

  server.registerTool(
    "export_agent_ledger",
    {
      title: "Export private agent ledger",
      description:
        "Export up to 1,000 private ledger rows for the calling API key as JSON. " +
        "Use filters to export a specific runId or decisionId for reproducible " +
        "evaluation. No public Arena user can see this data. " +
        PAPER_NOTE,
      inputSchema: {
        venue: z.string().optional().describe("Optional venue filter."),
        eventType: z.string().optional().describe("Optional event type filter."),
        runId: z.string().optional().describe("Optional run id filter."),
        decisionId: z
          .string()
          .optional()
          .describe("Optional decision id filter."),
        status: z
          .string()
          .optional()
          .describe("Optional ledgerStatus filter."),
        from: z.string().optional().describe("Optional ISO start timestamp."),
        to: z.string().optional().describe("Optional ISO end timestamp."),
        agentTrace: AGENT_TRACE_SCHEMA,
      },
      outputSchema: API_RESULT_OUTPUT_SCHEMA,
      annotations: readOnlyAnnotations("Export private agent ledger"),
    },
    async (
      { venue, eventType, runId, decisionId, status, from, to, agentTrace },
      extra,
    ) =>
      present(
        await client.exportLedger(
          { venue, eventType, runId, decisionId, status, from, to },
          requestKey(extra),
          agentTrace,
        ),
      ),
  );

  server.registerTool(
    "export_run_evidence",
    {
      title: "Export run evidence",
      description:
        "Export one private reproducibility bundle for a specific agentTrace.runId. " +
        "The bundle includes sanitized ledger rows, execution assumptions, " +
        "retention policy, outcome attribution, and the evidence checklist. " +
        "No public Arena user can see this data. " +
        PAPER_NOTE,
      inputSchema: {
        runId: z.string().min(1).describe("Required run id to export."),
        agentTrace: AGENT_TRACE_SCHEMA,
      },
      outputSchema: API_RESULT_OUTPUT_SCHEMA,
      annotations: readOnlyAnnotations("Export run evidence"),
    },
    async ({ runId, agentTrace }, extra) =>
      present(
        await client.exportLedger({ runId }, requestKey(extra), agentTrace),
      ),
  );

  server.registerTool(
    "get_arena_leaderboard",
    {
      title: "Get Agent Arena leaderboard",
      description:
        "The public Agent Arena: opted-in agents ranked by total realized PnL " +
        "(mUSD) across spot, futures, and prediction markets, with per-venue " +
        "breakdown and win rate. Only agents with at least minDecidedTrades " +
        "decided (win+loss) trades rank (currently 3 — echoed in the " +
        "response); demo/house agents seed the board until live agents " +
        "qualify. Rows also carry a 44-day sparkline, badges, rankDelta, " +
        "biggestWinMusd, and the self-reported model label. Pass " +
        "window='7d'|'30d' for the weekly/monthly board — re-ranked by PnL " +
        "realized inside the window (badges/biggestWin and the min-decided " +
        "gate stay all-time). Use it to see the field and where you stand — pair " +
        "with get_performance (your own scorecard) and get_arena_agent (drill " +
        "into one handle). Public data: agent names + performance only. " +
        PAPER_NOTE,
      inputSchema: {
        page: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe("Page number (1-100, default 1)."),
        pageSize: z
          .number()
          .int()
          .min(1)
          .max(50)
          .optional()
          .describe("Rows per page (1-50, default 12)."),
        window: z
          .enum(["7d", "30d", "all"])
          .optional()
          .describe(
            "Ranking window (default all = all-time). 7d/30d re-rank by " +
              "in-window realized PnL; counts/winRate/sparkline become " +
              "window-scoped.",
          ),
      },
      outputSchema: API_RESULT_OUTPUT_SCHEMA,
      annotations: readOnlyAnnotations("Get Agent Arena leaderboard"),
    },
    async ({ page, pageSize, window }, extra) =>
      present(
        await client.getArenaLeaderboard(
          { page, pageSize, window },
          requestKey(extra),
        ),
      ),
  );

  server.registerTool(
    "get_arena_agent",
    {
      title: "Get Agent Arena profile",
      description:
        "One agent's public Arena profile by handle (the `handle` field from " +
        "get_arena_leaderboard, e.g. 'a42-momentum-scout'): rank, total + " +
        "per-venue realized PnL, decided/total trade counts, and win rate. " +
        "Public data only — no account or key identity. " +
        PAPER_NOTE,
      inputSchema: {
        handle: z
          .string()
          .min(1)
          .describe(
            "Arena handle from the leaderboard (e.g. a42-momentum-scout).",
          ),
      },
      outputSchema: API_RESULT_OUTPUT_SCHEMA,
      annotations: readOnlyAnnotations("Get Agent Arena profile"),
    },
    async ({ handle }, extra) =>
      present(await client.getArenaAgent(handle, requestKey(extra))),
  );

  // ---------------- quotes (read scope, read-only) ----------------
  server.registerTool(
    "futures_quote",
    {
      title: "Futures quote",
      description:
        "Read-only futures quote: entry price, notional, size, liquidation price, " +
        "and eligibility. Never mutates state — always quote before opening. " +
        "leverage 1-20, marginMusd >= 10. " +
        PAPER_NOTE,
      inputSchema: {
        coinId: z.string().describe("Coin UCID."),
        side: z
          .enum(["long", "short"])
          .describe(
            "Futures direction: long benefits if price rises; short benefits if price falls.",
          ),
        leverage: z.number().min(1).max(20).describe("1-20x."),
        marginMusd: z
          .number()
          .min(10)
          .describe("Isolated margin in mUSD (>= 10)."),
        agentTrace: AGENT_TRACE_SCHEMA,
      },
      outputSchema: API_RESULT_OUTPUT_SCHEMA,
      annotations: readOnlyAnnotations("Futures quote"),
    },
    async ({ coinId, side, leverage, marginMusd, agentTrace }, extra) =>
      present(
        await client.futuresQuote(
          { coinId, side, leverage, marginMusd, agentTrace },
          requestKey(extra),
        ),
      ),
  );

  server.registerTool(
    "pm_quote",
    {
      title: "Prediction-market quote",
      description:
        "Read-only PM quote for a binary outcome: entry probability, share " +
        "estimate, max payout, eligibility, freshness, and decisionSupport " +
        "(market quality/liquidity/volume/spread tiers + flags) so you can " +
        "quote and gauge tradability in one call. Never mutates state. " +
        "stakeMusd must be > 0 (min to open is 10). Pass side: 'no' to quote " +
        "backing the NO side (omitted = yes); a NO entry fills at 100 minus the " +
        "outcome probability and pays out if the outcome resolves false. " +
        PAPER_NOTE,
      inputSchema: {
        source: z.string().describe("Source slug (e.g. kalshi, polymarket)."),
        slug: z.string().describe("Event slug."),
        outcomeExternalMarketId: z
          .string()
          .describe("Case-sensitive outcome / market id."),
        side: z
          .enum(["yes", "no"])
          .optional()
          .describe(
            "Which side of the binary outcome to back. NO pays out if it " +
              "resolves false; fills at 100 minus the outcome probability. " +
              "Omitted = yes.",
          ),
        stakeMusd: z.number().positive().describe("mUSD to stake (> 0)."),
        agentTrace: AGENT_TRACE_SCHEMA,
      },
      outputSchema: API_RESULT_OUTPUT_SCHEMA,
      annotations: readOnlyAnnotations("Prediction-market quote"),
    },
    async (
      { source, slug, outcomeExternalMarketId, side, stakeMusd, agentTrace },
      extra,
    ) =>
      present(
        await client.pmQuote(
          { source, slug, outcomeExternalMarketId, side, stakeMusd, agentTrace },
          requestKey(extra),
        ),
      ),
  );

  server.registerTool(
    "spot_quote",
    {
      title: "Spot quote",
      description:
        "Read-only spot MARKET quote: live execution price, estimated cost " +
        "(price x quantity), your available balance for the side, and whether " +
        "the fill is eligible (with blockReasons). Never mutates state — quote " +
        "before place_spot_order instead of buying/selling blind. Price age is " +
        "informational only (a market order fills regardless). coinId is a UCID, " +
        "NOT a ticker — use resolve_symbol first. " +
        PAPER_NOTE,
      inputSchema: {
        coinId: z.string().describe("Coin UCID (e.g. '1' = BTC)."),
        side: z
          .enum(["buy", "sell"])
          .describe("Spot side: buy increases the coin balance; sell reduces it."),
        quantity: z
          .number()
          .positive()
          .describe("Amount of the base coin (> 0)."),
        agentTrace: AGENT_TRACE_SCHEMA,
      },
      outputSchema: API_RESULT_OUTPUT_SCHEMA,
      annotations: readOnlyAnnotations("Spot quote"),
    },
    async ({ coinId, side, quantity, agentTrace }, extra) =>
      present(
        await client.spotQuote(
          { coinId, side, quantity, agentTrace },
          requestKey(extra),
        ),
      ),
  );

  // ---------------- writes ----------------
  server.registerTool(
    "place_spot_order",
    {
      title: "Place spot order",
      description:
        "Place a paper spot order. coinId is a coin UCID, NOT a ticker. " +
        "orderType market/limit/stop. limitPrice required for limit & stop; " +
        "stopPrice required for stop. idempotencyKey is REQUIRED and unique " +
        "per intent (reuse replays the original result — retry a timed-out " +
        "call with the SAME key; it will never double-execute). Requires the " +
        "trade:spot scope. CONFIRM with the user before calling. " +
        PAPER_NOTE,
      inputSchema: {
        coinId: z.string().describe('Coin UCID (e.g. "1" = BTC).'),
        side: z
          .enum(["buy", "sell"])
          .describe("Spot side: buy spends USDT; sell spends the base coin."),
        orderType: z
          .enum(["market", "limit", "stop"])
          .describe("Order execution type: market, limit, or stop."),
        quantity: z.number().positive().describe("Base-coin amount (> 0)."),
        limitPrice: z
          .number()
          .positive()
          .optional()
          .describe("USD/coin — required for limit & stop."),
        stopPrice: z
          .number()
          .positive()
          .optional()
          .describe("USD trigger — required for stop."),
        idempotencyKey: z
          .string()
          .min(1)
          .describe("Unique per intent; reuse replays the original result."),
        agentTrace: AGENT_TRACE_SCHEMA,
      },
      outputSchema: API_RESULT_OUTPUT_SCHEMA,
      annotations: mutatingAnnotations("Place spot order"),
    },
    async (
      {
        coinId,
        side,
        orderType,
        quantity,
        limitPrice,
        stopPrice,
        idempotencyKey,
        agentTrace,
      },
      extra,
    ) =>
      present(
        await client.placeSpotOrder(
          {
            coinId,
            side,
            orderType,
            quantity,
            limitPrice,
            stopPrice,
            idempotencyKey,
            agentTrace,
          },
          requestKey(extra),
        ),
      ),
  );

  server.registerTool(
    "cancel_spot_order",
    {
      title: "Cancel spot order",
      description:
        "Cancel an open spot order by id (releases frozen funds). Requires the " +
        "trade:spot scope. " +
        PAPER_NOTE,
      inputSchema: {
        orderId: z.number().int().positive().describe("Open order id."),
        agentTrace: AGENT_TRACE_SCHEMA,
      },
      outputSchema: API_RESULT_OUTPUT_SCHEMA,
      annotations: mutatingAnnotations("Cancel spot order", {
        destructive: true,
      }),
    },
    async ({ orderId, agentTrace }, extra) =>
      present(
        await client.cancelSpotOrder(orderId, requestKey(extra), agentTrace),
      ),
  );

  server.registerTool(
    "open_futures_position",
    {
      title: "Open futures position",
      description:
        "Open (or add to) a mock futures position. Requires the trade:futures " +
        "scope. Enabled now (server-flag gated — returns 403 'not enabled' only " +
        "if CoinRithm later disables it). idempotencyKey is REQUIRED and must be " +
        "unique per intent. leverage 1-20, marginMusd >= 10. Optionally set " +
        "stopLossPrice/takeProfitPrice atomically at open (side-aware corridor: " +
        "long needs liq < SL < mark < TP; short inverted) — protecting every " +
        "position is good practice. Quote first and CONFIRM with the user. " +
        PAPER_NOTE,
      inputSchema: {
        coinId: z
          .string()
          .describe("Coin UCID to open futures for. Use resolve_symbol first."),
        side: z
          .enum(["long", "short"])
          .describe(
            "Futures direction: long benefits if price rises; short benefits if price falls.",
          ),
        leverage: z
          .number()
          .min(1)
          .max(20)
          .describe("Leverage multiplier (1-20x)."),
        marginMusd: z
          .number()
          .min(10)
          .describe("Isolated margin in mUSD (>= 10)."),
        idempotencyKey: z
          .string()
          .min(1)
          .describe("Unique per intent; reuse replays the original result."),
        stopLossPrice: z
          .number()
          .positive()
          .optional()
          .describe(
            "Optional resting stop-loss set atomically at open (USD trigger; " +
              "fired by the per-minute worker).",
          ),
        takeProfitPrice: z
          .number()
          .positive()
          .optional()
          .describe(
            "Optional resting take-profit set atomically at open (USD " +
              "trigger; fired by the per-minute worker).",
          ),
        agentTrace: AGENT_TRACE_SCHEMA,
      },
      outputSchema: API_RESULT_OUTPUT_SCHEMA,
      annotations: mutatingAnnotations("Open futures position", {
        idempotent: true,
      }),
    },
    async (
      {
        coinId,
        side,
        leverage,
        marginMusd,
        idempotencyKey,
        stopLossPrice,
        takeProfitPrice,
        agentTrace,
      },
      extra,
    ) =>
      present(
        await client.openFuturesPosition(
          {
            coinId,
            side,
            leverage,
            marginMusd,
            idempotencyKey,
            ...(stopLossPrice !== undefined ? { stopLossPrice } : {}),
            ...(takeProfitPrice !== undefined ? { takeProfitPrice } : {}),
            agentTrace,
          },
          requestKey(extra),
        ),
      ),
  );

  server.registerTool(
    "set_futures_sl_tp",
    {
      title: "Set futures stop-loss / take-profit",
      description:
        "Set or clear resting stop-loss / take-profit triggers on an OPEN mock " +
        "futures position. A positive number SETS that trigger (side-aware: " +
        "long needs liq < SL < mark < TP; short inverted), null CLEARS it, an " +
        "omitted field is unchanged. Fired by the per-minute worker off the " +
        "live mark (liquidation always takes precedence); a fire closes the " +
        "FULL position at mark with realized PnL. Discover fills between polls " +
        "via my_trades with updatedSince. Requires the trade:futures scope. " +
        PAPER_NOTE,
      inputSchema: {
        positionId: z
          .number()
          .int()
          .positive()
          .describe("Open futures position id."),
        stopLossPrice: z
          .number()
          .positive()
          .nullable()
          .optional()
          .describe("Positive number sets; null clears; omit = unchanged."),
        takeProfitPrice: z
          .number()
          .positive()
          .nullable()
          .optional()
          .describe("Positive number sets; null clears; omit = unchanged."),
        agentTrace: AGENT_TRACE_SCHEMA,
      },
      outputSchema: API_RESULT_OUTPUT_SCHEMA,
      annotations: mutatingAnnotations("Set futures SL/TP", {
        idempotent: true,
      }),
    },
    async ({ positionId, stopLossPrice, takeProfitPrice, agentTrace }, extra) =>
      present(
        await client.setFuturesSlTp(
          {
            positionId,
            ...(stopLossPrice !== undefined ? { stopLossPrice } : {}),
            ...(takeProfitPrice !== undefined ? { takeProfitPrice } : {}),
            agentTrace,
          },
          requestKey(extra),
        ),
      ),
  );

  server.registerTool(
    "close_futures_position",
    {
      title: "Close futures position",
      description:
        "Close or partially reduce a mock futures position. fraction in (0,1] " +
        "reduces partially; omit (or 1) for a full close. idempotencyKey is " +
        "REQUIRED. Requires the trade:futures scope. " +
        PAPER_NOTE,
      inputSchema: {
        positionId: z
          .number()
          .int()
          .positive()
          .describe("Open futures position id to close or reduce."),
        fraction: z
          .number()
          .gt(0)
          .lte(1)
          .optional()
          .describe("(0,1] portion to close; omit/1 = full close."),
        idempotencyKey: z
          .string()
          .min(1)
          .describe("Unique per close intent; reuse replays the original result."),
        agentTrace: AGENT_TRACE_SCHEMA,
      },
      outputSchema: API_RESULT_OUTPUT_SCHEMA,
      annotations: mutatingAnnotations("Close futures position", {
        destructive: true,
        idempotent: true,
      }),
    },
    async ({ positionId, fraction, idempotencyKey, agentTrace }, extra) =>
      present(
        await client.closeFuturesPosition(
          { positionId, fraction, idempotencyKey, agentTrace },
          requestKey(extra),
        ),
      ),
  );

  server.registerTool(
    "open_pm_position",
    {
      title: "Open prediction-market position",
      description:
        "Open a mock prediction-market position (binary outcomes only). Requires " +
        "the trade:pm scope. Enabled now (server-flag gated — returns 403 'not " +
        "enabled' only if CoinRithm later disables it). idempotencyKey is " +
        "REQUIRED. stakeMusd >= 10. Pass side: 'no' to back the NO side (omitted " +
        "= yes); a NO entry fills at 100 minus the outcome probability and pays " +
        "out if the outcome resolves false. Quote first and CONFIRM with the user. " +
        PAPER_NOTE,
      inputSchema: {
        source: z
          .string()
          .describe("Prediction-market source slug, e.g. kalshi or polymarket."),
        slug: z.string().describe("Prediction-market event slug."),
        outcomeExternalMarketId: z
          .string()
          .describe("Case-sensitive outcome or market id returned by discovery."),
        side: z
          .enum(["yes", "no"])
          .optional()
          .describe(
            "Which side of the binary outcome to back. NO pays out if it " +
              "resolves false; fills at 100 minus the outcome probability. " +
              "Omitted = yes.",
          ),
        stakeMusd: z.number().min(10).describe("mUSD stake (>= 10)."),
        idempotencyKey: z
          .string()
          .min(1)
          .describe("Unique per PM-open intent; reuse replays the original result."),
        agentTrace: AGENT_TRACE_SCHEMA,
      },
      outputSchema: API_RESULT_OUTPUT_SCHEMA,
      annotations: mutatingAnnotations("Open prediction-market position", {
        idempotent: true,
      }),
    },
    async (
      {
        source,
        slug,
        outcomeExternalMarketId,
        side,
        stakeMusd,
        idempotencyKey,
        agentTrace,
      },
      extra,
    ) =>
      present(
        await client.openPmPosition(
          {
            source,
            slug,
            outcomeExternalMarketId,
            side,
            stakeMusd,
            idempotencyKey,
            agentTrace,
          },
          requestKey(extra),
        ),
      ),
  );

  // ---- Public cross-venue PM data (no API key required) ----
  // These wrap the free /api/prediction-markets/* endpoints — CoinRithm's
  // citable cross-venue dataset. They never attach the caller's key.

  server.registerTool(
    "pm_data_overview",
    {
      title: "Cross-venue prediction-market statistics",
      description:
        "Free public cross-venue prediction-market statistics: total/open/" +
        "closed market counts, total volume, 24h volume, and liquidity " +
        "aggregated across all eight venues (Polymarket, Kalshi, Rothera, " +
        "Limitless, Smarkets, Manifold, Metaculus, PredictIt), plus market " +
        "highlights. Freshness is SOURCE-AWARE — each venue ingests " +
        "independently; per-venue health (freshness tier, lag, stale reason) " +
        "is at /api/prediction-markets/sources/health. Volume is " +
        "reported on each venue's own basis (see the methodology at " +
        "https://coinrithm.com/en/prediction-markets/stats) and monetary " +
        "totals cover real-money venues only — these are self-computed " +
        "aggregates, so cite CoinRithm when quoting them. No API key required.",
      inputSchema: {
        fiat: z
          .string()
          .optional()
          .describe("Fiat currency code for monetary figures (default usd)."),
      },
      outputSchema: API_RESULT_OUTPUT_SCHEMA,
      annotations: readOnlyAnnotations(
        "Cross-venue prediction-market statistics",
      ),
    },
    async ({ fiat }) => present(await client.getPublicPmOverview({ fiat })),
  );

  server.registerTool(
    "pm_data_events",
    {
      title: "Search prediction markets across all venues",
      description:
        "Free public search over prediction-market events across ALL eight " +
        "venues (Polymarket, Kalshi, Rothera, Limitless, Smarkets, " +
        "Manifold, Metaculus, PredictIt) — broader than discover_pm_markets, which is " +
        "scoped to the paper-tradeable venues. Returns titles, probabilities, " +
        "volume/liquidity, status, and source per event, plus " +
        "referenceProbability when present (CoinRithm's canonical cross-venue " +
        "number for open events matched across venues — probability, " +
        "venueCount, spreadPoints, and outcomeName for multi-outcome " +
        "leaders). Research/data only: to trade, use discover_pm_markets + " +
        "pm_quote instead. No API key required.",
      inputSchema: {
        q: z.string().optional().describe("Optional search text."),
        source: z
          .string()
          .optional()
          .describe(
            "Optional venue filter: polymarket, kalshi, metaculus, predictit, " +
              "limitless, manifold, or smarkets.",
          ),
        status: z
          .string()
          .optional()
          .describe("Optional status filter (e.g. open or closed)."),
        sort: z.string().optional().describe("Optional sort key."),
        limit: z
          .number()
          .int()
          .min(1)
          .max(50)
          .optional()
          .describe("Max rows (1-50, default 20)."),
        offset: z
          .number()
          .int()
          .min(0)
          .optional()
          .describe("Pagination offset (default 0)."),
        fiat: z
          .string()
          .optional()
          .describe("Fiat currency code for monetary figures (default usd)."),
      },
      outputSchema: API_RESULT_OUTPUT_SCHEMA,
      annotations: readOnlyAnnotations(
        "Search prediction markets across all venues",
      ),
    },
    async ({ q, source, status, sort, limit, offset, fiat }) =>
      present(
        await client.listPublicPmEvents({
          q,
          source,
          status,
          sort,
          limit,
          offset,
          fiat,
        }),
      ),
  );

  server.registerTool(
    "pm_data_event",
    {
      title: "Get full prediction-market event detail",
      description:
        "Free public detail for one prediction-market event by venue + slug: " +
        "outcomes with probabilities, price snapshots, resolution evidence, " +
        "crossSourceMatches (the SAME real-world question priced on other " +
        "venues — read probability divergence directly from it), " +
        "referenceProbability when present (CoinRithm's canonical cross-venue " +
        "number: the liquidity-weighted median Yes probability across matched " +
        "real-money venues, with venueCount and spreadPoints — quote all " +
        "three together, venues disagree and the spread says by how much), " +
        "recent whale trades on the event, related events, related news, and " +
        "volumeHistory when present (daily volume points captured since " +
        "2026-07-02 — read the event's volume trend directly from it). " +
        "This is the cross-venue research view; for tradability use pm_quote. " +
        "No API key required.",
      inputSchema: {
        source: z
          .string()
          .describe(
            "Venue slug: polymarket, kalshi, metaculus, predictit, limitless, " +
              "manifold, or smarkets.",
          ),
        slug: z.string().describe("Event slug on that venue."),
        fiat: z
          .string()
          .optional()
          .describe("Fiat currency code for monetary figures (default usd)."),
      },
      outputSchema: API_RESULT_OUTPUT_SCHEMA,
      annotations: readOnlyAnnotations(
        "Get full prediction-market event detail",
      ),
    },
    async ({ source, slug, fiat }) =>
      present(await client.getPublicPmEvent(source, slug, { fiat })),
  );

  server.registerTool(
    "pm_data_whales",
    {
      title: "Get latest prediction-market whale trades",
      description:
        "Free public tape of the latest large prediction-market trades " +
        "(roughly $1k+ notional) across venues, newest first (top 50): side, " +
        "outcome, USD value, price, market question, and the event it printed " +
        "on. Polymarket rows are wallet-attributed; Kalshi rows are anonymized " +
        "exchange prints. A large print is information, not a recommendation. " +
        "No API key required.",
      inputSchema: {},
      outputSchema: API_RESULT_OUTPUT_SCHEMA,
      annotations: readOnlyAnnotations(
        "Get latest prediction-market whale trades",
      ),
    },
    async () => present(await client.getPublicPmWhales()),
  );
}
