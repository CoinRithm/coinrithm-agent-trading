-- Paid brains (contract v1, 2026-10-07). Prepaid credits only: one append-only
-- ledger per user. Balance = SUM(amount_micro_usd) per user_id; an agent's
-- month spend = -SUM over its debits since 00:00 UTC on the 1st. Amounts are
-- integer micro-USD so no float ever touches money. A debit is negative and
-- everything else is non-negative (enforced by the CHECK below), and every row
-- carries a unique idempotency key ('debit:<cycle_id>', 'grant:<uuid>', the
-- payment processor's id for a top-up) so a retried write can never charge or
-- credit twice. Rows are never updated or deleted by any runtime role.
CREATE TABLE IF NOT EXISTS agent_runtime.credit_ledger (
  id bigserial PRIMARY KEY,
  user_id bigint NOT NULL,
  kind text NOT NULL CHECK (kind IN ('grant','topup','debit','refund')),
  amount_micro_usd bigint NOT NULL,          -- + grant/topup/refund, - debit
  agent_id bigint NULL REFERENCES agent_runtime.agents(id) ON DELETE SET NULL,
  cycle_id bigint NULL,                      -- agent_cycles.id for debits
  model_id text NULL,                        -- catalogue id
  tokens_in integer NULL,
  tokens_out integer NULL,
  provider_cost_micro_usd bigint NULL,
  margin_micro_usd bigint NULL,
  note text NULL,
  idempotency_key text NOT NULL UNIQUE,      -- 'debit:<cycle_id>', 'grant:<uuid>', ...
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((kind = 'debit') = (amount_micro_usd < 0))
);
CREATE INDEX IF NOT EXISTS credit_ledger_user_created ON agent_runtime.credit_ledger (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS credit_ledger_agent_created ON agent_runtime.credit_ledger (agent_id, created_at DESC) WHERE agent_id IS NOT NULL;

-- Append-only grants. The production owner has default DML grants to
-- coinrithm_app in this schema (see sql/maintenance/runtime-role.sql), which
-- would include UPDATE and DELETE on this new table: revoke those first. The
-- API inserts grants (and later top-ups); the scheduler inserts debits; both
-- read balances. bigserial inserts call nextval, hence USAGE on the sequence.
-- Each role is granted only if it exists, so a fresh or test database without
-- them still migrates. The scheduler's grants are also provisioned by
-- runtime-role.sql (pinned to src/runtimeGrants.ts); repeating them here means
-- the new image passes readiness without a separate re-provisioning step.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'coinrithm_app') THEN
    REVOKE UPDATE, DELETE, TRUNCATE ON agent_runtime.credit_ledger FROM coinrithm_app;
    GRANT SELECT, INSERT ON agent_runtime.credit_ledger TO coinrithm_app;
    GRANT USAGE ON SEQUENCE agent_runtime.credit_ledger_id_seq TO coinrithm_app;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'coinrithm_scheduler') THEN
    REVOKE UPDATE, DELETE, TRUNCATE ON agent_runtime.credit_ledger FROM coinrithm_scheduler;
    GRANT SELECT, INSERT ON agent_runtime.credit_ledger TO coinrithm_scheduler;
    GRANT USAGE ON SEQUENCE agent_runtime.credit_ledger_id_seq TO coinrithm_scheduler;
  END IF;
END $$;
REVOKE ALL ON agent_runtime.credit_ledger FROM PUBLIC;
