-- Same additive raw-table contract as backend migration 232. Production runs
-- 232's concurrent index creation BEFORE the scheduler release. This form is
-- also usable by the existing transactional test/fresh-install boot migrator.
-- Payload is owner-private, bounded by the write sanitizer, expires in 30 days.
-- Expiry clears ONLY the new payload, not historical cycle outcomes/hashes.
ALTER TABLE agent_runtime.agent_cycles
  ADD COLUMN IF NOT EXISTS decision_input_record jsonb,
  ADD COLUMN IF NOT EXISTS decision_input_record_expires_at timestamptz;
CREATE INDEX IF NOT EXISTS agent_cycles_input_expiry_idx
  ON agent_runtime.agent_cycles (decision_input_record_expires_at, id)
  WHERE decision_input_record IS NOT NULL;
