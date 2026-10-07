// Operator script: run a bounded bench comparison whose model calls are
// ADMITTED by the scheduler's own capacity system (C3 of the item-3 plan,
// root 57066 / 57074). Run inside the scheduler container, only after a
// fresh capacity check and three-way agreement; this script never runs on
// its own.
//
//   node scripts/bench-admitted.mjs --corpus /path/to/corpus \
//     --variant pnl=/path/to/leo-pnl --variant dd=/path/to/leo-dd \
//     --until 2026-10-07T23:00:00Z \
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
// - --until is the approved window's end (UTC, at most 6 h ahead): no
//   decision, admission, owner-wait dispatch or recovery retry starts at
//   or after it (the guard's mayDispatch gate inside the router).
//   SIGINT/SIGTERM close the same gate; a request in flight finishes; the receipt is written and the pool closed on every
//   exit path (a second signal writes the receipt and exits at once).
// - Before the first call it refuses when the planned worst case
//   (cassettes x variants x repeats x 2) exceeds the cap; when a variant is
//   not an NVIDIA Super or Lightning spec (nothing is silently forced);
//   when capacity admission or the shared pool policy is off, or the bench
//   owner limit is above 25k TPM or concurrency 1; when a variant's model
//   or the key the bench selects is cooling down; or when that selected key
//   (benchKeyRef: id 0, shared with every live agent on the same index)
//   holds less than KEY_HEADROOM_MIN tokens now, or any debt.
// - Decision rule, fixed before any run: at most 20 decisions (40 calls /
//   2 attempts) can show JSON validity, reject codes and whether the
//   variants' decisions diverge beyond repeat noise. They never rank
//   variants by P&L, edge or calibration; outward use says "N snapshots,
//   behavioural only" (PAIRED-PROPOSAL section 6-7).
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
import {
  BENCH_MODELS,
  benchAgentRow,
  benchKeyRef,
  benchRoutedProvider,
} from "../dist/runtime.js";
import { sharedOwnerLimit } from "../dist/sharedPolicy.js";
import { BENCH_MAX_CALLS, createBenchGuard } from "../dist/benchGuard.js";
import { MAX_ROUTE_ATTEMPTS } from "../dist/route.js";

/** The selected key must hold at least this many tokens (half its 100k
 *  bucket) before the first call, and no debt. */
