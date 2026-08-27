-- Truthful fallback audit. Configured model stays on agents; every cycle records
-- what actually served it and why. route_attempts is bounded/sanitized by the
-- scheduler and never contains credentials, prompts, or raw model output.
ALTER TABLE agent_runtime.agent_cycles
  ADD COLUMN IF NOT EXISTS effective_provider text,
  ADD COLUMN IF NOT EXISTS route_reason text,
  ADD COLUMN IF NOT EXISTS route_attempts jsonb;

