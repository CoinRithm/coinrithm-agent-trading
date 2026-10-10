import {
  readPmHousePolicies,
  type PmHousePolicy,
} from "@coinrithm/mcp-trading/engine";
import { parsePaidBrainMarginPct } from "./paidBrain.js";
import { loadMasterKey } from "./crypto.js";

export interface CustomerJsonContentIdentity {
  ownerUserId: number;
  agentId: number;
}

export interface Config {
  databaseUrl: string;
  encryptionKey: Buffer;
  // Shared free-tier NVIDIA brain keys (a POOL). One account is enough to start;
  // adding independent keys (e.g. housemates' accounts) via NVIDIA_API_KEYS
  // multiplies the fleet budget (each key has its own ~40 RPM quota). Agents are
  // spread deterministically across the pool by id.
  nvidiaApiKeys: string[];
  // Shared free-tier Groq key (separate provider => its own quota). Lets free
  // agents run on Groq's fast LPU endpoint without a BYO key.
  groqApiKey?: string;
  coinrithmApiUrl: string;
  pollIntervalMs: number;
  maxConcurrent: number;
  claimBatch: number;
  // Per-key requests/min budget for the SHARED brain keys. Caps total model
  // calls/min across ALL agents on a shared key so a big batch coming due at once
  // can't 429-storm it. The NVIDIA fleet budget = nvidiaRpm * (pool size).
  nvidiaRpm: number;
  // Groq free tier also has a DAILY cap the per-minute budget can't see
  // (llama-3.1-8b-instant = 14.4K req/day ≈ 10 RPM sustained). The default 30
  // matches the per-minute limit; lower SCHEDULER_GROQ_RPM toward ~10 if a large
  // continuous fleet would otherwise burn the daily cap before the day is out.
  // (Hitting the cap is non-fatal: agents 429 -> skip -> retry next cadence.)
  groqRpm: number;
  // Cross-replica provider lease (RPM + TPM + concurrency). Enabled by default;
  // one env flag rolls back to the legacy in-memory guard.
  capacityEnabled: boolean;
  adaptiveCooldownEnabled: boolean;
  sharedPoolPolicyEnabled: boolean;
  lightningFallbackEnabled: boolean;
  // House agents on the shared hosted router only: their Nemotron Super route
  // asks for JSON content instead of the forced decision tool call. Every other
  // route and BYO key keeps the default transport. Customers have a separate
  // default-off gate below; this house flag never enrolls them.
  // Rollback: unset or SCHEDULER_HOUSE_SUPER_JSON_CONTENT_ENABLED=false.
  houseSuperJsonContentEnabled: boolean;
  // Required absolute UTC expiry for the trial above
  // (SCHEDULER_HOUSE_SUPER_JSON_CONTENT_UNTIL, e.g. 2026-10-05T21:00:00Z).
  // Missing or invalid = undefined = the original transport; checked per
  // attempt, so a restart cannot extend it.
  houseSuperJsonContentUntilMs?: number;
  // Separate, default-off customer preparation. All three settings are needed;
  // no wildcard/owner-wide enrollment and no customer records are changed.
  customerSuperJsonContentEnabled: boolean;
  customerSuperJsonContentUntilMs?: number;
  customerSuperJsonContentAllowlist: readonly CustomerJsonContentIdentity[];
  // Own-key (BYO) extension of that customer trial. Default off. It needs every
  // customer setting above PLUS this switch, so listing a pair for the hosted
  // trial alone never changes a BYO agent's transport.
  // Rollback: unset or SCHEDULER_CUSTOMER_SUPER_JSON_CONTENT_BYO_ENABLED=false.
  customerByoSuperJsonContentEnabled: boolean;
  // Shared hosted router only: Nemotron Super reached as a FALLBACK (the
  // agent's configured model is not Super) asks for JSON content. As the
  // second and last attempt it cannot use the same-model content retry.
  // Rollback: SCHEDULER_SUPER_FALLBACK_JSON_CONTENT_ENABLED=false.
  superFallbackJsonContentEnabled: boolean;
  compactPromptTablesEnabled: boolean;
  pmPaperV2Houses?: readonly PmHousePolicy[];
  sharedOwnerTpm: number;
  sharedMinModelIntervalSeconds: number;
  nvidiaTpm: number;
  nvidiaMaxConcurrent: number;
  groqTpm: number;
  groqMaxConcurrent: number;
  capacityLeaseTtlSeconds: number;
  // Hosted shared-key routing. Enabled by default with an env rollback switch:
  // capacity pressure/provider faults defer or fall through, never disable.
  routerEnabled: boolean;
  // Phase grid (owner 2026-09-23): each agent's due times sit on its own
  // cadence-sized grid, offset by a Fibonacci hash of its id, instead of
  // now()+cadence. Agents that finish together stop coming due together, so
  // the shared brain sees a steady trickle instead of one burst per cadence.
  // Rollback: SCHEDULER_PHASE_GRID_ENABLED=false restores now()+cadence.
  phaseGridEnabled: boolean;
  // Independent backup is eligible only after the boot contract probe passes.
  // The credential remains scheduler-only and is never persisted or logged.
  openAiBackupKey?: string;
  openAiBackupEligible: boolean;
  openAiRpm: number;
  openAiTpm: number;
  openAiMaxConcurrent: number;
  healthPort?: number;
  // Backend's internal attestation channel (same value as backend
  // INTERNAL_WRITE_TOKEN). When set, every scheduler-run request carries
  // x-internal-write-token, so the backend server-signs the decisions this
  // pipeline produces (G5c: hosted-external agents were landing unsigned).
  // Optional: unset => hosted decisions simply stay unsigned, as before.
  internalWriteToken?: string;
  // Paid brains (contract v1): the margin, in whole percent, added on top of
  // the provider cost of every paid call. The backend reads the SAME variable
  // with the SAME default for its displayed prices. Invalid or negative values
  // fall back to the default rather than to zero.
  /** null = invalid PAID_BRAIN_MARGIN_PCT: every paid call is refused. */
  paidBrainMarginPct: number | null;
  // PLATFORM keys for paid brains, scheduler env only. Never stored per agent,
  // never logged, never sent anywhere but the provider. Unset => an admitted
  // paid agent skips its cycle as recoverable infrastructure and is not debited.
  paidAnthropicApiKey?: string;
  paidGeminiApiKey?: string;
}

