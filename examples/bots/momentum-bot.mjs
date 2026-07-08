#!/usr/bin/env node
// ---------------------------------------------------------------------------
// CoinRithm MOMENTUM BOT — a complete, runnable futures-agent template.
//
// What it does (one full agent loop, ~150 lines of logic):
//   1. whoami                  — confirm the key + scopes
//   2. GET /resolve?q=SYMBOL   — symbol -> coinId (UCID)
//   3. GET /market/:coinId     — 1h/24h/7d momentum signal (long/short/none)
//   4. POST /futures/quote     — entry price, liquidation price, eligibility
//   5. Confirm gate            — DEFAULT IS A DRY RUN: prints the exact plan
//                                and exits. Set LIVE=1 to actually open.
//   6. POST /futures/open      — with stopLossPrice + takeProfitPrice set
//                                atomically at open (side-aware corridor)
//   7. Poll GET /trades?updatedSince=<asOf> — persisted cursor in a
//      .state.json next to this file; dedupe by (venue,id); paced by
//      RateLimit-Remaining; backs off on 429 Retry-After
//   8. Report when the stop-loss / take-profit / liquidation fires
//      (exitReason + realized PnL), then check the public Agent Arena.
//
// How to run:
//   COINRITHM_API_KEY=crk_live_xxx node examples/bots/momentum-bot.mjs
//
// Env:
//   COINRITHM_API_KEY  (required)  key scopes: read (+ trade:futures for LIVE)
//   LIVE=1             (optional)  actually place the trade. Default: DRY RUN —
//                                  reads + quote only, prints the plan, trades NOTHING.
//   SYMBOL             (optional)  default BTC
//   LEVERAGE           (optional)  default 2 (max 20)
//   MARGIN_MUSD        (optional)  default 50 (min 10)
//   SL_PCT / TP_PCT    (optional)  stop/target distance from entry, default 2 / 4 (%)
//   POLL_SECONDS       (optional)  default 60 (the SL/TP worker runs per-minute)
//   MAX_POLLS          (optional)  default 120 (~2h), then exits; the cursor is
//                                  persisted, so re-running RESUMES the watch.
//   BASE_URL           (optional)  default https://api.coinrithm.com
//
// What it costs: nothing. This is PAPER trading — a 50,000 virtual-mUSD
// account. No real money, no real exchange, not financial advice.
//
// Zero dependencies — Node 18+ (built-in fetch) only.
// ---------------------------------------------------------------------------

import { readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";

// One runId per bot session — groups all ledger rows for this run so the
// evidence bundle is exportable via GET /api/agent/ledger/export?runId=RUN_ID.
const RUN_ID = `momentum-${new Date().toISOString().slice(0, 10)}-${randomUUID().slice(0, 8)}`;

const BASE = process.env.BASE_URL || "https://api.coinrithm.com";
const KEY = process.env.COINRITHM_API_KEY || process.env.CRK_API_KEY;
const LIVE = process.env.LIVE === "1";
const SYMBOL = process.env.SYMBOL || "BTC";
const LEVERAGE = Math.min(Number(process.env.LEVERAGE) || 2, 20);
const MARGIN = Math.max(Number(process.env.MARGIN_MUSD) || 50, 10);
const SL_PCT = (Number(process.env.SL_PCT) || 2) / 100;
const TP_PCT = (Number(process.env.TP_PCT) || 4) / 100;
const POLL_SECONDS = Number(process.env.POLL_SECONDS) || 60;
const MAX_POLLS = Number(process.env.MAX_POLLS) || 120;

const STATE_FILE = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  ".momentum-bot.state.json",
);

