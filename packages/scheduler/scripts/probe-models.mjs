// Live latency + JSON-reliability probe for NVIDIA NIM models, sized for the
// hosted trading agent's decision loop. Reads the key from NVIDIA_API_KEY in the
// ENV ONLY (never an argument, never printed, never committed). Run:
//   NVIDIA_API_KEY=$(cat /path/to/key) node scripts/probe-models.mjs
//
// For each model it sends a realistic strict-JSON trading-decision prompt
// (response_format=json_object, the same shape the runner uses), times N runs,
// and reports median latency + whether the output parsed as JSON. A model whose
// median latency approaches a cadence is unusable at that cadence.

// Provider-agnostic: PROBE_PROVIDER=nvidia (default) | groq. Both are
// OpenAI-compatible; only the base URL + key env + candidate models differ.
const PROVIDER = (process.env.PROBE_PROVIDER || "nvidia").trim().toLowerCase();
const PROVIDERS = {
  nvidia: {
    base: "https://integrate.api.nvidia.com/v1",
    keyEnv: "NVIDIA_API_KEY",
    models: [
      { id: "nvidia/nemotron-3-super-120b-a12b" },
      { id: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning" },
      { id: "nvidia/nemotron-3.5-lightning-30b-a3b" },
      { id: "nvidia/nemotron-3-ultra-550b-a55b" },
      { id: "nvidia/nemotron-3-nano-30b-a3b" },
    ],
  },
  groq: {
    base: "https://api.groq.com/openai/v1",
    keyEnv: "GROQ_API_KEY",
    models: [
      { id: "llama-3.3-70b-versatile" },
      { id: "llama-3.1-8b-instant" },
      { id: "openai/gpt-oss-20b" },
      { id: "moonshotai/kimi-k2-instruct" },
      { id: "qwen/qwen3-32b" },
    ],
  },
};
const CONF = PROVIDERS[PROVIDER];
if (!CONF) {
  console.error(`unknown PROBE_PROVIDER "${PROVIDER}" — use nvidia or groq.`);
  process.exit(1);
}
const KEY = process.env[CONF.keyEnv]?.trim();
if (!KEY) {
  console.error(`${CONF.keyEnv} not set in env — refusing to run.`);
  process.exit(1);
}
const BASE = CONF.base;
const RUNS = Number(process.env.PROBE_RUNS || 2);
const MAX_TOKENS = 512;

// Candidate models for the selected provider. Nemotron's two entries (NVIDIA)
// measure reasoning-on vs the "detailed thinking off" toggle for the same model.
const MODELS = CONF.models;

const SYS_BASE =
  "You are a crypto paper-trading agent. Respond with ONE JSON object and nothing else: " +
  '{"decision":"act"|"skip","rationale":"1-2 sentence reason","confidence":0..1,' +
  '"actions":[{"type":"open","symbol":"BTC","side":"long"|"short","marginMusd":number,"leverage":number}]}. ' +
  "No text outside the JSON.";
const USER =
  "Market now: BTC $67,200 (+2.1% 24h), ETH $3,140 (-0.8%), SOL $151 (+5.4%). " +
  "Balance 50000 mUSD, no open positions. Watchlist BTC, ETH, SOL. Make your decision.";

function median(xs) {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

async function callOnce(model, system) {
  const sys = system ? `${system}\n\n${SYS_BASE}` : SYS_BASE;
  const t0 = Date.now();
  let res;
  try {
    res = await fetch(`${BASE}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "content-type": "application/json" },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: MAX_TOKENS,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: sys },
          { role: "user", content: USER },
        ],
      }),
    });
  } catch (e) {
    return { ok: false, ms: Date.now() - t0, err: `network: ${e.message}` };
  }
  const ms = Date.now() - t0;
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return { ok: false, ms, err: `HTTP ${res.status}: ${body.slice(0, 140)}` };
  }
  const json = await res.json().catch(() => null);
  const text = json?.choices?.[0]?.message?.content ?? "";
  const completionTokens = json?.usage?.completion_tokens ?? null;
  let jsonValid = false;
  try {
    const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    const obj = JSON.parse(cleaned);
    jsonValid = obj && typeof obj === "object" && "decision" in obj;
  } catch {
    jsonValid = false;
  }
  return { ok: true, ms, jsonValid, completionTokens, sample: text.slice(0, 90).replace(/\s+/g, " ") };
}

async function probe(m) {
  const label = m.label || m.id;
  const lat = [];
  let jsonOk = 0,
    runs = 0,
    lastErr = null,
    tokens = null,
    sample = "";
  for (let i = 0; i < RUNS; i++) {
    const r = await callOnce(m.id, m.system);
    runs++;
    if (!r.ok) {
      lastErr = r.err;
      break; // a 404/401 won't change across runs — stop hammering
    }
    lat.push(r.ms);
    if (r.jsonValid) jsonOk++;
    tokens = r.completionTokens ?? tokens;
    sample = r.sample;
    await new Promise((res) => setTimeout(res, 1500)); // space calls (shared 40 rpm)
  }
  return {
    label,
    available: lat.length > 0,
    medianMs: lat.length ? Math.round(median(lat)) : null,
    minMs: lat.length ? Math.min(...lat) : null,
    maxMs: lat.length ? Math.max(...lat) : null,
    jsonRate: lat.length ? `${jsonOk}/${lat.length}` : "-",
    completionTokens: tokens,
    err: lastErr,
    sample,
  };
}

(async () => {
  console.log(`Probing ${PROVIDER} (${MODELS.length} models, ${RUNS} runs each), ~300-tok JSON decision prompt\n`);
  const rows = [];
  for (const m of MODELS) {
    const r = await probe(m);
    rows.push(r);
    const lat = r.available ? `${(r.medianMs / 1000).toFixed(1)}s (min ${(r.minMs / 1000).toFixed(1)} / max ${(r.maxMs / 1000).toFixed(1)})` : "—";
    console.log(
      `${r.available ? "✓" : "✗"} ${r.label.padEnd(42)} ` +
        `median ${lat.padEnd(34)} json ${String(r.jsonRate).padEnd(5)} ` +
        `tok ${String(r.completionTokens ?? "?").padEnd(5)}` +
        (r.err ? ` ERR ${r.err}` : ""),
    );
  }
  console.log("\n--- machine-readable ---");
  console.log(JSON.stringify(rows, null, 2));
})();
