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
  console.error("Set CRK_API_KEY (create one in the app: Settings -> API keys).");
  process.exit(1);
}

const c = (s) => s; // placeholder for future colour
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

const must = (r, label) => {
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
    const j = must(r, "me");
    return { data: j, note: `acting as user ${j.userId}, scopes [${(j.scopes || []).join(", ")}]` };
  });
  const scopes = new Set(me?.scopes || []);

  // 2) One balance + the three frozen partitions
  console.log("\n2) Wallet (the ONE balance + 3 frozen partitions)");
  await step("GET /wallet", async () => {
    const r = await api("GET", "/api/agent/wallet");
    const j = must(r);
    const usdt = (j.assets || j.wallet?.assets || []).find?.((a) => a.coinId === "825") || j;
    return { data: j, note: `available + frozen(spot/futures/pm) — keys: ${Object.keys(usdt || j).slice(0, 8).join(",")}` };
  });
  await step("GET /portfolio (equity rollup)", async () => {
    const r = await api("GET", "/api/agent/portfolio");
    must(r);
    return { note: "PII-free projection" };
  });

  // 3) Market context (thesis input)
  console.log("\n3) Market context");
  let btcCoinId = "1";
  await step("GET /resolve?symbol=BTC", async () => {
    const r = await api("GET", "/api/agent/resolve?symbol=BTC");
    const j = must(r);
    btcCoinId = j.coinId || j.ucid || btcCoinId;
    return { note: `BTC -> coinId ${btcCoinId}` };
  });
  await step(`GET /market/${btcCoinId}`, async () => {
    const r = await api("GET", `/api/agent/market/${btcCoinId}`);
    const j = must(r);
    return { note: `price=${j.priceUsd ?? j.price ?? "?"} relatedPMs=${(j.relatedPredictionMarkets || j.relatedPms || []).length ?? "?"}` };
  });

  // 4) SPOT
  console.log("\n4) Spot trade");
  if (scopes.has("trade:spot") && !DRY) {
    await step("POST /spot/order (market buy 0.0005 BTC)", async () => {
      const r = await api("POST", "/api/agent/spot/order", {
        coinId: btcCoinId,
        side: "buy",
        orderType: "market",
        quantity: 0.0005,
      });
      if (r.status >= 400) return { blocked: `HTTP ${r.status} ${JSON.stringify(r.json)}` };
      return { note: `filled @ ${r.json?.executionPrice ?? "?"}` };
    });
  } else {
    console.log(`  ⏭  spot skipped (${DRY ? "DRY" : "no trade:spot scope"})`);
  }
  await step("GET /orders/open", async () => { must(await api("GET", "/api/agent/orders/open")); return {}; });
  await step("GET /trades (unified realized-PnL log)", async () => { must(await api("GET", "/api/agent/trades")); return {}; });

  // 5) FUTURES
  console.log("\n5) Futures");
  await step("POST /futures/quote (BTC long 2x, 50 mUSD)", async () => {
    const r = await api("POST", "/api/agent/futures/quote", { coinId: btcCoinId, side: "long", leverage: 2, marginMusd: 50 });
    if (r.status >= 400) return { blocked: `HTTP ${r.status} ${JSON.stringify(r.json)}` };
    return { note: `entry≈${r.json?.entryPrice ?? "?"} liq≈${r.json?.liquidationPrice ?? "?"}` };
  });
  let futPos = null;
  if (scopes.has("trade:futures") && !DRY) {
    futPos = await step("POST /futures/open (BTC long 2x, 50 mUSD)", async () => {
      const r = await api("POST", "/api/agent/futures/open", {
        coinId: btcCoinId, side: "long", leverage: 2, marginMusd: 50,
        idempotencyKey: `demo-fut-${me?.userId}-btc-1`,
      });
      if (r.status >= 400) return { blocked: `HTTP ${r.status} ${JSON.stringify(r.json)}` };
      return { data: r.json, note: `position ${r.json?.id ?? r.json?.positionId}` };
    });
  } else {
    console.log(`  ⏭  futures open skipped (${DRY ? "DRY" : "no trade:futures scope"})`);
  }
  await step("GET /positions/futures", async () => { must(await api("GET", "/api/agent/positions/futures")); return {}; });
  const fid = futPos?.id ?? futPos?.positionId;
  if (fid && !DRY) {
    await step("POST /futures/close (full)", async () => {
      const r = await api("POST", "/api/agent/futures/close", { positionId: fid, idempotencyKey: `demo-fut-close-${fid}` });
      if (r.status >= 400) return { blocked: `HTTP ${r.status} ${JSON.stringify(r.json)}` };
      return { note: `realized pnl ${r.json?.realizedPnlMusd ?? "?"}` };
    });
  }

  // 6) PREDICTION MARKETS — the discovery gap is visible here
  console.log("\n6) Prediction markets (note: no 'tradeable markets' discovery endpoint)");
  let pm = null;
  if (process.env.PM_SOURCE && process.env.PM_SLUG && process.env.PM_OUTCOME) {
    pm = { source: process.env.PM_SOURCE, slug: process.env.PM_SLUG, outcomeExternalMarketId: process.env.PM_OUTCOME };
  } else {
    // Best-effort discovery: pull a few open kalshi/polymarket events from the
    // PUBLIC list and probe each with /pm/quote until one is tradeable. This is
    // exactly the friction an agent hits today — there is no tradeable filter.
    await step("Discover a tradeable market (probing public open markets)", async () => {
      const candidates = [];
      for (const src of ["kalshi", "polymarket"]) {
        const r = await fetch(`${BASE}/api/prediction-markets?status=open&source=${src}&limit=15`).catch(() => null);
        const j = r && r.ok ? await r.json().catch(() => null) : null;
        const events = j?.events || j?.data || j?.markets || [];
        for (const e of events) {
          const out = (e.outcomes || [])[0];
          if (e.slug && out?.externalMarketId) candidates.push({ source: src, slug: e.slug, outcomeExternalMarketId: out.externalMarketId });
        }
      }
      if (candidates.length === 0) return { blocked: "could not read public PM list (shape unknown) — set PM_SOURCE/PM_SLUG/PM_OUTCOME to demo PM" };
      let probed = 0, tradeableFound = 0;
      for (const cand of candidates.slice(0, 12)) {
        const q = await api("POST", "/api/agent/pm/quote", { ...cand, stakeMusd: 50 });
        probed++;
        if (q.status < 400 && (q.json?.tradeable ?? q.json?.eligible ?? !q.json?.blockReasons?.length)) {
          tradeableFound++;
          if (!pm) pm = cand;
        }
      }
      return { note: `probed ${probed} open markets -> ${tradeableFound} tradeable (the rest are gate-blocked; this is the discovery gap)` };
    });
  }
  if (pm) {
    await step(`POST /pm/quote (${pm.source}/${pm.slug})`, async () => {
      const r = await api("POST", "/api/agent/pm/quote", { ...pm, stakeMusd: 50 });
      if (r.status >= 400) return { blocked: `HTTP ${r.status} ${JSON.stringify(r.json)}` };
      return { note: `shares≈${r.json?.shares ?? r.json?.sharesMusd ?? "?"} prob=${r.json?.currentProbability ?? "?"}` };
    });
    if (scopes.has("trade:pm") && !DRY) {
      await step("POST /pm/open (50 mUSD)", async () => {
        const r = await api("POST", "/api/agent/pm/open", { ...pm, stakeMusd: 50, idempotencyKey: `demo-pm-${me?.userId}-1` });
        if (r.status >= 400) return { blocked: `HTTP ${r.status} ${JSON.stringify(r.json)}` };
        return { note: `position ${r.json?.id}` };
      });
    } else {
      console.log(`  ⏭  pm open skipped (${DRY ? "DRY" : "no trade:pm scope"})`);
    }
  }
  await step("GET /positions/pm", async () => { must(await api("GET", "/api/agent/positions/pm")); return {}; });

  // 7) Performance / equity curve (how an agent measures itself)
  console.log("\n7) Self-measurement");
  await step("GET /equity-curve", async () => { must(await api("GET", "/api/agent/equity-curve")); return {}; });
  await step("GET /performance", async () => { must(await api("GET", "/api/agent/performance")); return {}; });

  console.log(`\n=== done: ${pass} ok, ${blocked} blocked, ${fail} errored ===`);
  if (blocked) console.log("Blocked steps are the real gaps to close (esp. PM tradeable-market discovery).");
};

run().catch((e) => { console.error("FATAL", e); process.exit(1); });