function req(env: NodeJS.ProcessEnv, k: string): string {
  const v = env[k];
  if (!v || !v.trim()) throw new Error(`missing required env ${k}`);
  return v.trim();
}

function intEnv(
  env: NodeJS.ProcessEnv,
  k: string,
  def: number,
  min: number,
): number {
  const raw = env[k];
  if (!raw) return def;
  const n = Number(raw);
  return Number.isFinite(n) && n >= min ? Math.floor(n) : def;
}

function boolEnv(
  env: NodeJS.ProcessEnv,
  key: string,
  fallback: boolean,
): boolean {
  const raw = env[key]?.trim().toLowerCase();
  if (!raw) return fallback;
  if (["1", "true", "yes", "on"].includes(raw)) return true;
  if (["0", "false", "no", "off"].includes(raw)) return false;
  throw new Error(`${key} must be true or false`);
}

// An absolute UTC instant only (trailing Z). Anything else, including a valid
// local or offset time, is ignored rather than guessed: an unusable expiry
// must leave the trial OFF, never on.
const UTC_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;

export function utcInstantEnv(
  env: NodeJS.ProcessEnv,
  key: string,
): number | undefined {
  const raw = env[key]?.trim();
  if (!raw || !UTC_INSTANT.test(raw)) return undefined;
  const ms = Date.parse(raw);
  // Date.parse rolls impossible dates (2026-02-30) forward; reject them.
  if (
    !Number.isFinite(ms) ||
    new Date(ms).toISOString().slice(0, 19) !== raw.slice(0, 19)
  )
    return undefined;
  return ms;
}

// Bounded exact pairs only. Reject the entire list on any bad entry rather
// than activating a partially parsed cohort. Never log the supplied identities.
// Validate lexical integers before JSON.parse can round a fraction into an ID,
// and reject duplicate object keys that JSON.parse would silently overwrite.
const CUSTOMER_OWNER_FIELD = '"ownerUserId"\\s*:\\s*[1-9][0-9]*';
const CUSTOMER_AGENT_FIELD = '"agentId"\\s*:\\s*[1-9][0-9]*';
const CUSTOMER_PAIR = `\\{\\s*(?:${CUSTOMER_OWNER_FIELD}\\s*,\\s*${CUSTOMER_AGENT_FIELD}|${CUSTOMER_AGENT_FIELD}\\s*,\\s*${CUSTOMER_OWNER_FIELD})\\s*\\}`;
const CUSTOMER_ALLOWLIST = new RegExp(
  `^\\s*\\[\\s*(?:${CUSTOMER_PAIR}(?:\\s*,\\s*${CUSTOMER_PAIR})*)?\\s*\\]\\s*$`,
);

