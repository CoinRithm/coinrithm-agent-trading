import { Pool, type PoolClient } from "pg";
import {
  sanitizeDecisionInputRecord,
  ACTIONS_STRING_DIAGNOSTICS,
  type ProviderUsage,
} from "@coinrithm/mcp-trading/engine";
import {
  admitPaidCall,
  debitKeyFor,
  priceUsage,
  releaseKeyFor,
  type AdmissionReason,
  type PaidBrainPriceRow,
  type PaidCallResult,
  type PricedCall,
} from "./paidBrain.js";
export { migrate, assertSchemaReady } from "./schema.js";

export interface AgentRow {
  id: number;
  handle: string;
  displayName: string;
  live: boolean;
  cadenceSeconds: number;
  modelProvider: string;
  modelName: string;
  modelBaseUrl: string | null;
  spec: unknown; // compiled AgentSpec (jsonb -> object)
  prose: string;
  coinrithmKeyEnc: string;
  brainKeyEnc: string | null;
  ownerUserId?: number | null;
  isHouse?: boolean;
}

export interface CycleRecord {
  decision: string;
  skipReason?: string;
  // Keystone transparency: the model's own analysis this cycle + decision
  // confidence, surfaced in the Arena terminal.
  rationale?: string;
  confidence?: number;
  // No `rawModelOutput` field here — deliberately. The no-CoT privacy promise
  // (frontend copy + CLAUDE.md data-retention: "raw prompts and model
  // reasoning traces are never stored") is enforced at the DB write boundary:
  // recordCycle/persistCycleResult hard-force raw_model_output to NULL below,
  // so this type omits the field entirely (compile-time block) rather than
  // accepting a value it would then have to ignore. See f778338.
  modelFailed?: boolean;
  disabled?: boolean;
  actions?: unknown;
  log?: string;
  error?: string;
  // Slice-2 metering (gate triggers + token usage) — the credit-system substrate.
  triggerCodes?: string[];
  llmCallMade?: boolean;
  tokensIn?: number;
  tokensOut?: number;
  estimatedCostUsd?: number;
  decisionType?: string;
  writeAttempted?: number;
  writeAccepted?: number;
  observationHash?: string;
  indicatorVersion?: string;
  effectiveProvider?: string;
  effectiveModel?: string;
  routeReason?: string;
  routeAttempts?: unknown[];
  // Owner-private input projection, never copied to actions/log or public APIs.
  // The runtime type is not trusted here: a second allowlist validates storage.
  decisionInputRecord?: unknown;
}

function decisionInputJson(value: unknown): string | null {
  const safe = sanitizeDecisionInputRecord(value);
  return safe ? JSON.stringify(safe) : null;
}

export function createPool(databaseUrl: string): Pool {
  const pool = new Pool({ connectionString: databaseUrl, max: 10 });
  // `pg` emits an EventEmitter `error` when an IDLE pooled connection dies
  // (not through a query Promise). Without a listener Node treats it as an
  // uncaught exception; a routine Postgres restart killed the whole scheduler
  // this way on 2026-08-12. pg removes the dead client itself, so log the event
  // and let the next query acquire a fresh connection.
  pool.on("error", (error) => {
    console.error(
      "[scheduler] idle postgres client dropped:",
      error instanceof Error ? error.message : String(error),
    );
  });
  return pool;
}

const TRANSIENT_DATABASE_CODES = new Set([
  "57P01", // admin_shutdown
  "57P02", // crash_shutdown
  "57P03", // cannot_connect_now / recovery
  "08000", // connection_exception
  "08001", // unable_to_establish_sqlconnection
  "08003", // connection_does_not_exist
  "08004", // sqlserver_rejected_establishment_of_sqlconnection
  "08006", // connection_failure
  "ECONNREFUSED",
  "ECONNRESET",
  "ENETUNREACH",
  "EHOSTUNREACH",
  "ETIMEDOUT",
]);

export function isTransientDatabaseError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: unknown; message?: unknown };
  if (typeof e.code === "string" && TRANSIENT_DATABASE_CODES.has(e.code))
    return true;
  const message = typeof e.message === "string" ? e.message : "";
  return /connection terminated|connection refused|server closed the connection|the database system is (starting|shutting down|in recovery)/i.test(
    message,
  );
}

export async function retryDatabaseStartup(
  operation: () => Promise<void>,
  options: {
    sleep?: (ms: number) => Promise<void>;
    onRetry?: (attempt: number, delayMs: number, code: string) => void;
    initialDelayMs?: number;
    maxDelayMs?: number;
  } = {},
): Promise<void> {
  const sleep =
    options.sleep ??
    ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const initialDelayMs = options.initialDelayMs ?? 1_000;
  const maxDelayMs = options.maxDelayMs ?? 30_000;
  let attempt = 0;
  for (;;) {
    try {
      await operation();
      return;
    } catch (error) {
      if (!isTransientDatabaseError(error)) throw error;
      attempt += 1;
      const delayMs = Math.min(
        maxDelayMs,
        initialDelayMs * 2 ** Math.min(attempt - 1, 10),
      );
      const code =
        error &&
        typeof error === "object" &&
        typeof (error as { code?: unknown }).code === "string"
          ? String((error as { code: string }).code)
          : "connection_error";
      options.onRetry?.(attempt, delayMs, code);
      await sleep(delayMs);
    }
  }
}

// Idempotent safety migration: move agents off the hosted Groq lane onto NVIDIA.
// Groq's free 6k-TPM tier counts our ~6.5k-token prompt as OVER budget, so a
// Groq house agent 413s every cycle (Olivia). The shared hosted Groq route is
// obsolete: a45-casa's recorded stop is a provider HTTP 404 on
// llama-3.1-8b-instant, and the hosted API no longer offers a Groq model, so
// nothing repairs such a row by itself. Groq stays a BYO option — a user's own
// key has its own quota — so this only touches rows inside
// AUTOMATIC_MODEL_MIGRATION_SCOPE (no BYO key, not pinned): every house row as
// before, plus (2026-09-24) SHARED user rows that are active or already stopped
// as model_unavailable AND whose owner-matched CoinRithm ApiKey exists and is
// not revoked (a revoked key would only turn a model stop into a key stop).
// Paused and risk/key-stopped shared rows are deliberately left alone: they
// cannot run until their owner acts, and if they then hit the dead provider
// they stop as model_unavailable and this migration repairs them on the next
// boot. Runs before migrateAgentsOffEolModels on boot, whose revive step
// reactivates the model_unavailable rows it just remapped; a row this
// migration skips stays on groq and is therefore outside that nvidia-only step.
// (Targets updated 2026-08-26: the previous targets were themselves EOL'd by
// NVIDIA — see EOL_MODEL_SUCCESSORS.)
// Match the runtime's exact pin semantics: only JSON boolean true pins a model.
// Never cast arbitrary user JSON to boolean (strings/objects can be malformed).
// A BYO credential or explicit pin makes model selection owner-controlled even
// if the row is a house agent. Use this on BOTH remapping and model revival.
const AUTOMATIC_MODEL_MIGRATION_SCOPE =
  "brain_key_enc IS NULL AND (spec->'pinnedModel') IS DISTINCT FROM 'true'::jsonb";

export async function migrateHouseAgentsOffGroq(pool: Pool): Promise<number> {
  const { rowCount } = await pool.query(
    `UPDATE agent_runtime.agents AS a
        SET model_provider = 'nvidia',
            model_name = CASE
              WHEN a.model_name ILIKE '%70b%' OR a.model_name ILIKE '%versatile%'
                THEN 'nvidia/nemotron-3-super-120b-a12b'
              ELSE 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning'
            END,
            model_base_url = NULL,
            updated_at = now()
      WHERE a.model_provider = 'groq'
        AND ${AUTOMATIC_MODEL_MIGRATION_SCOPE}
        AND (a.is_house = true
             OR ((a.status = 'active'
                  OR (a.status = 'disabled' AND a.disabled_reason ILIKE 'model_unavailable%'))
                 AND EXISTS (
                   SELECT 1 FROM "ApiKey" k
                    WHERE k.id = NULLIF(substring(a.handle FROM '^a([0-9]+)-'), '')::int
                      AND k."userId" = a.owner_user_id
                      AND k."revokedAt" IS NULL)))`,
  );
  return rowCount ?? 0;
}

