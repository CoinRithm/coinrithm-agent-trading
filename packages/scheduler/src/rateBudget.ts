// Fleet-wide token bucket for the SHARED free-tier brain key.
//
// maxConcurrent bounds PARALLELISM but NOT calls-per-minute: if a big batch of
// agents comes due at once, the concurrency queue drains and bursts far past the
// shared NVIDIA key's ~40 RPM budget — 429-storming every free agent, including
// the house agents shown on the public Arena. This bucket caps fleet-wide model
// calls/min for agents on the shared key. An agent that can't get a token this
// cadence skips gracefully and runs next cadence — the scheduler calls
// rescheduleToCadence on the skip path so next_run_at is reset from the claim-time
// RUN_LOCK back to now()+cadence (otherwise a 60s agent would be locked out for
// the full RUN_LOCK_SECONDS). BYO-key and non-nvidia agents are exempt: they have
// their own budget and never draw from the shared pool.
//
// Pure + deterministic: the caller injects `nowMs` so the refill is testable
// without timers. JS is single-threaded and tryAcquire/refill are synchronous
// (no await), so concurrent scheduler workers calling tryAcquire never race.

export class RateBudget {
  private tokens: number;
  private lastRefillMs: number;

  constructor(
    private readonly ratePerMin: number,
    nowMs: number,
  ) {
    // Start full so a fresh scheduler can run an initial burst up to the budget.
    this.tokens = ratePerMin;
    this.lastRefillMs = nowMs;
  }

  private refill(nowMs: number): void {
    const elapsed = nowMs - this.lastRefillMs;
    if (elapsed <= 0) return;
    this.tokens = Math.min(
      this.ratePerMin,
      this.tokens + (this.ratePerMin * elapsed) / 60_000,
    );
    this.lastRefillMs = nowMs;
  }

  // Take one token if available. Returns false when the fleet is over budget.
  tryAcquire(nowMs: number): boolean {
    this.refill(nowMs);
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    return false;
  }

  // Whole tokens currently available (for logging / health).
  available(nowMs: number): number {
    this.refill(nowMs);
    return Math.floor(this.tokens);
  }
}

// Which SHARED free-tier key (and thus which fleet budget) does this agent draw
// from? Only provider agents WITHOUT their own (BYO) brain key use a shared key;
// a BYO key runs on the user's own quota and is exempt (null). Each shared
// provider has its own budget bucket.
export type SharedKey = "nvidia" | "groq";
export function sharedKeyFor(
  modelProvider: string,
  hasBrainKey: boolean,
): SharedKey | null {
  if (hasBrainKey) return null;
  if (modelProvider === "nvidia") return "nvidia";
  if (modelProvider === "groq") return "groq";
  return null;
}

// Back-compat: NVIDIA is the original shared brain.
export function usesSharedBrain(
  modelProvider: string,
  hasBrainKey: boolean,
): boolean {
  return sharedKeyFor(modelProvider, hasBrainKey) === "nvidia";
}
