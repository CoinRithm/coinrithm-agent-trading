import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadState, newState, accrueRealized, checkKillSwitch } from "./state.js";
import { parseSkill } from "./skill.js";
import { renderFolderOfOne } from "./templates.js";

let tmp: string;
beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), "cr-state-"));
});
afterEach(() => {
  rmSync(tmp, { recursive: true, force: true });
});

describe("state", () => {
  it("fails closed on a corrupt state file (does not silently reset guards)", () => {
    const f = join(tmp, "s.json");
    writeFileSync(f, "{ not valid json ", "utf8");
    expect(() => loadState(f, "run-1")).toThrow(/corrupt/);
  });

  it("starts fresh when no file exists", () => {
    const s = loadState(join(tmp, "none.json"), "run-1");
    expect(s.cyclesRun).toBe(0);
    expect(s.intentSeq).toEqual({});
    expect(s.disabled).toBe(false);
  });

  it("preserves a disabled flag across a reload", () => {
    const f = join(tmp, "s.json");
    const s = newState("run-1");
    s.disabled = true;
    s.disabledReason = "kill";
    writeFileSync(f, JSON.stringify(s), "utf8");
    const reloaded = loadState(f, "run-1");
    expect(reloaded.disabled).toBe(true);
    expect(reloaded.disabledReason).toBe("kill");
  });

  it("accrues today + session realized and tracks the peak", () => {
    const s = newState("r");
    accrueRealized(s, [{ realizedPnlMusd: 10 }, { realizedPnlMusd: -4 }]);
    expect(s.realizedPnlMusd).toBe(6);
    expect(s.realizedPnlTodayMusd).toBe(6);
    expect(s.peakRealizedMusd).toBe(6);
  });

  it("kill-switch trips on realized drawdown", () => {
    const spec = parseSkill(renderFolderOfOne("a", "conservative")).spec; // maxDrawdownMusd 300
    const s = newState("r");
    s.peakRealizedMusd = 500;
    s.realizedPnlMusd = 100; // drawdown 400 >= 300
    expect(checkKillSwitch(spec, s)).toMatch(/drawdown/);
  });
});
