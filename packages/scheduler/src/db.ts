import { Pool } from "pg";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

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
}

export interface CycleRecord {
  decision: string;
  skipReason?: string;
  // Keystone transparency: the model's own analysis this cycle + decision
  // confidence + the full raw model text (capped), surfaced in the Arena terminal.
  rationale?: string;
  confidence?: number;
  rawModelOutput?: string;
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
}

export function createPool(databaseUrl: string): Pool {
  return new Pool({ connectionString: databaseUrl, max: 10 });
}

export async function migrate(pool: Pool): Promise<void> {
  const here = dirname(fileURLToPath(import.meta.url));
  const sql = readFileSync(join(here, "..", "sql", "001_agent_runtime.sql"), "utf8");
  await pool.query(sql);
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
export async function claimDueAgents(pool: Pool, limit: number): Promise<AgentRow[]> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query<RawAgent>(
      `SELECT id, handle, display_name, live, cadence_seconds, model_provider,
              model_name, model_base_url, spec, prose, coinrithm_key_enc, brain_key_enc
         FROM agent_runtime.agents
        WHERE status = 'active' AND next_run_at <= now()
        ORDER BY next_run_at
        LIMIT $1
        FOR UPDATE SKIP LOCKED`,
      [limit],
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

export async function loadStateJson(pool: Pool, agentId: number): Promise<unknown | null> {
  const { rows } = await pool.query<{ state: unknown }>(
    "SELECT state FROM agent_runtime.agent_state WHERE agent_id = $1",
    [agentId],
  );
  return rows.length > 0 ? rows[0]!.state : null;
}

export async function saveStateJson(pool: Pool, agentId: number, state: unknown): Promise<void> {
  await pool.query(
    `INSERT INTO agent_runtime.agent_state (agent_id, state, updated_at)
     VALUES ($1, $2::jsonb, now())
     ON CONFLICT (agent_id) DO UPDATE SET state = EXCLUDED.state, updated_at = now()`,
    [agentId, JSON.stringify(state)],
  );
}

export async function recordCycle(pool: Pool, agentId: number, rec: CycleRecord): Promise<void> {
  await pool.query(
    `INSERT INTO agent_runtime.agent_cycles
       (agent_id, decision, skip_reason, rationale, confidence, raw_model_output, model_failed, disabled, actions, log, error,
        trigger_codes, llm_call_made, tokens_in, tokens_out, estimated_cost_usd, decision_type, write_attempted, write_accepted)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
    [
      agentId,
      rec.decision,
      rec.skipReason ?? null,
      rec.rationale ?? null,
      rec.confidence ?? null,
      rec.rawModelOutput ?? null,
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
    ],
  );
}

// Persist a completed cycle ATOMICALLY: state + the cycle row (+ optional
// disable) in ONE transaction, so a mid-write crash never leaves them diverged
// (e.g. a kill-switch state saved but status still 'active').
export async function persistCycleResult(
  pool: Pool,
  agentId: number,
  args: { state: unknown; cycle: CycleRecord; disableReason?: string },
): Promise<void> {
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
    await client.query(
      `INSERT INTO agent_runtime.agent_cycles
         (agent_id, decision, skip_reason, rationale, confidence, raw_model_output, model_failed, disabled, actions, log, error,
          trigger_codes, llm_call_made, tokens_in, tokens_out, estimated_cost_usd, decision_type, write_attempted, write_accepted)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
      [
        agentId, c.decision, c.skipReason ?? null, c.rationale ?? null, c.confidence ?? null,
        c.rawModelOutput ?? null, !!c.modelFailed, !!c.disabled,
        c.actions === undefined ? null : JSON.stringify(c.actions), c.log ?? null, c.error ?? null,
        c.triggerCodes ?? null, c.llmCallMade ?? null, c.tokensIn ?? null, c.tokensOut ?? null,
        c.estimatedCostUsd ?? null, c.decisionType ?? null, c.writeAttempted ?? null, c.writeAccepted ?? null,
      ],
    );
    if (args.disableReason) {
      await client.query(
        "UPDATE agent_runtime.agents SET status = 'disabled', disabled_reason = $2, updated_at = now() WHERE id = $1",
        [agentId, args.disableReason.slice(0, 500)],
      );
    } else {
      // Reschedule the NEXT cycle from COMPLETION: cadence after this run finished,
      // not from claim — so a slow model just delays the next cycle instead of
      // overlapping it (claimDueAgents set a RUN_LOCK_SECONDS lock; reset it here).
      await client.query(
        `UPDATE agent_runtime.agents
            SET next_run_at = now() + make_interval(secs => cadence_seconds), updated_at = now()
          WHERE id = $1 AND status = 'active'`,
        [agentId],
      );
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

export async function disableAgent(pool: Pool, agentId: number, reason: string): Promise<void> {
  await pool.query(
    "UPDATE agent_runtime.agents SET status = 'disabled', disabled_reason = $2, updated_at = now() WHERE id = $1",
    [agentId, reason.slice(0, 500)],
  );
}

// Self-healing. The agentic Arena must NEVER look dead to a visitor, so every
// poll (no manual re-seed) the scheduler revives:
//   - ALL house agents (the public demo), whatever stopped them, and
//   - ANY user agent the SYSTEM stopped on a RECOVERABLE fault — a flaky-model
//     streak, rate-limit pressure, a reject run, or an unknown disable.
// It deliberately does NOT revive a user agent stopped by its own DRAWDOWN limit
// (a real, intended risk stop) or a SETUP error (a broken config that would just
// re-fail). COALESCE so a null reason still counts as recoverable. Revived
// handles are returned. Belt-and-suspenders with the engine's failure-floor.
export async function reviveDisabledAgents(pool: Pool): Promise<string[]> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query<{ id: number; handle: string }>(
      `UPDATE agent_runtime.agents
          SET status = 'active', disabled_reason = NULL, next_run_at = now(), updated_at = now()
        WHERE status = 'disabled'
          AND (
            is_house = true
            OR (
              COALESCE(disabled_reason, '') NOT ILIKE '%drawdown%'
              AND COALESCE(disabled_reason, '') NOT ILIKE '%setup%'
            )
          )
        RETURNING id, handle`,
    );
    if (rows.length > 0) {
      await client.query(
        `UPDATE agent_runtime.agent_state
            SET state = (state - 'disabledReason')
                       || '{"disabled":false,"consecutiveModelFailures":0}'::jsonb
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