// NVIDIA end-of-life event, 2026-08-26T09:00:00Z: the ENTIRE hosted Llama 3.x
// line (8B, 70B, 3.3-70B, 3.2-3B) plus the llama-nemotron variants
// (super-49b v1 AND v1.5, nano-8b) started returning
//   410 Gone — "has reached its end of life ... no longer available"
// on ALL accounts. 35 agents (house + user, incl. the first external user's
// fleet) were correctly perma-disabled by the model_unavailable classifier
// within hours. Successors below are LIVE-PROBE-VERIFIED (HTTP 200 on
// chat/completions, 2026-08-26 ~14:00Z) — the /v1/models catalog LIES (it
// lists ids that 404 on invoke), so never add a successor without a probe.
export const EOL_MODEL_SUCCESSORS: Record<string, string> = {
  "meta/llama-3.1-8b-instruct": "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning",
  "meta/llama-3.2-3b-instruct": "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning",
  "nvidia/llama-3.1-nemotron-nano-8b-v1":
    "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning",
  // 2026-09-01: the nano-30b successor itself went 410. 23 agents (17
  // active, Mia among them) were surviving on the router circuit fallback
  // onto super-120b, all sharing one per-model quota. Probe-verified
  // 2026-09-02: the omni-reasoning variant answers 200 with strict JSON.
  "nvidia/nemotron-3-nano-30b-a3b":
    "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning",
  "meta/llama-3.1-70b-instruct": "nvidia/nemotron-3-super-120b-a12b",
  "meta/llama-3.3-70b-instruct": "nvidia/nemotron-3-super-120b-a12b",
  "nvidia/llama-3.3-nemotron-super-49b-v1": "nvidia/nemotron-3-super-120b-a12b",
  "nvidia/llama-3.3-nemotron-super-49b-v1.5":
    "nvidia/nemotron-3-super-120b-a12b",
};

/** Boot-run, idempotent (same pattern as the de-Groq migration): remap shared,
 * unpinned NVIDIA-provider agents pointing at an EOL'd model to its verified
 * successor, then REVIVE agents the model_unavailable classifier disabled —
 * the disable was correct (the model was gone); with a living model mapped,
 * the permanent-failure cause no longer exists. Drawdown/key_invalid
 * disables are untouched, as are BYO and explicitly pinned agents, including
 * their disabled state. Returns [remapped, revived]. */
export async function migrateAgentsOffEolModels(
  pool: Pool,
): Promise<[number, number]> {
  const entries = Object.entries(EOL_MODEL_SUCCESSORS);
  const cases = entries
    .map((_, i) => `WHEN model_name = $${i * 2 + 1} THEN $${i * 2 + 2}`)
    .join(" ");
  const params = entries.flat();
  const deadList = entries.map((_, i) => `$${i * 2 + 1}`).join(", ");
  const { rowCount: remapped } = await pool.query(
    `UPDATE agent_runtime.agents
        SET model_name = CASE ${cases} ELSE model_name END,
            updated_at = now()
      WHERE model_provider = 'nvidia' AND model_name IN (${deadList})
        AND ${AUTOMATIC_MODEL_MIGRATION_SCOPE}`,
    params,
  );
  const { rowCount: revived } = await pool.query(
    `UPDATE agent_runtime.agents
        SET status = 'active',
            disabled_reason = NULL,
            next_run_at = now(),
            updated_at = now()
      WHERE status = 'disabled'
        AND disabled_reason ILIKE 'model_unavailable%'
        AND model_provider = 'nvidia'
        AND ${AUTOMATIC_MODEL_MIGRATION_SCOPE}
        AND model_name = ANY($1::text[])`,
    [Object.values(EOL_MODEL_SUCCESSORS)],
  );
  return [remapped ?? 0, revived ?? 0];
}

// --- Provider circuits (reliability slice 1, 2026-08-26) --------------------
// One row per (provider, model). Strikes accumulate FLEET-WIDE from
// providerHold cycle results; at CIRCUIT_TRIP_STRIKES the circuit opens and
// probe_after gates claiming with exponential backoff (60s doubling, capped
// 1h). A successful model call deletes the row. Provider failures therefore
// hold agents without EVER disabling them — disables stay reserved for
// credentials, drawdown, kill-switch and user action.

export const CIRCUIT_TRIP_STRIKES = 3;

export async function recordProviderStrike(
  pool: Pool,
  provider: string,
  model: string,
  error: string,
  increment = 1,
): Promise<void> {
  const boundedIncrement = Math.max(1, Math.min(3, Math.floor(increment)));
  await pool.query(
    `INSERT INTO agent_runtime.provider_circuits
       (provider, model, strikes, last_error, probe_after, opened_at, updated_at)
     VALUES ($1, $2, $4, $3,
       CASE WHEN $4 >= ${CIRCUIT_TRIP_STRIKES} THEN now() + interval '60 seconds' ELSE NULL END,
       now(), now())
     ON CONFLICT (provider, model) DO UPDATE SET
       strikes = agent_runtime.provider_circuits.strikes + $4,
       last_error = EXCLUDED.last_error,
       probe_after = CASE
         WHEN agent_runtime.provider_circuits.strikes + $4 >= ${CIRCUIT_TRIP_STRIKES}
         THEN now() + make_interval(secs => LEAST(
                60 * power(2, agent_runtime.provider_circuits.strikes + $4 - ${CIRCUIT_TRIP_STRIKES}),
                3600))
         ELSE NULL
       END,
       updated_at = now()`,
    [provider, model, error.slice(0, 500), boundedIncrement],
  );
}

export async function isProviderRouteAvailable(
  pool: Pool,
  provider: string,
  model: string,
): Promise<boolean> {
  const { rows } = await pool.query<{ eligible: boolean }>(
    `SELECT NOT EXISTS (
       SELECT 1
         FROM agent_runtime.provider_circuits
        WHERE provider = $1 AND model = $2
          AND strikes >= ${CIRCUIT_TRIP_STRIKES}
          AND probe_after > now()
     ) AS eligible`,
    [provider, model],
  );
  return rows[0]?.eligible !== false;
}

export async function clearProviderCircuit(
  pool: Pool,
  provider: string,
  model: string,
): Promise<number> {
  const { rowCount } = await pool.query(
    `DELETE FROM agent_runtime.provider_circuits WHERE provider = $1 AND model = $2`,
    [provider, model],
  );
  return rowCount ?? 0;
}

// --- Tier usage (the metering the tier gate reads; see tiers.ts) ---

// Non-disabled agents an owner currently runs — the deploy gate's agent-cap input.
export async function agentCountByOwner(
  pool: Pool,
  ownerUserId: number,
): Promise<number> {
  const { rows } = await pool.query<{ n: string }>(
    `SELECT COUNT(*) AS n
       FROM agent_runtime.agents
      WHERE owner_user_id = $1 AND status <> 'disabled'`,
    [ownerUserId],
  );
  return Number(rows[0]?.n ?? 0);
}

// Sum of metered model cost for an owner's agents since `since` — the run-budget
// gate's input. Reads agent_cycles.estimated_cost_usd populated per cycle.
export async function costByOwnerSince(
  pool: Pool,
  ownerUserId: number,
  since: Date,
): Promise<number> {
  const { rows } = await pool.query<{ total: string | null }>(
    `SELECT COALESCE(SUM(c.estimated_cost_usd), 0)::float8 AS total
       FROM agent_runtime.agent_cycles c
       JOIN agent_runtime.agents a ON a.id = c.agent_id
      WHERE a.owner_user_id = $1 AND c.ts >= $2`,
    [ownerUserId, since],
  );
  return Number(rows[0]?.total ?? 0);
}

