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
  groqRpm: number;
  healthPort?: number;
}

function req(env: NodeJS.ProcessEnv, k: string): string {
  const v = env[k];
  if (!v || !v.trim()) throw new Error(`missing required env ${k}`);
  return v.trim();
}

function intEnv(env: NodeJS.ProcessEnv, k: string, def: number, min: number): number {
  const raw = env[k];
  if (!raw) return def;
  const n = Number(raw);
  return Number.isFinite(n) && n >= min ? Math.floor(n) : def;
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
  return [...new Set(raw.split(",").map((s) => s.trim()).filter(Boolean))];
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const healthPortRaw = env.HEALTH_PORT?.trim();
  return {
    databaseUrl: req(env, "DATABASE_URL"),
    encryptionKey: loadMasterKey(req(env, "ENCRYPTION_KEY")),
    nvidiaApiKeys: keyPool(env),
    groqApiKey: env.GROQ_API_KEY?.trim() || undefined,
    coinrithmApiUrl: urlEnv(env, "COINRITHM_API_URL", "https://api.coinrithm.com"),
    pollIntervalMs: intEnv(env, "SCHEDULER_POLL_MS", 5000, 250),
    maxConcurrent: intEnv(env, "SCHEDULER_MAX_CONCURRENT", 6, 1),
    claimBatch: intEnv(env, "SCHEDULER_CLAIM_BATCH", 20, 1),
    nvidiaRpm: intEnv(env, "SCHEDULER_NVIDIA_RPM", 40, 1),
    groqRpm: intEnv(env, "SCHEDULER_GROQ_RPM", 30, 1),
    healthPort: healthPortRaw ? intEnv(env, "HEALTH_PORT", 8080, 1) : undefined,
  };
}
