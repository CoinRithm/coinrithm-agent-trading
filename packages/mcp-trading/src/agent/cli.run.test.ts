import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  mkdtempSync,
  existsSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cmdInspect, cmdNew, cmdRun, main } from "./cli.js";
import type { AgentDefinitionSnapshot } from "./definitionSnapshot.js";
import { newState } from "./state.js";
import type { RunnerDeps } from "./runner.js";

const mocks = vi.hoisted(() => ({ runLoop: vi.fn(), selectProvider: vi.fn() }));
vi.mock("./runner.js", () => ({ runLoop: mocks.runLoop }));
vi.mock("./providers.js", () => ({ selectProvider: mocks.selectProvider }));
let directory: string;
let folder: string;
beforeEach(() => {
  vi.resetAllMocks();
  directory = mkdtempSync(join(tmpdir(), "cr-cli-run-"));
  folder = join(directory, "fixture");
  cmdNew(folder);
  vi.stubEnv("COINRITHM_API_KEY", "fixture-paper-key");
  vi.stubEnv("COINRITHM_API_URL", "https://fixture.example.test");
  vi.stubEnv("LIVE", "0");
  vi.stubEnv("COINRITHM_AGENT_DISABLE_SKILLS", "0");
  vi.stubGlobal(
    "fetch",
    vi.fn(() => {
      throw new Error("Unexpected network call from CLI fixture");
    }),
  );
  mocks.selectProvider.mockReturnValue({ label: "fixture", decide: vi.fn() });
  mocks.runLoop.mockImplementation(async (deps: RunnerDeps) => {
    deps.log?.("fixture cycle");
    deps.state.cyclesRun += 1;
    return [{ planned: [] }];
  });
  vi.spyOn(console, "log").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  rmSync(directory, { recursive: true, force: true });
});

