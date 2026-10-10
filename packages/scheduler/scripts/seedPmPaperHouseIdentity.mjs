// Default is a local plan only. No DB connection, key minting or enrollment.
// Usage: node scripts/seedPmPaperHouseIdentity.mjs --config plan-input.json --agent bundle/
// Apply only after reviewing output: append --commit --expected-plan-sha <sha256>.
import { readFileSync } from "node:fs";
import pg from "pg";
import { loadAgent } from "@coinrithm/mcp-trading/engine";
import {
  planPmPaperHouse,
  provisionPmPaperHouse,
  PmHouseIdentityError,
} from "../dist/pmPaperHouseIdentity.js";
import { loadMasterKey } from "../dist/crypto.js";
import { operatorDatabaseUrl } from "../dist/operatorConnection.js";

let pool;
try {
  const args = process.argv.slice(2);
  const options = new Map();
  let commit = false;
  for (let i = 0; i < args.length; i++) {
    const name = args[i];
    if (name === "--commit" && !commit) {
      commit = true;
      continue;
    }
    if (
      !["--config", "--agent", "--expected-plan-sha"].includes(name) ||
      options.has(name) ||
      !args[i + 1] ||
      args[i + 1].startsWith("--")
    )
      throw new PmHouseIdentityError("invalid_arguments");
    options.set(name, args[++i]);
  }
  if (!options.has("--config") || !options.has("--agent"))
    throw new PmHouseIdentityError("config_and_agent_required");
  const configBytes = readFileSync(options.get("--config"));
  if (configBytes.length > 4096)
    throw new PmHouseIdentityError("config_too_large");
  const config = JSON.parse(configBytes.toString("utf8"));
  if (
    !config ||
    typeof config !== "object" ||
    Array.isArray(config) ||
    Object.keys(config).sort().join(",") !==
      "agentPublic,displayName,handle,target"
  )
    throw new PmHouseIdentityError("invalid_config_fields");
  const definition = loadAgent(options.get("--agent"), "hosted");
  const plan = planPmPaperHouse({
    ...config,
    raw: definition.raw,
    prose: definition.body,
  });
  if (!commit)
    console.log(JSON.stringify({ action: "plan_only", plan }, null, 2));
  else {
    if (!options.has("--expected-plan-sha"))
      throw new PmHouseIdentityError("reviewed_hash_required");
    const masterKey = loadMasterKey(process.env.ENCRYPTION_KEY ?? "");
    pool = new pg.Pool({
      connectionString: operatorDatabaseUrl(),
      max: 1,
      connectionTimeoutMillis: 5000,
    });
    const result = await provisionPmPaperHouse(
      pool,
      plan,
      options.get("--expected-plan-sha"),
      masterKey,
    );
    console.log(JSON.stringify(result, null, 2));
  }
} catch (error) {
  // Driver/bundle errors can contain parameters or untrusted input. Emit codes only.
  console.error(
    JSON.stringify({
      ok: false,
      code:
        error instanceof PmHouseIdentityError
          ? error.code
          : "operator_failed_no_automatic_retry",
    }),
  );
  process.exitCode = 1;
} finally {
  if (pool) await pool.end();
}
