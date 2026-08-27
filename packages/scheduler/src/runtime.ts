import type { Pool } from "pg";
import {
  runCycle,
  selectProvider,
  providerForRoute,
  CoinRithmClient,
  newState,
  rollDay,
  makeRunId,
  type RunnerDeps,
  type AgentSpec,
  type RunState,
  type ProviderEnv,
  type ProviderName,
  type DecideInput,
} from "@coinrithm/mcp-trading/dist/agent/engine.js";
import { decrypt } from "./crypto.js";
import {
  type AgentRow,
  loadStateJson,
  recordCycle,
  disableAgent,
  persistCycleResult,
  isProviderRouteAvailable,
  recordProviderStrike,
  clearProviderCircuit,
  rescheduleToCadence,
} from "./db.js";
import type { Config } from "./config.js";
import {
  RoutedProvider,
  resolveRouteChain,
  type ModelRoute,
  type RouteAttempt,
} from "./route.js";
import {
  reserveProviderCapacity,
  releaseProviderCapacity,
  coolDownProviderCapacity,
  isProviderRouteCoolingDown,
  type ProviderCapacityLease,
} from "./capacity.js";

const errMsg = (e: unknown): string =>
  e instanceof Error ? e.message : String(e);

class HostedProviderSetupError extends Error {}

// Pick a shared NVIDIA key from the pool for this agent. Deterministic by id so a
// given agent always uses the same key (stable idempotency/rate behavior), while
// the fleet spreads evenly across the pool. Empty pool => undefined (selectProvider
// then errors clearly that no key is configured).
function pickNvidiaKey(
  agent: AgentRow,
  config: Config,
): { key: string; keyRef: string } | undefined {
  const keys = config.nvidiaApiKeys;
  if (keys.length === 0) return undefined;
  const index = Number(agent.id) % keys.length;
  return { key: keys[index]!, keyRef: `nvidia:shared:${index}` };
}

