// Operator wrapper: record a bench corpus for the house bundles (item 3 plan,
// root 57066). READS ONLY: every cycle runs the production runCycle DRY-RUN
// through the recording transport, which refuses every non-GET request, with a
// brain that never calls a model (coinrithm-agent record). Run inside the
// scheduler container (it ships examples/ and the built engine):
//
//   COINRITHM_API_KEY=<read-only QA key> COINRITHM_API_URL=http://api:4000 \
//     node scripts/record-bench-corpus.mjs --out /path/to/corpus \
//     [--ticks 24] [--every-min 15] [--agents leo-breakout-hunter,mia-trend-rider]
//
// The key comes from the ENV only and is never printed or written. Before the
// first read the key must hold ONLY the "read" scope (GET /api/agent/me);
// anything else stops the run. Root mints the key with an expiry and revokes
// it afterwards; a 401 mid-run stops the run (the cassettes already written
// stay valid).
//
// Ticks run on a fixed grid from the start (tick i at start + i x every), so a
// slow tick never shifts later ones; a tick that overruns its slot starts the
// next one immediately. Each agent is recorded once per tick into <out>/<agent>/.
// <out>/receipt.json (no key, no account data) is rewritten after every tick,
// so an interrupted run keeps an exact record of what was captured.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { cmdRecord } from "@coinrithm/mcp-trading/dist/agent/cli.js";
import { CoinRithmClient } from "@coinrithm/mcp-trading/dist/agent/client.js";

export const HOUSE_BUNDLES = [
  "leo-breakout-hunter",
  "mia-trend-rider",
  "contrarian-carl",
  "olivia-calibrated-quant",
  "sam-risk-managed-swinger",
];
export const MAX_TICKS = 96;

const here = dirname(fileURLToPath(import.meta.url));

/** Pure: parse argv into a plan, or throw with the reason. */
export function parsePlan(argv) {
  const get = (name) => {
    const i = argv.indexOf(`--${name}`);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const out = get("out");
  if (!out) throw new Error("--out <dir> is required");
  const ticks = Number(get("ticks") ?? 24);
  if (!Number.isInteger(ticks) || ticks < 1 || ticks > MAX_TICKS)
    throw new Error(`--ticks must be an integer from 1 to ${MAX_TICKS}`);
  const everyMin = Number(get("every-min") ?? 15);
  if (!Number.isFinite(everyMin) || everyMin < 5 || everyMin > 240)
    throw new Error("--every-min must be a number from 5 to 240");
  const agents = (get("agents") ?? HOUSE_BUNDLES.join(","))
    .split(",")
    .map((a) => a.trim())
    .filter(Boolean);
  const unknown = agents.filter((a) => !HOUSE_BUNDLES.includes(a));
  if (agents.length === 0 || unknown.length > 0)
    throw new Error(
      `--agents must be house bundles (${HOUSE_BUNDLES.join(", ")}); got ${unknown.join(", ") || "none"}`,
    );
  return { out: resolve(out), ticks, everyMs: everyMin * 60_000, agents };
}

/** Pure: true only for a key whose scopes are exactly ["read"]. */
export function isReadOnlyScopes(scopes) {
  return (
    Array.isArray(scopes) &&
    scopes.length > 0 &&
    scopes.every((s) => s === "read")
  );
}

async function main() {
  const plan = parsePlan(process.argv.slice(2));
  const apiKey = process.env.COINRITHM_API_KEY;
  if (!apiKey) throw new Error("COINRITHM_API_KEY is not set");
  const client = new CoinRithmClient({
    apiKey,
    baseUrl: process.env.COINRITHM_API_URL || undefined,
  });
  const me = await client.me();
  const scopes = me.ok ? me.data?.scopes : undefined;
  if (!isReadOnlyScopes(scopes))
    throw new Error(
      `refusing to record: the key must hold only the "read" scope (HTTP ${me.status}, scopes ${JSON.stringify(scopes ?? null)})`,
    );

  mkdirSync(plan.out, { recursive: true });
  const startedAt = Date.now();
  const receipt = {
    schema: "coinrithm.bench.record-run.v1",
    startedAt: new Date(startedAt).toISOString(),
    plan: {
      ticks: plan.ticks,
      everyMinutes: plan.everyMs / 60_000,
      agents: plan.agents,
    },
    modelCalls: 0,
    ticks: [],
    stopped: null,
  };
  const save = () =>
    writeFileSync(
      join(plan.out, "receipt.json"),
      `${JSON.stringify(receipt, null, 2)}\n`,
    );
  save();

  for (let tick = 0; tick < plan.ticks; tick++) {
    const due = startedAt + tick * plan.everyMs;
    const wait = due - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    const row = { tick, at: new Date().toISOString(), agents: {} };
    // An expired or revoked key must stop the run BEFORE it records a cycle
    // of 401 responses (a cycle can finish as a skip without throwing).
    const check = await client.me();
    if (!check.ok || !isReadOnlyScopes(check.data?.scopes)) {
      receipt.stopped = `key no longer read-only/valid at tick ${tick} (HTTP ${check.status})`;
      save();
      console.error(`[record] ${receipt.stopped}; stopping`);
      process.exitCode = 1;
      return;
    }
    for (const agent of plan.agents) {
      const r = await cmdRecord(join(here, "../../../examples/agents", agent), {
        out: join(plan.out, agent),
        cycles: 1,
      });
      const last = r.lines[r.lines.length - 1] ?? "";
      row.agents[agent] = r.ok
        ? { ok: true, file: (r.data ?? [])[0] ?? null }
        : { ok: false, error: last.slice(0, 200) };
      if (!r.ok && /HTTP 401|unauthori[sz]ed/i.test(r.lines.join(" "))) {
        receipt.ticks.push(row);
        receipt.stopped = `key rejected at tick ${tick} (${agent})`;
        save();
        console.error(`[record] ${receipt.stopped}; stopping`);
        process.exitCode = 1;
        return;
      }
    }
    receipt.ticks.push(row);
    save();
    const ok = Object.values(row.agents).filter((a) => a.ok).length;
    console.log(
      `[record] tick ${tick + 1}/${plan.ticks} ${row.at}: ${ok}/${plan.agents.length} recorded`,
    );
  }
  receipt.finishedAt = new Date().toISOString();
  save();
  console.log(`[record] done: receipt ${join(plan.out, "receipt.json")}`);
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  main().catch((err) => {
    console.error(`[record] ${err instanceof Error ? err.message : err}`);
    process.exitCode = 1;
  });