// --- Paid brains: credit ledger + paid call state (sql/008, contract v2) ----
// Money rows are append-only (credit_ledger); each paid call's durable state
// lives in paid_calls and is advanced only along guarded transitions
// (`WHERE status = <expected>`), so two workers, a crash, or recovery racing a
// live cycle can never move money twice: every ledger row is keyed and every
// transition is conditional.
//
// Every balance-changing transaction FIRST takes the owner credit lock
// pg_advisory_xact_lock(734202, owner_user_id) (the backend's grants and
// top-ups take the same lock; 734201 is the separate agent-slot lock).

export const OWNER_CREDIT_LOCK = 734202;

// A call left 'reserved' or 'dispatched' this long is no longer in flight:
// longer than the 360 s run lock and the 300 s model timeout.
const STALE_CALL = "interval '15 minutes'";

type Queryable = Pick<PoolClient, "query">;

async function ownerCreditTransaction<T>(
  pool: Pool,
  userId: number,
  operation: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "SELECT pg_advisory_xact_lock($1::integer, $2::integer)",
      [OWNER_CREDIT_LOCK, userId],
    );
    const result = await operation(client);
    await client.query("COMMIT");
    return result;
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

function ledgerMicro(value: string | null | undefined, label: string): number {
  const parsed = Number(value ?? 0);
  if (!Number.isSafeInteger(parsed)) {
    throw new Error(`credit ledger ${label} is out of range`);
  }
  return parsed;
}

export interface CreditPosition {
  /** SUM(amount_micro_usd) of the user: open reserves already subtracted. */
  balanceMicro: number;
  /** This agent's spend in the reservation month: finalized debits plus the
   * worst case of every call still open; released calls count zero. A call
   * counts in the UTC month it was RESERVED in, even if finalised later. */
  monthSpendMicro: number;
  /** The owner has a call that may have been billed without usage (status
   * 'uncertain', or 'dispatched' and stale). Blocks every new paid call. */
  uncertain: boolean;
}

export async function readCreditPosition(
  client: Queryable,
  userId: number,
  agentId: number,
  monthStart: string,
): Promise<CreditPosition> {
  const { rows } = await client.query<{
    balance: string | null;
    month_spend: string | null;
    uncertain: boolean;
  }>(
    `SELECT
       (SELECT COALESCE(SUM(amount_micro_usd), 0)
          FROM agent_runtime.credit_ledger WHERE user_id = $1)::text AS balance,
       (SELECT COALESCE(SUM(CASE WHEN status = 'finalized' THEN COALESCE(debit_micro_usd, 0)
                                 WHEN status = 'released' THEN 0
                                 ELSE worst_case_micro_usd END), 0)
          FROM agent_runtime.paid_calls
         WHERE agent_id = $2 AND month_start = $3::date)::text AS month_spend,
       EXISTS (SELECT 1 FROM agent_runtime.paid_calls
                WHERE user_id = $1
                  AND status NOT IN ('released', 'finalized')
                  AND (status = 'uncertain'
                       OR (status = 'dispatched' AND dispatched_at < now() - ${STALE_CALL}))
       ) AS uncertain`,
    [userId, agentId, monthStart],
  );
  return {
    balanceMicro: ledgerMicro(rows[0]?.balance, "balance"),
    monthSpendMicro: ledgerMicro(rows[0]?.month_spend, "month spend"),
    uncertain: rows[0]?.uncertain === true,
  };
}

export interface PaidReservationRequest {
  userId: number;
  agentId: number;
  reserveKey: string;
  modelId: string;
  /** Snapshotted on the call: finalisation never reprices it. */
  price: PaidBrainPriceRow;
  marginPct: number;
  worstCaseMicro: number;
  capMicro: number;
  /** YYYY-MM-DD, the UTC month this reservation counts in. */
  monthStart: string;
}

export type PaidReservation =
  { kind: "reserved" } | { kind: "refused"; reason: AdmissionReason };

/** Step 1 of a paid cycle, in ONE transaction under the owner credit lock:
 * read the position, admit, and (if admitted) insert the negative `reserve`
 * row plus the paid_calls row in state 'reserved'. A reused key aborts the
 * whole transaction rather than run a call on someone else's reservation. */
export async function reservePaidCall(
  pool: Pool,
  request: PaidReservationRequest,
): Promise<PaidReservation> {
  return ownerCreditTransaction(pool, request.userId, async (client) => {
    const position = await readCreditPosition(
      client,
      request.userId,
      request.agentId,
      request.monthStart,
    );
    const decision = admitPaidCall({
      ...position,
      capMicro: request.capMicro,
      worstCaseMicro: request.worstCaseMicro,
    });
    if (!decision.admit) return { kind: "refused", reason: decision.reason };
    const ledger = await client.query(
      `INSERT INTO agent_runtime.credit_ledger
         (user_id, kind, amount_micro_usd, agent_id, model_id, note, idempotency_key)
       VALUES ($1, 'reserve', $2, $3, $4, $5, $6)
       ON CONFLICT (idempotency_key) DO NOTHING`,
      [
        request.userId,
        -request.worstCaseMicro,
        request.agentId,
        request.modelId,
        `price ${request.price.version}, margin ${request.marginPct}%`,
        request.reserveKey,
      ],
    );
    const call = await client.query(
      `INSERT INTO agent_runtime.paid_calls
         (reserve_key, user_id, agent_id, model_id, price, margin_pct,
          worst_case_micro_usd, month_start)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8::date)
       ON CONFLICT (reserve_key) DO NOTHING`,
      [
        request.reserveKey,
        request.userId,
        request.agentId,
        request.modelId,
        JSON.stringify(request.price),
        request.marginPct,
        request.worstCaseMicro,
        request.monthStart,
      ],
    );
    if (ledger.rowCount !== 1 || call.rowCount !== 1) {
      throw new Error("paid reservation key already used");
    }
    return { kind: "reserved" };
  });
}

/** Step 2a: commit 'dispatched' IMMEDIATELY before the HTTP call. Only a call
 * still 'reserved' may be dispatched, so recovery having released it, or a
 * second decide on the same reservation, can never reach the provider. */
export async function markPaidCallDispatched(
  pool: Pool,
  reserveKey: string,
): Promise<boolean> {
  const { rowCount } = await pool.query(
    `UPDATE agent_runtime.paid_calls
        SET status = 'dispatched', dispatched_at = now()
      WHERE reserve_key = $1 AND status = 'reserved'`,
    [reserveKey],
  );
  return rowCount === 1;
}

/** Step 2b: record what the provider answered, right after the call. An
 * answer without usage becomes 'uncertain' at once, which blocks the owner's
 * next paid admission immediately. */
export async function recordPaidCallResult(
  pool: Pool,
  reserveKey: string,
  result: PaidCallResult,
): Promise<boolean> {
  const update = (set: string, params: unknown[]) =>
    pool.query(
      `UPDATE agent_runtime.paid_calls SET ${set}
        WHERE reserve_key = $1 AND status = 'dispatched'`,
      [reserveKey, ...params],
    );
  const { rowCount } =
    result.status === "answered"
      ? await update(
          "status = 'answered', usage = $2::jsonb, answered_at = now()",
          [JSON.stringify(result.usage)],
        )
      : result.status === "rejected"
        ? await update(
            "status = 'rejected', provider_status = $2, answered_at = now()",
            [result.providerStatus],
          )
        : result.status === "uncertain"
          ? await update(
              "status = 'uncertain', note = $2, answered_at = now()",
              [result.reason.slice(0, 200)],
            )
          : // Proven not sent (the provider layer deferred before any request).
            await update("status = 'reserved', dispatched_at = NULL", []);
  return rowCount === 1;
}

