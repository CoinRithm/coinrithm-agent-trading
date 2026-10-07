-- Operator-only provisioning, AFTER migrate-schema.mjs. Not a startup migration.
-- This creates a NOLOGIN role; set its login secret through the deployment secret
-- manager separately. Never print credentials or put a migration URL in runtime.
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';
SELECT pg_advisory_xact_lock(1129469005, 1);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'coinrithm_scheduler') THEN
    CREATE ROLE coinrithm_scheduler NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_roles r WHERE pg_has_role('coinrithm_scheduler', r.oid, 'MEMBER')
      AND (r.rolname <> 'coinrithm_scheduler' OR r.rolsuper OR r.rolcreatedb OR r.rolcreaterole OR r.rolreplication OR r.rolbypassrls)
  ) THEN
    RAISE EXCEPTION 'Existing scheduler role has unexpected authority; inspect before provisioning';
  END IF;
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO coinrithm_scheduler', current_database());
  -- The production owner has default DML grants to coinrithm_app in this
  -- schema. Migration receipts are operator evidence, not application data.
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'coinrithm_app') THEN
    REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON agent_runtime.schema_migrations FROM coinrithm_app;
  END IF;
END $$;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON agent_runtime.schema_migrations FROM PUBLIC, coinrithm_scheduler;
GRANT USAGE ON SCHEMA agent_runtime, public TO coinrithm_scheduler;
GRANT SELECT, INSERT, UPDATE, DELETE ON
  agent_runtime.agents,
  agent_runtime.agent_state,
  agent_runtime.agent_cycles,
  agent_runtime.provider_circuits,
  agent_runtime.provider_capacity_buckets,
  agent_runtime.provider_capacity_leases,
  agent_runtime.provider_route_cooldowns
TO coinrithm_scheduler;
-- Append-only: the paid-brain credit ledger. The scheduler reads balances and
-- inserts debits; it never rewrites or removes a money row.
REVOKE UPDATE, DELETE, TRUNCATE ON agent_runtime.credit_ledger FROM PUBLIC, coinrithm_scheduler;
GRANT SELECT, INSERT ON agent_runtime.credit_ledger TO coinrithm_scheduler;
GRANT USAGE ON SEQUENCE agent_runtime.credit_ledger_id_seq TO coinrithm_scheduler;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA agent_runtime TO coinrithm_scheduler;
GRANT SELECT ON agent_runtime.schema_migrations TO coinrithm_scheduler;
-- Only these identity fields are read by the existing de-Groq startup repair.
GRANT SELECT (id, "userId", "revokedAt") ON public."ApiKey" TO coinrithm_scheduler;
COMMIT;
