import type { AgentSpec } from "./types.js";
import { INDICATOR_VERSION } from "./indicators.js";
import { COINRITHM_API, RESOLVER_VERSION } from "./version.js";
import { sha256, stableStringify } from "./util.js";

/** Private, portable definition; deliberately excludes mutable account state. */
export interface AgentDefinitionSnapshot {
  schema: "coinrithm.agent-definition.v1";
  engine: {
    packageVersion: string;
    resolverVersion: string;
    indicatorVersion: string;
    apiContractVersion: string;
  };
  /** Pass the actual post-overlay spec, without rebuilding it from frontmatter. */
  spec: AgentSpec;
  /** Exact strategy prose supplied to runCycle, after any skills ablation. */
  mergedProse: string;
  definitionHash: string;
}

/**
 * Binds the compiled definition and declared engine versions, not the original
 * source folder alone. This is an integrity/comparison hash, not a signature,
 * complete replay record, or attestation of a particular deployed binary.
 */
export function buildAgentDefinitionSnapshot(
  spec: AgentSpec,
  mergedProse: string,
): AgentDefinitionSnapshot {
  const definition = {
    schema: "coinrithm.agent-definition.v1" as const,
    engine: {
      packageVersion: COINRITHM_API.mcpVersion,
      resolverVersion: RESOLVER_VERSION,
      indicatorVersion: INDICATOR_VERSION,
      apiContractVersion: COINRITHM_API.openapiVersion,
    },
    spec,
    mergedProse,
  };
  // Detach from caller-owned spec: later mutations must not invalidate a saved
  // artifact while leaving its old hash attached to it.
  const serialized = stableStringify(definition);
  return {
    ...(JSON.parse(serialized) as Omit<
      AgentDefinitionSnapshot,
      "definitionHash"
    >),
    definitionHash: sha256(serialized),
  };
}
