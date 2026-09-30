// Operator-only: keep the privileged URL out of the scheduler runtime environment.
import { Pool } from "pg";
import { migrate } from "../dist/schema.js";

if (
  !process.argv.includes("--maintenance-confirmed") ||
  !process.env.MIGRATION_DATABASE_URL
) {
  throw new Error(
    "Requires --maintenance-confirmed and a separate MIGRATION_DATABASE_URL",
  );
}
const pool = new Pool({
  connectionString: process.env.MIGRATION_DATABASE_URL,
  max: 1,
});
try {
  await migrate(pool);
  console.log("Scheduler schema migrations applied and checksummed");
} finally {
  await pool.end();
}
