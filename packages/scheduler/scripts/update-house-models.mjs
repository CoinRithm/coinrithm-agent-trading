// Update ONLY the model + cadence of the existing house agents — no keys, no kit
// build, no spec reload. Use this to re-point house agents at different free
// brains without re-providing COINRITHM_KEY_* (which seed-house-agents.mjs needs
// because it re-encrypts the per-agent key on every upsert). Needs only
// DATABASE_URL. Idempotent.
//
//   DATABASE_URL=... node scripts/update-house-models.mjs
//
// KEEP THIS ROSTER IN SYNC with the HOUSE array in seed-house-agents.mjs.
import pg from "pg";

const HOUSE = [
  { handle: "mia-trend-rider", provider: "nvidia", name: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning", baseUrl: null, cadence: 180 },
  { handle: "contrarian-carl", provider: "nvidia", name: "nvidia/nemotron-3-super-120b-a12b", baseUrl: null, cadence: 180 },
  { handle: "leo-breakout-hunter", provider: "nvidia", name: "nvidia/nemotron-3-super-120b-a12b", baseUrl: null, cadence: 180 },
  { handle: "olivia-calibrated-quant", provider: "nvidia", name: "nvidia/nemotron-3-super-120b-a12b", baseUrl: null, cadence: 180 },
  { handle: "sam-risk-managed-swinger", provider: "nvidia", name: "nvidia/nemotron-3-super-120b-a12b", baseUrl: null, cadence: 180 },
];

function reqEnv(k) {
  const v = process.env[k];
  if (!v || !v.trim()) throw new Error(`missing required env ${k}`);
  return v.trim();
}

const pool = new pg.Pool({ connectionString: reqEnv("DATABASE_URL") });
try {
  for (const h of HOUSE) {
    const { rowCount } = await pool.query(
      `UPDATE agent_runtime.agents
         SET model_provider = $1, model_name = $2, model_base_url = $3,
             cadence_seconds = $4, updated_at = now()
       WHERE handle = $5 AND is_house = true`,
      [h.provider, h.name, h.baseUrl, h.cadence, h.handle],
    );
    console.log(
      `${rowCount ? "updated" : "NOT FOUND"} ${h.handle} -> ${h.provider}/${h.name} @${h.cadence}s`,
    );
  }
  console.log("house models updated.");
} finally {
  await pool.end();
}
