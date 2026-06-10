#!/usr/bin/env node
// CoinRithm agent-trading END-TO-END DEMO / SELF-TEST.
//
// Drives the full agent surface with a real API key and narrates every step so
// you can SEE what a trading agent actually does — and where it gets blocked.
// No dependencies (Node 18+ global fetch).
//
//   CRK_API_KEY=crk_live_xxx node examples/demo-run.mjs
//
// Env:
//   CRK_API_KEY   (required)  your agent key (scopes: read + trade:spot/futures/pm)
//   BASE_URL      (optional)  default https://api.coinrithm.com
//   DRY=1         (optional)  reads + quotes only, place NO orders (default: places tiny test trades)
//   PM_SOURCE / PM_SLUG / PM_OUTCOME (optional) a specific PM market to trade
//
// It is intentionally small-stakes and idempotent; paper funds only.

const BASE = process.env.BASE_URL || "https://api.coinrithm.com";
const KEY = process.env.CRK_API_KEY;
const DRY = process.env.DRY === "1";
if (!KEY) {
  console.error("Set CRK_API_KEY (create one in the app: Profile -> API Keys).");
  process.exit(1);
}

let pass = 0,
  fail = 0,
  blocked = 0;

const api = async (method, path, body) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${KEY}`,
      "content-type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {}
  return { status: res.status, json };
};

const step = async (label, fn) => {
  try {
    const out = await fn();
    if (out?.blocked) {
      blocked++;
      console.log(`  ⚠️  ${label}: ${out.blocked}`);
    } else {
      pass++;
      console.log(`  ✅ ${label}${out?.note ? ` — ${out.note}` : ""}`);
    }
    return out?.data;
  } catch (e) {
    fail++;
    console.log(`  ❌ ${label}: ${e.message}`);
    return null;
  }
};

const must = (r) => {
  if (r.status >= 400)
    throw new Error(`HTTP ${r.status} ${JSON.stringify(r.json)?.slice(0, 160)}`);
  return r.json;
};

const run = async () => {
  console.log(`\n=== CoinRithm agent demo @ ${BASE} (${DRY ? "DRY — reads only" : "LIVE — tiny test trades"}) ===\n`);

  // 1) Identity
  console.log("1) Identity & capability");
  const me = await step("GET /me", async () => {
    const r = await api("GET", "/api/agent/me");
    const j = must(r);
    return { data: j, note: `acting as user ${j.userId}, scopes [${(j.scopes || []).join(", ")}], agentName=${j.agentName ?? "-"}, agentModel=${j.agentModel ?? "-"}` };
  });
  const scopes = new Set(me?.scopes || []);

  // 2) One balance + the three frozen partitions
  console.log("\n2) Wallet (the ONE balance + 3 frozen partitions)");
  await step("GET /wallet", async () => {
    const r = await api("GET", "/api/agent/wallet");
    const j = must(r);
    const u = j.usdt || {};
    return { data: j, note: `available=${u.available ?? "?"} frozen(spot)=${u.frozen ?? "?"} frozenFutures=${u.frozenFutures ?? "?"} frozenPm=${u.frozenPm ?? "?"}` };
  });
  await step("GET /portfolio (equity rollup)", async () => {
    const r = await api("GET", "/api/agent/portfolio");
    const j = must(r);
    return { note: `equity.totalUsd=${j.equity?.totalUsd ?? "?"} (PII-free projection)` };
  });

  // 3) Market context (thesis input)
  console.log("\n3) Market context");
  let btcCoinId = "1";
  await step("GET /resolve?q=BTC", async () => {
    const r = await api("GET", "/api/agent/resolve?q=BTC");
    const j = must(r);
    btcCoinId = j.match?.coinId || btcCoinId;
    return { note: `BTC -> coinId ${btcCoinId} (${j.match?.name ?? "?"})` };
  });
  await step(`GET /market/${btcCoinId}`, async () => {
    const r = await api("GET", `/api/agent/market/${btcCoinId}`);
    const j = must(r);
    return { note: `price=${j.price?.usd ?? "?"} relatedPMs=${(j.relatedMarkets || []).length}` };
  });

  // 4) SPOT
  console.log("\n4) Spot trade");
  await step("POST /spot/quote (buy 0.0005 BTC)", async () => {
    const r = await api("POST", "/api/agent/spot/quote", { coinId: btcCoinId, side: "buy", quantity: 0.0005 });
    if (r.status >= 400) return { blocked: `HTTP ${r.status} ${JSON.stringify(r.json)}` };
    return { note: `eligible=${r.json?.eligible} px=${r.json?.executionPrice ?? "?"} cost≈${r.json?.estimatedCostMusd ?? "?"}` };
  });
  if (scopes.has("trade:spot") && !DRY) {
    await step("POST /spot/order (market buy 0.0005 BTC)", async () => {
      const r = await api("POST", "/api/agent/spot/order", {
        coinId: btcCoinId,
        side: "buy",
        orderType: "market",
        quantity: 0.0005,
        // REQUIRED for API-key callers; unique per intent (reuse replays).
        idempotencyKey: `demo-spot-${me?.userId}-${Date.now()}`,
      });
      if (r.status >= 400) return { blocked: `HTTP ${r.status} ${JSON.stringify(r.json)}` };
      return { note: `filled @ ${r.json?.summary?.executionPrice ?? "?"}` };
    });
  } else {
    console.log(`  ⏭  spot skipped (${DRY ? "DRY" : "no trade:spot scope"})`);
  }
  await step("GET /orders/open (all coins)", async () => {
    const j = must(await api("GET", "/api/agent/orders/open"));
    return { note: `${(j.rows || []).length} open, asOf=${j.asOf}` };
  });

  // 5) FUTURES — open with SL/TP protection, then adjust + clear via /sl-tp
  console.log("\n5) Futures (open + resting SL/TP)");
  let quote = null;
  await step("POST /futures/quote (BTC long 2x, 50 mUSD)", async () => {
    const r = await api("POST", "/api/agent/futures/quote", { coinId: btcCoinId, side: "long", leverage: 2, marginMusd: 50 });
    if (r.status >= 400) return { blocked: `HTTP ${r.status} ${JSON.stringify(r.json)}` };
    quote = r.json;
    return { note: `entry≈${r.json?.entryPrice ?? "?"} liq≈${r.json?.liquidationPrice ?? "?"}` };
  });
  let futPos = null;
  if (scopes.has("trade:futures") && !DRY) {
    futPos = await step("POST /futures/open (long 2x, 50 mUSD, SL/TP set at open)", async () => {
      // Open-time SL/TP corridor for a long: liq < SL < mark < TP.
      const entry = quote?.entryPrice;
      const liq = quote?.liquidationPrice;
      const body = {
        coinId: btcCoinId, side: "long", leverage: 2, marginMusd: 50,
        idempotencyKey: `demo-fut-${me?.userId}-btc-${Date.now()}`,
      };
      if (Number.isFinite(entry) && Number.isFinite(liq)) {
        body.stopLossPrice = liq + (entry - liq) * 0.5; // halfway between liq and entry
        body.takeProfitPrice = entry * 1.05;
      }
      const r = await api("POST", "/api/agent/futures/open", body);
      if (r.status >= 400) return { blocked: `HTTP ${r.status} ${JSON.stringify(r.json)}` };
      const p = r.json?.position;
      return { data: p, note: `position ${p?.id} SL=${p?.stopLossPrice ?? "-"} TP=${p?.takeProfitPrice ?? "-"}` };
    });
  } else {
    console.log(`  ⏭  futures open skipped (${DRY ? "DRY" : "no trade:futures scope"})`);
  }
  await step("GET /positions/futures", async () => {
    const j = must(await api("GET", "/api/agent/positions/futures"));
    return { note: `asOf=${j.asOf ?? "?"} (pass back as updatedSince to delta-poll)` };
  });
  const fid = futPos?.id;
  if (fid && !DRY) {
    await step("POST /futures/sl-tp (tighten TP; no idempotencyKey needed)", async () => {
      const entry = futPos?.entryPrice;
      const r = await api("POST", "/api/agent/futures/sl-tp", {
        positionId: fid,
        takeProfitPrice: Number.isFinite(entry) ? entry * 1.03 : undefined,
      });
      if (r.status >= 400) return { blocked: `HTTP ${r.status} ${JSON.stringify(r.json)}` };
      return { note: `TP -> ${r.json?.position?.takeProfitPrice ?? "?"}` };
    });
    await step("POST /futures/sl-tp (clear both triggers with null)", async () => {
      const r = await api("POST", "/api/agent/futures/sl-tp", {
        positionId: fid, stopLossPrice: null, takeProfitPrice: null,
      });
      if (r.status >= 400) return { blocked: `HTTP ${r.status} ${JSON.stringify(r.json)}` };
      return { note: "cleared — worker will no longer fire on this position" };
    });
    await step("POST /futures/close (full)", async () => {
      const r = await api("POST", "/api/agent/futures/close", { positionId: fid, idempotencyKey: `demo-fut-close-${fid}` });
      if (r.status >= 400) return { blocked: `HTTP ${r.status} ${JSON.stringify(r.json)}` };
      return { note: `realized pnl ${r.json?.position?.realizedPnlMusd ?? "?"}` };
    });
  }

  // 6) PREDICTION MARKETS — discover -> quote -> open
  console.log("\n6) Prediction markets (GET /pm/discover finds quote-ready markets)");
  let pm = null;
  if (process.env.PM_SOURCE && process.env.PM_SLUG && process.env.PM_OUTCOME) {
    pm = { source: process.env.PM_SOURCE, slug: process.env.PM_SLUG, outcomeExternalMarketId: process.env.PM_OUTCOME };
  } else {
    await step("GET /pm/discover?sort=best&limit=5", async () => {
      const r = await api("GET", "/api/agent/pm/discover?sort=best&limit=5");
      const j = must(r);
      const m = (j.data || []).find((x) => !x.pinned && (x.outcomes || []).length) || (j.data || [])[0];
      if (!m) return { blocked: "discovery returned no quote-ready markets right now" };
      pm = { source: m.source, slug: m.slug, outcomeExternalMarketId: m.outcomes[0].externalMarketId };
      return { note: `${(j.data || []).length} candidates; picked ${m.source}/${m.slug} ("${(m.title || "").slice(0, 50)}")` };
    });
  }
  if (pm) {
    await step(`POST /pm/quote (${pm.source}/${pm.slug})`, async () => {
      const r = await api("POST", "/api/agent/pm/quote", { ...pm, stakeMusd: 50 });
      if (r.status >= 400) return { blocked: `HTTP ${r.status} ${JSON.stringify(r.json)}` };
      return { note: `eligible=${r.json?.eligible} shares≈${r.json?.sharesEstimate ?? "?"} entryProb=${r.json?.entryProbability ?? "?"}` };
    });
    if (scopes.has("trade:pm") && !DRY) {
      await step("POST /pm/open (50 mUSD)", async () => {
        const r = await api("POST", "/api/agent/pm/open", { ...pm, stakeMusd: 50, idempotencyKey: `demo-pm-${me?.userId}-${Date.now()}` });
        if (r.status >= 400) return { blocked: `HTTP ${r.status} ${JSON.stringify(r.json)}` };
        return { note: `position ${r.json?.position?.id}` };
      });
    } else {
      console.log(`  ⏭  pm open skipped (${DRY ? "DRY" : "no trade:pm scope"})`);
    }
  }
  await step("GET /positions/pm", async () => { must(await api("GET", "/api/agent/positions/pm")); return {}; });

  // 7) Stay in sync: updatedSince delta polling (how an agent notices
  //    worker-fired SL/TP, liquidations, and PM settlements between turns).
  console.log("\n7) Delta polling (updatedSince/asOf cursor)");
  let cursor = null;
  await step("GET /trades (full log; capture asOf)", async () => {
    const j = must(await api("GET", "/api/agent/trades"));
    cursor = j.asOf;
    return { note: `${j.count ?? (j.trades || []).length} closed trades, asOf=${cursor}` };
  });
  await step("GET /trades?updatedSince=<asOf> (only NEW closes)", async () => {
    const j = must(await api("GET", `/api/agent/trades?updatedSince=${encodeURIComponent(cursor)}`));
    return { note: `${j.count ?? (j.trades || []).length} since cursor (expected 0 unless something just fired)` };
  });

  // 8) Performance / equity curve / arena (how an agent measures itself)
  console.log("\n8) Self-measurement + Arena");
  await step("GET /equity-curve (daily)", async () => { must(await api("GET", "/api/agent/equity-curve")); return {}; });
  await step("GET /equity-curve?granularity=realized (intraday)", async () => {
    const j = must(await api("GET", "/api/agent/equity-curve?granularity=realized"));
    return { note: `${(j.points || []).length} realization points` };
  });
  await step("GET /performance", async () => {
    const j = must(await api("GET", "/api/agent/performance"));
    return { note: `realized total ${j.totals?.realizedPnlMusd ?? "?"} mUSD, winRate=${j.totals?.winRate ?? "n/a"}` };
  });
  await step("GET /api/arena (public leaderboard)", async () => {
    const j = must(await api("GET", "/api/arena?pageSize=5"));
    const top = (j.rows || [])[0];
    return { note: `top: ${top?.agentName ?? "?"} (${top?.realizedPnlMusd ?? "?"} mUSD, min ${j.minDecidedTrades} decided to rank)` };
  });

  console.log(`\n=== done: ${pass} ok, ${blocked} blocked, ${fail} errored ===`);
};

run().catch((e) => { console.error("FATAL", e); process.exit(1); });
