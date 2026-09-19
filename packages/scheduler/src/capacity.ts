import { randomUUID } from "node:crypto";
import type { Pool } from "pg";

export interface ProviderCapacityLimit {
  /** Opaque stable id such as `nvidia:shared:0`; never a credential. */
  routeKey: string;
  provider: string;
  model: string;
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

export type ProviderCapacityDenialReason =
  "request_budget" | "token_budget" | "concurrency" | "shared_key_cooldown";

export type ProviderCapacityReservation =
  | { ok: true; lease: ProviderCapacityLease }
  | { ok: false; reasons: ProviderCapacityDenialReason[] };

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
): Promise<ProviderCapacityReservation> {
  const limit = {
    ...raw,
    requestsPerMinute: positiveInt(raw.requestsPerMinute, "requestsPerMinute"),
    // A configured TPM below one real request can never admit anything. Clamp
    // to one request rather than create a permanent silent-defer deadlock.
    tokensPerMinute: Math.max(
      positiveInt(raw.tokensPerMinute, "tokensPerMinute"),
      positiveInt(raw.reserveTokens, "reserveTokens"),
    ),
    maxConcurrent: positiveInt(raw.maxConcurrent, "maxConcurrent"),
    reserveTokens: positiveInt(raw.reserveTokens, "reserveTokens"),
    leaseTtlSeconds: positiveInt(raw.leaseTtlSeconds, "leaseTtlSeconds"),
  };
  if (!limit.routeKey.trim() || !limit.provider.trim() || !limit.model.trim()) {
    throw new Error("routeKey, provider and model are required");
  }

  const client = await pool.connect();
  const leaseId = randomUUID();
  try {
    await client.query("BEGIN");
    // First writer starts EMPTY and refills continuously. A scheduler restart
    // must not receive a fresh burst allowance (the exact production 429 mode
    // this table replaces). Later writers update the declared contract; the
    // locked refill below clamps any old surplus to the new limits.
    await client.query(
      `INSERT INTO agent_runtime.provider_capacity_buckets
         (route_key, provider, request_tokens, model_tokens,
          request_rate_per_min, model_rate_per_min, max_concurrent)
       VALUES ($1, $2, 0, 0, $3, $4, $5)
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
    // Diagnose from the SAME snapshot that decides admission, while the upsert
    // above holds the bucket lock. A later SELECT could miss a refill, expired
    // lease or cooldown boundary and falsely explain why this call was denied.
    const reserved = await client.query<{
      route_key: string | null;
      denial_reasons: ProviderCapacityDenialReason[];
    }>(
      `WITH checked AS MATERIALIZED (
         SELECT clock_timestamp() AS at
       ), budget AS MATERIALIZED (
         SELECT b.route_key, checked.at,
                LEAST(
                b.request_rate_per_min::double precision,
                b.request_tokens + b.request_rate_per_min *
                  GREATEST(0, EXTRACT(EPOCH FROM (checked.at - b.last_refill_at))) / 60.0
                ) AS available_requests,
                LEAST(
                b.model_rate_per_min::double precision,
                b.model_tokens + b.model_rate_per_min *
                  GREATEST(0, EXTRACT(EPOCH FROM (checked.at - b.last_refill_at))) / 60.0
                ) AS available_tokens,
                b.blocked_until > checked.at AS cooling,
                (SELECT count(*)
                 FROM agent_runtime.provider_capacity_leases l
                WHERE l.route_key = b.route_key
                  AND l.expires_at > checked.at) >= b.max_concurrent AS slots_full
           FROM agent_runtime.provider_capacity_buckets b CROSS JOIN checked
          WHERE b.route_key = $1
       ), decision AS MATERIALIZED (
         SELECT *, array_remove(ARRAY[
           CASE WHEN available_requests < 1 THEN 'request_budget' END,
           CASE WHEN available_tokens < $2 THEN 'token_budget' END,
           CASE WHEN slots_full THEN 'concurrency' END,
           CASE WHEN cooling THEN 'shared_key_cooldown' END
         ], NULL) AS denial_reasons FROM budget
       ), admitted AS (
         UPDATE agent_runtime.provider_capacity_buckets b
            SET request_tokens = d.available_requests - 1,
                model_tokens = d.available_tokens - $2,
                last_refill_at = d.at,
                updated_at = d.at
           FROM decision d
          WHERE b.route_key = d.route_key AND cardinality(d.denial_reasons) = 0
         RETURNING b.route_key
       )
       SELECT a.route_key, d.denial_reasons
         FROM decision d LEFT JOIN admitted a ON a.route_key = d.route_key`,
      [limit.routeKey, limit.reserveTokens],
    );

    const admission = reserved.rows[0];
    if (!admission) throw new Error("provider capacity bucket missing");
    if (admission.route_key === null) {
      await client.query("COMMIT");
      return { ok: false, reasons: admission.denial_reasons };
    }

    await client.query(
      `INSERT INTO agent_runtime.provider_capacity_leases
         (lease_id, route_key, reserved_tokens, expires_at)
       VALUES ($1::uuid, $2, $3,
               clock_timestamp() + make_interval(secs => $4))`,
      [leaseId, limit.routeKey, limit.reserveTokens, limit.leaseTtlSeconds],
    );
    await client.query("COMMIT");
    return {
      ok: true,
      lease: {
        leaseId,
        routeKey: limit.routeKey,
        reservedTokens: limit.reserveTokens,
      },
    };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Share a provider-requested cooldown (normally HTTP 429 Retry-After) across
 * every scheduler replica using this quota key. The caller supplies a bounded
 * duration; repeated failures only extend, never shorten, an existing hold.
 */
export async function coolDownProviderCapacity(
  pool: Pool,
  routeKey: string,
  provider: string,
  model: string,
  durationMs: number,
  failureClass = "rate_limit",
): Promise<void> {
  if (!Number.isFinite(durationMs) || durationMs < 0) {
    throw new Error("durationMs must be a finite non-negative number");
  }
  const boundedMs = Math.min(
    3_600_000,
    Math.max(1_000, Math.floor(durationMs)),
  );
  await pool.query(
    `INSERT INTO agent_runtime.provider_route_cooldowns
       (route_key, provider, model, blocked_until, last_failure_class,
        last_failure_at, updated_at)
     VALUES ($1, $2, $3,
             clock_timestamp() + ($4::double precision * interval '1 millisecond'),
             $5, clock_timestamp(), clock_timestamp())
     ON CONFLICT (route_key, model) DO UPDATE SET
       blocked_until = GREATEST(
         agent_runtime.provider_route_cooldowns.blocked_until,
         EXCLUDED.blocked_until
       ),
       last_failure_class = EXCLUDED.last_failure_class,
       last_failure_at = clock_timestamp(),
       updated_at = clock_timestamp()`,
    [routeKey, provider, model, boundedMs, failureClass.slice(0, 80)],
  );
}

export async function isProviderRouteCoolingDown(
  pool: Pool,
  routeKey: string,
  model: string,
): Promise<boolean> {
  const { rows } = await pool.query<{ cooling: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM agent_runtime.provider_route_cooldowns
        WHERE route_key = $1 AND model = $2 AND blocked_until > clock_timestamp()
     ) AS cooling`,
    [routeKey, model],
  );
  return rows[0]?.cooling === true;
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
