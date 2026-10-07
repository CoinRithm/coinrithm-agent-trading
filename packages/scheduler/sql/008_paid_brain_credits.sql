-- Paid brains (contract v2, 2026-10-07, with the root/Data consensus
-- corrections). Prepaid credits only, integer micro-USD, append-only ledger.
--
-- credit_ledger: one row per money movement, never updated or deleted.
--   positive: grant, topup, refund (credit given back), release (returns a
--             reserve);
--   negative: reserve (worst case held BEFORE a paid call), debit (the
--             provider-reported actual charge), reversal (a top-up refunded or
--             charged back at the payment provider).
--   Balance = SUM(amount_micro_usd) per user; open reserves are already
--   subtracted. Every row carries a unique idempotency key ('reserve:<agent>:
--   <cycle key>', 'release:<reserve key>', 'debit:<reserve key>', 'grant:<uuid>',
--   'topup:<transaction id>', ...) so a retried write never moves money twice.
--
-- paid_calls: the durable state of each paid call, committed BEFORE the HTTP
--   request is sent, so a crash can never be mistaken for "no call ran":
--     reserved   -> the worst case is held; the provider has NOT been called.
--     dispatched -> committed immediately before the HTTP call.
--     answered   -> the provider answered with usage (ready to finalise).
--     rejected   -> the provider answered with an explicit HTTP error and no
--                   usage (not billable: release).
--     uncertain  -> a call that may have been billed without usage: answered
--                   without usage, a transport failure, or a dispatched call
--                   left unresolved. Never auto-refunded; it blocks that owner's
--                   paid admissions until root reconciles it.
--     released / finalized -> closed.
--   The price row (version and per-token prices) and the margin are
--   snapshotted on the call, so finalisation and recovery never reprice an old
--   call after a price or config change. month_start is the UTC month of the
--   RESERVATION: the call counts toward that month's cap even when it is
--   finalised in the next month.
--
-- Every balance-changing transaction first takes the owner credit lock
-- pg_advisory_xact_lock(734202, owner_user_id).
CREATE TABLE IF NOT EXISTS agent_runtime.credit_ledger (
  id bigserial PRIMARY KEY,
  user_id bigint NOT NULL,
  kind text NOT NULL CHECK (kind IN ('grant','topup','refund','release','reserve','debit','reversal')),
  amount_micro_usd bigint NOT NULL,
  agent_id bigint NULL REFERENCES agent_runtime.agents(id) ON DELETE SET NULL,
  cycle_id bigint NULL,                      -- agent_cycles.id for debits
  model_id text NULL,                        -- catalogue id
  tokens_in integer NULL,
  tokens_out integer NULL,
  provider_cost_micro_usd bigint NULL,
  margin_micro_usd bigint NULL,
  note text NULL,
  idempotency_key text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (CASE WHEN kind IN ('reserve','debit','reversal')
              THEN amount_micro_usd < 0
              ELSE amount_micro_usd > 0 END)
);
CREATE INDEX IF NOT EXISTS credit_ledger_user_created ON agent_runtime.credit_ledger (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS credit_ledger_agent_created ON agent_runtime.credit_ledger (agent_id, created_at DESC) WHERE agent_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS agent_runtime.paid_calls (
  reserve_key text PRIMARY KEY,
  user_id bigint NOT NULL,
  agent_id bigint NOT NULL,
  model_id text NOT NULL,
  price jsonb NOT NULL,                      -- snapshotted price row (version + micro-USD per 1k tokens)
  margin_pct integer NOT NULL CHECK (margin_pct >= 0),
  worst_case_micro_usd bigint NOT NULL CHECK (worst_case_micro_usd > 0),
  month_start date NOT NULL,                 -- UTC month of the reservation
  status text NOT NULL DEFAULT 'reserved'
    CHECK (status IN ('reserved','dispatched','answered','rejected','uncertain','released','finalized')),
  provider_status integer NULL,              -- HTTP status of an explicit rejection
  usage jsonb NULL,                          -- provider-reported usage, never an estimate
  debit_micro_usd bigint NULL,               -- set when finalized
  cycle_id bigint NULL,
  note text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  dispatched_at timestamptz NULL,
  answered_at timestamptz NULL,
  closed_at timestamptz NULL
);
CREATE INDEX IF NOT EXISTS paid_calls_agent_month ON agent_runtime.paid_calls (agent_id, month_start);
CREATE INDEX IF NOT EXISTS paid_calls_open ON agent_runtime.paid_calls (user_id, created_at)
  WHERE status NOT IN ('released','finalized');

-- Payment-provider checkouts (merchant of record). Written by the backend
-- only; the scheduler never reads or writes it.
CREATE TABLE IF NOT EXISTS agent_runtime.credit_checkouts (
  transaction_id text PRIMARY KEY,
  user_id bigint NOT NULL,
  pack_id text NOT NULL,
  price_id text NOT NULL,
  usd_micro bigint NOT NULL,
  currency text NOT NULL,
  env text NOT NULL CHECK (env IN ('sandbox','production')),
  status text NOT NULL CHECK (status IN ('created','completed')),
  paid_total_minor bigint NULL,              -- grand total in minor units from the completed webhook
  credited_micro bigint NULL,                -- what was credited (for proportional partial-refund reversals)
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz NULL
);

-- Grants. The production owner has default DML grants to coinrithm_app in this
-- schema (see sql/maintenance/runtime-role.sql), which would include UPDATE
-- and DELETE on these new tables: revoke those first. Each role is granted only
-- if it exists, so a fresh or test database without them still migrates. The
-- scheduler's grants are also provisioned by runtime-role.sql (pinned to
-- src/runtimeGrants.ts); repeating them here lets the new image pass readiness
-- without a separate re-provisioning step.
--   coinrithm_app:       ledger SELECT, INSERT (+ sequence USAGE); paid_calls
--                        SELECT; credit_checkouts SELECT, INSERT, UPDATE.
--   coinrithm_scheduler: ledger SELECT, INSERT (+ sequence USAGE); paid_calls
--                        SELECT, INSERT, UPDATE; no credit_checkouts.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'coinrithm_app') THEN
    REVOKE UPDATE, DELETE, TRUNCATE ON agent_runtime.credit_ledger FROM coinrithm_app;
    GRANT SELECT, INSERT ON agent_runtime.credit_ledger TO coinrithm_app;
    GRANT USAGE ON SEQUENCE agent_runtime.credit_ledger_id_seq TO coinrithm_app;
    REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON agent_runtime.paid_calls FROM coinrithm_app;
    GRANT SELECT ON agent_runtime.paid_calls TO coinrithm_app;
    REVOKE DELETE, TRUNCATE ON agent_runtime.credit_checkouts FROM coinrithm_app;
    GRANT SELECT, INSERT, UPDATE ON agent_runtime.credit_checkouts TO coinrithm_app;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'coinrithm_scheduler') THEN
    REVOKE UPDATE, DELETE, TRUNCATE ON agent_runtime.credit_ledger FROM coinrithm_scheduler;
    GRANT SELECT, INSERT ON agent_runtime.credit_ledger TO coinrithm_scheduler;
    GRANT USAGE ON SEQUENCE agent_runtime.credit_ledger_id_seq TO coinrithm_scheduler;
    REVOKE DELETE, TRUNCATE ON agent_runtime.paid_calls FROM coinrithm_scheduler;
    GRANT SELECT, INSERT, UPDATE ON agent_runtime.paid_calls TO coinrithm_scheduler;
    REVOKE ALL ON agent_runtime.credit_checkouts FROM coinrithm_scheduler;
  END IF;
END $$;
REVOKE ALL ON agent_runtime.credit_ledger FROM PUBLIC;
REVOKE ALL ON agent_runtime.paid_calls FROM PUBLIC;
REVOKE ALL ON agent_runtime.credit_checkouts FROM PUBLIC;
