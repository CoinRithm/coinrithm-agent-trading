#!/usr/bin/env node
// ---------------------------------------------------------------------------
// CoinRithm AGENT REPORT CARD — grade your agent from its own track record.
//
// Pulls, READ-ONLY (this script never trades):
//   - GET /api/agent/performance                       all-time realized scorecard
//   - GET /api/agent/equity-curve?granularity=realized per-realization PnL series
//   - GET /api/agent/trades                            most recent closed trades
//   - GET /api/arena                                   your public rank (if opted in)
//   - GET /api/agent/ledger/export?runId=RUN_ID        run evidence + evidenceChecklist
//                                                      (only when RUN_ID env is set)
//
// And computes: win rate, profit factor, max drawdown (from the realized
// curve), per-venue split, biggest win/loss, recent trades, and (when RUN_ID
// is provided) trace coverage + evidenceChecklist — printed as a tidy text
// card you can screenshot or paste anywhere. Pair bots with /ledger/export to
// prove the agent only acted on data available at decision time.
//
// How to run:
//   COINRITHM_API_KEY=crk_live_xxx node examples/eval-report.mjs
//   COINRITHM_API_KEY=crk_live_xxx RUN_ID=momentum-2026-06-13-abc12345 node examples/eval-report.mjs
//
// Env:
//   COINRITHM_API_KEY  (required)  any key with the read scope
//   DAYS               (optional)  window for the curve metrics, default 30
//   RUN_ID             (optional)  if set, fetches the run evidence bundle and
//                                  prints trace coverage + evidenceChecklist
//   BASE_URL           (optional)  default https://api.coinrithm.com
//
// What it costs: nothing — read-only calls against your PAPER account
// (virtual mUSD). Not financial advice.
//
// Zero dependencies — Node 18+ (built-in fetch) only.
// ---------------------------------------------------------------------------

const BASE = process.env.BASE_URL || "https://api.coinrithm.com";
const KEY = process.env.COINRITHM_API_KEY || process.env.CRK_API_KEY;
const DAYS = Math.min(Math.max(Number(process.env.DAYS) || 30, 1), 365);
const RUN_ID = process.env.RUN_ID || null;

if (!KEY) {
  console.error("Set COINRITHM_API_KEY (CoinRithm -> Profile -> API Keys).");
  process.exit(1);
}

const api = async (p) => {
  const res = await fetch(`${BASE}${p}`, { headers: { Authorization: `Bearer ${KEY}` } });
  let json = null;
  try { json = await res.json(); } catch {}
  if (res.status >= 400) throw new Error(`GET ${p}: HTTP ${res.status} ${JSON.stringify(json)?.slice(0, 160)}`);
  return json;
};

// --- formatting helpers ------------------------------------------------------
const W = 64; // inner card width
const fmt = (n, d = 2) =>
  n == null || !Number.isFinite(Number(n))
    ? "n/a"
    : `${Number(n) >= 0 ? "+" : ""}${Number(n).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d })}`;
const pct = (x) => (x == null ? "n/a" : `${(Number(x) * 100).toFixed(1)}%`);
const line = (l = "", r = "") => {
  const pad = Math.max(1, W - l.length - r.length);
  console.log(`│ ${l}${" ".repeat(pad)}${r} │`);
};
const rule = (c = "─") => console.log(`├${c.repeat(W + 2)}┤`);

