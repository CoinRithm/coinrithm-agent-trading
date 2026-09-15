import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { IncomingMessage, ServerResponse } from "node:http";
import { loadConfig } from "./config.js";

const mocks = vi.hoisted(() => ({
  loadConfig: vi.fn(),
  createPool: vi.fn(),
  migrate: vi.fn(),
  retryDatabaseStartup: vi.fn(),
  migrateHouseAgentsOffGroq: vi.fn(),
  migrateAgentsOffEolModels: vi.fn(),
  runScheduler: vi.fn(),
  probeDecisionContract: vi.fn(),
  createServer: vi.fn(),
  end: vi.fn(),
}));
vi.mock("./config.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./config.js")>()),
  loadConfig: mocks.loadConfig,
}));
vi.mock("./db.js", () => mocks);
vi.mock("./scheduler.js", () => ({ runScheduler: mocks.runScheduler }));
vi.mock("@coinrithm/mcp-trading/engine", () => ({
  probeDecisionContract: mocks.probeDecisionContract,
}));
vi.mock("node:http", () => ({ createServer: mocks.createServer }));

let listeners: Map<string, (...args: unknown[]) => void>;
let finish: () => void;
let health: (req: IncomingMessage, res: ServerResponse) => void;
let config: ReturnType<typeof loadConfig>;

beforeEach(async () => {
  vi.resetModules();
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-15T00:00:00Z"));
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
  listeners = new Map();
  vi.spyOn(process, "on").mockImplementation((event, fn) => {
    listeners.set(event, fn);
    return process;
  });
  const real =
    await vi.importActual<typeof import("./config.js")>("./config.js");
  config = real.loadConfig({
    DATABASE_URL: "postgresql://fixture/unused",
    ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64"),
    HEALTH_PORT: "8080",
  });
  mocks.loadConfig.mockReturnValue(config);
  mocks.createPool.mockReturnValue({ end: mocks.end });
  mocks.migrate.mockResolvedValue(undefined);
  mocks.retryDatabaseStartup.mockImplementation(async (operation, options) => {
    options.onRetry(1, 1000, "ECONNREFUSED");
    await operation();
  });
  mocks.migrateHouseAgentsOffGroq.mockResolvedValue(0);
  mocks.migrateAgentsOffEolModels.mockResolvedValue([0, 0]);
  mocks.probeDecisionContract.mockResolvedValue({ ok: true });
  mocks.runScheduler.mockImplementation(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  mocks.end.mockResolvedValue(undefined);
  mocks.createServer.mockImplementation((callback) => {
    health = callback;
    return { listen: (_port: number, ready: () => void) => ready() };
  });
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

async function boot() {
  await import("./index.js");
  await vi.waitFor(() => expect(mocks.runScheduler).toHaveBeenCalledOnce());
}

describe("scheduler process lifecycle", () => {
  it("reports fresh/stale heartbeats, drains once on signals, and closes the pool", async () => {
    config.openAiBackupKey = "fixture-backup";
    mocks.migrateHouseAgentsOffGroq.mockResolvedValue(2);
    mocks.migrateAgentsOffEolModels.mockResolvedValue([1, 1]);
    await boot();
    expect(config.openAiBackupEligible).toBe(true);
    expect(mocks.migrate).toHaveBeenCalledWith(
      mocks.createPool.mock.results[0].value,
    );
    const res = { writeHead: vi.fn(), end: vi.fn() };
    health({} as IncomingMessage, res as unknown as ServerResponse);
    expect(res.writeHead).toHaveBeenLastCalledWith(200, {
      "content-type": "text/plain",
    });
    vi.setSystemTime(Date.now() + 360_000);
    health({} as IncomingMessage, res as unknown as ServerResponse);
    expect(res.writeHead).toHaveBeenLastCalledWith(503, {
      "content-type": "text/plain",
    });
    expect(res.end).toHaveBeenLastCalledWith("stale · no tick in 360s");
    listeners.get("SIGTERM")!();
    listeners.get("SIGINT")!();
    expect(mocks.runScheduler.mock.calls[0][2].stopped).toBe(true);
    expect(vi.getTimerCount()).toBe(1);
    finish();
    await vi.waitFor(() => expect(mocks.end).toHaveBeenCalledOnce());
    expect(process.exit).toHaveBeenCalledWith(0);
    await vi.advanceTimersByTimeAsync(30_000);
    expect(process.exit).toHaveBeenCalledTimes(2);
  });

  it("keeps a failed backup probe ineligible without stopping startup", async () => {
    config.openAiBackupKey = "fixture-backup";
    config.healthPort = undefined;
    mocks.probeDecisionContract.mockResolvedValue({
      ok: false,
      stage: "parse",
      error: "invalid decision",
    });
    await boot();
    expect(config.openAiBackupEligible).toBe(false);
    expect(mocks.createServer).not.toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith(
      "[scheduler] independent backup held: parse invalid decision",
    );
    finish();
    await vi.waitFor(() => expect(mocks.end).toHaveBeenCalledOnce());
  });

  it("does not probe a disabled router and handles process errors explicitly", async () => {
    config.routerEnabled = false;
    config.openAiBackupKey = "fixture-backup";
    await boot();
    expect(mocks.probeDecisionContract).not.toHaveBeenCalled();
    listeners.get("unhandledRejection")!(new Error("fixture rejection"));
    listeners.get("unhandledRejection")!("fixture string");
    expect(console.error).toHaveBeenCalledWith(
      "[scheduler] unhandledRejection:",
      "fixture rejection",
    );
    expect(console.error).toHaveBeenCalledWith(
      "[scheduler] unhandledRejection:",
      "fixture string",
    );
    const fatal = new Error("fixture exception");
    listeners.get("uncaughtException")!(fatal);
    expect(console.error).toHaveBeenCalledWith(
      "[scheduler] uncaughtException:",
      fatal,
    );
    expect(process.exit).toHaveBeenCalledWith(1);
    finish();
    await vi.waitFor(() => expect(mocks.end).toHaveBeenCalledOnce());
  });

  it.each([new Error("fixture startup error"), "fixture startup error"])(
    "fails startup closed: %s",
    async (error) => {
      mocks.migrate.mockRejectedValue(error);
      await import("./index.js");
      await vi.waitFor(() => expect(process.exit).toHaveBeenCalledWith(1));
      expect(console.error).toHaveBeenCalledWith(
        "[scheduler] fatal:",
        "fixture startup error",
      );
      expect(mocks.runScheduler).not.toHaveBeenCalled();
    },
  );
});