function customerJsonContentAllowlist(
  raw: string | undefined,
): CustomerJsonContentIdentity[] {
  if (!raw || raw.length > 4096 || !CUSTOMER_ALLOWLIST.test(raw)) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length > 16) return [];
    const result: CustomerJsonContentIdentity[] = [];
    const seen = new Set<string>();
    for (const entry of parsed) {
      if (
        !entry ||
        typeof entry !== "object" ||
        Array.isArray(entry) ||
        Object.keys(entry).length !== 2 ||
        !Number.isSafeInteger(entry.ownerUserId) ||
        entry.ownerUserId <= 0 ||
        !Number.isSafeInteger(entry.agentId) ||
        entry.agentId <= 0
      )
        return [];
      const pair = `${entry.ownerUserId}:${entry.agentId}`;
      if (seen.has(pair)) return [];
      seen.add(pair);
      result.push({ ownerUserId: entry.ownerUserId, agentId: entry.agentId });
    }
    return result;
  } catch {
    return [];
  }
}

// A set-but-invalid URL is a deploy mistake we want to fail loud on, not paper
// over with the default (which would silently point agents at the wrong host).
function urlEnv(env: NodeJS.ProcessEnv, k: string, def: string): string {
  const v = env[k]?.trim();
  if (!v) return def;
  try {
    new URL(v);
    return v;
  } catch {
    throw new Error(`${k} is not a valid URL: ${v}`);
  }
}

