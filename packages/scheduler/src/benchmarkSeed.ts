// Seed (or refresh) the three mechanical BENCHMARK baseline agents as
// agent_runtime rows (sol-audit #7). These are the deterministic, non-LLM
// reference line the Arena measures skill against: bench-market-implied,
// bench-base-rate, bench-random. Their definitions live in @coinrithm/mcp-trading
// (mechanical.ts) so the code path and the seed can never drift.
//
// This module is the TESTABLE core. `planBenchmarkSeed` is pure (no DB, no
// crypto) — it describes exactly what a run would do. `seedBenchmarkAgents` does
// the DB work. The CLI (scripts/seedBenchmarkAgents.mjs) is a thin shell:
//   dry-run by DEFAULT; only `--commit` writes. Never auto-run on deploy.
//
// Like the house seed: a COINRITHM_KEY_<HANDLE> (a crk_live_ paper key) is needed
// only to CREATE an agent's row. A config-only re-run (no key) refreshes an
// EXISTING agent's spec/prose/model/cadence in place, leaving its key + running
// state untouched — so refreshing caps needs only DATABASE_URL.

import type { Pool } from "pg";
import {
  BENCHMARK_AGENTS,
  newState,
  makeRunId,
} from "@coinrithm/mcp-trading/dist/agent/engine.js";
import { encrypt } from "./crypto.js";

// Env var carrying a benchmark's crk_live_ paper key, derived from its handle:
//   bench-market-implied -> COINRITHM_KEY_BENCH_MARKET_IMPLIED
export function keyEnvNameFor(handle: string): string {
  return `COINRITHM_KEY_${handle.toUpperCase().replace(/-/g, "_")}`;
}

// Env var carrying an optional owner CoinRithm user id for a benchmark:
//   bench-random -> BENCH_OWNER_BENCH_RANDOM
export function ownerEnvNameFor(handle: string): string {
  return `BENCH_OWNER_${handle.toUpperCase().replace(/-/g, "_")}`;
}

export type BenchmarkSeedMode = "insert" | "config-only";

export interface BenchmarkSeedIntent {
  handle: string;
  displayName: string;
  strategy: string;
  modelProvider: "mechanical";
  modelName: string; // == strategy (the runner reads the strategy from model.name)
  cadenceSeconds: number;
  ownerUserId: number | null;
  // insert     = a key is present -> create/upsert the full row (incl. key)
  // config-only = no key -> refresh an EXISTING row's definition in place
  mode: BenchmarkSeedMode;
  willWrite: boolean; // false in dry-run; true only when committing
}

export interface PlanBenchmarkSeedInput {
  commit: boolean;
  // Handles for which a COINRITHM_KEY_<HANDLE> is present (so a row can be created).
  availableKeyHandles: ReadonlySet<string>;
  // Optional handle -> owner CoinRithm user id.
  owners?: Readonly<Record<string, number>>;
}

// Pure: what a run WOULD do, per benchmark agent. No DB, no crypto, no I/O.
export function planBenchmarkSeed(
  input: PlanBenchmarkSeedInput,
): BenchmarkSeedIntent[] {
  return BENCHMARK_AGENTS.map((a) => {
    const hasKey = input.availableKeyHandles.has(a.handle);
    return {
      handle: a.handle,
      displayName: a.displayName,
      strategy: a.strategy,
      modelProvider: "mechanical" as const,
      modelName: a.spec.model?.name ?? a.strategy,
      cadenceSeconds: a.cadenceSeconds,
      ownerUserId: input.owners?.[a.handle] ?? null,
      mode: hasKey ? "insert" : "config-only",
      willWrite: input.commit,
    };
  });
}

// One-line human summary of an intent (for the CLI print + dry-run preview).
export function formatIntent(i: BenchmarkSeedIntent): string {
  const verb = i.willWrite
    ? i.mode === "insert"
      ? "UPSERT"
      : "CONFIG-UPDATE"
    : i.mode === "insert"
      ? "would UPSERT"
      : "would CONFIG-UPDATE";
  const owner = i.ownerUserId == null ? "owner=none" : `owner=${i.ownerUserId}`;
  return `${verb} ${i.handle} (mechanical/${i.modelName}, ${i.cadenceSeconds}s, ${owner})`;
}

export interface SeedBenchmarkResult {
  handle: string;
  action:
    | "inserted"
    | "config-updated"
    | "config-skipped-no-row"
    | "dry-run"
    | "skipped-no-key-dry-run";
  detail: string;
}

