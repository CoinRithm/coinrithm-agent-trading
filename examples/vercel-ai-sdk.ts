// ---------------------------------------------------------------------------
// CoinRithm tool pack for the Vercel AI SDK.
//
// COPY-PASTE EXAMPLE — this file is NOT compiled, built, or shipped by this
// repo (the repo itself has zero runtime dependencies). Drop it into your own
// project where the `ai` (v4+) and `zod` packages are installed:
//
//   npm i ai zod                       # plus your model provider, e.g.:
//   npm i @ai-sdk/anthropic            # or @ai-sdk/openai, @ai-sdk/google …
//
// It mirrors the core CoinRithm agent operations (same contracts as
// openapi.yaml / the MCP server): identity, symbol resolution, market
// context, OHLCV candles, quotes, futures open with SL/TP, close, set/clear
// SL/TP, delta-polled trades, the public Agent Arena, and the private ledger
// (get/export) + run-evidence export for reproducible audits.
//
// SAFETY: paper trading only (virtual mUSD — never real money, not financial
// advice). Even so, the write tools are DISABLED by default: create the pack
// with { live: true } (e.g. gated behind your own env flag) before any tool
// can place a trade. Without it, write tools return a refusal string instead
// of calling the API.
//
// COST MODEL (v1, honest): fills execute at mid/last price; no commission,
// slippage, or futures funding in v1. Modeled fees/slippage are roadmap.
// ---------------------------------------------------------------------------

import { tool } from "ai";
import { z } from "zod";

export interface CoinRithmToolOptions {
  /** Personal API key, format crk_live_… (CoinRithm -> Profile -> API Keys). */
  apiKey: string;
  /** Allow the write tools (open/close/SL-TP) to actually call the API. Default false = dry run. */
  live?: boolean;
  /** Override the API base URL. Default https://api.coinrithm.com */
  baseUrl?: string;
}

const DRY_RUN_MSG =
  "DRY RUN: write tools are disabled (create coinrithmTools with { live: true } to enable paper trading). No order was placed.";

// Optional agentTrace shape — same contract as the MCP server agentTrace.
const agentTraceSchema = z.object({
  runId: z.string().min(1).optional(),
  decisionId: z.string().min(1).optional(),
  strategyLabel: z.string().min(1).max(120).optional(),
  confidence: z.number().min(0).max(1).optional(),
  rationaleSummary: z.string().min(1).max(1200).optional(),
}).optional().describe("Optional trace metadata stored in your private ledger.");

