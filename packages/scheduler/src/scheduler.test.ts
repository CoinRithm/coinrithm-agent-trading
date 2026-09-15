import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Pool } from "pg";
import type { AgentRow } from "./db.js";
import { loadConfig } from "./config.js";
import { runScheduler } from "./scheduler.js";

const mocks = vi.hoisted(() => ({
  claimDueAgents: vi.fn(),
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
    expect(mocks.claimDueAgents).toHaveBeenCalledWith(
      pool,
      cfg.claimBatch,
      true,
    );
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
    expect(log).toHaveBeenCalledWith(
      "[scheduler] tick error: fixture runner failure",
    );
  });

  it("does not claim work after shutdown was requested", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await runScheduler(pool, config(), { stopped: true });
    expect(mocks.claimDueAgents).not.toHaveBeenCalled();
    expect(log).toHaveBeenLastCalledWith("[scheduler] drained");
  });
});
