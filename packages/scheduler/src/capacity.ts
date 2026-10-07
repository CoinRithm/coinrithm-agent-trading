import { randomUUID } from "node:crypto";
import type { Pool } from "pg";

export interface ProviderCapacityLimit {
  /** Opaque stable id such as `nvidia:shared:0`; never a credential. */
  routeKey: string;
  provider: string;
  model: string;
  requestsPerMinute: number;
  tokensPerMinute: number;
  /** Separate burst capacity for owner quotas; never raises the refill rate. */
  tokenBurst?: number;
  maxConcurrent: number;
  /** Prompt estimate + output allowance for the pending decision call. */
  reserveTokens: number;
  /** Must exceed the provider timeout; crash recovery is automatic after TTL. */
  leaseTtlSeconds: number;
  /**
   * Owner buckets only (009_capacity_waiters.sql): who is asking. A requester
   * denied for token budget becomes the bucket's single waiter; while the
   * claim is live, the owner's other requesters may only spend tokens beyond
   * its need, so its bounded in-cycle re-admission finds the refill instead of
   * the same agent losing every cycle. ttlSeconds bounds the claim.
   */
  waiter?: { key: string; ttlSeconds: number };
}

export interface ProviderCapacityLease {
  leaseId: string;
  routeKey: string;
  reservedTokens: number;
  tokenBurst?: number;
  /** Set when the reservation carried a waiter key (owner buckets). */
  waiterKey?: string;
}

export type ProviderCapacityDenialReason =
  "request_budget" | "token_budget" | "concurrency" | "shared_key_cooldown";

export type ProviderCapacityReservation =
  | { ok: true; lease: ProviderCapacityLease }
  | {
      ok: false;
      reasons: ProviderCapacityDenialReason[];
      /** Locked-snapshot refill time; absent for concurrency/cooldown holds. */
      retryAfterMs?: number;
      /**
       * True when, in the same locked snapshot, another live claimant owns
       * this bucket's turn (this requester owed it tokens). Such a requester
       * has no protected turn, so it should not hold a first-call wait slot.
       */
      claimedByOther?: boolean;
    };