export const KEY_HEADROOM_MIN = 50_000;
export const BENCH_OWNER_TPM_MAX = 25_000;
const MAX_WINDOW_MS = 6 * 60 * 60 * 1000;
export const DECISION_RULE =
  "behavioural only: JSON validity, reject codes and decision divergence beyond repeat noise; never a P&L, edge or calibration ranking";

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
  const until = one("until") ?? "";
  const deadlineMs = Date.parse(until);
  if (!/(Z|[+-]\d\d:\d\d)$/.test(until) || !Number.isFinite(deadlineMs))
    throw new Error(
      "need --until <ISO instant with offset>: the approved window's end",
    );
  if (deadlineMs <= Date.now() || deadlineMs - Date.now() > MAX_WINDOW_MS)
    throw new Error("--until must be in the future and at most 6 h ahead");

  const corpus = readCorpus(resolve(corpusDir));
  // Worst case: every decision uses the router's full attempt budget (a
  // malformed-output recovery retries the same model inside one decision).
  const decisions = corpus.cassettes.length * variants.length * repeats;
  const upperBound = decisions * MAX_ROUTE_ATTEMPTS;
  if (upperBound > maxCalls)
    throw new Error(
      `planned worst case ${upperBound} provider calls (${decisions} decisions x ${MAX_ROUTE_ATTEMPTS}) exceeds the cap ${maxCalls}; shrink the corpus or variants`,
    );

  // Each variant must itself be an NVIDIA spec on the approved pair: the
  // bench row is always NVIDIA, so anything else would be silently forced.
  const models = [
    ...new Set(
      variants.map((v) => {
        const path = v.slice(v.indexOf("=") + 1);
        const model = loadAgent(resolve(path), "self-host").spec.model;
        if (
          model?.provider !== "nvidia" ||
          model.baseUrl !== undefined ||
          !BENCH_MODELS.includes(model.name)
        )
          throw new Error(
            `variant ${v}: model must be provider nvidia (no baseUrl) and one of ${BENCH_MODELS.join(", ")}`,
          );
        return model.name;
      }),
    ),
  ];

  const config = loadConfig();
  if (!config.capacityEnabled || !config.sharedPoolPolicyEnabled)
    throw new Error(
      "capacity admission and the shared pool policy must both be on; not starting",
    );
  const owner = sharedOwnerLimit(benchAgentRow(models[0]), config, 1);
  if (
    owner.routeKey !== "shared-owner:bench" ||
    owner.tokensPerMinute > BENCH_OWNER_TPM_MAX ||
    owner.maxConcurrent !== 1
  )
    throw new Error(
      `bench owner limit must be shared-owner:bench at <= ${BENCH_OWNER_TPM_MAX} TPM and concurrency 1 (got ${owner.routeKey}, ${owner.tokensPerMinute}, ${owner.maxConcurrent}); not starting`,
    );
  const keyRef = benchKeyRef(config);

  // Captured here, before cmdBench installs any replay clock: provider
  // calls (Retry-After, call timing, backoff clearing) and the window end
  // run on this clock.
  const realNow = Date.now;
  const guard = createBenchGuard({
    maxCalls,
    minIntervalMs,
    maxOwnerDenialStreak: 3,
    deadlineMs,
    realNow,
  });
  const startedAt = new Date().toISOString();
  let result;
  let failure = null;
  const writeReceipt = () => {
    const receipt = {
      schema: "coinrithm.bench.admitted-run.v1",
      startedAt,
      finishedAt: new Date().toISOString(),
      until,
      ownerTenant: owner.routeKey,
      keyRef,
      maxCalls,
      minIntervalMs,
      decisions,
      upperBound,
      decisionRule: DECISION_RULE,
      guard: guard.state,
      ok: result?.ok ?? false,
      failure,
    };
    console.log(JSON.stringify(receipt));
    if (one("out"))
      writeFileSync(
        `${resolve(one("out"))}.guard.json`,
        `${JSON.stringify(receipt, null, 2)}\n`,
      );
  };
  let signals = 0;
  const onSignal = (sig) => {
    signals += 1;
    guard.abort(sig);
    if (signals === 1) {
      console.error(
        `[bench-admitted] ${sig}: no new decision starts; finishing the one in flight`,
      );
      return;
    }
    failure ??= `${sig} again: exited without waiting`;
    writeReceipt();
    process.exit(130);
  };
  process.on("SIGINT", onSignal);
  process.on("SIGTERM", onSignal);

  const pool = createPool(config.databaseUrl);
  try {
    // Fresh capacity check on what the bench will actually use: the
    // variants' models and the one key it selects.
    const { rows } = await pool.query(
      `SELECT count(*)::int AS n FROM agent_runtime.provider_route_cooldowns
        WHERE model = ANY($1::text[]) AND blocked_until > clock_timestamp()
       UNION ALL
       SELECT count(*)::int FROM agent_runtime.provider_capacity_buckets
        WHERE route_key = $2 AND blocked_until > clock_timestamp()`,
      [models, keyRef],
    );
    if (rows.some((r) => r.n > 0))
      throw new Error(
        `a variant model (${models.join(", ")}) or ${keyRef} is cooling down now; not starting`,
      );
    const key = await pool.query(
      `SELECT model_tokens::float8 AS stored,
              LEAST(model_rate_per_min::float8,
                    model_tokens + model_rate_per_min *
                      GREATEST(0, EXTRACT(EPOCH FROM clock_timestamp() - last_refill_at)) / 60.0
              )::float8 AS available
         FROM agent_runtime.provider_capacity_buckets
        WHERE route_key = $1`,
      [keyRef],
    );
    const k = key.rows[0];
    if (!k || k.stored < 0 || k.available < KEY_HEADROOM_MIN)
      throw new Error(
        `${keyRef} headroom too low now (available ${Math.round(k?.available ?? 0)}, stored ${Math.round(k?.stored ?? 0)}; need >= ${KEY_HEADROOM_MIN} and no debt); not starting`,
      );

    const providerFor = (spec) =>
      guard.wrap(
        benchRoutedProvider(pool, config, {
          modelName: spec.model?.name ?? "",
          mayDispatch: guard.mayDispatch,
        }),
      );
    result = await cmdBench({
      corpus: resolve(corpusDir),
      variants,
      repeats,
      out: one("out"),
      providerFor,
    });
    for (const line of result.lines) console.log(line);
    console.log(`[bench-admitted] decision rule: ${DECISION_RULE}`);
    if (!result.ok || guard.state.aborted) process.exitCode = 1;
  } catch (err) {
    failure = err instanceof Error ? err.message : String(err);
    throw err;
  } finally {
    process.off("SIGINT", onSignal);
    process.off("SIGTERM", onSignal);
    try {
      writeReceipt();
    } finally {
      await pool.end();
    }
  }
}

main().catch((err) => {
  console.error(`[bench-admitted] ${err instanceof Error ? err.message : err}`);
  process.exitCode = 1;
});
