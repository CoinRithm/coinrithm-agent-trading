// One-shot OPERATOR script (G5b): create the three benchmark agents' full
// identities — a dedicated User (independent 50k paper wallet, mirroring house
// users 57-61), a scoped crk_live_ key ({read,trade:pm}, agentPublic so the
// baselines appear on the Arena board) — then run the kit's benchmark seeder
// to write the agent_runtime rows.
//
// Run INSIDE the deployed scheduler container (has DATABASE_URL +
// ENCRYPTION_KEY + dist/):
//
//   C=$(docker ps --format "{{.Names}}" | grep s1tsfnu80)
//   docker cp packages/scheduler/scripts/seedBenchmarkIdentities.mjs "$C":/tmp/
//   docker exec "$C" node /tmp/seedBenchmarkIdentities.mjs
//
// Safety: aborts if ANY bench-* agent row already exists (first-run only).
// Raw keys are minted in-process, encrypted into agent_runtime.agents by the
// seeder, hashed into "ApiKey" — and NEVER printed (prefixes only). The users'
// passwords are random bytes that can never pass a bcrypt compare, so these
// accounts cannot be logged into.
import crypto from "node:crypto";
import pg from "pg";
import { BENCHMARK_AGENTS } from "@coinrithm/mcp-trading/dist/agent/engine.js";
import { seedBenchmarkAgents } from "../dist/benchmarkSeed.js";
import { loadMasterKey } from "../dist/crypto.js";

// Mirrors backend-v2 src/lib/apiKeys.ts exactly: crk_live_<base62(32B)>_<6-hex checksum>.
const BASE62 =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const toBase62 = (buf) => {
  let num = BigInt("0x" + buf.toString("hex"));
  if (num === 0n) return "0";
  let out = "";
  while (num > 0n) {
    out = BASE62[Number(num % 62n)] + out;
    num /= 62n;
  }
  return out;
};
const sha256hex = (s) => crypto.createHash("sha256").update(s).digest("hex");
const genKey = () => {
  const core = `crk_live_${toBase62(crypto.randomBytes(32))}`;
  const raw = `${core}_${sha256hex(core).slice(0, 6)}`;
  return {
    raw,
    prefix: raw.slice(0, "crk_live_".length + 8),
    hash: sha256hex(raw),
  };
};

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 3 });
const existing = await pool.query(
  "SELECT handle FROM agent_runtime.agents WHERE handle LIKE 'bench-%'",
);
if (existing.rowCount > 0) {
  console.log(
    "bench rows already exist:",
    existing.rows.map((r) => r.handle).join(", "),
    "- aborting (first-run script)",
  );
  process.exit(1);
}

const keysByHandle = {};
const owners = {};
for (const a of BENCHMARK_AGENTS) {
  const email = `${a.handle}@agents.coinrithm.com`;
  const u = await pool.query(
    `INSERT INTO "User" (email, password, username, role, plan, locale, "signupMethod", "isActive", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, 'user', 'free', 'en', 'agent-seed', true, now(), now())
     ON CONFLICT (email) DO UPDATE SET "updatedAt" = now()
     RETURNING id`,
    [email, crypto.randomBytes(32).toString("hex"), a.handle],
  );
  const userId = u.rows[0].id;
  const k = genKey();
  await pool.query(
    `INSERT INTO "ApiKey" ("userId", "keyPrefix", "keyHash", label, "agentName", "agentPublic", scopes, plan, "createdAt", "updatedAt")
     VALUES ($1, $2, $3, 'benchmark baseline', $4, true, ARRAY['read','trade:pm'], 'free', now(), now())`,
    [userId, k.prefix, k.hash, a.displayName],
  );
  keysByHandle[a.handle] = k.raw;
  owners[a.handle] = userId;
  console.log(`user ${userId} + key ${k.prefix}... for ${a.handle}`);
}

const results = await seedBenchmarkAgents(pool, {
  commit: true,
  masterKey: loadMasterKey(process.env.ENCRYPTION_KEY),
  keysByHandle,
  owners,
  log: console.log,
});
console.log(
  "seed results:",
  results.map((r) => `${r.handle}:${r.action}`).join(", "),
);
await pool.end();
