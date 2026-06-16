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
  modelFailed?: boolean;
  disabled?: boolean;
  actions?: unknown;
  log?: string;
  error?: string;
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

// Claim due active agents under a row lock so two scheduler replicas never
// double-run the same agent. next_run_at is advanced inside the same transaction
// BEFORE running, so a crash mid-run just skips to the next cadence (at-most-once
// per window) rather than re-firing the same cycle.
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
            SET next_run_at = now() + make_interval(secs => cadence_seconds),
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
       (agent_id, decision, skip_reason, model_failed, disabled, actions, log, error)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)`,
    [
      agentId,
      rec.decision,
      rec.skipReason ?? null,
      !!rec.modelFailed,
      !!rec.disabled,
      rec.actions === undefined ? null : JSON.stringify(rec.actions),
      rec.log ?? null,
      rec.error ?? null,
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
         (agent_id, decision, skip_reason, model_failed, disabled, actions, log, error)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)`,
      [
        agentId, c.decision, c.skipReason ?? null, !!c.modelFailed, !!c.disabled,
        c.actions === undefined ? null : JSON.stringify(c.actions), c.log ?? null, c.error ?? null,
      ],
    );
    if (args.disableReason) {
      await client.query(
        "UPDATE agent_runtime.agents SET status = 'disabled', disabled_reason = $2, updated_at = now() WHERE id = $1",
        [agentId, args.disableReason.slice(0, 500)],
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
