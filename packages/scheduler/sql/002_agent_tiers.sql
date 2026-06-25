-- 002_agent_tiers.sql — thin paid-tier scaffolding.
--
-- Adds the `plan` column the tier gate (src/tiers.ts) reads. The per-cycle
-- metering it pairs with already exists (agent_cycles token + estimated_cost_usd
-- columns from 001). Additive + idempotent: default 'free', house agents get
-- 'house' (exempt). NO behavior change until a caller enforces a gate result, so
-- this is safe to run on every boot like 001.

ALTER TABLE agent_runtime.agents
  ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free';

-- House agents are exempt from tier limits; tag them so the gate treats them as
-- the 'house' tier even if a future caller forgets the is_house flag.
UPDATE agent_runtime.agents
   SET plan = 'house', updated_at = now()
 WHERE is_house = true AND plan <> 'house';

-- Index the owner's active footprint — the deploy gate counts agents per owner.
CREATE INDEX IF NOT EXISTS agents_owner_plan_idx
  ON agent_runtime.agents (owner_user_id)
  WHERE status <> 'disabled';
