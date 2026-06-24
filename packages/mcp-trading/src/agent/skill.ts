import { readFileSync } from "node:fs";
import { parseFrontmatter } from "./frontmatter.js";
import {
  AgentSpec,
  ParsedSkill,
  LimitsConfig,
  AbstentionConfig,
  SyncConfig,
  KillSwitchConfig,
  Venue,
  VENUES,
  ModelConfig,
  ProviderName,
  PROVIDERS,
  ObjectiveConfig,
  ObjectivePrimary,
  Capability,
  ALLOWED_CAPABILITIES,
  DEFAULT_TRIGGER_POLICY,
  ResolvedAgent,
  ResolveIssue,
} from "./types.js";
import { resolveAgent, ResolveError } from "./resolve.js";
import { strictLint } from "./strictLint.js";
import { checkCapabilityDrift } from "./capabilityGuard.js";

// Safe defaults for the OPTIONAL policy blocks. A minimal self-host skill
// (name/description/spec/trigger/model/venues/risk) runs under these. Hosted
// mode requires them to be explicit (see skillValidator).
// A daily TRADE-COUNT cap of 0 (or absent) means UNLIMITED. We don't throttle how often
// an agent trades — the risk caps (daily loss, open margin, leverage, stops) are the real
// guardrails. "Unlimited" is normalised to a large finite value so cap-merge arithmetic
// (most-restrictive-wins) and JSON serialisation stay simple.
export const UNLIMITED_TRADES_PER_DAY = 1_000_000;
const normalizeTradeCap = (v: number): number => (v <= 0 ? UNLIMITED_TRADES_PER_DAY : v);

const DEFAULT_LIMITS: LimitsConfig = {
  maxTradesPerDay: UNLIMITED_TRADES_PER_DAY,
  maxWritesPerCycle: 2,
  maxDailyLossMusd: 5_000,
  maxOpenMarginMusd: 5_000,
};
const DEFAULT_ABSTENTION: AbstentionConfig = {
  onStaleData: true,
  onWeakSignal: true,
  onMissingQuote: true,
  onInsufficientBalance: true,
  minConfidence: 0,
};
const DEFAULT_SYNC: SyncConfig = { requirePollBeforeWrite: true };
const DEFAULT_KILLSWITCH: KillSwitchConfig = {
  maxDrawdownMusd: 0, // 0 = disabled
  maxConsecutiveRejects: 0, // 0 = disabled
  maxConsecutiveModelFailures: 5,
  onRateLimitPressure: true,
};

const num = (v: unknown, fallback: number): number =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback;
const bool = (v: unknown, fallback: boolean): boolean =>
  typeof v === "boolean" ? v : fallback;
const strArr = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
const obj = (v: unknown): Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};

function buildObjective(raw: unknown): ObjectiveConfig | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  if (typeof o.primary !== "string") return undefined;
  return {
    primary: o.primary as ObjectivePrimary,
    secondary: strArr(o.secondary),
    horizon: typeof o.horizon === "string" ? o.horizon : undefined,
  };
}

function buildModel(raw: unknown): ModelConfig | undefined {
  if (raw === undefined) return undefined;
  const m = obj(raw);
  return {
    provider: (PROVIDERS.includes(m.provider as ProviderName)
      ? (m.provider as ProviderName)
      : "openai-compatible") as ProviderName,
    name: typeof m.name === "string" ? m.name : "",
    baseUrl: typeof m.baseUrl === "string" ? m.baseUrl : undefined,
  };
}

