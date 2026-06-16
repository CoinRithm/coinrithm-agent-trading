import { loadMasterKey } from "./crypto.js";

export interface Config {
  databaseUrl: string;
  encryptionKey: Buffer;
  nvidiaApiKey?: string; // shared free-tier brain key
  coinrithmApiUrl: string;
  pollIntervalMs: number;
  maxConcurrent: number;
  claimBatch: number;
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

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const healthPortRaw = env.HEALTH_PORT?.trim();
  return {
    databaseUrl: req(env, "DATABASE_URL"),
    encryptionKey: loadMasterKey(req(env, "ENCRYPTION_KEY")),
    nvidiaApiKey: env.NVIDIA_API_KEY?.trim() || undefined,
    coinrithmApiUrl: urlEnv(env, "COINRITHM_API_URL", "https://api.coinrithm.com"),
    pollIntervalMs: intEnv(env, "SCHEDULER_POLL_MS", 5000, 250),
    maxConcurrent: intEnv(env, "SCHEDULER_MAX_CONCURRENT", 6, 1),
    claimBatch: intEnv(env, "SCHEDULER_CLAIM_BATCH", 20, 1),
    healthPort: healthPortRaw ? intEnv(env, "HEALTH_PORT", 8080, 1) : undefined,
  };
}
