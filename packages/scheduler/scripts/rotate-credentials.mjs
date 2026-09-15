// Offline-only. No command-line secrets and no default database target.
import { Pool } from "pg";
import { loadMasterKey } from "../dist/crypto.js";
import { rotateCredentials } from "../dist/rotateCredentials.js";

const args = new Set(process.argv.slice(2));
if (
  !args.has("--maintenance-confirmed") ||
  [...args].some((arg) => !["--maintenance-confirmed", "--apply"].includes(arg))
) {
  console.error(
    "Usage: node scripts/rotate-credentials.mjs --maintenance-confirmed [--apply]",
  );
  console.error(
    "Stop all schedulers and credential writers first; see README credential rotation.",
  );
  process.exit(1);
}
let pool;
let oldKey;
let newKey;
try {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  oldKey = loadMasterKey(process.env.ROTATION_OLD_KEY ?? "");
  newKey = loadMasterKey(process.env.ROTATION_NEW_KEY ?? "");
  delete process.env.ROTATION_OLD_KEY;
  delete process.env.ROTATION_NEW_KEY;
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1,
    connectionTimeoutMillis: 10_000,
  });
  const result = await rotateCredentials(
    pool,
    oldKey,
    newKey,
    args.has("--apply"),
  );
  console.log(JSON.stringify(result));
} catch {
  console.error(
    "Rotation did not report success. Keep services stopped; follow the recovery procedure before changing keys.",
  );
  process.exitCode = 1;
} finally {
  oldKey?.fill(0);
  newKey?.fill(0);
  await pool?.end();
}
