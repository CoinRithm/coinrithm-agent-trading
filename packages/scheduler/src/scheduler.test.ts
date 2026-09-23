import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Pool } from "pg";
import type { AgentRow } from "./db.js";
import { loadConfig } from "./config.js";
import { runScheduler } from "./scheduler.js";

const mocks = vi.hoisted(() => ({
  claimDueAgents: vi.fn(),
  configureScheduling: vi.fn(),
  reviveDisabledAgents: vi.fn(),
  recordCycle: vi.fn(),
  rescheduleToCadence: vi.fn(),
  runAgentOnce: vi.fn(),
  shouldUseHostedRouter: vi.fn(),
}));
vi.mock("./db.js", () => mocks);
vi.mock("./runtime.js", () => mocks);

const pool = {} as Pool;
const config = () =>
  loadConfig({
    DATABASE_URL: "postgresql://fixture/unused",
    ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64"),
    NVIDIA_API_KEYS: "fixture-key",
    GROQ_API_KEY: "fixture-groq",
    SCHEDULER_NVIDIA_RPM: "1",
    SCHEDULER_GROQ_RPM: "1",
    SCHEDULER_POLL_MS: "250",
  });
const agent = (
  id: number,
  modelProvider = "nvidia",
  brainKeyEnc: string | null = null,
) => ({ id, handle: `fixture-${id}`, modelProvider, brainKeyEnc }) as AgentRow;