if (!KEY) {
  console.error("Set COINRITHM_API_KEY (CoinRithm -> Profile -> API Keys).");
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --- agentTrace builder: one runId, per-call decisionId -------------------
const trace = (label, confidence) => ({
  runId: RUN_ID,
  decisionId: `${label}-${randomUUID().slice(0, 8)}`,
  strategyLabel: "momentum-futures",
  ...(confidence !== undefined ? { confidence } : {}),
});

// --- API helper: rate-limit pacing + 429 Retry-After backoff ---------------
const api = async (method, p, body) => {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`${BASE}${p}`, {
      method,
      headers: { Authorization: `Bearer ${KEY}`, "content-type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 429) {
      const wait = Number(res.headers.get("retry-after")) || 30;
      console.log(`  … 429 rate-limited, backing off ${wait}s`);
      await sleep(wait * 1000);
      continue;
    }
    // Proactive pacing: if the per-key budget is nearly spent, wait for reset.
    const remaining = Number(res.headers.get("ratelimit-remaining"));
    if (Number.isFinite(remaining) && remaining < 8) {
      const reset = Number(res.headers.get("ratelimit-reset")) || 10;
      console.log(`  … RateLimit-Remaining=${remaining}, pacing ${reset}s`);
      await sleep(reset * 1000);
    }
    let json = null;
    try { json = await res.json(); } catch {}
    return { status: res.status, json };
  }
  throw new Error("rate-limited 3 times in a row — giving up");
};

const must = (r, what) => {
  if (r.status >= 400) throw new Error(`${what}: HTTP ${r.status} ${JSON.stringify(r.json)?.slice(0, 200)}`);
  return r.json;
};

// --- Persisted state: asOf cursor + (venue,id) dedupe + open position ------
const loadState = () => {
  try { return JSON.parse(readFileSync(STATE_FILE, "utf8")); } catch { return { cursor: null, seen: [], position: null }; }
};
const saveState = (s) => writeFileSync(STATE_FILE, JSON.stringify(s, null, 2));

// --- Settlement watch: delta-poll /trades with the asOf cursor -------------
// Stops, take-profits, and liquidations fire SERVER-SIDE (per-minute worker).
// The contract: pass the previous response's asOf back as updatedSince.
// Delivery is at-least-once, so dedupe by (venue,id).
const watchPosition = async (state) => {
  const pos = state.position;
  console.log(`\nWatching position ${pos.id} (${pos.side} ${pos.symbol}) — SL=${pos.stopLossPrice ?? "-"} TP=${pos.takeProfitPrice ?? "-"}`);
  console.log(`(polling /trades?updatedSince every ${POLL_SECONDS}s; cursor persisted in ${path.basename(STATE_FILE)})`);

  for (let i = 0; i < MAX_POLLS; i++) {
    const qs = state.cursor ? `?venue=futures&updatedSince=${encodeURIComponent(state.cursor)}` : "?venue=futures&limit=1";
    const j = must(await api("GET", `/api/agent/trades${qs}`), "GET /trades");
    state.cursor = j.asOf; // ALWAYS advance the cursor from the response
    const fresh = (j.trades || []).filter((t) => !state.seen.includes(`${t.venue}:${t.id}`));
    for (const t of fresh) state.seen.push(`${t.venue}:${t.id}`);
    state.seen = state.seen.slice(-200);
    saveState(state);

    if (fresh.length > 0) {
      // Something closed since the last poll — check whether it was OUR position.
      const pj = must(await api("GET", "/api/agent/positions/futures"), "GET /positions/futures");
      const mine = (pj.positions || []).find((p) => p.id === pos.id);
      if (mine && mine.status !== "open") {
        const pnl = mine.realizedPnlMusd ?? 0;
        console.log(`\n${pnl >= 0 ? "🟢" : "🔴"} Position ${pos.id} closed: exitReason=${mine.exitReason} exit=${mine.exitPrice} realizedPnl=${pnl.toFixed(2)} mUSD`);
        state.position = null;
        saveState(state);
        await arenaCheck();
        return;
      }
      console.log(`  poll ${i + 1}: ${fresh.length} new closed trade(s), ours still open`);
    } else {
      console.log(`  poll ${i + 1}: no new fills (cursor=${state.cursor})`);
    }
    await sleep(POLL_SECONDS * 1000);
  }
  console.log(`\nReached MAX_POLLS=${MAX_POLLS}. Cursor + position persisted — re-run to resume watching.`);
};

// --- Run-evidence export: prove the agent only acted on available data ------
// Response shape (with runId): { apiKeyId, exportedAt, count, maxRows,
//   run: { evidenceChecklist: { schema, overallStatus, items:[{id,label,status,detail}] },
//          executionAssumptions: { costModel, ... }, outcomeSummary, summary, ... },
//   data: [...ledger rows] }
const exportRunEvidence = async () => {
  try {
    const bundle = must(await api("GET", `/api/agent/ledger/export?runId=${encodeURIComponent(RUN_ID)}`), "GET /ledger/export");
    const run = bundle.run;
    const ec = run?.evidenceChecklist;
    console.log(`\nRun evidence (runId=${RUN_ID}):`);
    console.log(`  evidenceChecklist.overallStatus = ${ec?.overallStatus ?? "n/a"}`);
    for (const item of (ec?.items ?? [])) {
      console.log(`    [${item.status}] ${item.label}: ${item.detail}`);
    }
    console.log(`  rows in export    = ${bundle.count ?? bundle.data?.length ?? 0}`);
    const ea = run?.executionAssumptions;
    if (ea) console.log(`  costModel         = ${ea.costModel ?? "paper, mid/last price, no commission/slippage/funding (v1)"}`);
  } catch (e) {
    console.log(`  (run evidence unavailable: ${e.message})`);
  }
};

// --- Arena: how does this agent rank publicly? ------------------------------
const arenaCheck = async () => {
  const me = must(await api("GET", "/api/agent/me"), "GET /me");
  const perf = must(await api("GET", "/api/agent/performance"), "GET /performance");
  console.log(`\nScorecard: realized total ${perf.totals?.realizedPnlMusd?.toFixed?.(2) ?? "?"} mUSD over ${perf.totals?.tradeCount ?? 0} trades (winRate ${perf.totals?.winRate ?? "n/a"})`);
  if (!me.agentName) {
    console.log("Not on the Arena yet — set agentName + agentPublic on your key (Profile -> API Keys) to get ranked (any agent with at least one decided trade is ranked).");
    await exportRunEvidence();
    return;
  }
  const arena = must(await api("GET", "/api/arena?pageSize=50"), "GET /api/arena");
  const row = (arena.rows || []).find((r) => r.agentName === me.agentName);
  if (row) console.log(`Arena: #${row.rank} "${row.agentName}" — ${row.realizedPnlMusd.toFixed(2)} mUSD realized, winRate=${row.winRate ?? "n/a"}`);
  else console.log(`"${me.agentName}" not in the Arena top ${arena.rows?.length ?? 0} yet (needs ${arena.minDecidedTrades} decided trades + agentPublic).`);
  await exportRunEvidence();
};

// --- Main -------------------------------------------------------------------
const run = async () => {
  console.log(`\n=== CoinRithm momentum bot — ${LIVE ? "LIVE (paper trades WILL be placed)" : "DRY RUN (plan only — set LIVE=1 to trade)"} ===`);
  console.log(`Paper trading only: virtual mUSD, no real money.\n`);

  const state = loadState();

  // Resume: if a previous run left a position open, just keep watching it.
  if (state.position) {
    console.log(`Resuming: state file has open position ${state.position.id}.`);
    await watchPosition(state);
    return;
  }

  // 1) Identity + scopes
  const me = must(await api("GET", "/api/agent/me"), "GET /me");
  const scopes = new Set(me.scopes || []);
  console.log(`1) whoami: user ${me.userId}, scopes [${[...scopes].join(", ")}]`);
  if (LIVE && !scopes.has("trade:futures")) {
    console.error("LIVE=1 needs a key with trade:futures scope. Mint one in Profile -> API Keys.");
    process.exit(1);
  }

  // 2) Resolve the symbol to a coinId (UCID) — never pass tickers as coinId
  const res = must(await api("GET", `/api/agent/resolve?q=${encodeURIComponent(SYMBOL)}`), "GET /resolve");
  if (!res.match) throw new Error(`could not resolve "${SYMBOL}" to a coin`);
  const coinId = res.match.coinId;
  console.log(`2) resolve: ${SYMBOL} -> coinId ${coinId} (${res.match.name})`);

  // 3) Momentum signal from market context (a TEACHING heuristic, not alpha:
  //    trade only when 1h and 24h momentum agree and 24h move is > 1%)
  const m = must(await api("GET", `/api/agent/market/${coinId}`), "GET /market");
  const { change1h, change24h, change7d } = m.price || {};
  console.log(`3) market: $${m.price?.usd} | 1h ${change1h}% 24h ${change24h}% 7d ${change7d}%`);
  let side = null;
  if (change1h > 0 && change24h > 1) side = "long";
  else if (change1h < 0 && change24h < -1) side = "short";
  if (!side) {
    console.log("   No signal (1h and 24h momentum must agree, |24h| > 1%). Nothing to do — exiting.");
    return;
  }
  console.log(`   Signal: ${side.toUpperCase()}`);

  // 4) Quote first — read-only; shows entry, liquidation, eligibility.
  //    Check observation.freshness — stale data must not drive a trade.
  const q = must(await api("POST", "/api/agent/futures/quote", {
    coinId, side, leverage: LEVERAGE, marginMusd: MARGIN,
    agentTrace: trace("futures-quote", 0.6),
  }), "POST /futures/quote");
  const freshness = q.observation?.freshness;
  console.log(`4) quote: observation freshness=${freshness?.status ?? "n/a"} ageSeconds=${freshness?.ageSeconds ?? "n/a"} hash=${q.observation?.hash ?? "n/a"}`);
  if (freshness?.status && freshness.status !== "fresh") {
    console.log(`   Quote data is ${freshness.status} — skipping to avoid stale-data trade.`);
    return;
  }
  if (!q.eligible) {
    console.log(`4) quote: entry BLOCKED — ${JSON.stringify(q.blockReasons)}. Exiting.`);
    return;
  }
  const entry = q.entryPrice;
  const liq = q.liquidationPrice;
  console.log(`4) quote: entry≈${entry} liq≈${liq} notional=${q.notionalMusd} mUSD`);

  // 5) Side-aware SL/TP corridor (long: liq < SL < entry < TP; short inverted),
  //    clamped so the stop never lands on the wrong side of liquidation.
  let stopLossPrice, takeProfitPrice;
  if (side === "long") {
    stopLossPrice = Math.max(entry * (1 - SL_PCT), liq + (entry - liq) * 0.1);
    takeProfitPrice = entry * (1 + TP_PCT);
  } else {
    stopLossPrice = Math.min(entry * (1 + SL_PCT), liq - (liq - entry) * 0.1);
    takeProfitPrice = entry * (1 - TP_PCT);
  }
  stopLossPrice = Number(stopLossPrice.toPrecision(6));
  takeProfitPrice = Number(takeProfitPrice.toPrecision(6));

  const plan = { coinId, symbol: res.match.symbol, side, leverage: LEVERAGE, marginMusd: MARGIN, entryPrice: entry, stopLossPrice, takeProfitPrice, liquidationPrice: liq };
  console.log(`5) plan:\n${JSON.stringify(plan, null, 2)}`);

  if (!LIVE) {
    // DRY RUN ends here — but still demonstrate the sync cursor contract once.
    const t = must(await api("GET", "/api/agent/trades?venue=futures&limit=1"), "GET /trades");
    state.cursor = t.asOf;
    saveState(state);
    console.log(`\nDRY RUN — no order placed. (Captured /trades asOf cursor ${t.asOf} into ${path.basename(STATE_FILE)}.)`);
    console.log("Set LIVE=1 to open this position with the SL/TP above (paper funds only).");
    return;
  }

  // 6) Open WITH SL/TP set atomically. idempotencyKey is REQUIRED and unique
  //    per intent — a retry of the SAME intent must reuse the SAME key.
  const idempotencyKey = `momentum-${coinId}-${side}-${randomUUID()}`;
  const open = must(
    await api("POST", "/api/agent/futures/open", {
      coinId, side, leverage: LEVERAGE, marginMusd: MARGIN,
      idempotencyKey, stopLossPrice, takeProfitPrice,
      agentTrace: trace("futures-open", 0.6),
    }),
    "POST /futures/open",
  );
  const pos = open.position;
  console.log(`6) opened position ${pos.id}: ${pos.side} ${pos.sizeCoin} ${res.match.symbol} @ ${pos.entryPrice} (SL ${pos.stopLossPrice}, TP ${pos.takeProfitPrice})`);

  // 7) Capture a fresh cursor, persist, and watch for the SL/TP to fire.
  const t = must(await api("GET", "/api/agent/trades?venue=futures&limit=1"), "GET /trades");
  state.cursor = t.asOf;
  state.position = { id: pos.id, side, symbol: res.match.symbol, stopLossPrice: pos.stopLossPrice, takeProfitPrice: pos.takeProfitPrice };
  saveState(state);
  await watchPosition(state);
};

run().catch((e) => { console.error("FATAL", e.message); process.exit(1); });
