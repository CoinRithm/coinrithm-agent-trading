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
  type DecisionInputRecord,
} from "@coinrithm/mcp-trading/engine";
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
import { sharedOwnerLimit } from "./sharedPolicy.js";
import {
  RoutedProvider,
  resolveRouteChain,
  NEMOTRON_SUPER,
  type ModelRoute,
  type RouteAttempt,
} from "./route.js";
import {
  reserveProviderCapacity,
  releaseProviderCapacity,
  coolDownProviderCapacity,
  clearProviderCapacityBackoff,
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

/**
 * Does this agent pin its model?
 *
 * Read defensively: `spec` is jsonb written by the studio and may be anything.
 * Anything other than an explicit `true` means the fleet default, failover on —
 * a malformed spec must never silently pin an agent and strand it whenever its
 * model is saturated.
 */
export function agentPinsModel(spec: unknown): boolean {
  if (!spec || typeof spec !== "object") return false;
  return (spec as { pinnedModel?: unknown }).pinnedModel === true;
}

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

function isOfficialNvidiaRoute(route: ModelRoute): boolean {
  return (
    route.provider === "nvidia" &&
    (route.baseUrl == null ||
      route.baseUrl === "https://integrate.api.nvidia.com/v1")
  );
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

// House-only, Super-only, time-boxed transport switch. Callers reach this
// through the shared hosted router (never BYO). This includes Super reached as
// a Nano fallback; other models keep their original transport. Evaluated for
// every route attempt, so expiry does not depend on restarting the scheduler.
export function usesHouseSuperJsonContent(
  agent: AgentRow,
  config: Config,
  route: ModelRoute,
  nowMs: number = Date.now(),
): boolean {
  return (
    config.houseSuperJsonContentEnabled &&
    config.houseSuperJsonContentUntilMs !== undefined &&
    nowMs < config.houseSuperJsonContentUntilMs &&
    agent.isHouse === true &&
    !agent.brainKeyEnc &&
    route.provider === "nvidia" &&
    route.model === NEMOTRON_SUPER
  );
}

// A separate customer canary, not an expansion of the house flag. Exact owner
// AND agent membership protects against enrolling siblings or a changed owner.
// Only a configured Super primary qualifies; Nano-to-Super fallback does not.
export function usesCustomerSuperJsonContent(
  agent: AgentRow,
  config: Config,
  route: ModelRoute,
  nowMs: number = Date.now(),
): boolean {
  const until = config.customerSuperJsonContentUntilMs;
  const hostedEndpoint = (baseUrl: string | null | undefined): boolean =>
    baseUrl == null || baseUrl === "https://integrate.api.nvidia.com/v1";
  return (
    config.customerSuperJsonContentEnabled === true &&
    until !== undefined &&
    Number.isFinite(until) &&
    Number.isFinite(nowMs) &&
    nowMs < until &&
    agent.isHouse === false &&
    agent.brainKeyEnc === null &&
    shouldUseHostedRouter(agent, config) &&
    agent.modelName === NEMOTRON_SUPER &&
    hostedEndpoint(agent.modelBaseUrl) &&
    route.provider === "nvidia" &&
    route.model === NEMOTRON_SUPER &&
    hostedEndpoint(route.baseUrl) &&
    config.customerSuperJsonContentAllowlist.some(
      (identity) =>
        identity.ownerUserId === agent.ownerUserId &&
        identity.agentId === agent.id,
    )
  );
}

// Own-key (BYO) counterpart of the customer gate above, for the direct
// selectProvider path that the hosted gate never reaches. It requires every
// customer trial setting (enabled, finite future expiry, exact owner AND agent
// pair) PLUS its own explicit BYO switch. Only an NVIDIA Super agent on the
// official NVIDIA endpoint qualifies. The customer's key, model and strategy are
// unchanged; only the request transport changes. Callers pass it as a function
// so the expiry is re-checked on every attempt, including the same-model retry.
export function usesCustomerByoSuperJsonContent(
  agent: AgentRow,
  config: Config,
  nowMs: number = Date.now(),
): boolean {
  const until = config.customerSuperJsonContentUntilMs;
  const officialEndpoint = (baseUrl: string | null | undefined): boolean =>
    baseUrl == null || baseUrl === "https://integrate.api.nvidia.com/v1";
  return (
    config.customerSuperJsonContentEnabled === true &&
    config.customerByoSuperJsonContentEnabled === true &&
    until !== undefined &&
    Number.isFinite(until) &&
    Number.isFinite(nowMs) &&
    nowMs < until &&
    agent.isHouse === false &&
    typeof agent.brainKeyEnc === "string" &&
    agent.brainKeyEnc !== "" &&
    agent.modelProvider === "nvidia" &&
    agent.modelName === NEMOTRON_SUPER &&
    officialEndpoint(agent.modelBaseUrl) &&
    config.customerSuperJsonContentAllowlist.some(
      (identity) =>
        identity.ownerUserId === agent.ownerUserId &&
        identity.agentId === agent.id,
    )
  );
}

function routedProviderFor(
  pool: Pool,
  agent: AgentRow,
  config: Config,
  log: string[],
): RoutedProvider<
  ProviderCapacityLease & { ownerLease?: ProviderCapacityLease }
> {
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
    // Opt-in per agent, via `pinnedModel: true` in its compiled spec. A pinned
    // agent SKIPS a cycle rather than letting the router substitute a model,
    // which is what a controlled variant comparison needs and what a live desk
    // does not. Default stays false, so the fleet keeps failing over.
    pinnedModel: agentPinsModel(agent.spec),
    lightningFallback:
      config.lightningFallbackEnabled && agent.isHouse === true,
  });

  const hookFailure = (stage: string, error: unknown): void => {
    log.push(`${stage}: ${errMsg(error).slice(0, 200)}`);
  };

  return new RoutedProvider(
    chain.profile,
    chain.routes,
    false,
    (route, options) => {
      const routeKey = keyForRoute(route, nvidia, config);
      return options?.nemotronJsonContent === true ||
        usesHouseSuperJsonContent(agent, config, route) ||
        usesCustomerSuperJsonContent(agent, config, route)
        ? providerForRoute(route, routeKey, fetch, {
            nemotronJsonContent: true,
          })
        : providerForRoute(route, routeKey, fetch);
    },
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
            admissionReasons: ["model_cooldown"],
          };
        }
        const limit = limitForRoute(route, input, config);
        let ownerLease: ProviderCapacityLease | undefined;
        if (config.sharedPoolPolicyEnabled) {
          const owner = await reserveProviderCapacity(
            pool,
            sharedOwnerLimit(agent, config, limit.reserveTokens),
          );
          if (!owner.ok)
            return {
              ok: false,
              scope: "owner",
              error: "shared pool owner budget unavailable",
              admissionReasons: owner.reasons,
              retryAfterMs: owner.retryAfterMs,
            };
          ownerLease = owner.lease;
        }
        try {
          const reservation = await reserveProviderCapacity(pool, limit);
          if (reservation.ok)
            return { ok: true, lease: { ...reservation.lease, ownerLease } };
          if (ownerLease)
            await releaseProviderCapacity(pool, ownerLease, 0, true);
          return {
            ok: false,
            scope: "key",
            error: "shared provider capacity unavailable",
            admissionReasons: reservation.reasons,
          };
        } catch (error) {
          if (ownerLease)
            await releaseProviderCapacity(pool, ownerLease, 0, true).catch(
              (e) => hookFailure("owner capacity release", e),
            );
          throw error;
        }
      },
      release: async (route, lease, result, unused) => {
        if (!lease) return;
        // The official NVIDIA endpoint answers a 429 or a worker admission 503
        // before inference and reports no usage. Charging the full estimate
        // for it drains the owner budget and defers the in-cycle fallback.
        // Only that exact rejection refunds tokens; the request stays debited.
        // Reported usage stays authoritative, and every ambiguous failure
        // (other ResourceExhausted, generic 503, timeout) keeps the full charge.
        const rejectedBeforeInference =
          !result.ok &&
          !result.usage &&
          isOfficialNvidiaRoute(route) &&
          (result.status === 429 ||
            (result.status === 503 &&
              /worker local total request limit reached/i.test(
                result.error ?? "",
              )));
        const actualTokens = result.usage
          ? result.usage.promptTokens + result.usage.completionTokens
          : rejectedBeforeInference
            ? 0
            : undefined;
        const releaseLease = (value: ProviderCapacityLease) =>
          unused
            ? releaseProviderCapacity(pool, value, 0, true)
            : releaseProviderCapacity(pool, value, actualTokens);
        await releaseLease(lease).catch((error) =>
          hookFailure("capacity release", error),
        );
        if (lease.ownerLease)
          await releaseLease(lease.ownerLease).catch((error) =>
            hookFailure("owner capacity release", error),
          );
      },
      observe: async (route, attempt: RouteAttempt, callStartedAt) => {
        try {
          if (attempt.outcome === "success") {
            await clearProviderCircuit(pool, route.provider, route.model);
            if (config.adaptiveCooldownEnabled && callStartedAt !== undefined) {
              await clearProviderCapacityBackoff(
                pool,
                route.keyRef,
                route.model,
                callStartedAt,
              );
            }
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
              attempt.retryAfterMs ??
                (config.adaptiveCooldownEnabled ? undefined : 60_000),
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
  // Kept only in this invocation. A failed run can retain its captured inputs
  // without putting private input data into the public log/action surfaces.
  let decisionInputRecord: DecisionInputRecord | undefined;

  // A DB read blip here is transient (not the agent's fault) — record + retry.
  let stateRaw: unknown;
  try {
    stateRaw = await loadStateJson(pool, agent.id);
  } catch (e) {
    await recordCycle(pool, agent.id, {
      decision: "error",
      error: `loadState: ${errMsg(e)}`,
      llmCallMade: false,
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
    // Ordinary BYO/direct agents keep the identical 3-argument call; only an
    // agent enrolled in the BYO trial gets the per-attempt transport check.
    const provider = shouldUseHostedRouter(agent, config)
      ? routedProviderFor(pool, agent, config, log)
      : usesCustomerByoSuperJsonContent(agent, config)
        ? selectProvider(spec, providerEnvFor(agent, config), fetch, {
            nemotronJsonContent: () =>
              usesCustomerByoSuperJsonContent(agent, config),
          })
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
      compactPromptTables:
        config.compactPromptTablesEnabled &&
        agent.isHouse === true &&
        shouldUseHostedRouter(agent, config),
      minModelIntervalSeconds:
        config.sharedPoolPolicyEnabled &&
        config.capacityEnabled &&
        shouldUseHostedRouter(agent, config)
          ? config.sharedMinModelIntervalSeconds
          : undefined,
      live: agent.live,
      stateFile: undefined, // DB-backed: no file I/O; we persist deps.state below
      log: (l) => log.push(l),
      onDecisionInputRecord: (record) => {
        decisionInputRecord = record;
      },
    };
  } catch (e) {
    const msg = errMsg(e);
    if (e instanceof HostedProviderSetupError) {
      await recordCycle(pool, agent.id, {
        decision: "skip",
        skipReason: "hosted provider temporarily unavailable",
        modelFailed: false,
        llmCallMade: false,
        log: log.join("\n"),
        error: `platform setup: ${msg}`,
      }).catch(() => {});
      await rescheduleToCadence(pool, agent.id).catch(() => {});
      return;
    }
    await recordCycle(pool, agent.id, {
      decision: "error",
      error: `setup: ${msg}`,
      llmCallMade: false,
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
        decisionInputRecord: result.decisionInputRecord ?? decisionInputRecord,
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
      decisionInputRecord,
    }).catch(() => {});
  }
}