export type PaidFinalization =
  "released" | "debited" | "uncertain" | "open" | "closed" | "missing";

interface PaidCallRow {
  user_id: string;
  agent_id: string;
  model_id: string;
  status: string;
  price: PaidBrainPriceRow;
  margin_pct: number;
  usage: ProviderUsage | null;
  worst_case_micro_usd: string;
  stale_reserved: boolean;
  stale_dispatched: boolean;
  stale_answered: boolean;
}

/** Step 3 (and recovery), in ONE transaction under the owner credit lock,
 * driven only by the call's durable state:
 * - 'reserved' (never dispatched; proof the provider was not called):
 *   release. At cycle end always; in recovery once stale.
 * - 'rejected' (a known pre-processing rejection: 400/401/403/404/413/429
 *   without usage): release. Any other HTTP error is recorded uncertain.
 * - 'answered' (provider-reported usage): release the reserve and debit the
 *   actual, priced with the price row and margin SNAPSHOTTED on the call.
 * - 'dispatched' with no recorded result: uncertain (never refunded).
 * - 'uncertain', 'released', 'finalized': nothing.
 * Recovery only touches calls idle for 15 minutes, so it never races a live
 * cycle; both paths are idempotent through the ledger keys and the guarded
 * status update. */
export async function finalizePaidCall(
  pool: Pool,
  reserveKey: string,
  options: { mode: "cycle_end" | "recovery"; cycleId?: number },
): Promise<PaidFinalization> {
  const head = await pool.query<{ user_id: string }>(
    "SELECT user_id FROM agent_runtime.paid_calls WHERE reserve_key = $1",
    [reserveKey],
  );
  const userId = Number(head.rows[0]?.user_id);
  if (!Number.isSafeInteger(userId)) return "missing";
  return ownerCreditTransaction(pool, userId, async (client) => {
    const { rows } = await client.query<PaidCallRow>(
      `SELECT user_id, agent_id, model_id, status, price, margin_pct, usage,
              worst_case_micro_usd::text AS worst_case_micro_usd,
              created_at < now() - ${STALE_CALL} AS stale_reserved,
              COALESCE(dispatched_at < now() - ${STALE_CALL}, false) AS stale_dispatched,
              COALESCE(answered_at < now() - ${STALE_CALL}, false) AS stale_answered
         FROM agent_runtime.paid_calls
        WHERE reserve_key = $1
        FOR UPDATE`,
      [reserveKey],
    );
    const call = rows[0];
    if (!call) return "missing";
    const recovery = options.mode === "recovery";
    const cycleId = options.cycleId ?? null;
    const close = (status: "released" | "finalized", debitMicro: number) =>
      client.query(
        `UPDATE agent_runtime.paid_calls
            SET status = $2, debit_micro_usd = $3, closed_at = now(),
                cycle_id = COALESCE(cycle_id, $4)
          WHERE reserve_key = $1 AND status = $5`,
        [reserveKey, status, debitMicro, cycleId, call.status],
      );
    const markUncertain = (note: string) =>
      client.query(
        `UPDATE agent_runtime.paid_calls
            SET status = 'uncertain', note = $2, cycle_id = COALESCE(cycle_id, $3)
          WHERE reserve_key = $1 AND status = $4`,
        [reserveKey, note.slice(0, 200), cycleId, call.status],
      );
    const release = () =>
      client.query(
        `INSERT INTO agent_runtime.credit_ledger
           (user_id, kind, amount_micro_usd, agent_id, cycle_id, model_id, idempotency_key)
         SELECT user_id, 'release', -amount_micro_usd, agent_id, $3, model_id, $2
           FROM agent_runtime.credit_ledger
          WHERE idempotency_key = $1 AND kind = 'reserve'
         ON CONFLICT (idempotency_key) DO NOTHING`,
        [reserveKey, releaseKeyFor(reserveKey), cycleId],
      );

    switch (call.status) {
      case "reserved":
        if (recovery && !call.stale_reserved) return "open";
        await release();
        await close("released", 0);
        return "released";
      case "rejected":
        if (recovery && !call.stale_answered) return "open";
        await release();
        await close("released", 0);
        return "released";
      case "dispatched":
        if (recovery && !call.stale_dispatched) return "open";
        await markUncertain("dispatched call left without a recorded result");
        return "uncertain";
      case "answered": {
        if (recovery && !call.stale_answered) return "open";
        let priced: PricedCall;
        try {
          if (!call.usage) throw new Error("answered call has no usage");
          priced = priceUsage(call.price, call.usage, call.margin_pct);
        } catch (e) {
          await markUncertain(
            `cannot price: ${e instanceof Error ? e.message : String(e)}`,
          );
          return "uncertain";
        }
        // Never charge above the reserve the owner's balance and cap
        // admitted. The input allowance is an estimate, so usage above the
        // reserve can happen: the excess is not charged, and the call is
        // flagged uncertain (blocking the owner's next paid call) for root
        // review.
        const reserved = Number(call.worst_case_micro_usd);
        if (!Number.isSafeInteger(reserved) || reserved <= 0) {
          await markUncertain("cannot read the call's reserve");
          return "uncertain";
        }
        const overReserve = priced.totalMicro > reserved;
        const debitMicro = overReserve ? reserved : priced.totalMicro;
        // The ledger keeps what WE pay the provider and what the owner was
        // charged apart: provider_cost is the provider-priced cost; margin is
        // what the charge earned over it, negative when an over-reserve
        // write-off exceeded the margin (root review of #118).
        const chargedMarginMicro = debitMicro - priced.providerCostMicro;
        const writtenOffMicro = priced.totalMicro - debitMicro;
        const notes = overReserve
          ? [
              `over reserve: priced ${priced.totalMicro}, charged the ${reserved} reserve, written off ${writtenOffMicro}`,
              ...priced.notes,
            ]
          : priced.notes;
        await release();
        if (debitMicro > 0) {
          await client.query(
            `INSERT INTO agent_runtime.credit_ledger
               (user_id, kind, amount_micro_usd, agent_id, cycle_id, model_id,
                tokens_in, tokens_out, provider_cost_micro_usd, margin_micro_usd,
                note, idempotency_key)
             VALUES ($1, 'debit', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             ON CONFLICT (idempotency_key) DO NOTHING`,
            [
              Number(call.user_id),
              -debitMicro,
              Number(call.agent_id),
              cycleId,
              call.model_id,
              Math.ceil(call.usage!.promptTokens),
              Math.ceil(call.usage!.completionTokens),
              priced.providerCostMicro,
              chargedMarginMicro,
              [`price ${call.price.version}`, ...notes].join("; "),
              debitKeyFor(reserveKey),
            ],
          );
        }
        if (overReserve) {
          await client.query(
            `UPDATE agent_runtime.paid_calls
                SET status = 'uncertain', debit_micro_usd = $2, note = $3,
                    cycle_id = COALESCE(cycle_id, $4)
              WHERE reserve_key = $1 AND status = 'answered'`,
            [reserveKey, debitMicro, notes[0]!.slice(0, 200), cycleId],
          );
          return "uncertain";
        }
        await close("finalized", debitMicro);
        return "debited";
      }
      default:
        return "closed";
    }
  });
}

export interface PaidRecoveryCandidates {
  /** Open calls idle for 15 minutes: finalise, release or mark uncertain. */
  stale: string[];
  /** Calls awaiting root reconciliation (alerted, never auto-refunded). */
  uncertain: Array<{ reserveKey: string; userId: number; agentId: number }>;
}

