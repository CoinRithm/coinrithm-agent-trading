import type { Pool } from "pg";
import {
  claimDueAgents,
  recordCycle,
  rescheduleToCadence,
  reviveDisabledAgents,
  configureScheduling,
  type AgentRow,
} from "./db.js";
import { runAgentOnce, shouldUseHostedRouter } from "./runtime.js";
import { RateBudget, sharedKeyFor, type SharedKey } from "./rateBudget.js";
import type { Config } from "./config.js";

const sleep = (ms: number): Promise<void> =>
  new Promise((r) => setTimeout(r, ms));

export interface Control {
  stopped: boolean;
}

// The poll loop: claim due agents (row-locked) up to the free execution
// slots, launch them under a fleet-wide RPM budget for the shared brain key,
// repeat while earlier runs are still in flight. A tick failure
// (e.g. a DB blip) is logged and the loop continues — runAgentOnce already
// isolates per-agent failures.
export async function runScheduler(
  pool: Pool,
  config: Config,
  control: Control,
  logFn: (line: string) => void = (l) => console.log(l),
  now: () => number = () => Date.now(),
  heartbeat?: { lastTickAt: number },
): Promise<void> {
  // NVIDIA fleet budget scales with the key pool: each independent key has its
  // own ~RPM quota, so N keys => N * nvidiaRpm fleet-wide. Groq has its own bucket.
  const nvidiaFleetRpm =
    config.nvidiaRpm * Math.max(1, config.nvidiaApiKeys.length);
  logFn(
    `[scheduler] up · poll=${config.pollIntervalMs}ms concurrency=${config.maxConcurrent} batch=${config.claimBatch} phaseGrid=${config.phaseGridEnabled} nvidiaKeys=${config.nvidiaApiKeys.length} nvidiaRpm=${nvidiaFleetRpm} groqRpm=${config.groqApiKey ? config.groqRpm : 0}`,
  );
  // One budget per shared key for the whole scheduler lifetime — each refills
  // over time across ticks, so a shared key is never bursted past its budget.
  const budgets: Record<SharedKey, RateBudget> = {
    nvidia: new RateBudget(nvidiaFleetRpm, now()),
    groq: new RateBudget(config.groqRpm, now()),
  };
  // Scheduling policy for every reschedule this process performs.
  configureScheduling({ phaseGrid: config.phaseGridEnabled });

  // Per-agent worker: never throws (runAgentOnce isolates per-agent failures
  // and the skip path swallows its own persistence errors), so a rejected
  // run can never take the poll loop down.
  const runOne = async (a: AgentRow): Promise<void> => {
    try {
      // Agents on a shared key must hold a token for THAT key's budget; if
      // it's over budget this cadence, skip gracefully (transparent skip in
      // the feed) and run next cadence rather than 429-storm the key. BYO-key
      // agents (sharedKeyFor => null) are exempt.
      // The routed hosted-NVIDIA path reserves durable cross-replica
      // RPM+TPM+concurrency inside runAgentOnce. Keep the legacy bucket
      // for BYO/other shared routes and as the one-flag rollback path.
      const routedCapacity =
        config.capacityEnabled && shouldUseHostedRouter(a, config);
      const sk = routedCapacity
        ? null
        : sharedKeyFor(a.modelProvider, !!a.brainKeyEnc);
      if (sk && !budgets[sk].tryAcquire(now())) {
        await recordCycle(pool, a.id, {
          decision: "skip",
          skipReason: `${sk} rate budget`,
        }).catch(() => {});
        // This skip never reached persistCycleResult, so reset the
        // RUN_LOCK that claimDueAgents set back to the agent's cadence —
        // else a 60s agent stays locked out for the full RUN_LOCK_SECONDS.
        await rescheduleToCadence(pool, a.id).catch(() => {});
        return;
      }
      await runAgentOnce(pool, a, config);
    } catch (e) {
      logFn(
        `[scheduler] runner error for ${a.handle}: ${e instanceof Error ? e.message : String(e)}`,
      );
    } finally {
      // Progress beat: a slow but healthy batch keeps ticking as agents
      // finish, so only a genuine freeze (no completions) trips the check.
      if (heartbeat) heartbeat.lastTickAt = now();
    }
  };

  // Runs are LAUNCHED per tick, not awaited as a batch (review 2026-09-23):
  // the loop claims at most the FREE execution slots, so a claimed agent never
  // queues behind a slow model past its run lock, and newly due agents keep
  // being admitted while others run. Draining waits for every in-flight run.
  const inFlight = new Set<Promise<void>>();
  const launch = (a: AgentRow): void => {
    const run: Promise<void> = runOne(a).finally(() => {
      inFlight.delete(run);
    });
    inFlight.add(run);
  };

  while (!control.stopped) {
    // Liveness heartbeat: the health endpoint reports UNHEALTHY if this stops
    // advancing, so an orchestrator restarts a HUNG loop, not just a crashed
    // process (a static "ok" can't tell a frozen loop from a healthy one).
    if (heartbeat) heartbeat.lastTickAt = now();
    try {
      // Self-heal FIRST so a revived agent is also claimed this same tick: the
      // Arena must never be a graveyard when a visitor lands (a flaky-model streak
      // or any house stop is undone automatically, no manual re-seed).
      const revived = await reviveDisabledAgents(pool);
      if (revived.length > 0)
        logFn(
          `[scheduler] self-heal: revived ${revived.length} disabled agent(s): ${revived.join(", ")}`,
        );
      const free = config.maxConcurrent - inFlight.size;
      if (free > 0) {
        const due = await claimDueAgents(
          pool,
          Math.min(config.claimBatch, free),
          config.routerEnabled,
        );
        if (due.length > 0) {
          logFn(
            `[scheduler] running ${due.length} (${inFlight.size} in flight): ${due.map((a) => a.handle).join(", ")}`,
          );
          for (const a of due) launch(a);
        }
      }
    } catch (e) {
      logFn(
        `[scheduler] tick error: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
    await sleep(config.pollIntervalMs);
  }
  await Promise.allSettled([...inFlight]);
  logFn("[scheduler] drained");
}
