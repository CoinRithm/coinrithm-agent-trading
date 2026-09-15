import type { Pool, PoolClient } from "pg";

// Two-key advisory lock scoped to this database, shared by schema replay and
// offline credential maintenance. Transaction ownership releases it on crashes.
export const MAINTENANCE_LOCK = [1129469005, 1] as const;

export async function maintenanceTransaction<T>(
  pool: Pool,
  operation: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  let discard = false;
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL lock_timeout = '30s'");
    await client.query("SET LOCAL statement_timeout = '120s'");
    await client.query("SELECT pg_advisory_xact_lock($1, $2)", [
      ...MAINTENANCE_LOCK,
    ]);
    const result = await operation(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      discard = true;
    }
    throw error;
  } finally {
    client.release(discard);
  }
}
