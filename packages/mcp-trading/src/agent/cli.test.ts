import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  mkdtempSync,
  rmSync,
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  cmdNew,
  cmdValidate,
  cmdEject,
  cmdLock,
  cmdInspect,
  acquireLock,
} from "./cli.js";

let tmp: string;
beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), "cr-cli-"));
});
afterEach(() => {
  rmSync(tmp, { recursive: true, force: true });
});

describe("cli", () => {
  it("new creates a valid folder-of-one; validate passes self-host AND hosted", () => {
    const dir = join(tmp, "my-agent");
    expect(cmdNew(dir, { preset: "conservative" }).ok).toBe(true);
    expect(existsSync(join(dir, "agent.md"))).toBe(true);
    expect(cmdValidate(dir, "self-host").ok).toBe(true);
    expect(cmdValidate(dir, "hosted").ok).toBe(true);
  });

  it("new refuses to overwrite and rejects unknown preset/template", () => {
    const dir = join(tmp, "a");
    expect(cmdNew(dir).ok).toBe(true);
    expect(cmdNew(dir).ok).toBe(false); // already exists
    expect(cmdNew(join(tmp, "b"), { preset: "reckless" }).ok).toBe(false);
    expect(cmdNew(join(tmp, "c"), { template: "nope" }).ok).toBe(false);
  });

  it("eject preserves the resolved AgentSpec and stays valid", () => {
    const dir = join(tmp, "ej");
    cmdNew(dir, { preset: "balanced" });
    const r = cmdEject(dir);
    expect(r.ok).toBe(true); // self-check: resolved spec unchanged
    expect(existsSync(join(dir, "runtime.yaml"))).toBe(true);
    expect(existsSync(join(dir, "character", "risk.yaml"))).toBe(true);
    expect(existsSync(join(dir, "safety", "killSwitch.yaml"))).toBe(true);
    expect(existsSync(join(dir, "functionality", "coinrithm.yaml"))).toBe(true);
    expect(existsSync(join(dir, "character", "thesis.md"))).toBe(true);
    expect(cmdValidate(dir, "hosted").ok).toBe(true);
  });

  it("lock writes a deterministic manifest.lock.json", () => {
    const dir = join(tmp, "lk");
    cmdNew(dir, { preset: "conservative" });
    expect(cmdLock(dir).ok).toBe(true);
    const lockPath = join(dir, "meta", "manifest.lock.json");
    expect(existsSync(lockPath)).toBe(true);
    const a = readFileSync(lockPath, "utf8");
    cmdLock(dir);
    const b = readFileSync(lockPath, "utf8");
    expect(a).toBe(b);
    expect(JSON.parse(a).configHash).toMatch(/^sha256:/);
  });

  it("inspect --json returns resolved config, provenance, hashes, validation", () => {
    const dir = join(tmp, "ins");
    cmdNew(dir, { preset: "bold" });
    const out = cmdInspect(dir, true).data as {
      resolvedConfig: Record<string, unknown>;
      provenance: unknown;
      contentHashes: Record<string, string>;
      validation: { valid: boolean };
    };
    expect(out.resolvedConfig.spec).toBe("coinrithm.agent.v1");
    expect(out.provenance).toBeTruthy();
    expect(Object.keys(out.contentHashes).length).toBeGreaterThan(0);
    expect(out.validation.valid).toBe(true);
  });

  describe("acquireLock", () => {
    it("holds an exclusive lock and releases it (idempotent release)", () => {
      const stateFile = join(tmp, ".agent.state.json");
      const release = acquireLock(stateFile);
      expect(release).not.toBeNull();
      expect(existsSync(`${stateFile}.lock`)).toBe(true);
      // A second acquire while held (our own live PID) is refused.
      expect(acquireLock(stateFile)).toBeNull();
      release!();
      expect(existsSync(`${stateFile}.lock`)).toBe(false);
      release!(); // releasing twice is a safe no-op
      expect(existsSync(`${stateFile}.lock`)).toBe(false);
    });

    it("reclaims an orphaned lock whose owner PID is dead (Ctrl-C trap fix)", () => {
      const stateFile = join(tmp, ".agent.state.json");
      const lock = `${stateFile}.lock`;
      // Simulate a runner that was killed without unwinding its finally: a lock
      // file naming a PID that is no longer alive.
      writeFileSync(lock, JSON.stringify({ pid: 2147483646 }), "utf8");
      const release = acquireLock(stateFile);
      expect(release).not.toBeNull(); // reclaimed, not trapped
      expect(JSON.parse(readFileSync(lock, "utf8")).pid).toBe(process.pid);
      release!();
      expect(existsSync(lock)).toBe(false);
    });

    it("refuses to reclaim a lock whose owner PID is still alive", () => {
      const stateFile = join(tmp, ".agent.state.json");
      const lock = `${stateFile}.lock`;
      // Live owner (this very process) → must NOT be stolen.
      writeFileSync(lock, JSON.stringify({ pid: process.pid }), "utf8");
      expect(acquireLock(stateFile)).toBeNull();
      expect(existsSync(lock)).toBe(true);
    });
  });

  it("validate fails closed on a broken agent (missing $ref)", () => {
    const dir = join(tmp, "bad");
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "agent.md"),
      `---\nspec: coinrithm.agent.v1\nname: x\ndescription: d\nrisk:\n  $ref: nope.yaml\n---\nbody`,
      "utf8",
    );
    expect(cmdValidate(dir).ok).toBe(false);
  });
});