/** A waiter never holds an owner bucket longer than this, retries included. */
export const MAX_WAITER_TTL_SECONDS = 900;
/** Claim slack past the waiter's own refill wait (its in-cycle re-admission). */
export const WAITER_RETRY_SLACK_SECONDS = 15;

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
    tokensPerMinute:
      raw.tokenBurst === undefined
        ? Math.max(
            positiveInt(raw.tokensPerMinute, "tokensPerMinute"),
            positiveInt(raw.reserveTokens, "reserveTokens"),
          )
        : positiveInt(raw.tokensPerMinute, "tokensPerMinute"),
    maxConcurrent: positiveInt(raw.maxConcurrent, "maxConcurrent"),
    reserveTokens: positiveInt(raw.reserveTokens, "reserveTokens"),
    leaseTtlSeconds: positiveInt(raw.leaseTtlSeconds, "leaseTtlSeconds"),
  };
  const tokenBurst =
    raw.tokenBurst === undefined
      ? undefined
      : Math.max(
          limit.tokensPerMinute,
          limit.reserveTokens,
          positiveInt(raw.tokenBurst, "tokenBurst"),
        );
  if (!limit.routeKey.trim() || !limit.provider.trim() || !limit.model.trim()) {
    throw new Error("routeKey, provider and model are required");
  }
  const waiterKey = raw.waiter?.key.trim() || null;
  const waiterTtlSeconds =
    waiterKey === null
      ? null
      : Math.min(
          MAX_WAITER_TTL_SECONDS,
          positiveInt(raw.waiter!.ttlSeconds, "waiter.ttlSeconds"),
        );

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
      retry_after_ms: number | null;
      claimed_by_other: boolean;
    }>(
      `WITH checked AS MATERIALIZED (
         SELECT clock_timestamp() AS at
       ), budget AS MATERIALIZED (
         SELECT b.route_key, checked.at,
                b.request_rate_per_min, b.model_rate_per_min,
                GREATEST(0, EXTRACT(EPOCH FROM (b.last_refill_at - checked.at))) AS refill_delay_seconds,
                LEAST(
                b.request_rate_per_min::double precision,
                b.request_tokens + b.request_rate_per_min *
                  GREATEST(0, EXTRACT(EPOCH FROM (checked.at - b.last_refill_at))) / 60.0
                ) AS available_requests,
                LEAST(
                COALESCE($3::double precision, b.model_rate_per_min::double precision),
                b.model_tokens + b.model_rate_per_min *
                  GREATEST(0, EXTRACT(EPOCH FROM (checked.at - b.last_refill_at))) / 60.0
                ) AS available_tokens,
                b.waiter_key,
                -- A claim is live until it expires, and only while an agent
                -- claimant is still active on the shared pool: a paused,
                -- deleted or BYO-switched agent releases it at once. (Text
                -- comparison: SQL does not short-circuit, so no cast here.)
                (b.waiter_key IS NOT NULL
                  AND b.waiter_expires_at > checked.at
                  AND (b.waiter_key !~ '^agent:[0-9]+$'
                       OR EXISTS (SELECT 1 FROM agent_runtime.agents w
                                   WHERE 'agent:' || w.id::text = b.waiter_key
                                     AND w.status = 'active'
                                     AND w.brain_key_enc IS NULL))) AS claim_live,
                b.waiter_tokens,
                b.blocked_until > checked.at AS cooling,
                (SELECT count(*)
                 FROM agent_runtime.provider_capacity_leases l
                WHERE l.route_key = b.route_key
                  AND l.expires_at > checked.at) >= b.max_concurrent AS slots_full
           FROM agent_runtime.provider_capacity_buckets b CROSS JOIN checked
          WHERE b.route_key = $1
       ), owed AS MATERIALIZED (
         -- Tokens owed to ANOTHER live claim; the claimant itself and requests
         -- without a waiter key (provider keys) owe nothing.
         SELECT *, CASE WHEN $4::text IS NOT NULL AND claim_live
                             AND waiter_key <> $4::text
                        THEN waiter_tokens::double precision ELSE 0 END AS owed_tokens
           FROM budget
       ), decision AS MATERIALIZED (
         SELECT *, array_remove(ARRAY[
           CASE WHEN available_requests < 1 THEN 'request_budget' END,
           CASE WHEN available_tokens - owed_tokens < $2 THEN 'token_budget' END,
           CASE WHEN slots_full THEN 'concurrency' END,
           CASE WHEN cooling THEN 'shared_key_cooldown' END
         ], NULL) AS denial_reasons FROM owed
       ), admitted AS (
         UPDATE agent_runtime.provider_capacity_buckets b
            SET request_tokens = d.available_requests - 1,
                model_tokens = d.available_tokens - $2,
                last_refill_at = d.at,
                updated_at = d.at,
                -- A live claim survives admission and is cleared only by
                -- the claimant's consumed release; a lapsed one goes now.
                waiter_key = CASE WHEN d.claim_live THEN b.waiter_key END,
                waiter_tokens = CASE WHEN d.claim_live THEN b.waiter_tokens END,
                waiter_since = CASE WHEN d.claim_live THEN b.waiter_since END,
                waiter_expires_at = CASE WHEN d.claim_live THEN b.waiter_expires_at END
           FROM decision d
          WHERE b.route_key = d.route_key AND cardinality(d.denial_reasons) = 0
         RETURNING b.route_key
       ), queued AS (
         -- A token-budget denial makes this requester the waiter unless another
         -- live claim holds the bucket. The claim covers the requester's own
         -- refill wait plus slack (its in-cycle re-admission), never more than
         -- ttlSeconds, and is fixed at the first wait: the claimant's later
         -- denials refresh only its need, never its age or expiry. Tokens,
         -- refill time and leases are untouched, as for any other denial.
         UPDATE agent_runtime.provider_capacity_buckets b
            SET waiter_key = $4::text,
                waiter_tokens = $2,
                waiter_since = CASE WHEN d.claim_live THEN b.waiter_since ELSE d.at END,
                waiter_expires_at = CASE WHEN d.claim_live THEN b.waiter_expires_at
                  ELSE d.at + make_interval(secs => LEAST(
                    $5::double precision,
                    d.refill_delay_seconds + GREATEST(
                      0, ($2 - d.available_tokens) / d.model_rate_per_min * 60.0,
                      (1 - d.available_requests) / d.request_rate_per_min * 60.0
                    ) + $6::double precision)) END,
                updated_at = d.at
           FROM decision d
          WHERE b.route_key = d.route_key
            AND $4::text IS NOT NULL
            AND 'token_budget' = ANY(d.denial_reasons)
            AND (NOT d.claim_live OR d.waiter_key = $4::text)
         RETURNING b.route_key
       )
       SELECT a.route_key, d.denial_reasons,
              CASE WHEN cardinality(d.denial_reasons) > 0
                         AND d.cooling IS NOT TRUE AND NOT d.slots_full
                   THEN CEIL((d.refill_delay_seconds + GREATEST(
                     0, ($2 + d.owed_tokens - d.available_tokens) / d.model_rate_per_min * 60.0,
                     (1 - d.available_requests) / d.request_rate_per_min * 60.0
                   )) * 1000)::double precision + 1
                   ELSE NULL END AS retry_after_ms,
              d.owed_tokens > 0 AS claimed_by_other
         FROM decision d LEFT JOIN admitted a ON a.route_key = d.route_key`,
      [
        limit.routeKey,
        limit.reserveTokens,
        tokenBurst ?? null,
        waiterKey,
        waiterTtlSeconds,
        WAITER_RETRY_SLACK_SECONDS,
      ],
    );

    const admission = reserved.rows[0];
    if (!admission) throw new Error("provider capacity bucket missing");
    if (admission.route_key === null) {
      await client.query("COMMIT");
      const refillWaitMs = admission.retry_after_ms;
      return {
        ok: false,
        reasons: admission.denial_reasons,
        ...(typeof refillWaitMs === "number" &&
        Number.isFinite(refillWaitMs) &&
        refillWaitMs > 0
          ? { retryAfterMs: refillWaitMs }
          : {}),
        ...(admission.claimed_by_other === true
          ? { claimedByOther: true }
          : {}),
      };
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
        ...(tokenBurst === undefined ? {} : { tokenBurst }),
        ...(waiterKey === null ? {} : { waiterKey }),
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
 * End an owner-bucket claim at once (a cycle that cannot wait for its refill,
 * or that stopped waiting). Only the named claimant's own claim is removed.
 */
export async function releaseOwnerClaim(
  pool: Pool,
  routeKey: string,
  waiterKey: string,
): Promise<void> {
  await pool.query(
    `UPDATE agent_runtime.provider_capacity_buckets
        SET waiter_key = NULL, waiter_tokens = NULL, waiter_since = NULL,
            waiter_expires_at = NULL, updated_at = clock_timestamp()
      WHERE route_key = $1 AND waiter_key = $2`,
    [routeKey, waiterKey],
  );
}

/**
 * Share a provider-requested cooldown (normally HTTP 429 Retry-After) across
 * every scheduler replica using this quota key. The caller supplies a bounded
 * duration; repeated failures only extend, never shorten, an existing hold.
 * Without Retry-After, start at 10-15s and double recent backoff up to 120-125s.
 * The row lock of ON CONFLICT makes escalation consistent across replicas.
 */
export async function coolDownProviderCapacity(
  pool: Pool,
  routeKey: string,
  provider: string,
  model: string,
  durationMs: number | undefined,
  failureClass = "rate_limit",
): Promise<void> {
  if (
    durationMs !== undefined &&
    (!Number.isFinite(durationMs) || durationMs < 0)
  ) {
    throw new Error("durationMs must be a finite non-negative number");
  }
  const boundedMs =
    durationMs === undefined
      ? null
      : Math.min(3_600_000, Math.max(1_000, Math.floor(durationMs)));
  const jitterMs = Math.floor(Math.random() * 5_001);
  await pool.query(
    `INSERT INTO agent_runtime.provider_route_cooldowns
       (route_key, provider, model, blocked_until, last_failure_class,
        last_failure_at, updated_at)
     VALUES ($1, $2, $3,
             clock_timestamp() + (COALESCE($4::double precision, 10000 + $6) * interval '1 millisecond'),
             $5, clock_timestamp(), clock_timestamp())
     ON CONFLICT (route_key, model) DO UPDATE SET
       blocked_until = GREATEST(
         agent_runtime.provider_route_cooldowns.blocked_until,
         CASE WHEN $4::double precision IS NOT NULL THEN EXCLUDED.blocked_until
         ELSE clock_timestamp() + ((CASE
           WHEN agent_runtime.provider_route_cooldowns.last_failure_at > clock_timestamp() - interval '5 minutes'
           THEN LEAST(120000, GREATEST(10000,
             extract(epoch FROM (agent_runtime.provider_route_cooldowns.blocked_until - agent_runtime.provider_route_cooldowns.last_failure_at)) * 1000) * 2)
           ELSE 10000 END + $6) * interval '1 millisecond') END
       ),
       last_failure_class = EXCLUDED.last_failure_class,
       last_failure_at = clock_timestamp(),
       updated_at = clock_timestamp()`,
    [routeKey, provider, model, boundedMs, failureClass.slice(0, 80), jitterMs],
  );
}

/** A successful call resets old backoff, never a failure newer than that call. */
export async function clearProviderCapacityBackoff(
  pool: Pool,
  routeKey: string,
  model: string,
  callStartedAt: number,
): Promise<void> {
  if (!Number.isFinite(callStartedAt))
    throw new Error("Invalid call start time");
  await pool.query(
    `DELETE FROM agent_runtime.provider_route_cooldowns
      WHERE route_key = $1 AND model = $2
        AND last_failure_at <= to_timestamp($3::double precision / 1000)`,
    [routeKey, model, callStartedAt],
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
 * usage. A smaller actual call refunds tokens; an underestimate is kept as
 * debt (the bucket may go negative) that refill repays before any later
 * admission, so reported usage, not the chars/4 estimate, meets the
 * configured rate. Live 2026-10-07: shared calls used 1.50x their reserve
 * and the old floor at 0 forgave the excess. All valid reported excess is
 * carried; usage counts only as a nonnegative safe integer, and anything
 * else (missing, negative, fractional, unsafe, non-finite) charges exactly
 * the reserve. A lease reconciles once (DELETE ... RETURNING).
 */
export async function releaseProviderCapacity(
  pool: Pool,
  lease: ProviderCapacityLease,
  actualTokens?: number,
  unused = false,
): Promise<void> {
  const actual =
    typeof actualTokens === "number" &&
    Number.isSafeInteger(actualTokens) &&
    actualTokens >= 0
      ? actualTokens
      : lease.reservedTokens;
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
            SET model_tokens = LEAST(
                  GREATEST(model_rate_per_min::double precision, $3::double precision),
                  model_tokens + $2
                ),
                request_tokens = LEAST(request_rate_per_min, request_tokens + $4),
                -- The claimant's turn is over only when its call consumed
                -- tokens; an unused or rejected-before-inference release keeps
                -- the claim, so a local or provider refusal never erases it.
                waiter_key = CASE WHEN $6 AND waiter_key = $5::text THEN NULL ELSE waiter_key END,
                waiter_tokens = CASE WHEN $6 AND waiter_key = $5::text THEN NULL ELSE waiter_tokens END,
                waiter_since = CASE WHEN $6 AND waiter_key = $5::text THEN NULL ELSE waiter_since END,
                waiter_expires_at = CASE WHEN $6 AND waiter_key = $5::text THEN NULL ELSE waiter_expires_at END,
                updated_at = clock_timestamp()
          WHERE route_key = $1`,
        [
          lease.routeKey,
          delta,
          lease.tokenBurst ?? 0,
          unused ? 1 : 0,
          lease.waiterKey ?? null,
          !unused && actual > 0 && lease.waiterKey !== undefined,
        ],
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