export interface SeedBenchmarkOptions {
  commit: boolean;
  // AES master key (from crypto.loadMasterKey) — REQUIRED only when committing a
  // row that carries a raw key. A config-only commit or a dry-run never needs it.
  masterKey?: Buffer;
  // handle -> raw crk_live_ key.
  keysByHandle?: Readonly<Record<string, string>>;
  // handle -> owner CoinRithm user id.
  owners?: Readonly<Record<string, number>>;
  log?: (line: string) => void;
}

// Do the actual DB work (idempotent). Mirrors the house-agent seed's create vs
// config-only split. NEVER resets a running agent's state or schedule.
export async function seedBenchmarkAgents(
  pool: Pool,
  opts: SeedBenchmarkOptions,
): Promise<SeedBenchmarkResult[]> {
  const log = opts.log ?? (() => {});
  const keys = opts.keysByHandle ?? {};
  const results: SeedBenchmarkResult[] = [];

  for (const a of BENCHMARK_AGENTS) {
    const rawKey = keys[a.handle]?.trim();
    const ownerUserId = opts.owners?.[a.handle] ?? null;
    const specJson = JSON.stringify(a.spec);
    const modelName = a.spec.model?.name ?? a.strategy;

    if (!rawKey) {
      // Config-only: refresh an EXISTING row's definition; never create (no key
      // to encrypt) and never touch its key or running state.
      if (!opts.commit) {
        log(
          `[dry-run] would CONFIG-UPDATE ${a.handle} (no key; only refreshes an existing row)`,
        );
        results.push({
          handle: a.handle,
          action: "skipped-no-key-dry-run",
          detail: "dry-run, no key",
        });
        continue;
      }
      const { rowCount } = await pool.query(
        `UPDATE agent_runtime.agents SET
            display_name = $2, cadence_seconds = $3, model_provider = 'mechanical',
            model_name = $4, model_base_url = NULL, spec = $5::jsonb, prose = $6,
            updated_at = now()
          WHERE handle = $1`,
        [
          a.handle,
          a.displayName,
          a.cadenceSeconds,
          modelName,
          specJson,
          a.prose,
        ],
      );
      const action = rowCount ? "config-updated" : "config-skipped-no-row";
      log(
        rowCount
          ? `config-updated ${a.handle} (key + state unchanged)`
          : `skipped ${a.handle}: not seeded yet — set ${keyEnvNameFor(a.handle)} to create it`,
      );
      results.push({
        handle: a.handle,
        action,
        detail: rowCount ? "definition refreshed" : "no existing row",
      });
      continue;
    }

    if (!opts.commit) {
      log(
        `[dry-run] would UPSERT ${a.handle} (mechanical/${modelName}, has key)`,
      );
      results.push({
        handle: a.handle,
        action: "dry-run",
        detail: "would upsert (has key)",
      });
      continue;
    }

    if (!opts.masterKey) {
      throw new Error(
        `ENCRYPTION_KEY (master key) is required to commit a benchmark row with a raw key (${a.handle})`,
      );
    }
    const crkEnc = encrypt(rawKey, opts.masterKey);
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO agent_runtime.agents
         (owner_user_id, handle, display_name, status, is_house, live, cadence_seconds,
          model_provider, model_name, model_base_url, spec, prose, coinrithm_key_enc, next_run_at)
       VALUES ($1,$2,$3,'active',true,true,$4,'mechanical',$5,NULL,$6::jsonb,$7,$8, now())
       ON CONFLICT (handle) DO UPDATE SET
          display_name      = EXCLUDED.display_name,
          cadence_seconds   = EXCLUDED.cadence_seconds,
          model_provider    = EXCLUDED.model_provider,
          model_name        = EXCLUDED.model_name,
          model_base_url    = EXCLUDED.model_base_url,
          spec              = EXCLUDED.spec,
          prose             = EXCLUDED.prose,
          coinrithm_key_enc = EXCLUDED.coinrithm_key_enc,
          updated_at        = now()
       RETURNING id`,
      [
        ownerUserId,
        a.handle,
        a.displayName,
        a.cadenceSeconds,
        modelName,
        specJson,
        a.prose,
        crkEnc,
      ],
    );
    const id = rows[0]?.id;
    // Initial state only if absent — never reset a running benchmark's counters.
    await pool.query(
      `INSERT INTO agent_runtime.agent_state (agent_id, state)
       VALUES ($1, $2::jsonb) ON CONFLICT (agent_id) DO NOTHING`,
      [id, JSON.stringify(newState(makeRunId(a.spec)))],
    );
    log(
      `seeded ${a.handle} (id ${id}, mechanical/${modelName}, ${a.cadenceSeconds}s)`,
    );
    results.push({ handle: a.handle, action: "inserted", detail: `id ${id}` });
  }

  return results;
}
