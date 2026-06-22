// Live latency + JSON-reliability probe for NVIDIA NIM models, sized for the
// hosted trading agent's decision loop. Reads the key from NVIDIA_API_KEY in the
// ENV ONLY (never an argument, never printed, never committed). Run:
//   NVIDIA_API_KEY=$(cat /path/to/key) node scripts/probe-models.mjs
//
// For each model it sends a realistic strict-JSON trading-decision prompt
// (response_format=json_object, the same shape the runner uses), times N runs,
// and reports median latency + whether the output parsed as JSON. A model whose
// median latency approaches a cadence is unusable at that cadence.

const KEY = process.env.NVIDIA_API_KEY?.trim();
if (!KEY) {
  console.error("NVIDIA_API_KEY not set in env — refusing to run.");
  process.exit(1);
}
const BASE = "https://integrate.api.nvidia.com/v1";
const RUNS = Number(process.env.PROBE_RUNS || 2);
const MAX_TOKENS = 512;

// Candidate models. `think` variants prepend Nemotron's reasoning-toggle so we
// can measure reasoning-on vs reasoning-off latency for the same model.
const MODELS = [
  { id: "meta/llama-3.1-8b-instruct" },
  { id: "meta/llama-3.3-70b-instruct" },
  { id: "meta/llama-3.1-70b-instruct" },
  { id: "nvidia/llama-3.3-nemotron-super-49b-v1", label: "nemotron-49b (reasoning ON)" },
  {
    id: "nvidia/llama-3.3-nemotron-super-49b-v1",
    label: "nemotron-49b (thinking OFF)",
    system: "detailed thinking off",
  },
  { id: "qwen/qwen2.5-72b-instruct" },
  { id: "mistralai/mixtral-8x22b-instruct-v0.1" },
  { id: "meta/llama-3.2-3b-instruct" },
  { id: "microsoft/phi-3.5-mini-instruct" },
];

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
  console.log(`Probing ${MODELS.length} models, ${RUNS} runs each, ~300-tok JSON decision prompt\n`);
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
