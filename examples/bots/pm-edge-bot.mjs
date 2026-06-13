#!/usr/bin/env node
// ---------------------------------------------------------------------------
// CoinRithm PM EDGE BOT — a complete, runnable prediction-market agent template.
//
// What it does (one full agent loop):
//   1. whoami                       — confirm the key + scopes
//   2. GET /pm/discover?sort=best   — quote-ready Kalshi/Polymarket markets
//   3. Filter on decisionSupport    — skip pinned (effectively decided), thin,
//                                     inactive, ambiguous, or wide-spread markets
//   4. POST /pm/quote (side yes|no) — entry probability, shares, eligibility,
//                                     plus the quote's own decisionSupport grade
//   5. Confirm gate                 — DEFAULT IS A DRY RUN: prints the exact
//                                     plan and exits. Set LIVE=1 to open.
//   6. POST /pm/open                — stake with a unique idempotencyKey
//   7. Poll GET /trades?venue=pm&updatedSince=<asOf> — persisted cursor in a
//      .state.json next to this file; dedupe by (venue,id); paced by
//      RateLimit-Remaining; backs off on 429 Retry-After
//   8. Report when the market settles (payout + PnL). Settlement can take
//      DAYS — the cursor is persisted, so re-running resumes the watch.
//
// How to run:
//   COINRITHM_API_KEY=crk_live_xxx node examples/bots/pm-edge-bot.mjs
//
// Env:
//   COINRITHM_API_KEY  (required)  key scopes: read (+ trade:pm for LIVE)
//   LIVE=1             (optional)  actually open the position. Default: DRY RUN —
//                                  discovery + quotes only, trades NOTHING.
//   PM_SIDE            (optional)  yes | no (default yes)
//   STAKE_MUSD         (optional)  default 25 (min 10)
//   Q                  (optional)  discovery search text (e.g. "bitcoin")
//   MIN_PROB/MAX_PROB  (optional)  entry-probability band, default 15..85 —
//                                  skips near-certain markets with no payout edge
//   POLL_SECONDS       (optional)  default 300 (settlement runs every ~5 min)
//   MAX_POLLS          (optional)  default 48 (~4h at default), then exits;
//                                  re-running RESUMES from the persisted cursor.
//   BASE_URL           (optional)  default https://api.coinrithm.com
//
// What it costs: nothing. This is PAPER trading — a 50,000 virtual-mUSD
// account. No real money, no real positions on Kalshi/Polymarket themselves,
// not financial advice.
//
// Zero dependencies — Node 18+ (built-in fetch) only.
// ---------------------------------------------------------------------------

import { readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";

// One runId per bot session — groups all ledger rows for this run so the
// evidence bundle is exportable via GET /api/agent/ledger/export?runId=RUN_ID.
const RUN_ID = `pm-edge-${new Date().toISOString().slice(0, 10)}-${randomUUID().slice(0, 8)}`;

const BASE = process.env.BASE_URL || "https://api.coinrithm.com";
const KEY = process.env.COINRITHM_API_KEY || process.env.CRK_API_KEY;
const LIVE = process.env.LIVE === "1";
const SIDE = process.env.PM_SIDE === "no" ? "no" : "yes";
const STAKE = Math.max(Number(process.env.STAKE_MUSD) || 25, 10);
const Q = process.env.Q || "";
const MIN_PROB = Number(process.env.MIN_PROB) || 15;
const MAX_PROB = Number(process.env.MAX_PROB) || 85;
const POLL_SECONDS = Number(process.env.POLL_SECONDS) || 300;
const MAX_POLLS = Number(process.env.MAX_POLLS) || 48;

const STATE_FILE = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  ".pm-edge-bot.state.json",
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
  strategyLabel: "pm-edge",
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

// --- decisionSupport gate: trade only graded, liquid, undecided markets ----
const passesGate = (ds, pinned) => {
  if (pinned) return "pinned (effectively decided)";
  if (!ds) return "no decisionSupport grade";
  if (ds.qualityTier === "low") return "qualityTier=low";
  if (ds.spreadTier === "wide") return "spreadTier=wide";
  const f = ds.flags || {};
  if (f.thinMarket) return "thinMarket";
  if (f.inactiveMarket) return "inactiveMarket";
  if (f.highAmbiguity) return "highAmbiguity";
  return null; // passes
};

// --- Settlement watch: delta-poll /trades?venue=pm with the asOf cursor ----
// PM settlement happens SERVER-SIDE when the source market resolves. Delivery
// via the cursor is at-least-once, so dedupe by (venue,id).
const watchSettlement = async (state) => {
  const pos = state.position;
  console.log(`\nWatching PM position ${pos.id} (${pos.source}/${pos.slug}, ${pos.side.toUpperCase()}) for settlement.`);
  console.log(`(polling /trades?venue=pm&updatedSince every ${POLL_SECONDS}s; cursor persisted in ${path.basename(STATE_FILE)})`);

  for (let i = 0; i < MAX_POLLS; i++) {
    const qs = state.cursor ? `?venue=pm&updatedSince=${encodeURIComponent(state.cursor)}` : "?venue=pm&limit=1";
    const j = must(await api("GET", `/api/agent/trades${qs}`), "GET /trades");
    state.cursor = j.asOf; // ALWAYS advance the cursor from the response
    const fresh = (j.trades || []).filter((t) => !state.seen.includes(`${t.venue}:${t.id}`));
    for (const t of fresh) state.seen.push(`${t.venue}:${t.id}`);
    state.seen = state.seen.slice(-200);
    saveState(state);

    if (fresh.length > 0) {
      // Something settled since the last poll — check whether it was OUR position.
      const pj = must(await api("GET", "/api/agent/positions/pm"), "GET /positions/pm");
      const mine = (pj.positions || []).find((p) => p.id === pos.id);
      if (mine && mine.status !== "open") {
        const pnl = mine.pnlMusd ?? 0;
        console.log(`\n${pnl >= 0 ? "🟢" : "🔴"} Position ${pos.id} settled: status=${mine.status} payout=${mine.payoutMusd ?? 0} mUSD, PnL=${pnl.toFixed(2)} mUSD${mine.voidReason ? ` (voided: ${mine.voidReason})` : ""}`);
        state.position = null;
        saveState(state);
        return;
      }
      console.log(`  poll ${i + 1}: ${fresh.length} new PM settlement(s), ours still open`);
    } else {
      console.log(`  poll ${i + 1}: no settlements yet (cursor=${state.cursor})`);
    }
    await sleep(POLL_SECONDS * 1000);
  }
  console.log(`\nReached MAX_POLLS=${MAX_POLLS}. Settlement can take days — cursor + position persisted, re-run to resume.`);
};

// --- Main -------------------------------------------------------------------
const run = async () => {
  console.log(`\n=== CoinRithm PM edge bot — ${LIVE ? "LIVE (a paper position WILL be opened)" : "DRY RUN (plan only — set LIVE=1 to trade)"} ===`);
  console.log(`Paper trading only: virtual mUSD, no real money.\n`);

  const state = loadState();

  // Resume: if a previous run left a position open, just keep watching it.
  if (state.position) {
    console.log(`Resuming: state file has open PM position ${state.position.id}.`);
    await watchSettlement(state);
    return;
  }

  // 1) Identity + scopes
  const me = must(await api("GET", "/api/agent/me"), "GET /me");
  const scopes = new Set(me.scopes || []);
  console.log(`1) whoami: user ${me.userId}, scopes [${[...scopes].join(", ")}]`);
  if (LIVE && !scopes.has("trade:pm")) {
    console.error("LIVE=1 needs a key with trade:pm scope. Mint one in Profile -> API Keys.");
    process.exit(1);
  }

  // 2) Discover quote-ready markets (Kalshi + Polymarket).
  //    Check meta.sourceHealth — skip stale/never_ingested sources immediately.
  const qs = `?sort=best&limit=20${Q ? `&q=${encodeURIComponent(Q)}` : ""}`;
  const disc = must(await api("GET", `/api/agent/pm/discover${qs}`), "GET /pm/discover");
  console.log(`2) discover: ${(disc.data || []).length} candidates${Q ? ` for "${Q}"` : ""}`);
  const healthySlug = new Set(
    (disc.meta?.sourceHealth || [])
      .filter((h) => h.status === "fresh")
      .map((h) => h.slug),
  );
  if (healthySlug.size === 0) {
    console.log("   No fresh PM sources right now (all stale or never_ingested). Try again later.");
    return;
  }
  console.log(`   Fresh sources: ${[...healthySlug].join(", ")}`);

  // 3+4) Gate on decisionSupport, then quote until one candidate passes.
  //      Also log observation.freshness + hash from each quote for the run record.
  let pick = null;
  for (const mkt of (disc.data || []).slice(0, 8)) {
    if (!healthySlug.has(mkt.source)) {
      console.log(`   skip ${mkt.source}/${mkt.slug} — source not fresh`);
      continue;
    }
    const outcome = (mkt.outcomes || [])[0];
    if (!outcome) continue;
    const skip = passesGate(mkt.decisionSupport, mkt.pinned);
    if (skip) {
      console.log(`   skip ${mkt.source}/${mkt.slug} — ${skip}`);
      continue;
    }
    const quote = must(
      await api("POST", "/api/agent/pm/quote", {
        source: mkt.source, slug: mkt.slug,
        outcomeExternalMarketId: outcome.externalMarketId,
        side: SIDE, stakeMusd: STAKE,
        agentTrace: trace("pm-quote", 0.5),
      }),
      "POST /pm/quote",
    );
    const freshness = quote.observation?.freshness;
    console.log(`   quote observation: freshness=${freshness?.status ?? "n/a"} hash=${quote.observation?.hash ?? "n/a"}`);
    if (freshness?.status && freshness.status !== "fresh") {
      console.log(`   skip ${mkt.source}/${mkt.slug} — quote data is ${freshness.status}`);
      continue;
    }
    if (!quote.eligible) {
      console.log(`   skip ${mkt.source}/${mkt.slug} — quote blocked: ${JSON.stringify(quote.blockReasons)}`);
      continue;
    }
    const qSkip = passesGate(quote.decisionSupport, false);
    if (qSkip) {
      console.log(`   skip ${mkt.source}/${mkt.slug} — quote grade: ${qSkip}`);
      continue;
    }
    const prob = quote.entryProbability; // 0..100
    if (!(prob >= MIN_PROB && prob <= MAX_PROB)) {
      console.log(`   skip ${mkt.source}/${mkt.slug} — entry prob ${prob} outside ${MIN_PROB}..${MAX_PROB} band`);
      continue;
    }
    pick = { mkt, outcome, quote };
    break;
  }

  if (!pick) {
    console.log("\nNo candidate passed the decisionSupport + probability gates right now. Try again later or set Q= to search a topic.");
    return;
  }

  const { mkt, outcome, quote } = pick;
  const plan = {
    source: mkt.source, slug: mkt.slug, title: mkt.title,
    outcome: outcome.name, outcomeExternalMarketId: outcome.externalMarketId,
    side: SIDE, stakeMusd: STAKE,
    entryProbability: quote.entryProbability,
    sharesEstimate: quote.sharesEstimate,
    maxPayout: quote.maxPayout,
    quality: quote.decisionSupport?.qualityTier,
  };
  console.log(`\n5) plan:\n${JSON.stringify(plan, null, 2)}`);

  if (!LIVE) {
    // DRY RUN ends here — but still demonstrate the sync cursor contract once.
    const t = must(await api("GET", "/api/agent/trades?venue=pm&limit=1"), "GET /trades");
    state.cursor = t.asOf;
    saveState(state);
    console.log(`\nDRY RUN — no position opened. (Captured /trades asOf cursor ${t.asOf} into ${path.basename(STATE_FILE)}.)`);
    console.log("Set LIVE=1 to open this position (paper funds only).");
    return;
  }

  // 6) Open. idempotencyKey is REQUIRED and unique per intent — a retry of
  //    the SAME intent must reuse the SAME key.
  const idempotencyKey = `pm-edge-${mkt.source}-${mkt.slug}-${randomUUID()}`;
  const open = must(
    await api("POST", "/api/agent/pm/open", {
      source: mkt.source, slug: mkt.slug,
      outcomeExternalMarketId: outcome.externalMarketId,
      side: SIDE, stakeMusd: STAKE, idempotencyKey,
      agentTrace: trace("pm-open", 0.5),
    }),
    "POST /pm/open",
  );
  const pos = open.position;
  console.log(`6) opened PM position ${pos.id}: ${SIDE.toUpperCase()} "${outcome.name}" @ ${pos.entryProbability} for ${STAKE} mUSD (max payout ${pos.maxPayout})`);

  // 7) Capture a fresh cursor, persist, and watch for settlement.
  const t = must(await api("GET", "/api/agent/trades?venue=pm&limit=1"), "GET /trades");
  state.cursor = t.asOf;
  state.position = { id: pos.id, source: mkt.source, slug: mkt.slug, side: SIDE };
  saveState(state);
  await watchSettlement(state);
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

run().then(() => exportRunEvidence()).catch((e) => { console.error("FATAL", e.message); process.exit(1); });
