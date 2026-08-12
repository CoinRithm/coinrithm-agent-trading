// The frozen, fully-resolved agent definition. Writing meta/manifest.lock.json
// makes a decomposed folder as reproducible as pinning a single SKILL.md by
// commit SHA: anyone can see exactly which knob values (and from which files)
// produced a run. Deterministic by construction — no timestamps, keys sorted.

import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { AgentSpec, ResolvedAgent, Provenance } from "./types.js";
import { sha256, stableStringify, toPosix } from "./util.js";
import {
  RESOLVER_VERSION,
  RUNNER_VERSION,
  MANIFEST_SCHEMA,
} from "./version.js";
import { INDICATOR_VERSION } from "./indicators.js";

export interface AgentManifest {
  schema: string;
  spec: string;
  resolverVersion: string;
  runnerVersion: string;
  indicatorVersion: string;
  resolvedConfig: Record<string, unknown>; // merged frontmatter, pre-defaults
  resolvedSpec: AgentSpec; // post buildSpec + defaults
  provenance: Provenance;
  contentHashes: Record<string, string>; // posix path -> sha256
  configHash: string; // binds resolvedSpec + resolver/schema version
}

export function buildManifest(
  resolved: ResolvedAgent,
  spec: AgentSpec,
): AgentManifest {
  // configHash binds the RESOLVED spec to the resolver + schema version, so a
  // run reproduces only against the same compile (not just the same files).
  const configHash = sha256(
    stableStringify({
      resolvedSpec: spec,
      resolverVersion: RESOLVER_VERSION,
      indicatorVersion: INDICATOR_VERSION,
      schema: MANIFEST_SCHEMA,
    }),
  );
  return {
    schema: MANIFEST_SCHEMA,
    spec: spec.spec || "coinrithm.agent.v1",
    resolverVersion: RESOLVER_VERSION,
    runnerVersion: RUNNER_VERSION,
    indicatorVersion: INDICATOR_VERSION,
    resolvedConfig: resolved.rawFrontmatter,
    resolvedSpec: spec,
    provenance: resolved.provenance,
    contentHashes: resolved.contentHashes,
    configHash,
  };
}

// Serialize deterministically (sorted keys, no timestamps) so two compiles of
// the same inputs on Windows and Linux are byte-identical.
export function serializeManifest(manifest: AgentManifest): string {
  return stableStringify(manifest) + "\n";
}

export function writeManifest(
  agentDir: string,
  manifest: AgentManifest,
): string {
  const metaDir = join(agentDir, "meta");
  mkdirSync(metaDir, { recursive: true });
  const out = join(metaDir, "manifest.lock.json");
  writeFileSync(out, serializeManifest(manifest), "utf8");
  return toPosix(out);
}
