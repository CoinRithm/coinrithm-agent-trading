import { randomUUID } from "node:crypto";
import type { Pool } from "pg";

export interface ProviderCapacityLimit {
  /** Opaque stable id such as `nvidia:shared:0`; never a credential. */
  routeKey: string;
  provider: string;
  requestsPerMinute: number;
  tokensPerMinute: number;
  maxConcurrent: number;
  /** Prompt estimate + output allowance for the pending decision call. */
  reserveTokens: number;
  /** Must exceed the provider timeout; crash recovery is automatic after TTL. */
  leaseTtlSeconds: number;
}

export interface ProviderCapacityLease {
  leaseId: string;
  routeKey: string;
  reservedTokens: number;
}

function positiveInt(value: number, name: string): number {
  if (!Number.isFinite(value) || value < 1) {
    throw new Error(`${name} must be a positive number`);
  }
  return Math.floor(value);
}

/**
 * Atomically reserve one request, its estimated tokens, and one concurrency
 * slot. The transaction is deliberately short: no network/model work occurs
 * while a DB lock is held. Every scheduler replica locks the same route row, so
 * adding replicas cannot multiply provider spend.
 */
export async function reserveProviderCapacity(
  pool: Pool,
  raw: ProviderCapacityLimit,
): Promise<ProviderCapacityLease | null> {
  const limit = {
    ...raw,
    requestsPerMinute: positiveInt(
      raw.requestsPerMinute,
      "requestsPerMinute",
    ),
    tokensPerMinute: positiveInt(raw.tokensPerMinute, "tokensPerMinute"),
    maxConcurrent: positiveInt(raw.maxConcurrent, "maxConcurrent"),
    reserveTokens: positiveInt(raw.reserveTokens, "reserveTokens"),
    leaseTtlSeconds: positiveInt(raw.leaseTtlSeconds, "leaseTtlSeconds"),
  };
  if (!limit.routeKey.trim() || !limit.provider.trim()) {
    throw new Error("routeKey and provider are required");
  }

  const client = await pool.connect();
  const leaseId = randomUUID();
  try {
    await client.query("BEGIN");
    // First writer starts full. Later writers update the declared contract;
    // the locked refill below clamps any old surplus to the new limits.
    await client.query(
      `INSERT INTO agent_runtime.provider_capacity_buckets
         (route_key, provider, request_tokens, model_tokens,
          request_rate_per_min, model_rate_per_min, max_concurrent)
       VALUES ($1, $2, $3, $4, $3, $4, $5)
       ON CONFLICT (route_key) DO UPDATE SET
         provider = EXCLUDED.provider,
         request_rate_per_min = EXCLUDED.request_rate_per_min,
         model_rate_per_min = EXCLUDED.model_rate_per_min,
         max_concurrent = EXCLUDED.max_concurrent,
         updated_at = clock_timestamp()`,
      [
        limit.routeKey,
        limit.provider,
        limit.requestsPerMinute,
        limit.tokensPerMinute,
        limit.maxConcurrent,
      ],
    );

    await client.query(
      `DELETE FROM agent_runtime.provider_capacity_leases
        WHERE route_key = $1 AND expires_at <= clock_timestamp()`,
      [limit.routeKey],
    );

    // Refill and reserve in ONE locked statement. The active-lease predicate is
    // evaluated while the bucket row is locked, so two replicas cannot both
    // claim the last concurrency slot.
    const reserved = await client.query<{ route_key: string }>(
      `UPDATE agent_runtime.provider_capacity_buckets b
          SET request_tokens = LEAST(
                b.request_rate_per_min::double precision,
                b.request_tokens + b.request_rate_per_min *
                  GREATEST(0, EXTRACT(EPOCH FROM (clock_timestamp() - b.last_refill_at))) / 60.0
              ) - 1,
              model_tokens = LEAST(
                b.model_rate_per_min::double precision,
                b.model_tokens + b.model_rate_per_min *
                  GREATEST(0, EXTRACT(EPOCH FROM (clock_timestamp() - b.last_refill_at))) / 60.0
              ) - $2,
              last_refill_at = clock_timestamp(),
              updated_at = clock_timestamp()
        WHERE b.route_key = $1
          AND LEAST(
                b.request_rate_per_min::double precision,
                b.request_tokens + b.request_rate_per_min *
                  GREATEST(0, EXTRACT(EPOCH FROM (clock_timestamp() - b.last_refill_at))) / 60.0
              ) >= 1
          AND LEAST(
                b.model_rate_per_min::double precision,
                b.model_tokens + b.model_rate_per_min *
                  GREATEST(0, EXTRACT(EPOCH FROM (clock_timestamp() - b.last_refill_at))) / 60.0
              ) >= $2
          AND (SELECT count(*)
                 FROM agent_runtime.provider_capacity_leases l
                WHERE l.route_key = b.route_key
                  AND l.expires_at > clock_timestamp()) < b.max_concurrent
      RETURNING b.route_key`,
      [limit.routeKey, limit.reserveTokens],
    );

    if (reserved.rows.length === 0) {
      await client.query("COMMIT");
      return null;
    }

    await client.query(
      `INSERT INTO agent_runtime.provider_capacity_leases
         (lease_id, route_key, reserved_tokens, expires_at)
       VALUES ($1::uuid, $2, $3,
               clock_timestamp() + make_interval(secs => $4))`,
      [
        leaseId,
        limit.routeKey,
        limit.reserveTokens,
        limit.leaseTtlSeconds,
      ],
    );
    await client.query("COMMIT");
    return {
      leaseId,
      routeKey: limit.routeKey,
      reservedTokens: limit.reserveTokens,
    };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Release concurrency immediately and reconcile the estimate against provider
 * usage. A smaller actual call refunds tokens; an underestimate debits the
 * difference without ever making the bucket negative.
 */
export async function releaseProviderCapacity(
  pool: Pool,
  lease: ProviderCapacityLease,
  actualTokens?: number,
): Promise<void> {
  const actual =
    actualTokens == null || !Number.isFinite(actualTokens)
      ? lease.reservedTokens
      : Math.max(0, Math.floor(actualTokens));
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const deleted = await client.query<{ reserved_tokens: number }>(
      `DELETE FROM agent_runtime.provider_capacity_leases
        WHERE lease_id = $1::uuid AND route_key = $2
      RETURNING reserved_tokens`,
      [lease.leaseId, lease.routeKey],
    );
    if (deleted.rows.length > 0) {
      const reserved = Number(deleted.rows[0]!.reserved_tokens);
      const delta = reserved - actual;
      await client.query(
        `UPDATE agent_runtime.provider_capacity_buckets
            SET model_tokens = GREATEST(
                  0,
                  LEAST(model_rate_per_min::double precision, model_tokens + $2)
                ),
                updated_at = clock_timestamp()
          WHERE route_key = $1`,
        [lease.routeKey, delta],
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

