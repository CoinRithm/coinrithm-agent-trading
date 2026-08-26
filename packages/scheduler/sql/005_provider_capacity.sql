-- Reliability initiative: provider capacity must be shared across scheduler
-- replicas. An in-memory bucket lets every replica spend the full quota, which
-- turns horizontal scaling into a provider-rate-limit storm.
--
-- The bucket is an atomic, continuously-refilling RPM + TPM budget. Short-lived
-- leases bound concurrent calls and expire after a worker crash. No provider
-- credential or prompt content is stored here; route_key is an opaque config id.
CREATE TABLE IF NOT EXISTS agent_runtime.provider_capacity_buckets (
  route_key              text PRIMARY KEY,
  provider               text NOT NULL,
  request_tokens         double precision NOT NULL,
  model_tokens           double precision NOT NULL,
  request_rate_per_min   int NOT NULL CHECK (request_rate_per_min > 0),
  model_rate_per_min     bigint NOT NULL CHECK (model_rate_per_min > 0),
  max_concurrent         int NOT NULL CHECK (max_concurrent > 0),
  last_refill_at         timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at             timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS agent_runtime.provider_capacity_leases (
  lease_id         uuid PRIMARY KEY,
  route_key        text NOT NULL REFERENCES agent_runtime.provider_capacity_buckets(route_key) ON DELETE CASCADE,
  reserved_tokens  int NOT NULL CHECK (reserved_tokens > 0),
  acquired_at      timestamptz NOT NULL DEFAULT clock_timestamp(),
  expires_at       timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_provider_capacity_leases_route_expiry
  ON agent_runtime.provider_capacity_leases (route_key, expires_at);