describe("runner CLI lifecycle", () => {
  it("uses the inspected compiled baseline and refuses drift before credentials or account access", async () => {
    const inspected = cmdInspect(folder, true).data as {
      compiledDefinition: AgentDefinitionSnapshot;
    };
    const hash = inspected.compiledDefinition.definitionHash;
    expect(
      await main(["run", folder, "--once", "--expect-definition", hash]),
    ).toBe(0);
    expect(mocks.runLoop).toHaveBeenCalledTimes(1);
    expect(mocks.runLoop.mock.calls[0][0]).toMatchObject({
      spec: inspected.compiledDefinition.spec,
      mergedProse: inspected.compiledDefinition.mergedProse,
    });
    mocks.runLoop.mockClear();
    mocks.selectProvider.mockClear();
    writeFileSync(
      join(folder, "agent.md"),
      readFileSync(join(folder, "agent.md"), "utf8") + "\nNew instruction.\n",
    );
    vi.stubEnv("COINRITHM_API_KEY", "");
    expect(
      await main(["run", folder, "--once", "--expect-definition", hash]),
    ).toBe(1);
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining("definition does not match"),
    );
    expect(mocks.selectProvider).not.toHaveBeenCalled();
    expect(mocks.runLoop).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("does not silently ignore an expected definition flag without its hash", async () => {
    expect(await main(["run", folder, "--once", "--expect-definition"])).toBe(
      1,
    );
    expect(mocks.selectProvider).not.toHaveBeenCalled();
    expect(mocks.runLoop).not.toHaveBeenCalled();
  });

  it("defaults to dry-run, persists completed counters and releases the lock", async () => {
    const listeners = process.listenerCount("SIGINT");
    const result = await cmdRun(folder, { once: true });
    expect(result).toMatchObject({ ok: true, code: 0 });
    expect(result.lines).toContain("fixture cycle");
    expect(result.lines.at(-1)).toBe("done: 1 cycle(s), no writes");
    expect(mocks.runLoop.mock.calls[0][0].live).toBe(false);
    expect(mocks.runLoop.mock.calls[0][1]).toEqual({ once: true });
    expect(
      JSON.parse(readFileSync(join(folder, ".agent.state.json"), "utf8"))
        .cyclesRun,
    ).toBe(1);
    expect(existsSync(join(folder, ".agent.state.json.lock"))).toBe(false);
    expect(process.listenerCount("SIGINT")).toBe(listeners);
  });

  it.each([
    { flags: ["--live"], envLive: "0", live: true },
    { flags: [], envLive: "1", live: true },
    { flags: ["--live", "--dry-run"], envLive: "1", live: false },
  ])(
    "applies explicit run flags $flags with LIVE=$envLive",
    async ({ flags, envLive, live }) => {
      vi.stubEnv("LIVE", envLive);
      vi.stubEnv("COINRITHM_AGENT_DISABLE_SKILLS", "1");
      const state = join(directory, "custom-state.json");
      mocks.runLoop.mockResolvedValue([{ planned: [{ executed: true }] }]);
      expect(
        await main(["run", folder, "--once", "--state", state, ...flags]),
      ).toBe(0);
      expect(mocks.runLoop.mock.calls[0][0]).toMatchObject({
        live,
        stateFile: state,
      });
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("skills DISABLED"),
      );
      expect(fetch).not.toHaveBeenCalled();
    },
  );

  it.each([undefined, "drawdown limit"])(
    "keeps a disabled local agent stopped (%s)",
    async (reason) => {
      writeFileSync(
        join(folder, ".agent.state.json"),
        JSON.stringify({
          ...newState("fixture"),
          disabled: true,
          disabledReason: reason,
        }),
      );
      const result = await cmdRun(folder);
      expect(result.ok).toBe(false);
      expect(result.lines[0]).toContain(reason ?? "kill-switch");
      expect(mocks.runLoop).not.toHaveBeenCalled();
      expect(existsSync(join(folder, ".agent.state.json.lock"))).toBe(false);
    },
  );

  it("rejects corrupt state, missing credentials, bad provider setup and an existing live lock", async () => {
    vi.stubEnv("COINRITHM_API_KEY", "");
    expect((await cmdRun(folder)).lines[0]).toContain(
      "COINRITHM_API_KEY is not set",
    );
    vi.stubEnv("COINRITHM_API_KEY", "fixture-paper-key");
    mocks.selectProvider.mockImplementationOnce(() => {
      throw new Error("fixture model missing");
    });
    expect((await cmdRun(folder)).lines).toEqual(["fixture model missing"]);
    const file = join(folder, ".agent.state.json");
    writeFileSync(file, "invalid JSON");
    expect((await cmdRun(folder)).lines[0]).toContain("corrupt");
    writeFileSync(`${file}.lock`, JSON.stringify({ pid: process.pid }));
    expect((await cmdRun(folder)).lines[0]).toContain("another runner holds");
    expect(mocks.runLoop).not.toHaveBeenCalled();
  });

  it("cleans up signals and the lock after a runner exception", async () => {
    const listeners = process.listenerCount("SIGINT");
    mocks.runLoop.mockRejectedValue(new Error("fixture runner failed"));
    await expect(cmdRun(folder)).rejects.toThrow("fixture runner failed");
    expect(existsSync(join(folder, ".agent.state.json.lock"))).toBe(false);
    expect(process.listenerCount("SIGINT")).toBe(listeners);
  });

  it("releases its lock before forwarding a shutdown signal", async () => {
    const prior = process.listeners("SIGINT");
    const kill = vi.spyOn(process, "kill").mockReturnValue(true);
    mocks.runLoop.mockImplementation(async () => {
      const handler = process
        .listeners("SIGINT")
        .find((fn) => !prior.includes(fn))!;
      handler("SIGINT");
      expect(existsSync(join(folder, ".agent.state.json.lock"))).toBe(false);
      return [{ planned: [] }];
    });
    expect((await cmdRun(folder)).ok).toBe(true);
    expect(kill).toHaveBeenCalledWith(process.pid, "SIGINT");
  });

  it.each([[], ["help"], ["--help"], ["-h"]].map((args) => ({ args })))(
    "prints usage for %j",
    async ({ args }) => {
      expect(await main(args)).toBe(0);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("paper-trading agents"),
      );
    },
  );

  it("dispatches authoring commands and surfaces invalid commands and paths", async () => {
    const other = join(directory, "new-agent");
    expect(
      await main([
        "new",
        other,
        "--template",
        "momentum-futures",
        "--preset",
        "balanced",
      ]),
    ).toBe(0);
    expect(await main(["validate", other, "--hosted"])).toBe(0);
    expect(await main(["validate", other, "--self-host"])).toBe(0);
    expect(await main(["inspect", other])).toBe(0);
    expect(await main(["inspect", other, "--json"])).toBe(0);
    expect(await main(["lock", other])).toBe(0);
    expect(await main(["eject", other])).toBe(0);
    expect(await main(["eject", other])).toBe(1);
    expect(await main(["unknown-command"])).toBe(1);
    expect(await main(["new"])).toBe(1);
    for (const command of ["validate", "inspect", "lock", "eject", "run"]) {
      expect(await main([command, join(directory, "missing")])).toBe(1);
    }
  });
});
