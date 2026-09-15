import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadState, newState, saveState } from "./state.js";

const rename = vi.hoisted(() => vi.fn());
vi.mock("node:fs", async (importOriginal) => {
  const fs = await importOriginal<typeof import("node:fs")>();
  return {
    ...fs,
    renameSync: (...args: Parameters<typeof fs.renameSync>) => {
      rename(...args);
      return fs.renameSync(...args);
    },
  };
});
let directory: string;
beforeEach(() => {
  rename.mockReset();
  directory = mkdtempSync(join(tmpdir(), "cr-atomic-state-"));
});
afterEach(() => rmSync(directory, { recursive: true, force: true }));

describe("atomic local state persistence", () => {
  it("replaces the complete state while retaining counters and disabled protections", () => {
    const file = join(directory, "nested", "state.json");
    const first = newState("fixture");
    first.disabled = true;
    first.riskIncreasesToday = 4;
    saveState(file, first);
    const second = { ...first, cyclesRun: 8 };
    saveState(file, second);
    expect(loadState(file, "ignored")).toMatchObject(second);
    expect(readdirSync(join(directory, "nested"))).toEqual(["state.json"]);
    expect(rename).toHaveBeenCalledTimes(2);
  });

  it("leaves the previous file intact when the final rename fails", () => {
    const file = join(directory, "state.json");
    const previous = {
      ...newState("fixture"),
      disabled: true,
      riskIncreasesToday: 4,
    };
    saveState(file, previous);
    const bytes = readFileSync(file, "utf8");
    rename.mockImplementationOnce(() => {
      throw new Error("fixture rename failure");
    });
    expect(() => saveState(file, { ...previous, cyclesRun: 99 })).toThrow(
      "fixture rename failure",
    );
    expect(readFileSync(file, "utf8")).toBe(bytes);
    expect(readdirSync(directory)).toEqual(["state.json"]);
  });

  it("does not touch the existing state if serialization fails or persistence is disabled", () => {
    const file = join(directory, "state.json");
    const state = newState("fixture");
    saveState(file, state);
    const bytes = readFileSync(file, "utf8");
    const circular = Object.assign({}, state, {
      toJSON: () => {
        throw new Error("fixture serialization failure");
      },
    });
    expect(() => saveState(file, circular)).toThrow(
      "fixture serialization failure",
    );
    saveState(undefined, circular);
    expect(readFileSync(file, "utf8")).toBe(bytes);
    expect(readdirSync(directory)).toEqual(["state.json"]);
  });
});
