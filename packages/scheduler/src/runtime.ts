import type { Pool } from "pg";
import {
  runCycle,
  selectProvider,
  CoinRithmClient,
  newState,
  rollDay,
  makeRunId,
  type RunnerDeps,
  type AgentSpec,
  type RunState,
  type ProviderEnv,
  type ProviderName,
} from "@coinrithm/mcp-trading/dist/agent/engine.js";
import { decrypt } from "./crypto.js";
import {
  type AgentRow,
  loadStateJson,
  recordCycle,
  disableAgent,
  persistCycleResult,
} from "./db.js";
import type { Config } from "./config.js";

const errMsg = (e: unknown): string => (e instanceof Error ? e.message : String(e));

// Pick a shared NVIDIA key from the pool for this agent. Deterministic by id so a
// given agent always uses the same key (stable idempotency/rate behavior), while
// the fleet spreads evenly across the pool. Empty pool => undefined (selectProvider
// then errors clearly that no key is configured).
function pickNvidiaKey(agent: AgentRow, config: Config): string | undefined {
  const keys = config.nvidiaApiKeys;
  if (keys.length === 0) return undefined;
  return keys[Number(agent.id) % keys.length];
}

// Put the agent's model key into the env var the runner's selectProvider reads
// for that provider. Free-tier `nvidia`/`groq` use the shared scheduler keys; any
// other provider (or a BYO key) uses the agent's own decrypted brain key.
function providerEnvFor(agent: AgentRow, config: Config): ProviderEnv {
  const byo = agent.brainKeyEnc ? decrypt(agent.brainKeyEnc, config.encryptionKey) : undefined;
  switch (agent.modelProvider) {
    case "nvidia":
      return { NVIDIA_API_KEY: byo ?? pickNvidiaKey(agent, config) };
    case "anthropic":
      return { ANTHROPIC_API_KEY: byo };
    case "openai":
      return { OPENAI_API_KEY: byo };
    case "groq":
      return { GROQ_API_KEY: byo ?? config.groqApiKey };
    default:
      return { MODEL_API_KEY: byo };
  }
}

// Reconstruct a RunState from stored JSON with the SAME fail-closed contract the
// file loader uses: a present-but-corrupt state is fatal (we refuse to run and
// disable, rather than silently reset counters / re-enable a kill-switched
// agent). Missing state = a fresh start.
export function hydrateState(raw: unknown, runId: string): RunState {
  if (raw == null) return newState(runId);
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("stored agent state is corrupt (not an object) — refusing to run");
  }
  const parsed = raw as Partial<RunState>;
  const base = newState(typeof parsed.runId === "string" ? parsed.runId : runId);
  return rollDay({
    ...base,
    ...parsed,
    seen: Array.isArray(parsed.seen) ? parsed.seen : [],
    intentSeq:
      parsed.intentSeq && typeof parsed.intentSeq === "object" && !Array.isArray(parsed.intentSeq)
        ? parsed.intentSeq
        : {},
  });
}

// Run ONE cycle for one agent and persist the outcome. NEVER throws — failures
// are isolated per agent so the loop and other agents are unaffected. Two error
// classes: SETUP errors (bad key, missing model, corrupt state) never self-heal,
// so the agent is DISABLED rather than error-looped every cadence; RUN errors
// (network/model/DB) are transient and simply retried next cadence.
export async function runAgentOnce(pool: Pool, agent: AgentRow, config: Config): Promise<void> {
  const log: string[] = [];

  // A DB read blip here is transient (not the agent's fault) — record + retry.
  let stateRaw: unknown;
  try {
    stateRaw = await loadStateJson(pool, agent.id);
  } catch (e) {
    await recordCycle(pool, agent.id, { decision: "error", error: `loadState: ${errMsg(e)}` }).catch(() => {});
    return;
  }

  // SETUP — config/credential errors are FATAL (won't self-heal) -> disable.
  let deps: RunnerDeps;
  try {
    const spec: AgentSpec = {
      ...(agent.spec as AgentSpec),
      model: {
        provider: agent.modelProvider as ProviderName,
        name: agent.modelName,
        baseUrl: agent.modelBaseUrl ?? undefined,
      },
    };
    const provider = selectProvider(spec, providerEnvFor(agent, config), fetch);
    const apiKey = decrypt(agent.coinrithmKeyEnc, config.encryptionKey);
    const client = new CoinRithmClient({ apiKey, baseUrl: config.coinrithmApiUrl });
    const state = hydrateState(stateRaw, makeRunId(spec));
    deps = {
      client,
      provider,
      spec,
      mergedProse: agent.prose,
      state,
      live: agent.live,
      stateFile: undefined, // DB-backed: no file I/O; we persist deps.state below
      log: (l) => log.push(l),
    };
  } catch (e) {
    const msg = errMsg(e);
    await recordCycle(pool, agent.id, { decision: "error", error: `setup: ${msg}`, log: log.join("\n") }).catch(() => {});
    await disableAgent(pool, agent.id, `setup error: ${msg}`).catch(() => {});
    return;
  }

  // RUN one cycle, then persist state + cycle (+ any disable) ATOMICALLY. The
  // runner's idempotency keys are deterministic and advance only on success, so
  // a crash before persist replays the SAME key and the server's unique index
  // returns the cached result — never a double-trade (at-most-once per window).
  try {
    const result = await runCycle(deps);
    await persistCycleResult(pool, agent.id, {
      state: deps.state,
      cycle: {
        decision: result.decision,
        skipReason: result.skipReason,
        rationale: result.rationale,
        confidence: result.confidence,
        rawModelOutput: result.rawModelOutput,
        modelFailed: result.modelFailed,
        disabled: result.disabled,
        actions: result.planned,
        log: log.join("\n"),
      },
      disableReason: result.disabled ? (result.disabledReason ?? "kill-switch") : undefined,
    });
  } catch (e) {
    await recordCycle(pool, agent.id, { decision: "error", error: errMsg(e), log: log.join("\n") }).catch(() => {});
  }
}
