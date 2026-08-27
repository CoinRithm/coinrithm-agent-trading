// Public engine surface for an external scheduler (the hosted "free run").
// The runner is storage-agnostic: runCycle takes { spec, mergedProse, state } as
// plain objects and saveState(undefined) no-ops, so a scheduler can load state
// from a DB, run one cycle, and persist the mutated state itself — no file I/O.
//
// This barrel is the ONE import a host scheduler needs; it re-exports only the
// stable engine pieces, never the CLI.

export { runCycle, type RunnerDeps } from "./runner.js";
export {
  selectProvider,
  providerForRoute,
  type ProviderEnv,
  type Provider,
  type DecideInput,
  type DecideResult,
  type DecideRouteAttempt,
  type DecideRouteMeta,
} from "./providers.js";
export { parseDecision } from "./decision.js";
// Reliability slice A: the declarative request-capability table and the
// representative decision probe (route eligibility = a REAL parsed decision,
// never a bare HTTP 200 — the 62f3a12 lesson).
export {
  chatShapeFor,
  buildChatBody,
  type ChatShape,
} from "./providerCapabilities.js";
export {
  probeDecisionContract,
  type ProbeRoute,
  type ProbeDecisionResult,
} from "./decisionProbe.js";
export { CoinRithmClient } from "./client.js";
export { loadAgent, buildSpec, type LoadedAgent } from "./skill.js";
export { resolveAgent } from "./resolve.js";
export { validateSkill, type SkillValidationMode } from "./skillValidator.js";
export { newState, rollDay } from "./state.js";
export { makeRunId } from "./runEvidence.js";
export { parseCadenceMs } from "./util.js";
// Mechanical BENCHMARK baseline agents (sol #7): the deterministic, non-LLM
// reference line the scheduler seeds into agent_runtime and the runner executes.
export {
  BENCHMARK_AGENTS,
  BENCHMARK_STRATEGIES,
  decideMechanical,
  isBenchmarkStrategy,
  type BenchmarkStrategy,
  type BenchmarkAgentDefinition,
} from "./mechanical.js";
export type {
  AgentSpec,
  RunState,
  CycleResult,
  PlannedAction,
  Venue,
  ProviderName,
  ModelConfig,
} from "./types.js";