// Put the agent's model key into the env var the runner's selectProvider reads
// for that provider. Free-tier `nvidia`/`groq` use the shared scheduler keys; any
// other provider (or a BYO key) uses the agent's own decrypted brain key.
function providerEnvFor(agent: AgentRow, config: Config): ProviderEnv {
  const byo = agent.brainKeyEnc
    ? decrypt(agent.brainKeyEnc, config.encryptionKey)
    : undefined;
  switch (agent.modelProvider) {
    case "nvidia":
      return { NVIDIA_API_KEY: byo ?? pickNvidiaKey(agent, config)?.key };
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

export function shouldUseHostedRouter(
  agent: AgentRow,
  config: Config,
): boolean {
  return (
    config.routerEnabled &&
    !agent.brainKeyEnc &&
    agent.modelProvider === "nvidia"
  );
}

function limitForRoute(route: ModelRoute, input: DecideInput, config: Config) {
  const reserveTokens =
    Math.ceil((input.system.length + input.user.length) / 4) +
    (input.maxTokens ?? 1024);
  if (route.provider === "openai") {
    return {
      routeKey: route.keyRef,
      provider: route.provider,
      model: route.model,
      requestsPerMinute: config.openAiRpm,
      tokensPerMinute: config.openAiTpm,
      maxConcurrent: config.openAiMaxConcurrent,
      reserveTokens,
      leaseTtlSeconds: config.capacityLeaseTtlSeconds,
    };
  }
  return {
    routeKey: route.keyRef,
    provider: route.provider,
    model: route.model,
    requestsPerMinute: config.nvidiaRpm,
    tokensPerMinute: config.nvidiaTpm,
    maxConcurrent: config.nvidiaMaxConcurrent,
    reserveTokens,
    leaseTtlSeconds: config.capacityLeaseTtlSeconds,
  };
}

function keyForRoute(
  route: ModelRoute,
  nvidia: { key: string; keyRef: string },
  config: Config,
): string {
  if (route.provider === "nvidia" && route.keyRef === nvidia.keyRef)
    return nvidia.key;
  if (
    route.provider === "openai" &&
    route.keyRef === "openai:shared:backup" &&
    config.openAiBackupKey
  )
    return config.openAiBackupKey;
  throw new Error(`no credential configured for route ${route.provider}`);
}

function routedProviderFor(
  pool: Pool,
  agent: AgentRow,
  config: Config,
  log: string[],
): RoutedProvider<ProviderCapacityLease> {
  const nvidia = pickNvidiaKey(agent, config);
  if (!nvidia)
    throw new HostedProviderSetupError("shared NVIDIA key unavailable");
  const chain = resolveRouteChain({
    configured: {
      provider: "nvidia",
      model: agent.modelName,
      baseUrl: agent.modelBaseUrl,
      keyRef: nvidia.keyRef,
    },
    byo: false,
    openAiBackup: Boolean(
      config.openAiBackupKey && config.openAiBackupEligible,
    ),
  });

  const hookFailure = (stage: string, error: unknown): void => {
    log.push(`${stage}: ${errMsg(error).slice(0, 200)}`);
  };

  return new RoutedProvider(
    chain.profile,
    chain.routes,
    false,
    (route) =>
      providerForRoute(route, keyForRoute(route, nvidia, config), fetch),
    {
      sanitizeError: (value) => {
        let out = value;
        for (const secret of [nvidia.key, config.openAiBackupKey]) {
          if (secret) out = out.split(secret).join("***");
        }
        return out;
      },
      availability: async (route) => {
        if (
          route.provider === "openai" &&
          (!config.openAiBackupKey || !config.openAiBackupEligible)
        ) {
          return {
            eligible: false,
            reason: config.openAiBackupKey ? "probe" : "missing_key",
          };
        }
        const eligible = await isProviderRouteAvailable(
          pool,
          route.provider,
          route.model,
        );
        return eligible
          ? { eligible: true }
          : { eligible: false, reason: "circuit" };
      },
      acquire: async (route, input) => {
        if (!config.capacityEnabled) return { ok: true };
        if (await isProviderRouteCoolingDown(pool, route.keyRef, route.model)) {
          return {
            ok: false,
            scope: "route",
            error: "provider model cooldown active",
          };
        }
        const lease = await reserveProviderCapacity(
          pool,
          limitForRoute(route, input, config),
        );
        return lease
          ? { ok: true, lease }
          : {
              ok: false,
              scope: "key",
              error: "shared provider capacity unavailable",
            };
      },
      release: async (_route, lease, result) => {
        if (!lease) return;
        const actualTokens = result.ok
          ? result.usage
            ? result.usage.promptTokens + result.usage.completionTokens
            : undefined
          : undefined;
        await releaseProviderCapacity(pool, lease, actualTokens).catch(
          (error) => hookFailure("capacity release", error),
        );
      },
      observe: async (route, attempt: RouteAttempt) => {
        try {
          if (attempt.outcome === "success") {
            await clearProviderCircuit(pool, route.provider, route.model);
            return;
          }
          // A local capacity defer is expected backpressure, not evidence that
          // the provider/model is unhealthy.
          if (attempt.outcome === "deferred") return;
          if (attempt.failureClass === "capacity") {
            await coolDownProviderCapacity(
              pool,
              route.keyRef,
              route.provider,
              route.model,
              attempt.retryAfterMs ?? 60_000,
              "rate_limit",
            );
            return;
          }
          if (attempt.failureClass) {
            await recordProviderStrike(
              pool,
              route.provider,
              route.model,
              attempt.error ?? attempt.failureClass,
              attempt.failureClass === "permanent" ? 3 : 1,
            );
          }
        } catch (error) {
          // Circuit/audit state is operational metadata. Never throw away a
          // valid model decision because this side-channel write blipped; the
          // durable lease still expires automatically after a worker crash.
          hookFailure("route observe", error);
        }
      },
    },
  );
}

// Reconstruct a RunState from stored JSON with the SAME fail-closed contract the
// file loader uses: a present-but-corrupt state is fatal (we refuse to run and
// disable, rather than silently reset counters / re-enable a kill-switched
// agent). Missing state = a fresh start.
export function hydrateState(raw: unknown, runId: string): RunState {
  if (raw == null) return newState(runId);
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error(
      "stored agent state is corrupt (not an object) — refusing to run",
    );
  }
  const parsed = raw as Partial<RunState>;
  const base = newState(
    typeof parsed.runId === "string" ? parsed.runId : runId,
  );
  return rollDay({
    ...base,
    ...parsed,
    seen: Array.isArray(parsed.seen) ? parsed.seen : [],
    intentSeq:
      parsed.intentSeq &&
      typeof parsed.intentSeq === "object" &&
      !Array.isArray(parsed.intentSeq)
        ? parsed.intentSeq
        : {},
  });
}

// Run ONE cycle for one agent and persist the outcome. NEVER throws — failures
// are isolated per agent so the loop and other agents are unaffected. Two error
// classes: SETUP errors (bad key, missing model, corrupt state) never self-heal,
// so the agent is DISABLED rather than error-looped every cadence; RUN errors
// (network/model/DB) are transient and simply retried next cadence.
export async function runAgentOnce(
  pool: Pool,
  agent: AgentRow,
  config: Config,
): Promise<void> {
  const log: string[] = [];

  // A DB read blip here is transient (not the agent's fault) — record + retry.
  let stateRaw: unknown;
  try {
    stateRaw = await loadStateJson(pool, agent.id);
  } catch (e) {
    await recordCycle(pool, agent.id, {
      decision: "error",
      error: `loadState: ${errMsg(e)}`,
    }).catch(() => {});
    return;
  }

  // SETUP — owner credential/spec failures are fatal. A missing PLATFORM-owned
  // shared provider credential is recoverable infrastructure: keep the agent
  // active and retry rather than converting an operator mistake into user state.
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
    const provider = shouldUseHostedRouter(agent, config)
      ? routedProviderFor(pool, agent, config, log)
      : selectProvider(spec, providerEnvFor(agent, config), fetch);
    const apiKey = decrypt(agent.coinrithmKeyEnc, config.encryptionKey);
    const client = new CoinRithmClient({
      apiKey,
      baseUrl: config.coinrithmApiUrl,
      // Attestation channel (G5c): with the token set, the backend
      // server-signs every decision this hosted pipeline writes. The token
      // never reaches self-host bundles — it exists only in scheduler env.
      extraHeaders: config.internalWriteToken
        ? { "x-internal-write-token": config.internalWriteToken }
        : undefined,
    });
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
    if (e instanceof HostedProviderSetupError) {
      await recordCycle(pool, agent.id, {
        decision: "skip",
        skipReason: "hosted provider temporarily unavailable",
        modelFailed: false,
        log: log.join("\n"),
        error: `platform setup: ${msg}`,
      }).catch(() => {});
      await rescheduleToCadence(pool, agent.id).catch(() => {});
      return;
    }
    await recordCycle(pool, agent.id, {
      decision: "error",
      error: `setup: ${msg}`,
      log: log.join("\n"),
    }).catch(() => {});
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
        // result.rawModelOutput (engine CycleResult) is intentionally NOT
        // forwarded — CycleRecord has no such field. The no-CoT privacy
        // promise is enforced at the DB write boundary in db.ts, which
        // hard-forces raw_model_output to NULL regardless; the engine already
        // never populates it either (f778338), but the DB helper doesn't rely
        // on that upstream guarantee.
        modelFailed: result.modelFailed,
        disabled: result.disabled,
        actions: result.planned,
        log: log.join("\n"),
        // Slice-2 metering passthrough (gate triggers + token usage).
        triggerCodes: result.triggerCodes,
        llmCallMade: result.llmCallMade,
        tokensIn: result.tokensIn,
        tokensOut: result.tokensOut,
        estimatedCostUsd: result.estimatedCostUsd,
        decisionType: result.decisionType,
        writeAttempted: result.writeAttempted,
        writeAccepted: result.writeAccepted,
        observationHash: result.observationHash,
        indicatorVersion: result.indicatorVersion,
        effectiveProvider: result.effectiveProvider,
        effectiveModel: result.effectiveModel,
        routeReason: result.routeReason,
        routeAttempts: result.routeAttempts,
      },
      disableReason: result.disabled
        ? (result.disabledReason ?? "kill-switch")
        : undefined,
      // Reliability slice 1: permanent provider failures strike the fleet
      // circuit (never a disable); a successful call closes the route's
      // circuit. effective_model = configured model until routing exists.
      // SHARED-key routes only: a BYO-key 404 can be ACCOUNT-scoped (NIM
      // returns "Function not found for account" when an account lacks a
      // model entitlement — observed 2026-08-26), so one user's key must
      // never open a circuit that holds the shared fleet. BYO agents keep
      // per-agent retry semantics (the runner's hold skip each cadence).
      providerHold:
        agent.brainKeyEnc || shouldUseHostedRouter(agent, config)
          ? undefined
          : result.providerHold,
      // Routed hooks already maintain the actual attempted route's circuit.
      // Leaving this unset on a routed defer also prevents the configured
      // model being falsely persisted as an effective model when no call ran.
      model:
        agent.brainKeyEnc || shouldUseHostedRouter(agent, config)
          ? undefined
          : { provider: agent.modelProvider, name: agent.modelName },
    });
  } catch (e) {
    await recordCycle(pool, agent.id, {
      decision: "error",
      error: errMsg(e),
      log: log.join("\n"),
    }).catch(() => {});
  }
}