// Coerce raw frontmatter into a best-effort AgentSpec. This NEVER throws on bad
// values — it fills in what it can and lets validateSkill report problems
// against the raw frontmatter. The runner only proceeds when validation passes.
export function buildSpec(raw: Record<string, unknown>): AgentSpec {
  const trigger = obj(raw.trigger);
  const risk = obj(raw.risk);
  const limits = obj(raw.limits);
  const abst = obj(raw.abstention);
  const sync = obj(raw.sync);
  const ks = obj(raw.killSwitch);
  const trig = obj(raw.triggerPolicy);

  const venues = strArr(raw.venues).filter((v): v is Venue =>
    (VENUES as readonly string[]).includes(v),
  );

  return {
    name: typeof raw.name === "string" ? raw.name : "",
    description: typeof raw.description === "string" ? raw.description : "",
    spec: typeof raw.spec === "string" ? raw.spec : "",
    trigger: {
      cadence: typeof trigger.cadence === "string" ? trigger.cadence : "",
      timezone: typeof trigger.timezone === "string" ? trigger.timezone : undefined,
    },
    model: buildModel(raw.model),
    venues,
    risk: {
      maxLeverage: num(risk.maxLeverage, 1),
      perTradeMarginMusd: num(risk.perTradeMarginMusd, 0),
      maxConcurrentPositions: num(risk.maxConcurrentPositions, 0),
      requireStopLoss: bool(risk.requireStopLoss, true),
      watchlist: strArr(risk.watchlist),
      blocklist: strArr(risk.blocklist),
    },
    limits: {
      maxTradesPerDay: normalizeTradeCap(num(limits.maxTradesPerDay, DEFAULT_LIMITS.maxTradesPerDay)),
      maxWritesPerCycle: num(limits.maxWritesPerCycle, DEFAULT_LIMITS.maxWritesPerCycle),
      maxDailyLossMusd: num(limits.maxDailyLossMusd, DEFAULT_LIMITS.maxDailyLossMusd),
      maxOpenMarginMusd: num(limits.maxOpenMarginMusd, DEFAULT_LIMITS.maxOpenMarginMusd),
    },
    abstention: {
      onStaleData: bool(abst.onStaleData, DEFAULT_ABSTENTION.onStaleData),
      onWeakSignal: bool(abst.onWeakSignal, DEFAULT_ABSTENTION.onWeakSignal),
      onMissingQuote: bool(abst.onMissingQuote, DEFAULT_ABSTENTION.onMissingQuote),
      onInsufficientBalance: bool(
        abst.onInsufficientBalance,
        DEFAULT_ABSTENTION.onInsufficientBalance,
      ),
      minConfidence: num(abst.minConfidence, DEFAULT_ABSTENTION.minConfidence),
    },
    sync: {
      requirePollBeforeWrite: bool(
        sync.requirePollBeforeWrite,
        DEFAULT_SYNC.requirePollBeforeWrite,
      ),
    },
    killSwitch: {
      maxDrawdownMusd: num(ks.maxDrawdownMusd, DEFAULT_KILLSWITCH.maxDrawdownMusd),
      maxConsecutiveRejects: num(
        ks.maxConsecutiveRejects,
        DEFAULT_KILLSWITCH.maxConsecutiveRejects,
      ),
      maxConsecutiveModelFailures: num(
        ks.maxConsecutiveModelFailures,
        DEFAULT_KILLSWITCH.maxConsecutiveModelFailures,
      ),
      onRateLimitPressure: bool(
        ks.onRateLimitPressure,
        DEFAULT_KILLSWITCH.onRateLimitPressure,
      ),
    },
    objective: buildObjective(raw.objective),
    capabilities: strArr(raw.capabilities).filter((c): c is Capability =>
      (ALLOWED_CAPABILITIES as readonly string[]).includes(c),
    ),
    // OKF v2 (load-bearing): the gate reads this; omitted -> DEFAULT_TRIGGER_POLICY.
    // This is the agent's INTENT — the platform deployment overlay may tighten it
    // server-side, and it can never widen a hard cap (caps live in the runner).
    triggerPolicy: {
      mode: trig.mode === "always" ? "always" : DEFAULT_TRIGGER_POLICY.mode,
      skipLlmWhenNoTrigger: bool(
        trig.skipLlmWhenNoTrigger,
        DEFAULT_TRIGGER_POLICY.skipLlmWhenNoTrigger,
      ),
      alwaysManageOpenPositions: bool(
        trig.alwaysManageOpenPositions,
        DEFAULT_TRIGGER_POLICY.alwaysManageOpenPositions,
      ),
      maxLlmCallsPerHour: num(
        trig.maxLlmCallsPerHour,
        DEFAULT_TRIGGER_POLICY.maxLlmCallsPerHour,
      ),
      debounceMinutes: num(trig.debounceMinutes, DEFAULT_TRIGGER_POLICY.debounceMinutes),
      pmEvalCooldownMinutes: num(
        trig.pmEvalCooldownMinutes,
        DEFAULT_TRIGGER_POLICY.pmEvalCooldownMinutes,
      ),
    },
  };
}

export function parseSkill(text: string): ParsedSkill {
  const { data, body } = parseFrontmatter(text);
  return { spec: buildSpec(data), body, raw: data };
}

export function loadSkill(path: string): ParsedSkill {
  return parseSkill(readFileSync(path, "utf8"));
}

export interface LoadedAgent {
  resolved: ResolvedAgent;
  spec: AgentSpec;
  body: string; // the merged prose the LLM reads
  raw: Record<string, unknown>;
  lint: ResolveIssue[];
}

// Compile an agent (single file OR decomposed folder) into a spec + the prose
// the LLM reads. Fail-closed: resolveAgent() throws on any structural/secret
// problem. In hosted mode the strict key/enum lint is ALSO fatal (no silent
// coercion of a typo'd knob); self-host returns lint as advisory issues.
export function loadAgent(
  inputPath: string,
  mode: "self-host" | "hosted" = "self-host",
): LoadedAgent {
  const resolved = resolveAgent(inputPath);
  const raw = resolved.rawFrontmatter;
  const spec = buildSpec(raw);
  // strictLint = frontmatter keys/enums; capability drift = prose references to
  // venues/actions/caps the runner (or this agent's venues) does not support.
  const lint = [...strictLint(raw), ...checkCapabilityDrift(resolved, spec)];
  if (mode === "hosted" && lint.length) throw new ResolveError(lint);
  return { resolved, spec, body: resolved.mergedProse, raw, lint };
}
