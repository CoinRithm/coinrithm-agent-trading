import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { Pool } from "pg";
import { claimDueAgents, migrate } from "./db.js";

// TEMPORARY DIAGNOSTIC (never merge): the capacity concurrency case
// "claims each due agent once across concurrent workers" has returned the
// same fixture twice in CI (2 of 5 runs) and never locally. This runs many
// concurrent claim pairs against the real database and, on a double claim,
// prints both claimers' transaction ids, backend pids, the row version each
// one locked, and wall-clock timings, so the mechanism can be read off.
const databaseUrl = process.env.CAPACITY_TEST_DATABASE_URL;

type DiagRow = {
  id: string;
  row_xmin: string;
  nra: Date;
  xid: string;
  pid: number;
  ts: Date;
};

describe.skipIf(!databaseUrl)("DIAG claim race", () => {
  let pool: Pool;
  beforeAll(async () => {
    pool = new Pool({ connectionString: databaseUrl });
    await migrate(pool);
  });
  afterAll(async () => {
    await pool.end();
  });

  it("runs 300 concurrent claim pairs and reports any double claim with row and transaction evidence", async () => {
    const src = readFileSync("src/db.ts", "utf8");
    const m = src.match(
      /`(WITH due AS MATERIALIZED[\s\S]*?ORDER BY tenant_position, next_run_at, id)`/,
    );
    if (!m) throw new Error("claim SQL not found");
    let sql = m[1]!.replace("${excludeSql}", "");
    const before = sql;
    sql = sql.replace(
      "due.tenant_position, a.next_run_at\n",
      "due.tenant_position, a.next_run_at, a.xmin::text AS row_xmin\n",
    );
    sql = sql.replace(
      /SELECT id, handle,[\s\S]*?FROM picked/,
      "SELECT picked.*, pg_current_xact_id()::text AS xid, pg_backend_pid() AS pid, clock_timestamp() AS ts FROM picked",
    );
    if (sql === before || !sql.includes("row_xmin") || !sql.includes("xid"))
      throw new Error("instrumentation did not apply");

    const instrumented = async () => {
      const c = await pool.connect();
      const t0 = Date.now();
      try {
        await c.query("BEGIN");
        const { rows } = await c.query<DiagRow>(sql, [2, false]);
        const t1 = Date.now();
        if (rows.length > 0)
          await c.query(
            `UPDATE agent_runtime.agents
                SET next_run_at = now() + make_interval(secs => GREATEST(cadence_seconds, 360)),
                    last_run_at = now(), updated_at = now()
              WHERE id = ANY($1::bigint[])`,
            [rows.map((r) => r.id)],
          );
        await c.query("COMMIT");
        return { rows, t0, t1, t2: Date.now() };
      } catch (e) {
        await c.query("ROLLBACK").catch(() => {});
        throw e;
      } finally {
        c.release();
      }
    };
    const production = async () => {
      const t0 = Date.now();
      const rows = await claimDueAgents(pool, 2);
      return {
        rows: rows.map((r) => ({ id: String(r.id) }) as DiagRow),
        t0,
        t1: Date.now(),
        t2: Date.now(),
      };
    };

    const doubles: string[] = [];
    let hits = 0;
    for (let i = 0; i < 300; i++) {
      await pool.query(
        "DELETE FROM agent_runtime.agents WHERE handle = 'diag-fixture'",
      );
      const { rows: inserted } = await pool.query<{ id: string }>(
        `INSERT INTO agent_runtime.agents
           (handle, display_name, owner_user_id, status, live, cadence_seconds, model_provider, model_name, spec, prose, coinrithm_key_enc)
         VALUES ('diag-fixture', 'diag', 4242, 'active', false, 600, 'fixture', 'fixture-model', '{}', '', 'x')
         RETURNING id`,
      );
      const id = Number(inserted[0]!.id);
      const idle = await pool.query<{ n: number }>(
        "SELECT count(*)::int AS n FROM pg_stat_activity WHERE state LIKE 'idle in transaction%'",
      );
      const useProduction = i % 2 === 1;
      const [a, b] = await Promise.all(
        useProduction
          ? [production(), production()]
          : [instrumented(), instrumented()],
      );
      const hitA = a.rows.filter((r) => Number(r.id) === id);
      const hitB = b.rows.filter((r) => Number(r.id) === id);
      hits += hitA.length + hitB.length;
      if (hitA.length + hitB.length > 1) {
        const { rows: after } = await pool.query(
          "SELECT xmin::text AS xmin, next_run_at, last_run_at, now() AS now FROM agent_runtime.agents WHERE id = $1",
          [id],
        );
        doubles.push(
          JSON.stringify({
            i,
            variant: useProduction ? "production" : "instrumented",
            idleInTx: idle.rows[0]!.n,
            a: { ...a, rows: a.rows },
            b: { ...b, rows: b.rows },
            after: after[0],
          }),
        );
      }
    }
    console.log(
      `DIAG claim race: 300 pairs, ${hits} fixture claims, ${doubles.length} doubles\n${doubles.join("\n")}`,
    );
    await pool.query(
      "DELETE FROM agent_runtime.agents WHERE handle = 'diag-fixture'",
    );
    expect(hits).toBeGreaterThan(0);
  });
});