beforeEach(() => {
  vi.useFakeTimers();
  vi.resetAllMocks();
  mocks.reviveDisabledAgents.mockResolvedValue([]);
  mocks.recordCycle.mockResolvedValue(undefined);
  mocks.rescheduleToCadence.mockResolvedValue(undefined);
  mocks.runAgentOnce.mockResolvedValue(undefined);
  mocks.shouldUseHostedRouter.mockReturnValue(false);
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("scheduler polling", () => {
  it("meters shared keys independently, exempts BYO, and releases skipped run locks", async () => {
    const control = { stopped: false };
    const due = [
      agent(1),
      agent(2),
      agent(3, "groq"),
      agent(4, "groq"),
      agent(5, "nvidia", "encrypted-fixture"),
    ];
    mocks.claimDueAgents.mockImplementation(async () => {
      control.stopped = true;
      return due;
    });
    mocks.reviveDisabledAgents.mockResolvedValue([19]);
    const heartbeat = { lastTickAt: 0 };
    const log = vi.fn();
    const cfg = { ...config(), capacityEnabled: false };
    const running = runScheduler(
      pool,
      cfg,
      control,
      log,
      () => 1234,
      heartbeat,
    );
    await vi.runAllTimersAsync();
    await running;
    expect(mocks.runAgentOnce.mock.calls.map((c) => c[1].id)).toEqual([
      1, 3, 5,
    ]);
    expect(mocks.recordCycle).toHaveBeenCalledWith(pool, 2, {
      decision: "skip",
      skipReason: "nvidia rate budget",
    });
    expect(mocks.recordCycle).toHaveBeenCalledWith(pool, 4, {
      decision: "skip",
      skipReason: "groq rate budget",
    });
    expect(mocks.rescheduleToCadence.mock.calls.map((c) => c[1])).toEqual([
      2, 4,
    ]);
    // Claims are bounded by the free execution slots, never the raw batch.
    expect(mocks.claimDueAgents).toHaveBeenCalledWith(
      pool,
      Math.min(cfg.claimBatch, cfg.maxConcurrent),
      true,
    );
    expect(mocks.configureScheduling).toHaveBeenCalledWith({
      phaseGrid: cfg.phaseGridEnabled,
    });
    expect(heartbeat.lastTickAt).toBe(1234);
    expect(log).toHaveBeenCalledWith(expect.stringContaining("revived 1"));
    expect(log).toHaveBeenLastCalledWith("[scheduler] drained");
  });

  it("lets the durable router govern routed agents and scales legacy budgets by key count", async () => {
    const cfg = { ...config(), nvidiaApiKeys: ["fixture-a", "fixture-b"] };
    const control = { stopped: false };
    mocks.shouldUseHostedRouter.mockImplementation((a: AgentRow) => a.id === 3);
    mocks.claimDueAgents.mockImplementation(async () => {
      control.stopped = true;
      return [agent(1), agent(2), agent(3), agent(4)];
    });
    const running = runScheduler(pool, cfg, control, vi.fn());
    await vi.runAllTimersAsync();
    await running;
    expect(mocks.runAgentOnce.mock.calls.map((c) => c[1].id)).toEqual([
      1, 2, 3,
    ]);
    expect(mocks.rescheduleToCadence).toHaveBeenCalledWith(pool, 4);
  });

  it("keeps draining when skip persistence fails and both cleanup operations are attempted", async () => {
    const control = { stopped: false };
    mocks.claimDueAgents.mockImplementation(async () => {
      control.stopped = true;
      return [agent(1), agent(2)];
    });
    mocks.recordCycle.mockRejectedValue(new Error("fixture write failure"));
    mocks.rescheduleToCadence.mockRejectedValue(
      new Error("fixture reschedule failure"),
    );
    const running = runScheduler(pool, config(), control, vi.fn());
    await vi.runAllTimersAsync();
    await expect(running).resolves.toBeUndefined();
    expect(mocks.rescheduleToCadence).toHaveBeenCalledWith(pool, 2);
  });

  it.each([new Error("database unavailable"), "database unavailable"])(
    "recovers after a failed poll: %s",
    async (error) => {
      const control = { stopped: false };
      mocks.reviveDisabledAgents
        .mockRejectedValueOnce(error)
        .mockResolvedValue([]);
      mocks.claimDueAgents.mockImplementation(async () => {
        control.stopped = true;
        return [];
      });
      const log = vi.fn();
      const running = runScheduler(
        pool,
        { ...config(), groqApiKey: undefined, nvidiaApiKeys: [] },
        control,
        log,
      );
      await vi.runAllTimersAsync();
      await running;
      expect(mocks.reviveDisabledAgents).toHaveBeenCalledTimes(2);
      expect(log).toHaveBeenCalledWith(
        "[scheduler] tick error: database unavailable",
      );
      expect(mocks.runAgentOnce).not.toHaveBeenCalled();
    },
  );

  it("updates progress heartbeat even when a runner fails", async () => {
    const control = { stopped: false };
    mocks.claimDueAgents.mockImplementation(async () => {
      control.stopped = true;
      return [agent(1)];
    });
    mocks.runAgentOnce.mockRejectedValue(new Error("fixture runner failure"));
    const now = vi
      .fn()
      .mockReturnValueOnce(1)
      .mockReturnValueOnce(2)
      .mockReturnValueOnce(3)
      .mockReturnValueOnce(4)
      .mockReturnValue(5);
    const heartbeat = { lastTickAt: 0 };
    const log = vi.fn();
    const running = runScheduler(pool, config(), control, log, now, heartbeat);
    await vi.runAllTimersAsync();
    await running;
    expect(heartbeat.lastTickAt).toBe(5);
    // A runner failure is isolated per agent (the loop keeps polling), never
    // surfaced as a tick-level error that would imply the poll itself broke.
    expect(log).toHaveBeenCalledWith(
      "[scheduler] runner error for fixture-1: fixture runner failure",
    );
  });

  it("claims no more agents than the free execution slots and keeps polling while runs are in flight", async () => {
    const control = { stopped: false };
    const cfg = {
      ...config(),
      capacityEnabled: false,
      maxConcurrent: 2,
      claimBatch: 20,
    };
    const release: Array<() => void> = [];
    mocks.runAgentOnce.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          release.push(resolve);
        }),
    );
    mocks.claimDueAgents.mockImplementation(async (_pool, limit: number) => {
      // Only the first claim finds work; both slots then stay busy.
      if (mocks.claimDueAgents.mock.calls.length === 1)
        return [agent(1, "nvidia", "byo-1"), agent(2, "nvidia", "byo-2")].slice(
          0,
          limit,
        );
      if (mocks.claimDueAgents.mock.calls.length >= 3) control.stopped = true;
      return [];
    });
    const running = runScheduler(pool, cfg, control, vi.fn(), () => 99);
    // Tick 1 claims two (the free slots), ticks 2+ find every slot busy.
    await vi.advanceTimersByTimeAsync(250);
    expect(mocks.claimDueAgents.mock.calls[0]?.[1]).toBe(2);
    await vi.advanceTimersByTimeAsync(250);
    await vi.advanceTimersByTimeAsync(250);
    // No claim while both slots are occupied: every later poll asked for 0.
    for (const call of mocks.claimDueAgents.mock.calls.slice(1)) {
      expect(call[1]).toBeUndefined();
    }
    expect(mocks.runAgentOnce).toHaveBeenCalledTimes(2);
    // Draining waits for the in-flight runs.
    let drained = false;
    void running.then(() => {
      drained = true;
    });
    await vi.advanceTimersByTimeAsync(250);
    expect(drained).toBe(false);
    for (const resolve of release) resolve();
    await vi.runAllTimersAsync();
    await running;
    expect(drained).toBe(true);
  });

  it("freezes the heartbeat when every slot is hung past the lease TTL and thaws it on a completion", async () => {
    const control = { stopped: false };
    let clock = 1_000;
    const cfg = {
      ...config(),
      capacityEnabled: false,
      maxConcurrent: 1,
      claimBatch: 20,
      capacityLeaseTtlSeconds: 360,
    };
    const release: Array<() => void> = [];
    mocks.runAgentOnce.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          release.push(resolve);
        }),
    );
    mocks.claimDueAgents.mockImplementation(async () =>
      mocks.claimDueAgents.mock.calls.length === 1
        ? [agent(1, "nvidia", "byo-1")]
        : [],
    );
    const heartbeat = { lastTickAt: 0 };
    const log = vi.fn();
    const running = runScheduler(
      pool,
      cfg,
      control,
      log,
      () => clock,
      heartbeat,
    );
    // Tick 1 claims and launches the only slot; the run never completes.
    await vi.advanceTimersByTimeAsync(250);
    expect(heartbeat.lastTickAt).toBe(1_000);
    expect(mocks.runAgentOnce).toHaveBeenCalledTimes(1);
    // Polling keeps refreshing the heartbeat while the run is younger than the
    // lease TTL (poll liveness).
    clock = 100_000;
    await vi.advanceTimersByTimeAsync(250);
    expect(heartbeat.lastTickAt).toBe(100_000);
    // Past the lease TTL with no completion, polling must NOT refresh it
    // (progress liveness): the healthcheck has to be able to trip.
    clock = 1_000 + 361_000;
    await vi.advanceTimersByTimeAsync(250);
    await vi.advanceTimersByTimeAsync(250);
    expect(heartbeat.lastTickAt).toBe(100_000);
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining("progress stalled"),
    );
    // A completion is progress: the heartbeat thaws on it.
    clock = 1_000 + 400_000;
    release[0]!();
    await vi.advanceTimersByTimeAsync(0);
    expect(heartbeat.lastTickAt).toBe(1_000 + 400_000);
    control.stopped = true;
    await vi.runAllTimersAsync();
    await running;
    expect(log).toHaveBeenLastCalledWith("[scheduler] drained");
  });

  it("bounds the shutdown drain by the lease TTL when a run never returns", async () => {
    const control = { stopped: false };
    const cfg = {
      ...config(),
      capacityEnabled: false,
      maxConcurrent: 1,
      capacityLeaseTtlSeconds: 360,
    };
    mocks.runAgentOnce.mockImplementation(() => new Promise<void>(() => {}));
    mocks.claimDueAgents.mockImplementation(async () => {
      control.stopped = true;
      return [agent(1, "nvidia", "byo-1")];
    });
    const log = vi.fn();
    const running = runScheduler(pool, cfg, control, log, () => 7);
    let drained = false;
    void running.then(() => {
      drained = true;
    });
    await vi.advanceTimersByTimeAsync(250);
    await vi.advanceTimersByTimeAsync(359_000);
    expect(drained).toBe(false);
    await vi.advanceTimersByTimeAsync(2_000);
    await running;
    expect(drained).toBe(true);
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining("drain timed out with 1 run(s)"),
    );
    expect(log).toHaveBeenLastCalledWith("[scheduler] drained");
  });

  it("does not claim work after shutdown was requested", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await runScheduler(pool, config(), { stopped: true });
    expect(mocks.claimDueAgents).not.toHaveBeenCalled();
    expect(log).toHaveBeenLastCalledWith("[scheduler] drained");
  });
});
