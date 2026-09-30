import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Pool } from "pg";
import { maintenanceTransaction } from "./maintenance.js";

function migrations() {
  const directory = join(dirname(fileURLToPath(import.meta.url)), "..", "sql");
  return readdirSync(directory)
    .filter((name) => /^\d+_.*\.sql$/.test(name))
    .sort()
    .map((name) => {
      const sql = readFileSync(join(directory, name), "utf8").replace(
        /\r\n/g,
        "\n",
      );
      return {
        name,
        sql,
        checksum: createHash("sha256").update(sql).digest("hex"),
      };
    });
}

/** Explicit operator operation. Never called by the scheduler process. */
export async function migrate(pool: Pool): Promise<void> {
  const files = migrations();
  await maintenanceTransaction(pool, async (client) => {
    await client.query("CREATE SCHEMA IF NOT EXISTS agent_runtime");
    await client.query(`CREATE TABLE IF NOT EXISTS agent_runtime.schema_migrations (
      filename text PRIMARY KEY,
      checksum text NOT NULL CHECK (checksum ~ '^[0-9a-f]{64}$'),
      applied_at timestamptz NOT NULL DEFAULT clock_timestamp()
    )`);
    const applied = await client.query<{ filename: string; checksum: string }>(
      "SELECT filename, checksum FROM agent_runtime.schema_migrations",
    );
    const checksums = new Map(
      applied.rows.map((row) => [row.filename, row.checksum]),
    );
    for (const file of files) {
      const checksum = checksums.get(file.name);
      if (checksum !== undefined && checksum !== file.checksum) {
        throw new Error(`Scheduler migration checksum changed: ${file.name}`);
      }
      if (checksum !== undefined) continue;
      await client.query(file.sql);
      await client.query(
        "INSERT INTO agent_runtime.schema_migrations (filename, checksum) VALUES ($1, $2)",
        [file.name, file.checksum],
      );
    }
  });
}

/** Read-only startup contract: every bundled migration must already be applied. */
export async function assertSchemaReady(pool: Pool): Promise<void> {
  const applied = await pool.query<{ filename: string; checksum: string }>(
    "SELECT filename, checksum FROM agent_runtime.schema_migrations",
  );
  const checksums = new Map(
    applied.rows.map((row) => [row.filename, row.checksum]),
  );
  for (const file of migrations()) {
    if (checksums.get(file.name) !== file.checksum) {
      throw new Error(
        `Scheduler schema is not ready: ${file.name}; run the operator migration command`,
      );
    }
  }
  const privileges = await pool.query<{ unsafe: boolean }>(`SELECT (
    current_user <> 'coinrithm_scheduler'
    OR EXISTS (SELECT 1 FROM pg_roles r WHERE pg_has_role(current_user, r.oid, 'MEMBER')
      AND (r.rolname <> current_user OR r.rolsuper OR r.rolcreatedb OR r.rolcreaterole OR r.rolreplication OR r.rolbypassrls))
    OR has_database_privilege(current_user, current_database(), 'CREATE')
    OR has_schema_privilege(current_user, 'public', 'CREATE')
    OR has_schema_privilege(current_user, 'agent_runtime', 'CREATE')
    OR EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname IN ('public', 'agent_runtime') AND c.relowner = (SELECT oid FROM pg_roles WHERE rolname = current_user))
    OR has_table_privilege(current_user, 'agent_runtime.schema_migrations', 'INSERT,UPDATE,DELETE,TRUNCATE')
  ) AS unsafe`);
  if (privileges.rows[0]?.unsafe !== false) {
    throw new Error(
      "Scheduler runtime database role must have DML-only privileges; use a separate migration connection",
    );
  }
}
