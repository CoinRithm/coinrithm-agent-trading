import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
  existsSync,
  readFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { resolveAgent } from "./resolve.js";
import { buildSpec } from "./skill.js";
import { buildManifest, serializeManifest, writeManifest } from "./manifest.js";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "cr-manifest-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});
function write(rel: string, content: string): void {
  const p = join(dir, rel);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, content, "utf8");
}

const AGENT = `---
spec: coinrithm.agent.v1
name: t
description: d
trigger:
  cadence: 1h
model:
  provider: anthropic
  name: claude-sonnet-4-6
venues: [futures]
risk:
  maxLeverage: 3
  perTradeMarginMusd: 100
  maxConcurrentPositions: 3
  requireStopLoss: true
  watchlist: [BTC, ETH]
---
body`;

describe("manifest", () => {
  it("is deterministic: two compiles of the same inputs serialize identically", () => {
    write("agent.md", AGENT);
    const a = serializeManifest(
      buildManifest(
        resolveAgent(dir),
        buildSpec(resolveAgent(dir).rawFrontmatter),
      ),
    );
    const b = serializeManifest(
      buildManifest(
        resolveAgent(dir),
        buildSpec(resolveAgent(dir).rawFrontmatter),
      ),
    );
    expect(a).toBe(b);
  });

  it("writes meta/manifest.lock.json with a config hash", () => {
    write("agent.md", AGENT);
    const resolved = resolveAgent(dir);
    const manifest = buildManifest(
      resolved,
      buildSpec(resolved.rawFrontmatter),
    );
    const out = writeManifest(dir, manifest);
    expect(existsSync(join(dir, "meta", "manifest.lock.json"))).toBe(true);
    const parsed = JSON.parse(
      readFileSync(join(dir, "meta", "manifest.lock.json"), "utf8"),
    );
    expect(parsed.schema).toBe("coinrithm.manifest.v1");
    expect(parsed.configHash).toMatch(/^sha256:/);
    expect(parsed.resolvedSpec.risk.maxLeverage).toBe(3);
    expect(out).toContain("manifest.lock.json");
  });
});
