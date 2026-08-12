-- Agent runtime schema. Lives in its own Postgres schema inside the shared
-- coinrithm-postgres DB so it stays decoupled from the trading backend's
-- (Prisma-managed) public schema. Idempotent: safe to run on every boot.

CREATE SCHEMA IF NOT EXISTS agent_runtime;

-- One row per agent (house OR user). The compiled spec + prose are stored so the
-- scheduler runs cycles without re-resolving; resolve + validate --hosted happen
-- once at deploy time. Secrets are stored ENCRYPTED (AES-256-GCM envelope) and
-- decrypted only in memory at run time.
CREATE TABLE IF NOT EXISTS agent_runtime.agents (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  owner_user_id     BIGINT,                         -- CoinRithm user id (house: 57-61)
  handle            TEXT NOT NULL UNIQUE,           -- arena handle / slug
  display_name      TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'active', -- active | paused | disabled
  disabled_reason   TEXT,
  is_house          BOOLEAN NOT NULL DEFAULT false,
  live              BOOLEAN NOT NULL DEFAULT true,  -- false = dry-run (no writes)
  cadence_seconds   INTEGER NOT NULL CHECK (cadence_seconds >= 60),
  model_provider    TEXT NOT NULL,                  -- nvidia | anthropic | openai | groq | gemini | openai-compatible | mechanical (non-LLM benchmark baselines; model_name carries the strategy)
  model_name        TEXT NOT NULL,
  model_base_url    TEXT,
  spec              JSONB NOT NULL,                 -- compiled AgentSpec
  prose             TEXT NOT NULL,                  -- mergedProse the LLM reads
  manifest          JSONB,
  coinrithm_key_enc TEXT NOT NULL,                  -- encrypted crk_live_ key (per-agent paper account)
  brain_key_enc     TEXT,                           -- encrypted BYO model key (NULL => shared free-tier key)
  next_run_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_run_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- The claim query filters active + due and orders by next_run_at.
CREATE INDEX IF NOT EXISTS agents_due_idx
  ON agent_runtime.agents (next_run_at)
  WHERE status = 'active';

-- Per-agent RunState (cursor, daily counters, kill-switch inputs, idempotency
-- seq). Replaces the self-host .agent.state.json. 1:1 with an agent.
CREATE TABLE IF NOT EXISTS agent_runtime.agent_state (
  agent_id   BIGINT PRIMARY KEY REFERENCES agent_runtime.agents (id) ON DELETE CASCADE,
  state      JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Append-only per-cycle feed: the reasoning + actions + result that powers the
-- live terminal view, the Arena summary, and the daily post. (Authoritative
-- trade records live in the CoinRithm private ledger; this is the narrative.)
CREATE TABLE IF NOT EXISTS agent_runtime.agent_cycles (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  agent_id     BIGINT NOT NULL REFERENCES agent_runtime.agents (id) ON DELETE CASCADE,
  ts           TIMESTAMPTZ NOT NULL DEFAULT now(),
  decision     TEXT NOT NULL,                       -- skip | act | error
  skip_reason  TEXT,
  rationale    TEXT,                                -- model's short analysis this cycle (keystone transparency)
  confidence   DOUBLE PRECISION,                    -- decision-level confidence 0..1
  raw_model_output TEXT,                            -- DEPRECATED, always NULL: raw model text is NEVER persisted (no-CoT privacy policy). Kept for schema stability; use `rationale` (sanitized).
  model_failed BOOLEAN NOT NULL DEFAULT false,
  disabled     BOOLEAN NOT NULL DEFAULT false,
  actions      JSONB,                               -- planned actions (+ accept/reject + executed)
  log          TEXT,                                -- human-readable cycle log (terminal feed)
  error        TEXT
);

-- Keystone transparency columns — additive + idempotent so re-running migrate on
-- an EXISTING deployment backfills them (CREATE TABLE IF NOT EXISTS won't).
ALTER TABLE agent_runtime.agent_cycles ADD COLUMN IF NOT EXISTS rationale TEXT;
ALTER TABLE agent_runtime.agent_cycles ADD COLUMN IF NOT EXISTS confidence DOUBLE PRECISION;
ALTER TABLE agent_runtime.agent_cycles ADD COLUMN IF NOT EXISTS raw_model_output TEXT;

-- Slice-2 metering columns (preflight-gate triggers + token usage). The data the
-- future credit system + tier pricing read. Additive + idempotent.
ALTER TABLE agent_runtime.agent_cycles ADD COLUMN IF NOT EXISTS trigger_codes TEXT[];
ALTER TABLE agent_runtime.agent_cycles ADD COLUMN IF NOT EXISTS llm_call_made BOOLEAN;
ALTER TABLE agent_runtime.agent_cycles ADD COLUMN IF NOT EXISTS tokens_in INTEGER;
ALTER TABLE agent_runtime.agent_cycles ADD COLUMN IF NOT EXISTS tokens_out INTEGER;
ALTER TABLE agent_runtime.agent_cycles ADD COLUMN IF NOT EXISTS estimated_cost_usd NUMERIC(12,6);
ALTER TABLE agent_runtime.agent_cycles ADD COLUMN IF NOT EXISTS decision_type TEXT;
ALTER TABLE agent_runtime.agent_cycles ADD COLUMN IF NOT EXISTS write_attempted INTEGER;
ALTER TABLE agent_runtime.agent_cycles ADD COLUMN IF NOT EXISTS write_accepted INTEGER;
-- D16 reproducibility receipt: privacy-safe hash of the exact structured model
-- input plus the versioned deterministic indicator algorithm that produced it.
ALTER TABLE agent_runtime.agent_cycles ADD COLUMN IF NOT EXISTS observation_hash TEXT;
ALTER TABLE agent_runtime.agent_cycles ADD COLUMN IF NOT EXISTS indicator_version TEXT;

CREATE INDEX IF NOT EXISTS agent_cycles_agent_ts_idx
  ON agent_runtime.agent_cycles (agent_id, ts DESC);
