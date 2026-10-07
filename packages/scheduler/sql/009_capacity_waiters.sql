-- Owner-bucket fairness (2026-10-07). A shared owner bucket (25k TPM, burst =
-- one request, one concurrent call) is refilled continuously, and the phase grid
-- gives every agent the same offset each cadence. With five house agents, the
-- agent whose slot lands ~45 s after a large prompt found the bucket short of
-- its reserve on every cycle and was deferred indefinitely (house Mia: 0 model
-- calls from 04:25 UTC while holding an open position).
--
-- One waiter per bucket: the first requester denied for token budget is
-- recorded here, and the scheduler retries that agent after the refill instead
-- of a whole grid interval later. While the claim is live, other requesters of
-- the owner may only spend tokens beyond its need, so the retry finds it. The
-- claim covers the waiter's own refill wait plus slack (never more than 15
-- minutes), is fixed at the first wait, counts only while its agent is active
-- on the shared pool, and ends when the waiter's call consumes tokens.
-- Nullable columns only: no rewrite, existing rows mean "no waiter".
ALTER TABLE agent_runtime.provider_capacity_buckets
  ADD COLUMN IF NOT EXISTS waiter_key        text,
  ADD COLUMN IF NOT EXISTS waiter_tokens     int CHECK (waiter_tokens IS NULL OR waiter_tokens > 0),
  ADD COLUMN IF NOT EXISTS waiter_since      timestamptz,
  ADD COLUMN IF NOT EXISTS waiter_expires_at timestamptz;
