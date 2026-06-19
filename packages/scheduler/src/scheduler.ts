import type { Pool } from "pg";
import { claimDueAgents, recordCycle } from "./db.js";
import { runAgentOnce } from "./runtime.js";
import { withConcurrency } from "./concurrency.js";
import { RateBudget, usesSharedBrain } from "./rateBudget.js";
import type { Config } from "./config.js";

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

export interface Control {
  stopped: boolean;
}

// The poll loop: claim due agents (row-locked), run them concurrency-capped and
// under a fleet-wide RPM budget for the shared brain key, repeat. A tick failure
// (e.g. a DB blip) is logged and the loop continues — runAgentOnce already
// isolates per-agent failures.
export async function runScheduler(
  pool: Pool,
  config: Config,
  control: Control,
  logFn: (line: string) => void = (l) => console.log(l),
  now: () => number = () => Date.now(),
): Promise<void> {
  logFn(
    `[scheduler] up · poll=${config.pollIntervalMs}ms concurrency=${config.maxConcurrent} batch=${config.claimBatch} sharedRpm=${config.nvidiaRpm}`,
  );
  // ONE budget for the whole scheduler lifetime — it refills over time across
  // ticks, so the shared brain key is never bursted past ~nvidiaRpm/min.
  const budget = new RateBudget(config.nvidiaRpm, now());
  while (!control.stopped) {
    try {
      const due = await claimDueAgents(pool, config.claimBatch);
      if (due.length > 0) {
        logFn(`[scheduler] running ${due.length}: ${due.map((a) => a.handle).join(", ")}`);
        await withConcurrency(due, config.maxConcurrent, async (a) => {
          // Shared-brain agents must hold a fleet token; if the fleet is over
          // budget this cadence, skip gracefully (transparent skip in the feed)
          // and let the agent run next cadence rather than 429-storm the key.
          if (usesSharedBrain(a.modelProvider, !!a.brainKeyEnc) && !budget.tryAcquire(now())) {
            await recordCycle(pool, a.id, {
              decision: "skip",
              skipReason: "fleet rate budget",
            }).catch(() => {});
            return;
          }
          await runAgentOnce(pool, a, config);
        });
      }
    } catch (e) {
      logFn(`[scheduler] tick error: ${e instanceof Error ? e.message : String(e)}`);
    }
    await sleep(config.pollIntervalMs);
  }
  logFn("[scheduler] drained");
}
