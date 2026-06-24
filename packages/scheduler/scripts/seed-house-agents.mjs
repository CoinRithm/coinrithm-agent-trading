// Seed (or update) the 5 house agents as agent_runtime rows. Resolves each
// example folder, validates --hosted (loadAgent in hosted mode throws on any
// lint/drift issue), encrypts its CoinRithm key, and upserts the row + initial
// state. House CoinRithm keys come from env COINRITHM_KEY_<DISPLAY> — never
// hardcoded. Re-running is safe: it refreshes the definition but never resets
// running state or the schedule.
//
// CONFIG-ONLY re-seed: if a COINRITHM_KEY_<DISPLAY> is absent, that agent's
// spec/prose/model/cadence are UPDATED in place without its raw key (the stored
// key + running state are left untouched). So refreshing the floors/caps/
// personas on the LIVE agents needs only DATABASE_URL — no secret keys to paste.
// Provide the keys only for an initial seed (or a deliberate key rotation).
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

// Each house agent runs on a DIFFERENT free brain so the public Arena showcases
// the full model lineup (the model shows in each agent's live terminal). All ids
// are probe-verified (scripts/probe-models.mjs). Cadence is per-agent: the Groq
// llama-3.3-70b-versatile has a 1K req/day free cap, so Sam runs every 2 min
// (~720/day) to stay under it; the rest are 60s. Both overrides win over each
// example folder's own model/trigger.cadence, so a re-seed never reverts them.
//
// RPM headroom: NVIDIA agents (Mia/Carl/Leo/Sam) = ~4 calls/min vs the 40 RPM
// shared key; Olivia is the lone Groq agent (60s) ~1 call/min, and one ~5k-token
// call fits Groq's 6k TPM. Carl's Nemotron is only fast (~4s) once the kit forces
// "detailed thinking off" (kit >= 57be052), so deploy that kit before seeding.
const HOUSE = [
  {
    handle: "mia-trend-rider", display: "Mia", owner: 57,
    model: { provider: "nvidia", name: "meta/llama-3.1-8b-instruct", baseUrl: null },
    cadence: 60,
  },
  {
    handle: "contrarian-carl", display: "Carl", owner: 58,
    model: { provider: "nvidia", name: "nvidia/llama-3.3-nemotron-super-49b-v1", baseUrl: null },
    cadence: 60,
  },
  {
    handle: "leo-breakout-hunter", display: "Leo", owner: 59,
    model: { provider: "nvidia", name: "meta/llama-3.1-70b-instruct", baseUrl: null },
    cadence: 60,
  },
  {
    handle: "olivia-calibrated-quant", display: "Olivia", owner: 60,
    model: { provider: "groq", name: "llama-3.1-8b-instant", baseUrl: null },
    cadence: 60,
  },
  {
    // Moved OFF Groq to NVIDIA: two Groq agents sharing one 6k-TPM free key both
    // 413/429'd (~10k tok/min > 6k). Sam on NVIDIA 70B trades reliably (like Leo)
    // and leaves Olivia ALONE on Groq, where one ~5k-token call/min fits 6k TPM.
    handle: "sam-risk-managed-swinger", display: "Sam", owner: 61,
    model: { provider: "nvidia", name: "meta/llama-3.1-70b-instruct", baseUrl: null },
    cadence: 60,
  },
];

function reqEnv(k) {
  const v = process.env[k];
  if (!v || !v.trim()) throw new Error(`missing required env ${k}`);
  return v.trim();
}

const here = dirname(fileURLToPath(import.meta.url));
const pool = new pg.Pool({ connectionString: reqEnv("DATABASE_URL") });
// ENCRYPTION_KEY is only needed when we (re)write a raw CoinRithm key. A
// config-only re-seed never encrypts, so load the master key lazily — that path
// requires only DATABASE_URL.
let _masterKey = null;
const masterKey = () => (_masterKey ??= loadMasterKey(reqEnv("ENCRYPTION_KEY")));

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
    const cadenceSeconds = h.cadence;
    const rawKey = process.env[`COINRITHM_KEY_${h.display.toUpperCase()}`]?.trim();

    // CONFIG-ONLY path: no raw key -> refresh an EXISTING agent's definition
    // (spec/prose/model/cadence) without touching its key or running state.
    if (!rawKey) {
      const { rowCount } = await pool.query(
        `UPDATE agent_runtime.agents SET
            display_name = $2, cadence_seconds = $3, model_provider = $4,
            model_name = $5, model_base_url = $6, spec = $7::jsonb, prose = $8,
            updated_at = now()
         WHERE handle = $1`,
        [
          h.handle, h.display, cadenceSeconds, h.model.provider, h.model.name,
          h.model.baseUrl, JSON.stringify(spec), body,
        ],
      );
      console.log(
        rowCount
          ? `updated ${h.handle} (config-only; key + state unchanged, cadence ${cadenceSeconds}s, brain ${h.model.provider}/${h.model.name})`
          : `skipped ${h.handle}: not seeded yet — set COINRITHM_KEY_${h.display.toUpperCase()} to create it`,
      );
      continue;
    }

    const crkEnc = encrypt(rawKey, masterKey());
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
        h.owner, h.handle, h.display, cadenceSeconds, h.model.provider, h.model.name,
        h.model.baseUrl, JSON.stringify(spec), body, crkEnc,
      ],
    );
    const id = rows[0].id;
    // Initialise state only if absent — never reset a running agent's counters.
    await pool.query(
      `INSERT INTO agent_runtime.agent_state (agent_id, state)
       VALUES ($1, $2::jsonb) ON CONFLICT (agent_id) DO NOTHING`,
      [id, JSON.stringify(newState(makeRunId(spec)))],
    );
    console.log(`seeded ${h.handle} (id ${id}, cadence ${cadenceSeconds}s, brain ${h.model.provider}/${h.model.name})`);
  }

  // House agents are meant to stay live. After refreshing definitions, revive any
  // that a kill-switch (e.g. a flaky-model streak) disabled, and clear the
  // consecutive-failure counter — surgically, without resetting PnL or schedule.
  const revived = await pool.query(
    `UPDATE agent_runtime.agents
        SET status = 'active', disabled_reason = NULL, next_run_at = now(), updated_at = now()
      WHERE is_house = true AND status <> 'active'
      RETURNING handle`,
  );
  await pool.query(
    `UPDATE agent_runtime.agent_state s
        SET state = (s.state - 'disabledReason')
                   || '{"disabled":false,"consecutiveModelFailures":0}'::jsonb
       FROM agent_runtime.agents a
      WHERE s.agent_id = a.id AND a.is_house = true`,
  );
  console.log(
    revived.rowCount
      ? `revived ${revived.rowCount} disabled house agent(s): ${revived.rows.map((r) => r.handle).join(", ")}`
      : "all house agents already active",
  );
  console.log("house agents seeded.");
} finally {
  await pool.end();
}
