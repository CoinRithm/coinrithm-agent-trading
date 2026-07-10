// CLI shell for seeding the three mechanical BENCHMARK baseline agents
// (sol-audit #7): bench-market-implied, bench-base-rate, bench-random.
//
// DRY-RUN BY DEFAULT — prints the plan and writes NOTHING. Pass --commit to
// actually upsert the rows. NEVER auto-runs; the orchestrator runs this by hand
// against prod (never on deploy). All real logic + types live in the compiled,
// unit-tested src/benchmarkSeed.ts; this shell only reads env + drives it.
//
// Usage:
//   # preview (no writes):
//   DATABASE_URL=... node scripts/seedBenchmarkAgents.mjs
//
//   # create the rows (needs a crk_live_ paper key per agent + the master key):
//   DATABASE_URL=... ENCRYPTION_KEY=... \
//   COINRITHM_KEY_BENCH_MARKET_IMPLIED=crk_live_... \
//   COINRITHM_KEY_BENCH_BASE_RATE=crk_live_... \
//   COINRITHM_KEY_BENCH_RANDOM=crk_live_... \
//   node scripts/seedBenchmarkAgents.mjs --commit
//
//   # refresh definitions only (no keys, only DATABASE_URL):
//   DATABASE_URL=... node scripts/seedBenchmarkAgents.mjs --commit
//
// Optional per-agent owner id: BENCH_OWNER_BENCH_RANDOM=123 (else NULL).

import pg from "pg";
import { BENCHMARK_AGENTS } from "@coinrithm/mcp-trading/dist/agent/engine.js";
import {
  planBenchmarkSeed,
  seedBenchmarkAgents,
  formatIntent,
  keyEnvNameFor,
  ownerEnvNameFor,
} from "../dist/benchmarkSeed.js";
import { loadMasterKey } from "../dist/crypto.js";

function reqEnv(k) {
  const v = process.env[k];
  if (!v || !v.trim()) throw new Error(`missing required env ${k}`);
  return v.trim();
}

const commit = process.argv.includes("--commit");

// Gather per-agent keys + owners from env (never hardcoded).
const keysByHandle = {};
const owners = {};
const availableKeyHandles = new Set();
for (const a of BENCHMARK_AGENTS) {
  const rawKey = process.env[keyEnvNameFor(a.handle)]?.trim();
  if (rawKey) {
    keysByHandle[a.handle] = rawKey;
    availableKeyHandles.add(a.handle);
  }
  const ownerRaw = process.env[ownerEnvNameFor(a.handle)]?.trim();
  if (ownerRaw && Number.isFinite(Number(ownerRaw))) owners[a.handle] = Number(ownerRaw);
}

// Preview (pure): always print what WOULD/DID happen.
const plan = planBenchmarkSeed({ commit, availableKeyHandles, owners });
console.log(`benchmark seed plan (${commit ? "COMMIT" : "dry-run"}):`);
for (const i of plan) console.log(`  - ${formatIntent(i)}`);
const missing = plan.filter((i) => i.mode === "config-only").map((i) => i.handle);
if (missing.length > 0) {
  console.log(
    `note: ${missing.join(", ")} have no key — a first-time create needs ${missing
      .map((h) => keyEnvNameFor(h))
      .join(", ")} (config-only otherwise refreshes an existing row).`,
  );
}

const pool = new pg.Pool({ connectionString: reqEnv("DATABASE_URL") });
// Master key only needed to commit a row that carries a raw key.
const needMaster = commit && availableKeyHandles.size > 0;
const masterKey = needMaster ? loadMasterKey(reqEnv("ENCRYPTION_KEY")) : undefined;

try {
  const results = await seedBenchmarkAgents(pool, {
    commit,
    masterKey,
    keysByHandle,
    owners,
    log: (l) => console.log(`  ${l}`),
  });
  if (!commit) {
    console.log("\ndry-run complete — nothing was written. Re-run with --commit to apply.");
  } else {
    console.log(`\nbenchmark agents seeded: ${results.map((r) => `${r.handle}=${r.action}`).join(", ")}`);
  }
} finally {
  await pool.end();
}
