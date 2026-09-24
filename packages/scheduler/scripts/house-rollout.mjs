// House persona rollout CLI (owner 2026-09-23). Dry-run by default; root applies.
//
//   DATABASE_URL=... node scripts/house-rollout.mjs --hashes
//       print each house agent's live contentHash/status for writing a plan
//   DATABASE_URL=... node scripts/house-rollout.mjs --plan plan.json
//       review: evaluate every entry, write nothing, exit 1 on any rejection
//   DATABASE_URL=... node scripts/house-rollout.mjs --plan plan.json --apply
//       apply all entries in one transaction (any rejection rolls back)
//
// plan.json: { "version": "personas-v2", "entries": [ { "handle": "...",
//   "bundlePath": "examples/agents/<handle>", "expectedContentHash": "<sha256>",
//   "resume": false, "changeNote": "optional" } ] }
//
// Build first (npm run build in scheduler and mcp-trading): this imports dist.
import { readFileSync } from "node:fs";
import pg from "pg";
import {
  HouseRolloutRejected,
  readHouseState,
  runHouseRollout,
} from "../dist/houseRollout.js";

function reqEnv(k) {
  const v = process.env[k];
  if (!v || !v.trim()) throw new Error(`missing required env ${k}`);
  return v.trim();
}

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const value = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

const pool = new pg.Pool({ connectionString: reqEnv("DATABASE_URL") });
const printEntries = (entries) => {
  for (const e of entries) {
    console.log(
      `${e.decision.toUpperCase().padEnd(11)} ${e.handle} (id ${e.agentId ?? "?"}, ${e.status ?? "no row"}${e.disabledReason ? `: ${e.disabledReason}` : ""})`,
    );
    console.log(
      `             live ${e.currentHash?.slice(0, 12) ?? "-"} -> next ${e.nextHash?.slice(0, 12) ?? "-"}; prose ${e.proseChars ?? "-"} chars; spec keys changed: ${e.changedSpecKeys.join(", ") || "none"}`,
    );
    console.log(
      `             resume: requested=${e.resume.requested} eligible=${e.resume.eligible}${e.resume.reason ? ` (${e.resume.reason})` : ""}`,
    );
    for (const r of e.reasons) console.log(`             ! ${r}`);
  }
};

try {
  if (flag("--hashes")) {
    for (const s of await readHouseState(pool)) {
      console.log(
        `${s.handle.padEnd(26)} id ${s.agentId ?? "?"} ${s.status ?? "no row"}${s.disabledReason ? ` (${s.disabledReason})` : ""} runLocked=${s.runLocked} hash=${s.contentHash ?? "-"}`,
      );
    }
    process.exit(0);
  }
  const planPath = value("--plan");
  if (!planPath) throw new Error("usage: --hashes | --plan <file> [--apply]");
  const plan = JSON.parse(readFileSync(planPath, "utf8"));
  const apply = flag("--apply");
  try {
    const result = await runHouseRollout(pool, plan, { apply });
    console.log(
      `${apply ? "APPLIED" : "DRY RUN"} plan ${result.plan}: ${result.entries.length} entr${result.entries.length === 1 ? "y" : "ies"}`,
    );
    printEntries(result.entries);
    const rejected = result.entries.some((e) => e.decision === "reject");
    process.exit(rejected ? 1 : 0);
  } catch (e) {
    if (e instanceof HouseRolloutRejected) {
      console.log(`REJECTED (rolled back): ${e.message}`);
      printEntries(e.entries);
      process.exit(1);
    }
    throw e;
  }
} finally {
  await pool.end();
}
