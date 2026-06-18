// Seed (or update) the 5 house agents as agent_runtime rows. Resolves each
// example folder, validates --hosted (loadAgent in hosted mode throws on any
// lint/drift issue), encrypts its CoinRithm key, and upserts the row + initial
// state. House CoinRithm keys come from env COINRITHM_KEY_<DISPLAY> — never
// hardcoded. Re-running is safe: it refreshes the definition but never resets
// running state or the schedule.
//
//   DATABASE_URL=... ENCRYPTION_KEY=... \
//   COINRITHM_KEY_MIA=crk_live_... COINRITHM_KEY_CARL=... COINRITHM_KEY_LEO=... \
//   COINRITHM_KEY_OLIVIA=... COINRITHM_KEY_SAM=... \
//   npm run seed:house

import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";
import {
  loadAgent,
  newState,
  makeRunId,
} from "@coinrithm/mcp-trading/dist/agent/engine.js";
import { encrypt, loadMasterKey } from "../dist/crypto.js";

const HOUSE = [
  { handle: "mia-trend-rider", display: "Mia", owner: 57 },
  { handle: "contrarian-carl", display: "Carl", owner: 58 },
  { handle: "leo-breakout-hunter", display: "Leo", owner: 59 },
  { handle: "olivia-calibrated-quant", display: "Olivia", owner: 60 },
  { handle: "sam-risk-managed-swinger", display: "Sam", owner: 61 },
];
// Verified default free brain (DECISIONS D14).
const MODEL = { provider: "nvidia", name: "meta/llama-3.1-8b-instruct", baseUrl: null };
// House agents poll every 10 min to match the data refresh: PM ingest is 10-min
// and spot/futures prices are fresher still. 5 house agents x 1 NVIDIA call /
// 1 min: 5 house agents = ~5 RPM even if all fall due in the same tick, far
// under the NVIDIA 40 RPM budget (room for ~35 more before a second key). A
// 1-min wake captures fast price-driven actions (coin prices refresh ~1 min).
// This OVERRIDES each example folder's trigger.cadence (like the MODEL override
// above), so a re-seed never reverts it.
const HOUSE_CADENCE_SECONDS = 60;

function reqEnv(k) {
  const v = process.env[k];
  if (!v || !v.trim()) throw new Error(`missing required env ${k}`);
  return v.trim();
}

const here = dirname(fileURLToPath(import.meta.url));
const key = loadMasterKey(reqEnv("ENCRYPTION_KEY"));
const pool = new pg.Pool({ connectionString: reqEnv("DATABASE_URL") });

try {
  for (const h of HOUSE) {
    const folder = join(here, "..", "..", "..", "examples", "agents", h.handle);
    const { spec, body } = loadAgent(folder, "hosted"); // throws if invalid / drifted
    // House agents get the `indicators` capability so observe() enriches the
    // observation with computed TA (RSI/EMA/ATR/Bollinger/breakout). Overrides
    // the example folder, same as the MODEL/cadence overrides above.
    spec.capabilities = Array.from(
      new Set([...(spec.capabilities ?? []), "indicators"]),
    );
    const cadenceSeconds = HOUSE_CADENCE_SECONDS;
    const crkEnc = encrypt(reqEnv(`COINRITHM_KEY_${h.display.toUpperCase()}`), key);

    const { rows } = await pool.query(
      `INSERT INTO agent_runtime.agents
         (owner_user_id, handle, display_name, status, is_house, live, cadence_seconds,
          model_provider, model_name, model_base_url, spec, prose, coinrithm_key_enc, next_run_at)
       VALUES ($1,$2,$3,'active',true,true,$4,$5,$6,$7,$8::jsonb,$9,$10, now())
       ON CONFLICT (handle) DO UPDATE SET
          display_name      = EXCLUDED.display_name,
          cadence_seconds   = EXCLUDED.cadence_seconds,
          model_provider    = EXCLUDED.model_provider,
          model_name        = EXCLUDED.model_name,
          model_base_url    = EXCLUDED.model_base_url,
          spec              = EXCLUDED.spec,
          prose             = EXCLUDED.prose,
          coinrithm_key_enc = EXCLUDED.coinrithm_key_enc,
          updated_at        = now()
       RETURNING id`,
      [
        h.owner, h.handle, h.display, cadenceSeconds, MODEL.provider, MODEL.name,
        MODEL.baseUrl, JSON.stringify(spec), body, crkEnc,
      ],
    );
    const id = rows[0].id;
    // Initialise state only if absent — never reset a running agent's counters.
    await pool.query(
      `INSERT INTO agent_runtime.agent_state (agent_id, state)
       VALUES ($1, $2::jsonb) ON CONFLICT (agent_id) DO NOTHING`,
      [id, JSON.stringify(newState(makeRunId(spec)))],
    );
    console.log(`seeded ${h.handle} (id ${id}, cadence ${cadenceSeconds}s, brain ${MODEL.name})`);
  }
  console.log("house agents seeded.");
} finally {
  await pool.end();
}
