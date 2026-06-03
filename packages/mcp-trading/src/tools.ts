// Registers the CoinRithm trading tools on an MCP server instance.
//
// Every tool wraps exactly one /api/agent/* call. Tool results return the raw
// JSON body as text so the model sees the real server response (incl. error
// shapes like { error, blockReasons }). HTTP-level failures are surfaced as
// isError results rather than thrown so the model can react.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type { ServerNotification, ServerRequest } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { CoinRithmClient, bearerFromHeader, type ApiResult } from "./client.js";

const PAPER_NOTE =
  "Paper trading only — virtual funds (50,000 mUSD). Not financial advice.";

// The `extra` argument the SDK passes to every tool handler.
type ToolExtra = RequestHandlerExtra<ServerRequest, ServerNotification>;

// Per-request key resolution (multi-user HTTP).
//
// On the Streamable-HTTP transport the SDK surfaces the incoming HTTP request's
// headers on `extra.requestInfo.headers` (StreamableHTTPServerTransport builds
// `requestInfo` from the Node request and threads it through to handlers). We
// read the caller's own `Authorization: Bearer crk_live_…` from there and pass
// it as the per-request key for this one call.
//
// On the stdio transport there is no HTTP request, so `extra.requestInfo` is
// undefined and this returns undefined — the client then falls back to the
// COINRITHM_API_KEY it was constructed with. `authInfo.token` is also honoured
// in case a future auth middleware populates it.
function requestKey(extra: ToolExtra): string | undefined {
  const fromHeader = bearerFromHeader(extra.requestInfo?.headers?.authorization);
  if (fromHeader) return fromHeader;
  const token = extra.authInfo?.token?.trim();
  return token || undefined;
}

function present(result: ApiResult) {
  const payload = {
    httpStatus: result.status,
    ok: result.ok,
    body: result.data,
  };
  return {
    content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }],
    isError: !result.ok,
  };
}