export async function listPaidRecoveryCandidates(
  pool: Pool,
  limit = 100,
): Promise<PaidRecoveryCandidates> {
  const stale = await pool.query<{ reserve_key: string }>(
    `SELECT reserve_key FROM agent_runtime.paid_calls
      WHERE status NOT IN ('released', 'finalized')
        AND ((status = 'reserved' AND created_at < now() - ${STALE_CALL})
          OR (status = 'dispatched' AND dispatched_at < now() - ${STALE_CALL})
          OR (status IN ('answered', 'rejected') AND answered_at < now() - ${STALE_CALL}))
      ORDER BY created_at
      LIMIT $1`,
    [limit],
  );
  const uncertain = await pool.query<{
    reserve_key: string;
    user_id: string;
    agent_id: string;
  }>(
    `SELECT reserve_key, user_id, agent_id FROM agent_runtime.paid_calls
      WHERE status NOT IN ('released', 'finalized') AND status = 'uncertain'
      ORDER BY created_at
      LIMIT $1`,
    [limit],
  );
  return {
    stale: stale.rows.map((row) => row.reserve_key),
    uncertain: uncertain.rows.map((row) => ({
      reserveKey: row.reserve_key,
      userId: Number(row.user_id),
      agentId: Number(row.agent_id),
    })),
  };
}

interface RawAgent {
  id: string;
  handle: string;
  display_name: string;
  live: boolean;
  cadence_seconds: string;
  model_provider: string;
  model_name: string;
  model_base_url: string | null;
  spec: unknown;
  prose: string;
  coinrithm_key_enc: string;
  brain_key_enc: string | null;
  owner_user_id?: string | null;
  is_house?: boolean;
}

function mapAgent(r: RawAgent): AgentRow {
  return {
    id: Number(r.id),
    handle: r.handle,
    displayName: r.display_name,
    live: r.live,
    cadenceSeconds: Number(r.cadence_seconds),
    modelProvider: r.model_provider,
    modelName: r.model_name,
    modelBaseUrl: r.model_base_url,
    spec: r.spec,
    prose: r.prose,
    coinrithmKeyEnc: r.coinrithm_key_enc,
    brainKeyEnc: r.brain_key_enc,
    ownerUserId: r.owner_user_id == null ? null : Number(r.owner_user_id),
    isHouse: r.is_house === true,
  };
}

// While a cycle runs, the agent row is "locked" by pushing next_run_at this far
// out, so a slow run can't be re-claimed (overlap) before it finishes; on
// COMPLETION persistCycleResult resets next_run_at to now()+cadence. Must exceed
// the model timeout (providers DEFAULT_TIMEOUT_MS) + observe/act/persist overhead.
// Must EXCEED the model timeout (providers DEFAULT_TIMEOUT_MS = 300s) + observe/
// act/persist overhead, so a slow-but-alive cycle is never re-claimed (overlapped)
// before it finishes. A crashed cycle retries after this window.
const RUN_LOCK_SECONDS = 360;

// Claim due active agents under a row lock so two scheduler replicas never
// double-run the same agent. next_run_at is advanced inside the same transaction
// BEFORE running (a RUN_LOCK_SECONDS lock), so a crash mid-run retries after the
// lock window rather than re-firing the same cycle; a normal cycle reschedules to
// now()+cadence on completion — sequential per agent, so a slow call just delays
// the next cycle, never overlaps it.
export async function claimDueAgents(
  pool: Pool,
  limit: number,
  routerEnabled = false,
  /** Agents this process is still running (review 2026-09-23): once a hung
   * run outlives RUN_LOCK_SECONDS its row is claimable again, and a loop
   * that keeps polling would re-claim the SAME agent into a free slot. They
   * are excluded in SQL before tenant ranking and LIMIT, so other agents
   * still fill the batch; claim-and-discard would only extend their locks.
   * Empty (the default) keeps the query and its parameters unchanged. */
  excludeAgentIds: readonly number[] = [],
): Promise<AgentRow[]> {
  const excludeSql =
    excludeAgentIds.length > 0
      ? "\n            AND NOT (a.id = ANY($3::bigint[]))"
      : "";
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query<RawAgent>(
      // Reliability slice 1: agents whose (provider, model) circuit is OPEN
      // (tripped and inside its backoff window) are excluded from claiming —
      // a fleet-wide provider outage becomes a cheap skip at the claim query
      // instead of N agents burning cycles into failures. When probe_after
      // passes, matching agents claim again; the next cycle either closes
      // the circuit (success) or re-arms it with a longer backoff.
      // Fairness is applied before LIMIT: take every tenant's oldest due agent
      // before taking any tenant's second, then third, and so on. All house
      // agents intentionally form one tenant; each external owner forms another.
      // Without this, a large house/user fleet that became due first could fill
      // every batch indefinitely while a one-agent owner waited behind it.
      // The outer query locks ONLY agent rows; provider-circuit reads stay cheap.
      // Recheck eligibility on the row being locked: the materialized due list
      // can predate a concurrent claim or pause. PostgreSQL re-evaluates these
      // predicates against that transaction's updated row before returning it.
      `WITH due AS MATERIALIZED (
         SELECT a.id,
                row_number() OVER (
                  PARTITION BY CASE
                    WHEN a.is_house THEN 'house'
                    WHEN a.owner_user_id IS NOT NULL THEN 'user:' || a.owner_user_id::text
                    ELSE 'agent:' || a.id::text
                  END
                  ORDER BY a.next_run_at, a.id
                ) AS tenant_position
           FROM agent_runtime.agents a
           LEFT JOIN agent_runtime.provider_circuits pc
             ON pc.provider = a.model_provider AND pc.model = a.model_name
          WHERE a.status = 'active' AND a.next_run_at <= now()${excludeSql}
            AND (($2::boolean AND a.brain_key_enc IS NULL AND a.model_provider = 'nvidia')
                 OR a.brain_key_enc IS NOT NULL
                 OR pc.probe_after IS NULL OR pc.strikes < 3 OR pc.probe_after <= now())
       ), picked AS MATERIALIZED (
         SELECT a.id, a.handle, a.display_name, a.live, a.cadence_seconds,
                a.model_provider, a.model_name, a.model_base_url, a.spec,
                a.prose, a.coinrithm_key_enc, a.brain_key_enc, a.owner_user_id, a.is_house,
                due.tenant_position, a.next_run_at
           FROM due
           JOIN agent_runtime.agents a ON a.id = due.id
          WHERE a.status = 'active' AND a.next_run_at <= now()
          ORDER BY due.tenant_position, a.next_run_at, a.id
          LIMIT $1
          FOR UPDATE OF a SKIP LOCKED
       )
       SELECT id, handle, display_name, live, cadence_seconds, model_provider,
              model_name, model_base_url, spec, prose, coinrithm_key_enc,
              brain_key_enc, owner_user_id, is_house
         FROM picked
        ORDER BY tenant_position, next_run_at, id`,
      excludeAgentIds.length > 0
        ? [limit, routerEnabled, [...excludeAgentIds]]
        : [limit, routerEnabled],
    );
    if (rows.length > 0) {
      const ids = rows.map((r) => r.id);
      await client.query(
        `UPDATE agent_runtime.agents
            SET next_run_at = now() + make_interval(secs => GREATEST(cadence_seconds, ${RUN_LOCK_SECONDS})),
                last_run_at = now(),
                updated_at = now()
          WHERE id = ANY($1::bigint[])`,
        [ids],
      );
    }
    await client.query("COMMIT");
    return rows.map(mapAgent);
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

export async function loadStateJson(
  pool: Pool,
  agentId: number,
): Promise<unknown | null> {
  const { rows } = await pool.query<{ state: unknown }>(
    "SELECT state FROM agent_runtime.agent_state WHERE agent_id = $1",
    [agentId],
  );
  return rows.length > 0 ? rows[0]!.state : null;
}

export async function saveStateJson(
  pool: Pool,
  agentId: number,
  state: unknown,
): Promise<void> {
  await pool.query(
    `INSERT INTO agent_runtime.agent_state (agent_id, state, updated_at)
     VALUES ($1, $2::jsonb, now())
     ON CONFLICT (agent_id) DO UPDATE SET state = EXCLUDED.state, updated_at = now()`,
    [agentId, JSON.stringify(state)],
  );
}

function sanitizeRouteAttempts(value: unknown): unknown[] {
  if (!Array.isArray(value)) return [];
  const outcomes = new Set(["success", "failed", "deferred"]);
  const classes = new Set(["capacity", "permanent", "transient", "malformed"]);
  const admissionReasons = [
    "request_budget",
    "token_budget",
    "concurrency",
    "shared_key_cooldown",
    "model_cooldown",
  ];
  return value.slice(0, 2).flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const raw = item as Record<string, unknown>;
    const provider =
      typeof raw.provider === "string" ? raw.provider.slice(0, 80) : "unknown";
    const model =
      typeof raw.model === "string" ? raw.model.slice(0, 160) : "unknown";
    const outcome =
      typeof raw.outcome === "string" && outcomes.has(raw.outcome)
        ? raw.outcome
        : "failed";
    const failureClass =
      typeof raw.failureClass === "string" && classes.has(raw.failureClass)
        ? raw.failureClass
        : undefined;
    const boundedNumber = (
      candidate: unknown,
      max: number,
    ): number | undefined =>
      typeof candidate === "number" && Number.isFinite(candidate)
        ? Math.max(0, Math.min(max, Math.floor(candidate)))
        : undefined;
    const error =
      typeof raw.error === "string"
        ? raw.error
            .replace(/Bearer\s+[A-Za-z0-9._-]{8,}/gi, "Bearer ***")
            .slice(0, 200)
        : undefined;
    const rawReasons = raw.admissionReasons;
    const diagnostic =
      outcome === "failed" && failureClass === "malformed"
        ? ACTIONS_STRING_DIAGNOSTICS.find(
            (value) => value === raw.actionsStringDiagnostic,
          )
        : undefined;
    const responseSource =
      outcome === "success" ||
      (outcome === "failed" && failureClass === "malformed")
        ? ["content", "tool_call", "content_fallback"].find(
            (value) => value === raw.responseSource,
          )
        : undefined;
    const reasons =
      outcome === "deferred" && Array.isArray(rawReasons)
        ? admissionReasons.filter((reason) => rawReasons.includes(reason))
        : [];
    return [
      {
        provider,
        model,
        outcome,
        ...(failureClass ? { failureClass } : {}),
        ...(boundedNumber(raw.status, 599) !== undefined
          ? { status: boundedNumber(raw.status, 599) }
          : {}),
        ...(boundedNumber(raw.retryAfterMs, 3_600_000) !== undefined
          ? { retryAfterMs: boundedNumber(raw.retryAfterMs, 3_600_000) }
          : {}),
        latencyMs: boundedNumber(raw.latencyMs, 3_600_000) ?? 0,
        ...(error ? { error } : {}),
        ...(reasons.length ? { admissionReasons: reasons } : {}),
        ...(diagnostic ? { actionsStringDiagnostic: diagnostic } : {}),
        ...(responseSource ? { responseSource } : {}),
      },
    ];
  });
}

