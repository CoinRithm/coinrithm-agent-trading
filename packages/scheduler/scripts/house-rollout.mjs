// House persona rollout CLI (owner 2026-09-23). Dry-run by default; root applies.
//
//   DATABASE_URL=... node scripts/house-rollout.mjs --hashes
//       print each house agent's live contentHash/status for writing a plan
//   DATABASE_URL=... node scripts/house-rollout.mjs --plan plan.json
//       review: evaluate every entry, write nothing, exit 1 on any rejection;
//       also reports recent database activity markers, not process liveness
//   DATABASE_URL=... node scripts/house-rollout.mjs --plan plan.json --apply --scheduler-stopped
//       apply all entries in one transaction (any rejection rolls back).
//       Stop ALL scheduler instances first (Coolify), verify no workers remain,
//       and keep them stopped through the transaction. --scheduler-stopped
//       attests to that external verification. The script additionally vetoes
//       recent DB activity (360 s by default, --quiescence-seconds N to change).
//       Quiet timestamps/expired leases do NOT prove process shutdown.
//       Restart the scheduler afterwards.
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
const age = (s) =>
  s === null || s === undefined ? "never" : `${Math.round(s)} s ago`;
const printEntries = (entries) => {
  for (const e of entries) {
    console.log(
      `${e.decision.toUpperCase().padEnd(11)} ${e.handle} (id ${e.agentId ?? "?"}, ${e.status ?? "no row"}${e.disabledReason ? `: ${e.disabledReason}` : ""})`,
    );
    console.log(
      `             live ${e.currentHash?.slice(0, 12) ?? "-"} -> next ${e.nextHash?.slice(0, 12) ?? "-"}; prose ${e.proseChars ?? "-"} chars; spec keys changed: ${e.changedSpecKeys.join(", ") || "none"}; live model pin ${e.liveModelPreserved ? "kept" : "absent"}`,
    );
    console.log(
      `             last claim ${age(e.lastRunAgeSeconds)}; claim lock visible: ${e.claimLockVisible}; resume: requested=${e.resume.requested} eligible=${e.resume.eligible}${e.resume.reason ? ` (${e.resume.reason})` : ""}`,
    );
    for (const r of e.reasons) console.log(`             ! ${r}`);
  }
};
const printQuiescence = (q) => {
  console.log(
    `DB activity markers ${q.quiet ? "QUIET" : "PRESENT"} (window ${q.windowSeconds} s; does not verify scheduler shutdown): last cycle ${age(q.lastCycleAgeSeconds)}; unexpired leases ${q.activeLeases}; house activity ${q.houseActivity.join(", ") || "none"}`,
  );
  for (const r of q.reasons) console.log(`             ! ${r}`);
};

try {
  if (flag("--hashes")) {
    for (const s of await readHouseState(pool)) {
      console.log(
        `${s.handle.padEnd(26)} id ${s.agentId ?? "?"} ${s.status ?? "no row"}${s.disabledReason ? ` (${s.disabledReason})` : ""} lastClaim=${age(s.lastRunAgeSeconds)} claimLockVisible=${s.claimLockVisible} hash=${s.contentHash ?? "-"}`,
      );
    }
    process.exit(0);
  }
  const planPath = value("--plan");
  if (!planPath)
    throw new Error(
      "usage: --hashes | --plan <file> [--apply --scheduler-stopped] [--quiescence-seconds N]",
    );
  const plan = JSON.parse(readFileSync(planPath, "utf8"));
  const apply = flag("--apply");
  const schedulerStopped = flag("--scheduler-stopped");
  if (apply && !schedulerStopped) {
    console.log(
      "refusing: --apply requires --scheduler-stopped (stop ALL scheduler instances, verify no workers remain, and keep them stopped through the transaction)",
    );
    process.exit(2);
  }
  const quiescenceRaw = value("--quiescence-seconds");
  const quiescenceSeconds =
    quiescenceRaw === undefined ? undefined : Number(quiescenceRaw);
  try {
    const result = await runHouseRollout(pool, plan, {
      apply,
      schedulerStopped,
      quiescenceSeconds,
    });
    console.log(
      `${apply ? "APPLIED" : "DRY RUN"} plan ${result.plan}: ${result.entries.length} entr${result.entries.length === 1 ? "y" : "ies"}`,
    );
    printEntries(result.entries);
    printQuiescence(result.quiescence);
    const rejected = result.entries.some((e) => e.decision === "reject");
    process.exit(rejected ? 1 : 0);
  } catch (e) {
    if (e instanceof HouseRolloutRejected) {
      console.log(`REJECTED (rolled back): ${e.message}`);
      printEntries(e.entries);
      if (e.quiescence) printQuiescence(e.quiescence);
      process.exit(1);
    }
    throw e;
  }
} finally {
  await pool.end();
}