export function registerTools(server: McpServer, client: CoinRithmClient): void {
  // ---------------- identity ----------------
  server.registerTool(
    "whoami",
    {
      title: "Who am I (CoinRithm)",
      description:
        "Return the identity behind the configured API key: userId, keyId, and " +
        "granted scopes. Use this first to confirm what the key is allowed to do. " +
        PAPER_NOTE,
      inputSchema: {},
    },
    async (_args, extra) => present(await client.whoami(requestKey(extra))),
  );

  // ---------------- reads ----------------
  server.registerTool(
    "get_portfolio",
    {
      title: "Get portfolio",
      description:
        "Get the paper account dashboard: equity (wallet.totalUsd), period PnL " +
        "(wallet.pnl), asset balances, open orders, and recent history. " +
        PAPER_NOTE,
      inputSchema: {
        fiat: z
          .string()
          .optional()
          .describe("Display fiat code (default USD). Equity stays USD-denominated."),
        locale: z.string().optional().describe("Locale (default en)."),
      },
    },
    async ({ fiat, locale }, extra) =>
      present(await client.getPortfolio({ fiat, locale }, requestKey(extra))),
  );

  server.registerTool(
    "get_wallet",
    {
      title: "Get wallet",
      description:
        "Get raw cash balances: USDT available plus the three frozen partitions " +
        "(frozen = spot orders, frozenPm = PM, frozenFutures = futures margin). " +
        "Optionally include one coin asset. " + PAPER_NOTE,
      inputSchema: {
        coinId: z
          .string()
          .optional()
          .describe('Coin UCID (e.g. "1" = BTC) to also return that asset.'),
      },
    },
    async ({ coinId }, extra) =>
      present(await client.getWallet({ coinId }, requestKey(extra))),
  );

  server.registerTool(
    "list_open_orders",
    {
      title: "List open spot orders",
      description:
        "List open (resting) spot orders for ONE coin. coinId is required. " +
        PAPER_NOTE,
      inputSchema: {
        coinId: z.string().min(1).describe("Coin UCID to list open orders for."),
        limit: z
          .number()
          .int()
          .min(1)
          .max(200)
          .optional()
          .describe("Max rows (1-200, default 100)."),
      },
    },
    async ({ coinId, limit }, extra) =>
      present(await client.listOpenOrders({ coinId, limit }, requestKey(extra))),
  );

  server.registerTool(
    "get_positions",
    {
      title: "Get positions",
      description:
        "List open + historical positions for a venue. venue='futures' returns " +
        "mock futures positions (with unrealized PnL + liquidation distance on " +
        "open ones); venue='pm' returns mock prediction-market positions (with " +
        "unrealized mark on open ones). " + PAPER_NOTE,
      inputSchema: {
        venue: z
          .enum(["futures", "pm"])
          .describe("Which venue's positions to list."),
      },
    },
    async ({ venue }, extra) =>
      present(
        venue === "futures"
          ? await client.getFuturesPositions(requestKey(extra))
          : await client.getPmPositions(requestKey(extra)),
      ),
  );

  server.registerTool(
    "resolve_symbol",
    {
      title: "Resolve symbol -> coinId",
      description:
        "Resolve a human symbol / slug / name (e.g. 'BTC', 'ethereum') to a " +
        "CoinRithm coinId (UCID) plus disambiguating alternatives. Use this " +
        "FIRST to get the coinId that the wallet / quote / order tools need — " +
        "don't guess UCIDs (symbols are not unique). " + PAPER_NOTE,
      inputSchema: {
        q: z
          .string()
          .min(1)
          .describe("Symbol, slug, or name (e.g. BTC, bitcoin, Ethereum)."),
      },
    },
    async ({ q }, extra) =>
      present(await client.resolveSymbol({ q }, requestKey(extra))),
  );

  server.registerTool(
    "get_equity_curve",
    {
      title: "Get equity curve",
      description:
        "Daily wallet equity time series ({date, usdValue}) for the paper " +
        "account — the basis for reviewing performance over time and narrating " +
        "results. days = look-back window (1-365, default 30). " + PAPER_NOTE,
      inputSchema: {
        days: z
          .number()
          .int()
          .min(1)
          .max(365)
          .optional()
          .describe("Look-back window in days (1-365, default 30)."),
      },
    },
    async ({ days }, extra) =>
      present(await client.getEquityCurve({ days }, requestKey(extra))),
  );

  server.registerTool(
    "get_my_trades",
    {
      title: "Get my trades",
      description:
        "Unified realized-PnL log of CLOSED trades across venues (spot fills, " +
        "closed/liquidated futures, settled prediction-markets), most-recent " +
        "first — the agent's memory of what it did and what won/lost. Use it to " +
        "review performance before deciding the next move. " + PAPER_NOTE,
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
      },
    },
    async ({ venue, limit }, extra) =>
      present(await client.getMyTrades({ venue, limit }, requestKey(extra))),
  );

  server.registerTool(
    "get_market_context",
    {
      title: "Get market context",
      description:
        "Compact factual context for ONE coin to form a thesis: price + " +
        "1h/24h/7d change + market cap, per-coin sentiment votes, the global " +
        "Fear & Greed value, and up to 3 directly-related OPEN prediction " +
        "markets (with their leading outcome + probability). Facts only — no " +
        "generated thesis. Call resolve_symbol first to get the coinId. " +
        PAPER_NOTE,
      inputSchema: {
        coinId: z
          .string()
          .min(1)
          .describe('Coin UCID (e.g. "1" = BTC). Use resolve_symbol to find it.'),
      },
    },
    async ({ coinId }, extra) =>
      present(await client.getMarketContext(coinId, requestKey(extra))),
  );

  server.registerTool(
    "get_performance",
    {
      title: "Get my performance",
      description:
        "The calling key's own realized performance: total + per-venue realized " +
        "PnL (mUSD), trade count, win/loss/neutral counts, and win rate (null " +
        "until there are decided trades). Closed trades only — the scorecard for " +
        "this agent. " + PAPER_NOTE,
      inputSchema: {},
    },
    async (_args, extra) =>
      present(await client.getPerformance(requestKey(extra))),
  );

  server.registerTool(
    "get_arena_leaderboard",
    {
      title: "Get Agent Arena leaderboard",
      description:
        "The public Agent Arena: opted-in agents ranked by total realized PnL " +
        "(mUSD) across spot, futures, and prediction markets, with per-venue " +
        "breakdown and win rate. Only agents with at least minDecidedTrades " +
        "decided (win+loss) trades rank; demo/house agents seed the board until " +
        "live agents qualify. Use it to see the field and where you stand — pair " +
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
      },
    },
    async ({ page, pageSize }, extra) =>
      present(
        await client.getArenaLeaderboard({ page, pageSize }, requestKey(extra)),
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
        "Public data only — no account or key identity. " + PAPER_NOTE,
      inputSchema: {
        handle: z
          .string()
          .min(1)
          .describe("Arena handle from the leaderboard (e.g. a42-momentum-scout)."),
      },
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
        "leverage 1-20, marginMusd >= 10. " + PAPER_NOTE,
      inputSchema: {
        coinId: z.string().describe("Coin UCID."),
        side: z.enum(["long", "short"]),
        leverage: z.number().min(1).max(20).describe("1-20x."),
        marginMusd: z.number().min(10).describe("Isolated margin in mUSD (>= 10)."),
      },
    },
    async ({ coinId, side, leverage, marginMusd }, extra) =>
      present(
        await client.futuresQuote(
          { coinId, side, leverage, marginMusd },
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
        "estimate, max payout, eligibility, and freshness. Never mutates state. " +
        "stakeMusd must be > 0 (min to open is 10). " + PAPER_NOTE,
      inputSchema: {
        source: z.string().describe("Source slug (e.g. kalshi, polymarket)."),
        slug: z.string().describe("Event slug."),
        outcomeExternalMarketId: z
          .string()
          .describe("Case-sensitive outcome / market id."),
        stakeMusd: z.number().positive().describe("mUSD to stake (> 0)."),
      },
    },
    async ({ source, slug, outcomeExternalMarketId, stakeMusd }, extra) =>
      present(
        await client.pmQuote(
          { source, slug, outcomeExternalMarketId, stakeMusd },
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
        "stopPrice required for stop. Requires the trade:spot scope. CONFIRM with " +
        "the user before calling. " + PAPER_NOTE,
      inputSchema: {
        coinId: z.string().describe('Coin UCID (e.g. "1" = BTC).'),
        side: z.enum(["buy", "sell"]),
        orderType: z.enum(["market", "limit", "stop"]),
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
      },
    },
    async ({ coinId, side, orderType, quantity, limitPrice, stopPrice }, extra) =>
      present(
        await client.placeSpotOrder(
          {
            coinId,
            side,
            orderType,
            quantity,
            limitPrice,
            stopPrice,
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
        "trade:spot scope. " + PAPER_NOTE,
      inputSchema: {
        orderId: z.number().int().positive().describe("Open order id."),
      },
    },
    async ({ orderId }, extra) =>
      present(await client.cancelSpotOrder(orderId, requestKey(extra))),
  );

  server.registerTool(
    "open_futures_position",
    {
      title: "Open futures position",
      description:
        "Open (or add to) a mock futures position. Requires the trade:futures " +
        "scope AND is server-flag gated (currently returns 403 'not enabled'). " +
        "idempotencyKey is REQUIRED and must be unique per intent. leverage 1-20, " +
        "marginMusd >= 10. Quote first and CONFIRM with the user. " + PAPER_NOTE,
      inputSchema: {
        coinId: z.string(),
        side: z.enum(["long", "short"]),
        leverage: z.number().min(1).max(20),
        marginMusd: z.number().min(10),
        idempotencyKey: z
          .string()
          .min(1)
          .describe("Unique per intent; reuse replays the original result."),
      },
    },
    async ({ coinId, side, leverage, marginMusd, idempotencyKey }, extra) =>
      present(
        await client.openFuturesPosition(
          {
            coinId,
            side,
            leverage,
            marginMusd,
            idempotencyKey,
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
        "REQUIRED. Requires the trade:futures scope. " + PAPER_NOTE,
      inputSchema: {
        positionId: z.number().int().positive(),
        fraction: z
          .number()
          .gt(0)
          .lte(1)
          .optional()
          .describe("(0,1] portion to close; omit/1 = full close."),
        idempotencyKey: z.string().min(1),
      },
    },
    async ({ positionId, fraction, idempotencyKey }, extra) =>
      present(
        await client.closeFuturesPosition(
          { positionId, fraction, idempotencyKey },
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
        "the trade:pm scope AND is server-flag gated (currently returns 403 'not " +
        "enabled'). idempotencyKey is REQUIRED. stakeMusd >= 10. Quote first and " +
        "CONFIRM with the user. " + PAPER_NOTE,
      inputSchema: {
        source: z.string(),
        slug: z.string(),
        outcomeExternalMarketId: z.string(),
        stakeMusd: z.number().min(10).describe("mUSD stake (>= 10)."),
        idempotencyKey: z.string().min(1),
      },
    },
    async (
      { source, slug, outcomeExternalMarketId, stakeMusd, idempotencyKey },
      extra,
    ) =>
      present(
        await client.openPmPosition(
          {
            source,
            slug,
            outcomeExternalMarketId,
            stakeMusd,
            idempotencyKey,
          },
          requestKey(extra),
        ),
      ),
  );
}
