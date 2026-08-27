import { loadMasterKey } from "./crypto.js";

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
  nvidiaTpm: number;
  nvidiaMaxConcurrent: number;
  groqTpm: number;
  groqMaxConcurrent: number;
  capacityLeaseTtlSeconds: number;
  // Hosted shared-key routing. Enabled by default with an env rollback switch:
  // capacity pressure/provider faults defer or fall through, never disable.
  routerEnabled: boolean;
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
  };
}