export async function recordCycle(
  pool: Pool,
  agentId: number,
  rec: CycleRecord,
): Promise<void> {
  await pool.query(
    `INSERT INTO agent_runtime.agent_cycles
       (agent_id, decision, skip_reason, rationale, confidence, raw_model_output, model_failed, disabled, actions, log, error,
        trigger_codes, llm_call_made, tokens_in, tokens_out, estimated_cost_usd, decision_type, write_attempted, write_accepted,
        observation_hash, indicator_version, effective_provider, effective_model,
        route_reason, route_attempts, decision_input_record, decision_input_record_expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21,
             $22, $23, $24, $25::jsonb, $26::jsonb,
             CASE WHEN $26::jsonb IS NOT NULL THEN now() + interval '30 days' ELSE NULL END)`,
    [
      agentId,
      rec.decision,
      rec.skipReason ?? null,
      rec.rationale ?? null,
      rec.confidence ?? null,
      // no-CoT privacy policy: raw_model_output is hard-forced NULL at this DB
      // write boundary — CycleRecord has no rawModelOutput field to read from,
      // so no caller can ever persist raw model text here regardless of what
      // it passes upstream. Defense in depth on top of the runner (f778338).
      null,
      !!rec.modelFailed,
      !!rec.disabled,
      rec.actions === undefined ? null : JSON.stringify(rec.actions),
      rec.log ?? null,
      rec.error ?? null,
      rec.triggerCodes ?? null,
      rec.llmCallMade ?? null,
      rec.tokensIn ?? null,
      rec.tokensOut ?? null,
      rec.estimatedCostUsd ?? null,
      rec.decisionType ?? null,
      rec.writeAttempted ?? null,
      rec.writeAccepted ?? null,
      rec.observationHash ?? null,
      rec.indicatorVersion ?? null,
      rec.effectiveProvider ?? null,
      rec.effectiveModel ?? null,
      rec.routeReason ?? null,
      rec.routeAttempts === undefined
        ? null
        : JSON.stringify(sanitizeRouteAttempts(rec.routeAttempts)),
      decisionInputJson(rec.decisionInputRecord),
    ],
  );
}

