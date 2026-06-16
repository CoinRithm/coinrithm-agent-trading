// NVIDIA NIM probe (Probe-First). Runs the agent's REAL system prompt + a live
// observation through candidate free NIM models and checks each emits a valid
// `Decision` (via the same parseDecision the runner uses). Tells us which free
// model to ship the house agents on — without touching the runner.
//
// SECURITY: the key is read from a file path arg or NVIDIA_API_KEY env and is
// NEVER printed. Save your key to a throwaway file, e.g. C:\tmp\nvidia_key.txt,
// then: node scripts/nim-probe.mjs C:\tmp\nvidia_key.txt   (delete it after).
//
// Build dist first: npm run build

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { loadAgent } from "../dist/agent/skill.js";
import { buildSystemPrompt, buildUserPrompt } from "../dist/agent/prompt.js";
import { parseDecision } from "../dist/agent/decision.js";

const BASE = "https://integrate.api.nvidia.com/v1";
const TRIALS = 3;
const MAX_TOKENS = 4096; // generous so reasoning models don't truncate before JSON

// Candidate free-endpoint model ids. Wrong ids just report `model_not_found` —
// edit this list as needed. (ids per build.nvidia.com model cards.)
const MODELS = (process.env.PROBE_MODELS || "meta/llama-3.3-70b-instruct,meta/llama-3.1-8b-instruct")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
// Disqualified: nvidia/nemotron-3-ultra-550b-a55b (~60s + thinking tokens corrupt
// the JSON — a reasoning model is the wrong tool for a fast trade-decide).
// Override with PROBE_MODELS="meta/llama-3.1-8b-instruct" to probe one fast.

function getKey() {
  const fromEnv = process.env.NVIDIA_API_KEY;
  if (fromEnv && fromEnv.trim()) return fromEnv.trim();
  const path = process.argv[2];
  if (path) {
    try {
      const k = readFileSync(path, "utf8").trim();
      if (k) return k;
    } catch (e) {
      console.error(`could not read key file ${path}: ${e.message}`);
      process.exit(1);
    }
  }
  console.error("usage: node scripts/nim-probe.mjs <key-file>   (or set NVIDIA_API_KEY). Key is never printed.");
  process.exit(1);
}

const key = getKey();
const here = dirname(fileURLToPath(import.meta.url));
// Optional 2nd arg = agent folder name (default Mia). Lets us probe an agent
// whose strategy WOULD act (e.g. leo-breakout-hunter) to exercise the ACT path.
const agentName = process.argv[3] || "mia-trend-rider";
const agentPath = join(here, "..", "..", "..", "examples", "agents", agentName);

const { spec, body } = loadAgent(agentPath, "self-host");
const system = buildSystemPrompt(spec, body);

// Two scenarios: a calm tape (mild momentum -> expect skip) and a strong tape
// (big momentum -> exercises the ACT path, so we verify the futures_open / spot
// action JSON parses, not just the skip JSON). Coherent with the agent's own
// watchlist + venues.
function buildUser(regime) {
  const strong = regime === "strong";
  const watch = spec.risk.watchlist.map((symbol, i) => ({
    symbol,
    coinId: String(i + 1),
    name: symbol,
    priceUsd: i === 0 ? 67412.5 : 1000 * (i + 1),
    change1h: i === 0 ? (strong ? 3.8 : 0.9) : strong ? 1.2 : 0.2,
    change24h: i === 0 ? (strong ? 11.5 : 2.4) : strong ? 4.0 : 0.6,
    change7d: i === 0 ? (strong ? 18 : 6.1) : strong ? 7 : 1.2,
    freshness: { status: "fresh", ageSeconds: 14 },
  }));
  return buildUserPrompt({
    asOf: "2026-06-16T13:41:00Z",
    scopes: ["read", "trade:futures", "trade:spot"],
    cashAvailableMusd: 49000,
    equityMusd: 50000,
    openPositions: [],
    openOrders: [],
    pmPositions: [],
    pmMarkets: [],
    watch,
    syncCursor: null,
    newClosedTrades: [],
    polledBeforeWrite: true,
  });
}
const SCENARIOS = [
  { name: "calm tape (mild momentum — skip is correct)", regime: "calm" },
  { name: "strong tape (big momentum — exercises ACT-path JSON)", regime: "strong" },
];

console.log(`probe: agent=${spec.name} venues=[${spec.venues.join(",")}] systemPrompt=${system.length} chars`);

async function callModel(model, jsonMode, user) {
  const reqBody = {
    model,
    temperature: 0.2,
    max_tokens: MAX_TOKENS,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  };
  if (jsonMode) reqBody.response_format = { type: "json_object" };
  const t0 = Date.now();
  let res;
  try {
    res = await fetch(`${BASE}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify(reqBody),
    });
  } catch (e) {
    return { httpOk: false, status: 0, ms: Date.now() - t0, err: e.message };
  }
  const ms = Date.now() - t0;
  const raw = await res.text();
  if (!res.ok) return { httpOk: false, status: res.status, ms, err: raw.slice(0, 300) };
  let content = "";
  try {
    content = JSON.parse(raw).choices?.[0]?.message?.content ?? "";
  } catch {
    return { httpOk: false, status: res.status, ms, err: "response not JSON envelope" };
  }
  return { httpOk: true, status: res.status, ms, content };
}

function looksLikeJsonModeRejection(err) {
  return /response_format|json_object|guided|not supported|unsupported|invalid/i.test(err || "");
}

for (const scenario of SCENARIOS) {
  const user = buildUser(scenario.regime);
  console.log(`\n── ${scenario.name} ──`);
  for (const model of MODELS) {
    let pass = 0;
    let usedJsonMode = true;
    const latencies = [];
    const samples = [];
    let lastErr = "";
    for (let t = 0; t < TRIALS; t++) {
      let r = await callModel(model, usedJsonMode, user);
      // If the model rejects JSON mode, fall back to prompt-only (parseDecision strips fences).
      if (!r.httpOk && usedJsonMode && looksLikeJsonModeRejection(r.err)) {
        usedJsonMode = false;
        r = await callModel(model, false, user);
      }
      if (!r.httpOk) {
        lastErr = `HTTP ${r.status} ${r.err}`;
        continue;
      }
      latencies.push(r.ms);
      const parsed = parseDecision(r.content);
      if (parsed.ok) {
        pass++;
        const acts = parsed.decision.actions.map((a) => a.type).join(",") || "(none)";
        samples.push(`${parsed.decision.decision}${acts !== "(none)" ? ` [${acts}]` : ""}`);
      } else {
        lastErr = `parse: ${parsed.error}`.slice(0, 160);
        samples.push("PARSE_FAIL");
      }
    }
    const avg = latencies.length ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;
    const verdict = pass === TRIALS ? "✓ PASS" : pass > 0 ? "~ FLAKY" : "✗ FAIL";
    console.log(
      `${verdict}  ${model}\n` +
        `        decisions: ${pass}/${TRIALS} valid · jsonMode=${usedJsonMode} · ~${avg}ms · ${samples.join(" | ") || "—"}` +
        (pass < TRIALS ? `\n        last issue: ${lastErr}` : ""),
    );
  }
}
console.log("\nShip the house agents on the fastest ✓ PASS model; reject any model that ever PARSE_FAILs.");
