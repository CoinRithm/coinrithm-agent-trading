// Operator script: run a bounded bench comparison whose model calls are
// ADMITTED by the scheduler's own capacity system (C3 of the item-3 plan,
// root 57066 / 57074). Run inside the scheduler container, only after a
// fresh capacity check and three-way agreement; this script never runs on
// its own.
//
//   node scripts/bench-admitted.mjs --corpus /path/to/corpus \
//     --variant pnl=/path/to/leo-pnl --variant dd=/path/to/leo-dd \
//     [--repeats 2] [--max-calls 40] [--min-interval-sec 90] \
//     [--out report.json]
//
// - Every variant's brain is the scheduler's routed provider for a
//   synthetic, never-persisted agent (runtime.ts benchRoutedProvider): the
//   same NVIDIA key buckets, model cooldowns and usage debt as live agents,
//   under its own owner budget shared-owner:bench (25k TPM, concurrency 1;
//   never a house, QA or customer tenant), pinned to the variant's model.
// - benchGuard.ts caps provider calls for the whole run (<= 40), spaces
//   decisions, and aborts on the first provider 429, any cooldown hold or 3
//   owner-budget denials in a row; after an abort nothing reaches a provider.
// - Before the first call it refuses when the planned worst case
//   (cassettes x variants x repeats) exceeds the cap, or when the route is
//   already cooling down.
// - The bench itself refuses every write and starts each cycle from a fresh
//   state (coinrithm-agent bench). Secrets come from the scheduler env only;
//   nothing is printed but counts.

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { cmdBench } from "@coinrithm/mcp-trading/dist/agent/cli.js";
import { readCorpus } from "@coinrithm/mcp-trading/dist/agent/bench/cassette.js";
import { loadAgent } from "@coinrithm/mcp-trading/dist/agent/skill.js";
import { loadConfig } from "../dist/config.js";
import { createPool } from "../dist/db.js";
import { benchRoutedProvider } from "../dist/runtime.js";
import { BENCH_MAX_CALLS, createBenchGuard } from "../dist/benchGuard.js";
import { MAX_ROUTE_ATTEMPTS } from "../dist/route.js";

const argv = process.argv.slice(2);
const one = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
};
const many = (name) =>
  argv.flatMap((a, i) => (a === `--${name}` ? [argv[i + 1] ?? ""] : []));

async function main() {
  const corpusDir = one("corpus");
  const variants = many("variant");
  if (!corpusDir || variants.length < 1)
    throw new Error(
      "need --corpus <dir> and at least one --variant name=<path>",
    );
  const repeats = Number(one("repeats") ?? 2);
  const maxCalls = Number(one("max-calls") ?? BENCH_MAX_CALLS);
  const minIntervalMs = Number(one("min-interval-sec") ?? 90) * 1000;
  if (!Number.isInteger(repeats) || repeats < 1)
    throw new Error("--repeats must be a positive integer");
  if (!Number.isFinite(minIntervalMs) || minIntervalMs < 60_000)
    throw new Error("--min-interval-sec must be at least 60");

  const corpus = readCorpus(resolve(corpusDir));
  // Worst case: every decision uses the router's full attempt budget (a
  // malformed-output recovery retries the same model inside one decision).
  const decisions = corpus.cassettes.length * variants.length * repeats;
  const upperBound = decisions * MAX_ROUTE_ATTEMPTS;
  if (upperBound > maxCalls)
    throw new Error(
      `planned worst case ${upperBound} provider calls (${decisions} decisions x ${MAX_ROUTE_ATTEMPTS}) exceeds the cap ${maxCalls}; shrink the corpus or variants`,
    );

  const models = [
    ...new Set(
      variants.map((v) => {
        const path = v.slice(v.indexOf("=") + 1);
        return loadAgent(resolve(path), "self-host").spec.model?.name ?? "";
      }),
    ),
  ];
  if (models.some((m) => !m))
    throw new Error("every variant needs a model name");

  const config = loadConfig();
  const pool = createPool(config.databaseUrl);
  try {
    // Fresh capacity check: refuse to start into an existing cooldown on the
    // variants' own models or on a shared NVIDIA key.
    const { rows } = await pool.query(
      `SELECT count(*)::int AS n FROM agent_runtime.provider_route_cooldowns
        WHERE model = ANY($1::text[]) AND blocked_until > clock_timestamp()
       UNION ALL
       SELECT count(*)::int FROM agent_runtime.provider_capacity_buckets
        WHERE route_key LIKE 'nvidia:shared:%' AND blocked_until > clock_timestamp()`,
      [models],
    );
    if (rows.some((r) => r.n > 0))
      throw new Error(
        `a variant model (${models.join(", ")}) or an NVIDIA key is cooling down now; not starting`,
      );

    const guard = createBenchGuard({
      maxCalls,
      minIntervalMs,
      maxOwnerDenialStreak: 3,
    });
    const providerFor = (spec) =>
      guard.wrap(
        benchRoutedProvider(pool, config, {
          modelName: spec.model?.name ?? "",
        }),
      );
    const startedAt = new Date().toISOString();
    const result = await cmdBench({
      corpus: resolve(corpusDir),
      variants,
      repeats,
      out: one("out"),
      providerFor,
    });
    for (const line of result.lines) console.log(line);
    const receipt = {
      schema: "coinrithm.bench.admitted-run.v1",
      startedAt,
      finishedAt: new Date().toISOString(),
      ownerTenant: "shared-owner:bench",
      maxCalls,
      minIntervalMs,
      decisions,
      upperBound,
      guard: guard.state,
      ok: result.ok,
    };
    console.log(JSON.stringify(receipt));
    if (one("out"))
      writeFileSync(
        `${resolve(one("out"))}.guard.json`,
        `${JSON.stringify(receipt, null, 2)}\n`,
      );
    if (!result.ok || guard.state.aborted) process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(`[bench-admitted] ${err instanceof Error ? err.message : err}`);
  process.exitCode = 1;
});
