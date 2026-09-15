// Real child processes + real loopback HTTP; execution ledger is a fixture.
// No provider, CoinRithm production service or trading account is contacted.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { writeFileSync, readFileSync } from "node:fs";
import { once } from "node:events";
import { randomUUID } from "node:crypto";

writeFileSync(
  "cycle-child.mjs",
  `
  import { CoinRithmClient, buildSpec, loadState, runCycle } from '@coinrithm/mcp-trading/engine';
  import { writeFileSync } from 'node:fs';
  const [baseUrl, stateFile, output] = process.argv.slice(2);
  const spec = buildSpec({ name: 'restart fixture', venues: ['futures'],
    trigger: { cadence: '1m' }, triggerPolicy: { mode: 'always' },
    risk: { maxLeverage: 2, perTradeMarginMusd: 50, maxConcurrentPositions: 2,
      requireStopLoss: true, watchlist: ['BTC'] },
    limits: { maxTradesPerDay: 3, maxWritesPerCycle: 1, maxOpenMarginMusd: 100 },
  });
  const state = loadState(stateFile, 'new-process-' + process.pid);
  const result = await runCycle({ spec, state, stateFile, live: true, mergedProse: 'offline fixture',
    client: new CoinRithmClient({ apiKey: 'offline-fixture', baseUrl, requestTimeoutMs: 3000 }),
    provider: { label: 'fixture', decide: async () => ({ ok: true, text: JSON.stringify({
      decision: 'act', confidence: 0.8, actions: [{ type: 'futures_open', symbol: 'BTC', side: 'long',
        leverage: 2, marginMusd: 50, stopLossPrice: 60000, confidence: 0.8 }],
    }) }) },
  });
  writeFileSync(output, JSON.stringify({ result, state }));
`,
);

for (const failure of ["lost-response", "killed-before-response"]) {
  const ledger = new Map();
  const requests = [];
  let child;
  let errorOutput = "";
  let phase = 0;
  let visible = false;
  const server = createServer(async (req, res) => {
    try {
      let raw = "";
      for await (const part of req) raw += part;
      const path = new URL(req.url, "http://fixture.invalid").pathname;
      const json = (value) => {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify(value));
      };
      if (path === "/api/agent/me")
        return json({ scopes: ["read", "trade:futures"] });
      if (path === "/api/agent/portfolio")
        return json({ equity: { totalUsd: 50000, availableUsd: 1000 } });
      if (path === "/api/agent/wallet")
        return json({ usdt: { available: 1000 } });
      if (path === "/api/agent/trades")
        return json({ asOf: new Date().toISOString(), trades: [] });
      if (path === "/api/agent/ledger/export") return json({ trades: [] });
      if (path === "/api/agent/positions/futures")
        return json({ positions: visible ? [...ledger.values()] : [] });
      if (path === "/api/agent/resolve")
        return json({ match: { coinId: "1", name: "Bitcoin" } });
      if (path === "/api/agent/market/1")
        return json({
          price: { usd: 67000 },
          observation: { freshness: { status: "fresh", ageSeconds: 0 } },
        });
      if (path === "/api/agent/futures/quote")
        return json({
          eligible: true,
          entryPrice: 67000,
          liquidationPrice: 60000,
          observation: { freshness: { status: "fresh" } },
        });
      if (path === "/api/agent/futures/open") {
        const body = JSON.parse(raw);
        requests.push(body.idempotencyKey);
        if (!ledger.has(body.idempotencyKey))
          ledger.set(body.idempotencyKey, {
            id: ledger.size + 1,
            status: "open",
            coinId: "1",
            symbol: "BTC",
            side: "long",
            marginMusd: 50,
            unrealizedPnlMusd: 0,
          });
        if (phase === 0) {
          if (failure === "killed-before-response") child.kill("SIGKILL");
          res.destroy();
          return;
        }
        visible = true;
        return json({ position: ledger.get(body.idempotencyKey) });
      }
      throw new Error("Unexpected fixture request: " + req.method + " " + path);
    } catch (error) {
      errorOutput += String(error);
      res.writeHead(500);
      res.end();
    }
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const baseUrl = "http://127.0.0.1:" + server.address().port;
  const unique = randomUUID();
  const stateFile = failure + unique + " state.json";
  const output = failure + unique + " result.json";
  const run = async () => {
    child = spawn(
      process.execPath,
      ["cycle-child.mjs", baseUrl, stateFile, output],
      { windowsHide: true },
    );
    child.stderr.on("data", (chunk) => {
      errorOutput += chunk;
    });
    const timeout = setTimeout(() => child.kill("SIGKILL"), 15_000);
    try {
      return (await once(child, "close"))[0];
    } finally {
      clearTimeout(timeout);
    }
  };
  try {
    const firstCode = await run();
    if (failure === "lost-response") {
      assert.equal(firstCode, 0, errorOutput);
      const { result, state } = JSON.parse(readFileSync(output));
      assert.equal(result.planned[0].executed, false);
      assert.equal(state.writesToday, 0);
      assert.equal(state.journal?.length ?? 0, 0);
    } else assert.notEqual(firstCode, 0);
    assert.equal(
      requests.length,
      1,
      "transport failure must not be replayed by the client",
    );
    assert.equal(ledger.size, 1);
    const initial = JSON.parse(readFileSync(stateFile));
    assert.equal(initial.writesToday, 0);
    phase = 1;
    // Deliberately lagged positions read: the model repeats the intent after
    // restart, exercising the stable key against the fixture's dedupe ledger.
    assert.equal(await run(), 0, errorOutput);
    const recovered = JSON.parse(readFileSync(output));
    assert.equal(recovered.state.runId, initial.runId);
    assert.equal(recovered.result.planned[0].executed, true);
    assert.equal(recovered.state.writesToday, 1);
    assert.equal(recovered.state.riskIncreasesToday, 1);
    assert.equal(requests.length, 2);
    assert.equal(
      requests[0],
      requests[1],
      "restart must reuse the ambiguous intent key",
    );
    assert.equal(
      ledger.size,
      1,
      "only one opening in the fixture execution ledger",
    );
    // Fresh position reconciliation blocks a third duplicate intent.
    assert.equal(await run(), 0, errorOutput);
    const reconciled = JSON.parse(readFileSync(output));
    assert.equal(reconciled.result.planned[0].code, "duplicate_intent");
    assert.equal(reconciled.state.writesToday, 1);
    assert.equal(requests.length, 2);
    assert.equal(errorOutput, "");
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
  console.log("Restart lifecycle passed: " + failure);
}
