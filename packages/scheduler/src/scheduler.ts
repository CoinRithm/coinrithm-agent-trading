import type { Pool } from "pg";
import { claimDueAgents, recordCycle } from "./db.js";
import { runAgentOnce } from "./runtime.js";
import { withConcurrency } from "./concurrency.js";
import { RateBudget, sharedKeyFor, type SharedKey } from "./rateBudget.js";
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
  // NVIDIA fleet budget scales with the key pool: each independent key has its
  // own ~RPM quota, so N keys => N * nvidiaRpm fleet-wide. Groq has its own bucket.
  const nvidiaFleetRpm = config.nvidiaRpm * Math.max(1, config.nvidiaApiKeys.length);
  logFn(
    `[scheduler] up · poll=${config.pollIntervalMs}ms concurrency=${config.maxConcurrent} batch=${config.claimBatch} nvidiaKeys=${config.nvidiaApiKeys.length} nvidiaRpm=${nvidiaFleetRpm} groqRpm=${config.groqApiKey ? config.groqRpm : 0}`,
  );
  // One budget per shared key for the whole scheduler lifetime — each refills
  // over time across ticks, so a shared key is never bursted past its budget.
  const budgets: Record<SharedKey, RateBudget> = {
    nvidia: new RateBudget(nvidiaFleetRpm, now()),
    groq: new RateBudget(config.groqRpm, now()),
  };
  while (!control.stopped) {
    try {
      const due = await claimDueAgents(pool, config.claimBatch);
      if (due.length > 0) {
        logFn(`[scheduler] running ${due.length}: ${due.map((a) => a.handle).join(", ")}`);
        await withConcurrency(due, config.maxConcurrent, async (a) => {
          // Agents on a shared key must hold a token for THAT key's budget; if
          // it's over budget this cadence, skip gracefully (transparent skip in
          // the feed) and run next cadence rather than 429-storm the key. BYO-key
          // agents (sharedKeyFor => null) are exempt.
          const sk = sharedKeyFor(a.modelProvider, !!a.brainKeyEnc);
          if (sk && !budgets[sk].tryAcquire(now())) {
            await recordCycle(pool, a.id, {
              decision: "skip",
              skipReason: `${sk} rate budget`,
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
