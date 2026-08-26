-- Reliability initiative slice 1 (2026-08-26, after the NVIDIA EOL event):
-- provider/model failures must NEVER disable hosted agents. Instead of each
-- agent striking out 3x and dying (35 agents on 08-26), failures aggregate
-- into ONE fleet-wide circuit per (provider, model). Open circuits exclude
-- matching agents from claiming (cheap skip, zero cycle burn, zero disables);
-- when probe_after passes, agents become claimable again and the next cycle
-- either closes the circuit (success) or re-opens it with a longer backoff.
-- User pauses, revoked credentials, drawdown and safety stops keep their
-- existing disable semantics untouched.
CREATE TABLE IF NOT EXISTS agent_runtime.provider_circuits (
  provider    text NOT NULL,
  model       text NOT NULL,
  strikes     int  NOT NULL DEFAULT 0,
  last_error  text,
  -- NULL until the circuit trips (strikes >= 3); then the earliest instant a
  -- probe cycle may run. Success deletes the row; failure re-arms with
  -- exponential backoff capped at one hour.
  probe_after timestamptz,
  opened_at   timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (provider, model)
);

-- Truth after failover (initiative finding: the system records the CONFIGURED
-- model, not what actually served). Every persisted cycle now records the
-- effective model; identical to the configured model until routing exists.
ALTER TABLE agent_runtime.agent_cycles
  ADD COLUMN IF NOT EXISTS effective_model text;