const run = async () => {
  const [me, perf, curve, trades] = await Promise.all([
    api("/api/agent/me"),
    api("/api/agent/performance"),
    api(`/api/agent/equity-curve?granularity=realized&days=${DAYS}`),
    api("/api/agent/trades?limit=5"),
  ]);

  // --- window metrics from the realized curve (one point per realization) ---
  const points = curve.points || [];
  const pnls = points.map((p) => Number(p.realizedPnlMusd)).filter(Number.isFinite);
  const grossWin = pnls.filter((x) => x > 0).reduce((a, b) => a + b, 0);
  const grossLoss = Math.abs(pnls.filter((x) => x < 0).reduce((a, b) => a + b, 0));
  const profitFactor = grossLoss > 0 ? grossWin / grossLoss : pnls.some((x) => x > 0) ? Infinity : null;

  // Max drawdown: peak-to-trough on the cumulative realized-PnL series.
  let peak = -Infinity, maxDd = 0;
  for (const p of points) {
    const c = Number(p.cumulativeRealizedPnlMusd);
    if (!Number.isFinite(c)) continue;
    peak = Math.max(peak, c);
    maxDd = Math.max(maxDd, peak - c);
  }

  const biggestWin = pnls.length ? Math.max(...pnls) : null;
  const biggestLoss = pnls.length ? Math.min(...pnls) : null;

  // --- public Arena rank (only if the key opted in with agentName) ----------
  let arenaLine = "not opted in (set agentName + agentPublic on the key)";
  if (me.agentName) {
    try {
      const arena = await api("/api/arena?pageSize=50");
      const row = (arena.rows || []).find((r) => r.agentName === me.agentName);
      arenaLine = row
        ? `#${row.rank} of ${arena.total} (${fmt(row.realizedPnlMusd)} mUSD${row.rankDelta != null ? `, ${row.rankDelta >= 0 ? "▲" : "▼"}${Math.abs(row.rankDelta)}` : ""})`
        : `not ranked yet (needs ${arena.minDecidedTrades} decided trades + agentPublic)`;
    } catch {
      arenaLine = "arena unavailable right now";
    }
  }

  const t = perf.totals || {};
  const name = me.agentName || `key #${me.keyId}`;

  // --- the card --------------------------------------------------------------
  console.log(`\n┌${"─".repeat(W + 2)}┐`);
  line(`AGENT REPORT CARD — ${name}`.slice(0, W - 18), me.agentModel || "");
  line(`CoinRithm paper trading · all values in virtual mUSD`);
  rule("═");
  line("ALL-TIME (this key)");
  line("  Realized PnL", `${fmt(t.realizedPnlMusd)} mUSD`);
  line("  Trades (win / loss / flat)", `${t.tradeCount ?? 0}  (${t.winCount ?? 0} / ${t.lossCount ?? 0} / ${t.neutralCount ?? 0})`);
  line("  Win rate", t.winRate == null ? "n/a (no decided trades)" : pct(t.winRate));
  rule();
  line(`LAST ${DAYS} DAYS (realized curve, ${points.length} realizations)`);
  line("  Profit factor", profitFactor == null ? "n/a" : profitFactor === Infinity ? "∞ (no losses)" : profitFactor.toFixed(2));
  line("  Max drawdown", `${fmt(-maxDd)} mUSD`);
  line("  Biggest win / loss", `${fmt(biggestWin)} / ${fmt(biggestLoss)} mUSD`);
  rule();
  line("BY VENUE (all-time realized)");
  for (const v of ["spot", "futures", "pm"]) {
    const x = perf.byVenue?.[v] || {};
    line(`  ${v.padEnd(8)} ${String(x.tradeCount ?? 0).padStart(4)} trades`, `${fmt(x.realizedPnlMusd)} mUSD  wr ${x.winRate == null ? " n/a" : pct(x.winRate)}`);
  }
  rule();
  line("RECENT TRADES");
  const recent = trades.trades || [];
  if (recent.length === 0) line("  (none yet)");
  for (const tr of recent.slice(0, 5)) {
    const label = (tr.symbol || tr.market || "?").slice(0, 24);
    line(`  ${tr.venue.padEnd(7)} ${(tr.side || "").padEnd(5)} ${label}`, `${fmt(tr.realizedPnlMusd)} mUSD`);
  }
  rule();
  line("AGENT ARENA", arenaLine.slice(0, 44));

  // --- Run evidence + evidenceChecklist (only when RUN_ID is supplied) ------
  // Response shape (with runId): { apiKeyId, exportedAt, count, maxRows,
  //   run: { evidenceChecklist: { schema, overallStatus, items:[{id,label,status,detail}] },
  //          executionAssumptions: { costModel, ... }, outcomeSummary, summary, ... },
  //   data: [...ledger rows] }
  if (RUN_ID) {
    rule("─");
    line(`RUN EVIDENCE  runId=${RUN_ID}`.slice(0, W));
    try {
      const bundle = await api(`/api/agent/ledger/export?runId=${encodeURIComponent(RUN_ID)}`);
      const run = bundle.run || {};
      const ec = run.evidenceChecklist || {};
      const ea = run.executionAssumptions || {};
      line("  overallStatus",  String(ec.overallStatus ?? "n/a"));
      for (const item of (ec.items || [])) {
        line(`    [${item.status}] ${item.label}`.slice(0, W - 2), item.detail?.slice(0, 28) || "");
      }
      line("  rows in export", String(bundle.count ?? bundle.data?.length ?? 0));
      line("  costModel", (ea.costModel ?? "paper, mid/last price, no commission/slippage/funding (v1)").slice(0, W - 12));
    } catch (e) {
      line("  (run evidence unavailable)", e.message.slice(0, 36));
    }
  }

  console.log(`└${"─".repeat(W + 2)}┘`);
  console.log(`as of ${perf.asOf} · paper funds only · not financial advice\n`);
};

run().catch((e) => { console.error("FATAL", e.message); process.exit(1); });