// Persist a completed cycle ATOMICALLY: state + the cycle row (+ optional
// disable) in ONE transaction, so a mid-write crash never leaves them diverged
// (e.g. a kill-switch state saved but status still 'active').
//
// Reliability slice 1: `providerHold` (a permanent provider/model failure the
// runner classified) records a FLEET circuit strike instead of any disable;
// `model` identifies the route so a SUCCESSFUL model call closes its circuit.
export async function persistCycleResult(
  pool: Pool,
  agentId: number,
  args: {
    state: unknown;
    cycle: CycleRecord;
    disableReason?: string;
    providerHold?: { provider: string; model: string; error: string };
    /**
     * Owner-budget deferral with no model call (sharedPolicy
     * ownerDeferralRetrySeconds): run again this many seconds from now, or at
     * the next grid slot if that is sooner. Ignored unless 1-3600.
     */
    retryInSeconds?: number;
    /** The route that served (or failed) this cycle — configured model until
     * failover routing exists. Recorded as agent_cycles.effective_model. */
    model?: { provider: string; name: string };
  },
): Promise<number | undefined> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO agent_runtime.agent_state (agent_id, state, updated_at)
       VALUES ($1, $2::jsonb, now())
       ON CONFLICT (agent_id) DO UPDATE SET state = EXCLUDED.state, updated_at = now()`,
      [agentId, JSON.stringify(args.state)],
    );
    const c = args.cycle;
    // RETURNING id: the paid-brain debit is keyed by this cycle's id
    // ('debit:<cycle_id>'), written right after this transaction commits.
    const inserted = await client.query<{ id: string }>(
      `INSERT INTO agent_runtime.agent_cycles
         (agent_id, decision, skip_reason, rationale, confidence, raw_model_output, model_failed, disabled, actions, log, error,
          trigger_codes, llm_call_made, tokens_in, tokens_out, estimated_cost_usd, decision_type, write_attempted, write_accepted,
          observation_hash, indicator_version, effective_provider, effective_model,
          route_reason, route_attempts, decision_input_record, decision_input_record_expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21,
               $22, $23, $24, $25::jsonb, $26::jsonb,
               CASE WHEN $26::jsonb IS NOT NULL THEN now() + interval '30 days' ELSE NULL END)
       RETURNING id`,
      [
        agentId,
        c.decision,
        c.skipReason ?? null,
        c.rationale ?? null,
        c.confidence ?? null,
        // no-CoT privacy policy: raw_model_output is hard-forced NULL at this DB
        // write boundary (same enforcement as recordCycle above) — see f778338.
        null,
        !!c.modelFailed,
        !!c.disabled,
        c.actions === undefined ? null : JSON.stringify(c.actions),
        c.log ?? null,
        c.error ?? null,
        c.triggerCodes ?? null,
        c.llmCallMade ?? null,
        c.tokensIn ?? null,
        c.tokensOut ?? null,
        c.estimatedCostUsd ?? null,
        c.decisionType ?? null,
        c.writeAttempted ?? null,
        c.writeAccepted ?? null,
        c.observationHash ?? null,
        c.indicatorVersion ?? null,
        c.effectiveProvider ??
          (c.llmCallMade === true ? args.model?.provider : null) ??
          null,
        c.effectiveModel ??
          (c.llmCallMade === true ? args.model?.name : null) ??
          null,
        c.routeReason ?? null,
        c.routeAttempts === undefined
          ? null
          : JSON.stringify(sanitizeRouteAttempts(c.routeAttempts)),
        decisionInputJson(c.decisionInputRecord),
      ],
    );
    if (args.providerHold) {
      // Fleet circuit strike INSIDE the same transaction — never a disable.
      const h = args.providerHold;
      await client.query(
        `INSERT INTO agent_runtime.provider_circuits
           (provider, model, strikes, last_error, probe_after, opened_at, updated_at)
         VALUES ($1, $2, 1, $3, NULL, now(), now())
         ON CONFLICT (provider, model) DO UPDATE SET
           strikes = agent_runtime.provider_circuits.strikes + 1,
           last_error = EXCLUDED.last_error,
           probe_after = CASE
             WHEN agent_runtime.provider_circuits.strikes + 1 >= ${CIRCUIT_TRIP_STRIKES}
             THEN now() + make_interval(secs => LEAST(
                    60 * power(2, agent_runtime.provider_circuits.strikes + 1 - ${CIRCUIT_TRIP_STRIKES}),
                    3600))
             ELSE NULL
           END,
           updated_at = now()`,
        [h.provider, h.model, h.error.slice(0, 500)],
      );
    } else if (
      args.model &&
      c.llmCallMade === true &&
      !c.modelFailed &&
      (c.decisionType === "act" || c.decisionType === "skip")
    ) {
      // A real, successful model call on this route closes its circuit.
      await client.query(
        `DELETE FROM agent_runtime.provider_circuits WHERE provider = $1 AND model = $2`,
        [args.model.provider, args.model.name],
      );
    }
    if (args.disableReason) {
      // A cycle may finish after the owner paused/disconnected/revoked it.
      // Keep that newer authoritative status and reason intact.
      await client.query(
        "UPDATE agent_runtime.agents SET status = 'disabled', disabled_reason = $2, updated_at = now() WHERE id = $1 AND status = 'active'",
        [agentId, args.disableReason.slice(0, 500)],
      );
    } else {
      // Reschedule the NEXT cycle from COMPLETION: cadence after this run finished,
      // not from claim — so a slow model just delays the next cycle instead of
      // overlapping it (claimDueAgents set a RUN_LOCK_SECONDS lock; reset it here).
      const retry =
        Number.isInteger(args.retryInSeconds) &&
        args.retryInSeconds! >= 1 &&
        args.retryInSeconds! <= 3600
          ? args.retryInSeconds!
          : null;
      await client.query(
        retry === null
          ? `UPDATE agent_runtime.agents
            SET next_run_at = ${nextRunAtSql(schedulingFlags)},
                updated_at = now()
          WHERE id = $1 AND status = 'active'`
          : `UPDATE agent_runtime.agents
            SET next_run_at = LEAST(${nextRunAtSql(schedulingFlags)},
                                    now() + make_interval(secs => $2::int)),
                updated_at = now()
          WHERE id = $1 AND status = 'active'`,
        retry === null ? [agentId] : [agentId, retry],
      );
    }
    await client.query("COMMIT");
    const cycleId = Number(inserted?.rows?.[0]?.id);
    return Number.isSafeInteger(cycleId) && cycleId > 0 ? cycleId : undefined;
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

// Shared-pool cadence floor (owner directive 2026-08-27). The free NVIDIA pool
// is a FIXED budget, so the more agents share it the slower each one may run:
// measured 2026-08-27, a cycle costs ~8.4k input tokens, and at 100k TPM the
// lane tops out near 11.7 calls/min no matter how many agents want one. Left
// unbounded, agent 60 simply starves agents 1-59 (and the fleet 429s, which is
// exactly what a 25 percent failure rate on super-120b looked like).
//
// floor_seconds = ceil(active_shared_agents * 60 / TARGET_RPM), so the interval
// stretches automatically as the user base grows. BYO agents bring their OWN
// quota and are never floored — that is the honest upgrade path, and the whole
// reason the free tier can stay free.
export const SHARED_CADENCE_TARGET_RPM = (() => {
  const raw = Number(process.env.SCHEDULER_SHARED_TARGET_RPM);
  return Number.isFinite(raw) && raw > 0 ? raw : 8;
})();

// Active shared-pool agents, for the owner-bucket waiter TTL (sharedPolicy).
// Read at most once a minute; a failed read keeps the last value (0 at boot,
// which only shortens the TTL to the configured cadence) and never blocks
// admission.
let activeSharedCount: { atMs: number; n: number } | null = null;
export async function activeSharedAgentCount(
  pool: Pool,
  nowMs = Date.now(),
): Promise<number> {
  if (activeSharedCount && nowMs - activeSharedCount.atMs < 60_000)
    return activeSharedCount.n;
  try {
    const r = await pool.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM agent_runtime.agents
        WHERE status = 'active' AND brain_key_enc IS NULL`,
    );
    activeSharedCount = { atMs: nowMs, n: Number(r.rows[0]?.n ?? 0) };
  } catch {
    activeSharedCount = { atMs: nowMs, n: activeSharedCount?.n ?? 0 };
  }
  return activeSharedCount.n;
}
/** Tests only: forget the cached count. */
export function resetActiveSharedAgentCount(): void {
  activeSharedCount = null;
}

/** Pure: the floor a shared-pool agent may not run faster than. */
export function sharedCadenceFloorSeconds(activeSharedAgents: number): number {
  if (!(activeSharedAgents > 0)) return 0;
  return Math.ceil((activeSharedAgents * 60) / SHARED_CADENCE_TARGET_RPM);
}

// SQL: seconds until this agent's next cycle. GREATEST(configured, floor) for
// shared agents; the configured cadence verbatim for BYO.
const NEXT_CADENCE_SECS = `GREATEST(
       cadence_seconds,
       CASE WHEN brain_key_enc IS NULL THEN (
         SELECT ceil(count(*) * 60.0 / ${SHARED_CADENCE_TARGET_RPM})
           FROM agent_runtime.agents s
          WHERE s.status = 'active' AND s.brain_key_enc IS NULL
       ) ELSE 0 END
     )`;

// Phase grid (owner 2026-09-23) -------------------------------------------
// Rescheduling every agent to now()+cadence keeps agents that finished
// together coming due together, and a synchronized batch drains the shared
// brain's per-minute budget in one go while later minutes sit idle (live
// 2026-09-23: three house agents starting within ~7 s of each other every
// cadence, 67-100% of their cycles deferred on capacity). On the grid, the
// next due time is the agent's next SLOT: slots are cadence-sized and the
// agent's phase inside a slot is a Fibonacci hash of its id (multiply by
// 2^32/phi, keep the top bits), which spreads sequential ids evenly: ids 1..7
// on a 240 s grid land at 148, 56, 204, 113, 21, 169 and 78 s. The result is
// strictly after now() and at most one cadence away, so an overrunning cycle
// simply runs at its next slot: no catch-up burst, no overlap (the claim-time
// RUN_LOCK is untouched, and the shared-pool floor still sizes the slot).
export interface SchedulingFlags {
  phaseGrid: boolean;
}
let schedulingFlags: SchedulingFlags = {
  phaseGrid: process.env.SCHEDULER_PHASE_GRID_ENABLED !== "false",
};
/** runScheduler sets this from Config at boot; tests set it explicitly. */
export function configureScheduling(flags: SchedulingFlags): void {
  schedulingFlags = { ...flags };
}
export function currentSchedulingFlags(): SchedulingFlags {
  return { ...schedulingFlags };
}