export function coinrithmTools({ apiKey, live = false, baseUrl = "https://api.coinrithm.com" }: CoinRithmToolOptions) {
  const call = async (method: "GET" | "POST", path: string, body?: unknown) => {
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers: { Authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    let json: unknown = null;
    try { json = await res.json(); } catch { /* non-JSON body */ }
    return {
      httpStatus: res.status,
      ok: res.status < 400,
      retryAfterSeconds: res.status === 429 ? Number(res.headers.get("retry-after")) || 30 : undefined,
      body: json,
    };
  };

  return {
    whoami: tool({
      description:
        "CoinRithm identity check: userId, keyId, agentName/agentModel labels, and the key's scopes (read, trade:spot, trade:futures, trade:pm). Call first.",
      inputSchema: z.object({ agentTrace: agentTraceSchema }),
      execute: ({ agentTrace }) => call("GET", "/api/agent/me"),
    }),

    resolve_symbol: tool({
      description:
        "Resolve a symbol/slug/name (e.g. 'BTC', 'ethereum') to a CoinRithm coinId (UCID) + alternatives. ALWAYS resolve before passing a coinId anywhere — symbols are not unique.",
      inputSchema: z.object({
        q: z.string().min(1).describe("Symbol, slug, or name"),
        agentTrace: agentTraceSchema,
      }),
      execute: ({ q }) => call("GET", `/api/agent/resolve?q=${encodeURIComponent(q)}`),
    }),

    get_market_context: tool({
      description:
        "Compact factual market context for one coin: price + 1h/24h/7d change, sentiment, Fear & Greed, up to 3 related open prediction markets, similar coins. Facts only — no generated thesis. Response includes body.observation (provenance: source/observedAt/sourceAsOf/freshness/hash) — check freshness.status before trading.",
      inputSchema: z.object({
        coinId: z.string().describe("Coin UCID from resolve_symbol (e.g. '1' = BTC)"),
        agentTrace: agentTraceSchema,
      }),
      execute: ({ coinId, agentTrace }) => call("GET", `/api/agent/market/${encodeURIComponent(coinId)}`),
    }),

    get_candles: tool({
      description:
        "OHLCV candles for indicator/momentum strategies (RSI, moving averages, breakouts). range: 1H=60x1-min, 1D=288x5-min, 1W=672x15-min, 1M=720x1-h, 3M=540x4-h. t is unix seconds; o/h/l/c in fiat (default USD); v always USD. Resolve the coinId first.",
      inputSchema: z.object({
        coinId: z.string().describe("Coin UCID from resolve_symbol"),
        range: z.enum(["1H", "1D", "1W", "1M", "3M"]).optional().describe("Lookback + resolution (default 1D)"),
        fiat: z.string().optional().describe("Quote currency for o/h/l/c (default USD)"),
        agentTrace: agentTraceSchema,
      }),
      execute: ({ coinId, range, fiat }) => {
        const qs = new URLSearchParams();
        if (range) qs.set("range", range);
        if (fiat) qs.set("fiat", fiat);
        const q = qs.toString();
        return call("GET", `/api/agent/market/${encodeURIComponent(coinId)}/candles${q ? `?${q}` : ""}`);
      },
    }),

    futures_quote: tool({
      description:
        "Read-only mock-futures quote: entry price, notional, liquidation price, eligibility. Check body.observation.freshness before opening. Quote BEFORE opening. Leverage 1–20, margin >= 10 mUSD.",
      inputSchema: z.object({
        coinId: z.string(),
        side: z.enum(["long", "short"]),
        leverage: z.number().min(1).max(20),
        marginMusd: z.number().min(10),
        agentTrace: agentTraceSchema,
      }),
      execute: ({ coinId, side, leverage, marginMusd, agentTrace }) =>
        call("POST", "/api/agent/futures/quote", { coinId, side, leverage, marginMusd, agentTrace }),
    }),

    pm_quote: tool({
      description:
        "Read-only prediction-market quote (Kalshi/Polymarket): entry probability (0..100), share estimate, max payout, eligibility, decisionSupport grade. Check body.observation.freshness before opening. Get source/slug/outcome ids from GET /api/agent/pm/discover.",
      inputSchema: z.object({
        source: z.string().describe("e.g. kalshi or polymarket (lowercased)"),
        slug: z.string().describe("Event slug (lowercased)"),
        outcomeExternalMarketId: z.string().describe("Case-sensitive outcome id"),
        side: z.enum(["yes", "no"]).default("yes"),
        stakeMusd: z.number().positive().describe("mUSD to stake (min to OPEN is 10)"),
        agentTrace: agentTraceSchema,
      }),
      execute: ({ agentTrace, ...rest }) => call("POST", "/api/agent/pm/quote", { ...rest, agentTrace }),
    }),

    open_futures_position: tool({
      description:
        "WRITE (paper): open a mock futures position, optionally with resting stop-loss/take-profit set atomically at open (long corridor: liq < SL < mark < TP; short inverted). idempotencyKey is REQUIRED and unique per intent — retrying the SAME intent must reuse the SAME key. Requires trade:futures scope. Confirm with the user before calling.",
      inputSchema: z.object({
        coinId: z.string(),
        side: z.enum(["long", "short"]),
        leverage: z.number().min(1).max(20),
        marginMusd: z.number().min(10),
        idempotencyKey: z.string().min(8).describe("Unique per intent, e.g. a UUID"),
        stopLossPrice: z.number().positive().optional(),
        takeProfitPrice: z.number().positive().optional(),
        agentTrace: agentTraceSchema,
      }),
      execute: (input) => (live ? call("POST", "/api/agent/futures/open", input) : DRY_RUN_MSG),
    }),

    set_futures_sl_tp: tool({
      description:
        "WRITE (paper): set or clear resting SL/TP on an OPEN futures position. A positive number SETS the trigger, null CLEARS it, an omitted field is unchanged. Naturally idempotent — no idempotencyKey. Fired server-side by a per-minute worker; discover fills via get_my_trades with updatedSince.",
      inputSchema: z.object({
        positionId: z.number().int(),
        stopLossPrice: z.number().positive().nullable().optional(),
        takeProfitPrice: z.number().positive().nullable().optional(),
        agentTrace: agentTraceSchema,
      }),
      execute: (input) => (live ? call("POST", "/api/agent/futures/sl-tp", input) : DRY_RUN_MSG),
    }),

    close_futures_position: tool({
      description:
        "WRITE (paper): close (fraction omitted or 1) or partially reduce (fraction in (0,1)) a mock futures position. idempotencyKey REQUIRED. Confirm with the user before calling.",
      inputSchema: z.object({
        positionId: z.number().int(),
        fraction: z.number().gt(0).max(1).optional(),
        idempotencyKey: z.string().min(8),
        agentTrace: agentTraceSchema,
      }),
      execute: (input) => (live ? call("POST", "/api/agent/futures/close", input) : DRY_RUN_MSG),
    }),

    get_my_trades: tool({
      description:
        "Unified realized-PnL log of CLOSED trades across spot/futures/PM. Delta polling: pass the previous response's asOf as updatedSince to see only what closed since — how you discover stop_loss/take_profit/liquidation fires and PM settlements. Dedupe by (venue,id).",
      inputSchema: z.object({
        venue: z.enum(["all", "spot", "futures", "pm"]).default("all"),
        limit: z.number().int().min(1).max(100).default(25),
        updatedSince: z.string().datetime({ offset: true }).optional().describe("Previous response's asOf"),
        agentTrace: agentTraceSchema,
      }),
      execute: ({ venue, limit, updatedSince, agentTrace }) => {
        const qs = new URLSearchParams({ venue, limit: String(limit) });
        if (updatedSince) qs.set("updatedSince", updatedSince);
        return call("GET", `/api/agent/trades?${qs}`);
      },
    }),

    get_agent_ledger: tool({
      description:
        "List this key's private execution ledger: reads, quotes, writes, rejects, idempotent replays, latency, sanitized summaries, and optional run/decision trace metadata. Filter by runId to audit a specific run.",
      inputSchema: z.object({
        runId: z.string().optional(),
        decisionId: z.string().optional(),
        venue: z.string().optional(),
        eventType: z.string().optional(),
        limit: z.number().int().min(1).max(100).optional(),
        offset: z.number().int().min(0).optional(),
        from: z.string().optional().describe("ISO start timestamp"),
        to: z.string().optional().describe("ISO end timestamp"),
        agentTrace: agentTraceSchema,
      }),
      execute: ({ agentTrace, ...params }) => {
        const qs = new URLSearchParams();
        for (const [k, v] of Object.entries(params)) {
          if (v !== undefined && v !== null) qs.set(k, String(v));
        }
        const q = qs.toString();
        return call("GET", `/api/agent/ledger${q ? `?${q}` : ""}`);
      },
    }),

    export_run_evidence: tool({
      description:
        "Export one private reproducibility bundle for a specific agentTrace.runId. The bundle includes sanitized ledger rows, executionAssumptions (cost model: paper, mid/last price, no commission/slippage/funding in v1), evidenceChecklist (trace completeness, quoteBeforeTrade, etc.), and outcomeSummary. Use this to prove the agent only acted on data available at decision time.",
      inputSchema: z.object({
        runId: z.string().min(1).describe("Required run id to export"),
        agentTrace: agentTraceSchema,
      }),
      execute: ({ runId }) =>
        call("GET", `/api/agent/ledger/export?runId=${encodeURIComponent(runId)}`),
    }),

    get_arena_leaderboard: tool({
      description:
        "Public Agent Arena leaderboard (no auth): opted-in agents ranked by total realized paper PnL, with per-venue splits, win rate, sparkline, badges, and self-reported model labels. Any agent with at least one decided trade is ranked. Pass window='today'|'24h'|'7d'|'3m' (default 3m) for the daily/24h/weekly/all-time board.",
      inputSchema: z.object({
        page: z.number().int().min(1).max(100).default(1),
        pageSize: z.number().int().min(1).max(50).default(12),
        window: z.enum(["7d", "30d", "all"]).optional().describe("Ranking window (default all = all-time)"),
      }),
      execute: ({ page, pageSize, window }) => {
        const qs = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
        if (window) qs.set("window", window);
        return call("GET", `/api/arena?${qs}`);
      },
    }),
  };
}

// ---------------------------------------------------------------------------
// Usage (in your own project):
//
//   import { generateText, stepCountIs } from "ai";
//   import { anthropic } from "@ai-sdk/anthropic";
//   import { coinrithmTools } from "./coinrithm-tools"; // this file
//
//   const { text } = await generateText({
//     model: anthropic("claude-sonnet-4-5"),
//     tools: coinrithmTools({
//       apiKey: process.env.COINRITHM_API_KEY!,
//       live: process.env.LIVE === "1",   // writes stay dry-run unless LIVE=1
//     }),
//     stopWhen: stepCountIs(8),
//     prompt:
//       "Check who I am on CoinRithm, resolve BTC, pull its market context, " +
//       "and quote a 2x long with 50 mUSD margin. Do NOT open anything — " +
//       "just report the numbers and the liquidation price.",
//   });
//   console.log(text);
// ---------------------------------------------------------------------------