// NVIDIA_API_KEYS (comma-separated pool) wins; else the single NVIDIA_API_KEY;
// else empty. Dedup + trim so a stray comma or repeat can't double-count budget.
function keyPool(env: NodeJS.ProcessEnv): string[] {
  const raw = env.NVIDIA_API_KEYS?.trim() || env.NVIDIA_API_KEY?.trim() || "";
  return [
    ...new Set(
      raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  ];
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const healthPortRaw = env.HEALTH_PORT?.trim();
  return {
    databaseUrl: req(env, "DATABASE_URL"),
    encryptionKey: loadMasterKey(req(env, "ENCRYPTION_KEY")),
    nvidiaApiKeys: keyPool(env),
    groqApiKey: env.GROQ_API_KEY?.trim() || undefined,
    coinrithmApiUrl: urlEnv(
      env,
      "COINRITHM_API_URL",
      "https://api.coinrithm.com",
    ),
    pollIntervalMs: intEnv(env, "SCHEDULER_POLL_MS", 5000, 250),
    maxConcurrent: intEnv(env, "SCHEDULER_MAX_CONCURRENT", 6, 1),
    claimBatch: intEnv(env, "SCHEDULER_CLAIM_BATCH", 20, 1),
    // The scheduler has its own NVIDIA key. Live 2026-08-27 evidence showed the
    // 429 is model-specific (Super 25.5%, Nano 0.0%), not a global 15-RPM cap;
    // model cooldown/fallback handles that without throttling the healthy lane.
    nvidiaRpm: intEnv(env, "SCHEDULER_NVIDIA_RPM", 15, 1),
    groqRpm: intEnv(env, "SCHEDULER_GROQ_RPM", 30, 1),
    capacityEnabled: boolEnv(env, "SCHEDULER_CAPACITY_ENABLED", true),
    adaptiveCooldownEnabled: boolEnv(
      env,
      "SCHEDULER_ADAPTIVE_COOLDOWN_ENABLED",
      true,
    ),
    sharedPoolPolicyEnabled: boolEnv(
      env,
      "SCHEDULER_SHARED_POOL_POLICY_ENABLED",
      false,
    ),
    lightningFallbackEnabled: boolEnv(
      env,
      "SCHEDULER_LIGHTNING_FALLBACK_ENABLED",
      false,
    ),
    houseSuperJsonContentEnabled: boolEnv(
      env,
      "SCHEDULER_HOUSE_SUPER_JSON_CONTENT_ENABLED",
      false,
    ),
    superFallbackJsonContentEnabled: boolEnv(
      env,
      "SCHEDULER_SUPER_FALLBACK_JSON_CONTENT_ENABLED",
      true,
    ),
    houseSuperJsonContentUntilMs: utcInstantEnv(
      env,
      "SCHEDULER_HOUSE_SUPER_JSON_CONTENT_UNTIL",
    ),
    customerSuperJsonContentEnabled: boolEnv(
      env,
      "SCHEDULER_CUSTOMER_SUPER_JSON_CONTENT_ENABLED",
      false,
    ),
    customerSuperJsonContentUntilMs: utcInstantEnv(
      env,
      "SCHEDULER_CUSTOMER_SUPER_JSON_CONTENT_UNTIL",
    ),
    customerSuperJsonContentAllowlist: customerJsonContentAllowlist(
      env.SCHEDULER_CUSTOMER_SUPER_JSON_CONTENT_ALLOWLIST,
    ),
    customerByoSuperJsonContentEnabled: boolEnv(
      env,
      "SCHEDULER_CUSTOMER_SUPER_JSON_CONTENT_BYO_ENABLED",
      false,
    ),
    pmPaperV2Houses: readPmHousePolicies(env.SCHEDULER_PM_PAPER_V2_HOUSES_JSON),
    compactPromptTablesEnabled: boolEnv(
      env,
      "SCHEDULER_COMPACT_PROMPT_TABLES_ENABLED",
      false,
    ),
    sharedOwnerTpm: intEnv(env, "SCHEDULER_SHARED_OWNER_TPM", 25_000, 1),
    sharedMinModelIntervalSeconds: intEnv(
      env,
      "SCHEDULER_SHARED_MIN_MODEL_INTERVAL_SECONDS",
      180,
      0,
    ),
    // Configurable because provider/account tiers vary. The default covers the
    // measured ~68k sustained fleet demand with bounded headroom.
    nvidiaTpm: intEnv(env, "SCHEDULER_NVIDIA_TPM", 100_000, 1),
    nvidiaMaxConcurrent: intEnv(env, "SCHEDULER_NVIDIA_MAX_CONCURRENT", 4, 1),
    // Groq remains BYO-only for current hosted prompts (> observed shared TPM),
    // but an explicit contract prevents unsafe future reuse.
    groqTpm: intEnv(env, "SCHEDULER_GROQ_TPM", 8_000, 1),
    groqMaxConcurrent: intEnv(env, "SCHEDULER_GROQ_MAX_CONCURRENT", 2, 1),
    // Model calls can run for 300s; this matches the 360s scheduler run lock.
    capacityLeaseTtlSeconds: intEnv(
      env,
      "SCHEDULER_CAPACITY_LEASE_TTL_SECONDS",
      360,
      301,
    ),
    routerEnabled: boolEnv(env, "SCHEDULER_ROUTER_ENABLED", true),
    phaseGridEnabled: boolEnv(env, "SCHEDULER_PHASE_GRID_ENABLED", true),
    openAiBackupKey: env.COINRITHM_OPENAI_BACKUP_KEY?.trim() || undefined,
    // Set true only by the startup probe; loading a key is not proof that its
    // model/request contract works.
    openAiBackupEligible: false,
    // Deliberately below the live 500 RPM / 200k TPM headers: the credential
    // may be shared with other CoinRithm workloads until it is isolated.
    openAiRpm: intEnv(env, "SCHEDULER_OPENAI_RPM", 30, 1),
    openAiTpm: intEnv(env, "SCHEDULER_OPENAI_TPM", 100_000, 1),
    openAiMaxConcurrent: intEnv(env, "SCHEDULER_OPENAI_MAX_CONCURRENT", 2, 1),
    healthPort: healthPortRaw ? intEnv(env, "HEALTH_PORT", 8080, 1) : undefined,
    internalWriteToken: env.COINRITHM_INTERNAL_WRITE_TOKEN?.trim() || undefined,
    paidBrainMarginPct: parsePaidBrainMarginPct(env.PAID_BRAIN_MARGIN_PCT),
    paidAnthropicApiKey: env.PAID_ANTHROPIC_API_KEY?.trim() || undefined,
    paidGeminiApiKey: env.PAID_GEMINI_API_KEY?.trim() || undefined,
  };
}
