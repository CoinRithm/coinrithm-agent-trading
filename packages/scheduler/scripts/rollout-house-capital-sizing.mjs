// Narrow original-house opt-in. Dry-run by default; --commit changes ONLY the
// missing spec.capitalSizing field, never a whole spec/prose/model/key/state.
// Existing different policies are preserved for explicit operator review.
// This script is NEVER registered in startup, migration, seed or deployment.
//
// After building BOTH packages:
//   DATABASE_URL=... node scripts/rollout-house-capital-sizing.mjs
//   DATABASE_URL=... node scripts/rollout-house-capital-sizing.mjs --commit
// Do not use seed-house-agents.mjs for this rollout: it updates other definition
// fields and revives/reset counters on a broader house fleet.

import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";

// Exact original identities from seed-house-agents.mjs. A matching handle alone
// is insufficient; user forks and the mechanical benchmark fleet are excluded.
export const HOUSE_CAPITAL_ROSTER = Object.freeze([
  { handle: "mia-trend-rider", owner: 57 },
  { handle: "contrarian-carl", owner: 58 },
  { handle: "leo-breakout-hunter", owner: 59 },
  { handle: "olivia-calibrated-quant", owner: 60 },
  { handle: "sam-risk-managed-swinger", owner: 61 },
]);

const IDENTITY_SCOPE = `handle = $1 AND owner_user_id = $2
  AND is_house = true AND model_provider <> 'mechanical'
  AND (spec #>> '{model,provider}') IS DISTINCT FROM 'mechanical'
  AND jsonb_typeof(spec) = 'object'`;

// Exported solely for offline fake-DB tests. The real CLI always owns a single
// transaction, so a concurrent policy edit or missing identity rolls back all
// updates. No row contents beyond policy metadata are selected or logged.
export async function rolloutHouseCapitalSizing(
  db,
  policiesByHandle,
  commit = false,
) {
  const plan = [];
  for (const house of HOUSE_CAPITAL_ROSTER) {
    const policy = policiesByHandle[house.handle];
    if (!policy || policy.version !== "equity_fraction_v1") {
      throw new Error(`missing validated policy for ${house.handle}`);
    }
    const result = await db.query(
      `SELECT id, spec ? 'capitalSizing' AS "hasPolicy",
              spec->'capitalSizing' AS policy
         FROM agent_runtime.agents WHERE ${IDENTITY_SCOPE}`,
      [house.handle, house.owner],
    );
    if (result.rows.length > 1)
      throw new Error(`ambiguous original-house identity: ${house.handle}`);
    const row = result.rows[0];
    const action = !row
      ? "missing_or_excluded"
      : !row.hasPolicy
        ? "would_opt_in"
        : isDeepStrictEqual(row.policy, policy)
          ? "already_configured"
          : "preserved_existing_policy";
    plan.push({ ...house, rowId: row?.id, policy, action });
  }
  if (commit && plan.some((item) => item.action === "missing_or_excluded")) {
    throw new Error(
      "original-house roster incomplete; no policy update applied",
    );
  }
  if (commit) {
    for (const item of plan) {
      if (item.action !== "would_opt_in") continue;
      const result = await db.query(
        `UPDATE agent_runtime.agents
            SET spec = jsonb_set(spec, '{capitalSizing}', $3::jsonb, true)
          WHERE ${IDENTITY_SCOPE} AND id = $4
            AND NOT (spec ? 'capitalSizing')`,
        [item.handle, item.owner, JSON.stringify(item.policy), item.rowId],
      );
      if (result.rowCount !== 1) {
        throw new Error(
          `identity/policy changed during rollout: ${item.handle}`,
        );
      }
      item.action = "opted_in";
    }
  }
  return plan.map(({ handle, action }) => ({ handle, action }));
}

async function main() {
  const args = process.argv.slice(2);
  if (
    args.some((arg) => arg !== "--commit" && arg !== "--dry-run") ||
    (args.includes("--commit") && args.includes("--dry-run"))
  ) {
    throw new Error(
      "usage: rollout-house-capital-sizing.mjs [--dry-run | --commit]",
    );
  }
  const commit = args.includes("--commit");
  const { loadAgent, validateSkill } =
    await import("@coinrithm/mcp-trading/dist/agent/engine.js");
  const here = dirname(fileURLToPath(import.meta.url));
  const policies = {};
  for (const house of HOUSE_CAPITAL_ROSTER) {
    const agent = loadAgent(
      join(here, "../../../examples/agents", house.handle),
      "hosted",
    );
    const validation = validateSkill(
      { spec: agent.spec, raw: agent.raw, body: agent.body },
      "hosted",
    );
    if (!validation.valid || !agent.spec.capitalSizing) {
      throw new Error(`invalid capitalSizing configuration: ${house.handle}`);
    }
    policies[house.handle] = agent.spec.capitalSizing;
  }
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString)
    throw new Error("DATABASE_URL is required; no connection made");
  const { default: pg } = await import("pg");
  const pool = new pg.Pool({ connectionString });
  let client;
  try {
    client = await pool.connect();
    await client.query(commit ? "BEGIN" : "BEGIN READ ONLY");
    await client.query("SET LOCAL lock_timeout = '5s'");
    await client.query("SET LOCAL statement_timeout = '15s'");
    const results = await rolloutHouseCapitalSizing(client, policies, commit);
    await client.query(commit ? "COMMIT" : "ROLLBACK");
    console.log(
      JSON.stringify({ mode: commit ? "commit" : "dry-run", results }),
    );
  } catch (error) {
    if (client) await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client?.release();
    await pool.end();
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