/** 2^32 / phi: the Fibonacci-hash multiplier (Knuth). */
export const PHASE_HASH_MULTIPLIER = 2654435769n;

/** JS mirror of the SQL phase below: 0 <= phase < cadenceSeconds. */
export function phaseOffsetSeconds(
  agentId: number,
  cadenceSeconds: number,
): number {
  const secs = BigInt(Math.max(1, Math.floor(cadenceSeconds)));
  const hashed = (BigInt(agentId) * PHASE_HASH_MULTIPLIER) % 4294967296n;
  return Number((hashed * secs) / 4294967296n);
}

/** SQL: the agent's next due time, evaluated against the UPDATE's own row
 * (`id`, `cadence_seconds`, `brain_key_enc`). Grid on: the next slot of the
 * agent's grid; off: now()+cadence, the historical behavior. */
export function nextRunAtSql(flags: SchedulingFlags): string {
  if (!flags.phaseGrid)
    return `now() + make_interval(secs => ${NEXT_CADENCE_SECS})`;
  return `(SELECT to_timestamp(
              (floor((extract(epoch FROM now()) - grid.phase) / grid.secs) + 1) * grid.secs
              + grid.phase)
            FROM (SELECT slot.secs,
                         (((id * ${PHASE_HASH_MULTIPLIER}) % 4294967296) * slot.secs) / 4294967296 AS phase
                    FROM (SELECT GREATEST((${NEXT_CADENCE_SECS})::bigint, 1) AS secs) slot) grid)`;
}

// Reschedule an agent's NEXT cycle to now()+cadence WITHOUT recording a cycle.
// claimDueAgents advances next_run_at by GREATEST(cadence, RUN_LOCK_SECONDS) at
// claim time so a slow run is never re-claimed mid-flight; the COMPLETION path
// (persistCycleResult) resets that lock to now()+cadence. A graceful skip (e.g.
// over the shared-key rate budget) never reaches persistCycleResult, so without
// this it would inherit the full RUN_LOCK lock — a 60s agent locked out 360s.
// Mirror the persistCycleResult reschedule so the agent runs again next cadence.
export async function rescheduleToCadence(
  pool: Pool,
  agentId: number,
): Promise<void> {
  await pool.query(
    `UPDATE agent_runtime.agents
        SET next_run_at = ${nextRunAtSql(schedulingFlags)},
            updated_at = now()
      WHERE id = $1 AND status = 'active'`,
    [agentId],
  );
}

// Pause (not disable) with a reason: the owner's own resume path
// (POST /api/agents/:id/resume) re-arms it after a top-up, and
// reviveDisabledAgents never touches a paused row, so it cannot thrash.
// Like disableAgent, only an agent that is still active is paused; a newer
// owner stop or pause keeps its own status and reason.
export async function pauseAgent(
  pool: Pool,
  agentId: number,
  reason: string,
): Promise<void> {
  await pool.query(
    "UPDATE agent_runtime.agents SET status = 'paused', disabled_reason = $2, updated_at = now() WHERE id = $1 AND status = 'active'",
    [agentId, reason.slice(0, 500)],
  );
}

export async function disableAgent(
  pool: Pool,
  agentId: number,
  reason: string,
): Promise<void> {
  // Setup work can also finish after an owner stop. Only disable an agent
  // that is still running; never replace an existing pause or stop reason.
  await pool.query(
    "UPDATE agent_runtime.agents SET status = 'disabled', disabled_reason = $2, updated_at = now() WHERE id = $1 AND status = 'active'",
    [agentId, reason.slice(0, 500)],
  );
}

// Self-healing. The agentic Arena must NEVER look dead to a visitor, so every
// poll (no manual re-seed) the scheduler revives:
//   - house agents (the public demo), and
//   - ANY user agent the SYSTEM stopped on a RECOVERABLE fault — a flaky-model
//     streak, rate-limit pressure, a reject run, or an unknown disable.
// It deliberately does NOT revive:
//   - explicit owner stops (disconnect or API-key revocation). Match the API's
//     existing 'by owner' reason contract; only the owner may resume these.
//   - ANY agent (house included, since 2026-08-27) stopped by its own DRAWDOWN
//     limit (a real, intended risk stop) or a SETUP error (a broken config that
//     would just re-fail). House agents were exempt from this until live
//     evidence killed the exemption: leo-breakout-hunter tripped 'equity
//     drawdown >= 2500', was revived within 5 minutes, and re-tripped on the
//     next tick because reviving clears the reason and the counters but not the
//     EQUITY that tripped it — 103 cycles in 30 minutes against ~10 for a
//     normal agent. Beyond the thrash, an exempt house agent publishes a
//     maxDrawdownMusd it does not actually obey, on the exact fleet shown to
//     the public as exemplars, on a platform whose pitch is verified receipts.
//     A house agent that trips its risk stop now STAYS stopped until an
//     operator resolves its book, which is a visible, recorded action instead
//     of a silent 30-second revive. Transient classes below still self-heal for
//     everyone, which is what the exemption was actually written for.
//   - and
//   - ANY agent (house included) disabled with a PERMANENT-failure prefix:
//     'model_unavailable' (provider 404 / decommissioned model — fails every
//     cycle forever; live-measured 93% dead cycles with 7 revives in 3h) or
//     'key_invalid' (revoked CoinRithm key answering 401 forever; ~1,500
//     wasted cycles/day across four agents before this exemption). Reviving
//     into a deterministic failure does not make the Arena look alive — it
//     makes the waste invisible. The reason string in the agents table is the
//     operator's fix-it signal.
// COALESCE so a null reason still counts as recoverable. Revived handles are
// returned. Belt-and-suspenders with the engine's failure-floor.
export async function reviveDisabledAgents(pool: Pool): Promise<string[]> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query<{ id: number; handle: string }>(
      `UPDATE agent_runtime.agents
          SET status = 'active', disabled_reason = NULL, next_run_at = now(), updated_at = now()
        WHERE status = 'disabled'
          AND COALESCE(disabled_reason, '') NOT ILIKE '%by owner%'
          AND COALESCE(disabled_reason, '') NOT ILIKE 'model_unavailable%'
          AND COALESCE(disabled_reason, '') NOT ILIKE 'key_invalid%'
          AND COALESCE(disabled_reason, '') NOT ILIKE '%drawdown%'
          AND COALESCE(disabled_reason, '') NOT ILIKE '%setup%'
        RETURNING id, handle`,
    );
    if (rows.length > 0) {
      // Zero EVERY kill-switch counter, not just model failures: the kill-switch
      // trips on consecutiveRejectCycles, rateLimitHits, and consecutiveExecFailures
      // too, so clearing only model failures lets a reject-disabled (or
      // rate-limit-disabled) agent revive and immediately re-trip the same gate
      // every poll — a revive/disable thrash. Reset them all on revive.
      await client.query(
        `UPDATE agent_runtime.agent_state
            SET state = (state - 'disabledReason')
                       || '{"disabled":false,"consecutiveModelFailures":0,"consecutiveRejectCycles":0,"consecutiveExecFailures":0,"rateLimitHits":0}'::jsonb
          WHERE agent_id = ANY($1::bigint[])`,
        [rows.map((r) => r.id)],
      );
    }
    await client.query("COMMIT");
    return rows.map((r) => r.handle);
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}
