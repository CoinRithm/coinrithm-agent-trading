import type { Pool } from "pg";
import { claimDueAgents } from "./db.js";
import { runAgentOnce } from "./runtime.js";
import type { Config } from "./config.js";

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

// Run a list of tasks with a concurrency cap (keeps us under the brain's RPM and
// the per-key trade limits even when a big batch comes due at once).
async function withConcurrency<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  const queue = [...items];
  const worker = async (): Promise<void> => {
    for (let item = queue.shift(); item !== undefined; item = queue.shift()) {
      await fn(item);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, queue.length) }, worker));
}

export interface Control {
  stopped: boolean;
}

// The poll loop: claim due agents (row-locked), run them concurrency-capped,
// repeat. A tick failure (e.g. a DB blip) is logged and the loop continues —
// runAgentOnce already isolates per-agent failures.
export async function runScheduler(
  pool: Pool,
  config: Config,
  control: Control,
  logFn: (line: string) => void = (l) => console.log(l),
): Promise<void> {
  logFn(
    `[scheduler] up · poll=${config.pollIntervalMs}ms concurrency=${config.maxConcurrent} batch=${config.claimBatch}`,
  );
  while (!control.stopped) {
    try {
      const due = await claimDueAgents(pool, config.claimBatch);
      if (due.length > 0) {
        logFn(`[scheduler] running ${due.length}: ${due.map((a) => a.handle).join(", ")}`);
        await withConcurrency(due, config.maxConcurrent, (a) => runAgentOnce(pool, a, config));
      }
    } catch (e) {
      logFn(`[scheduler] tick error: ${e instanceof Error ? e.message : String(e)}`);
    }
    await sleep(config.pollIntervalMs);
  }
  logFn("[scheduler] drained");
}
