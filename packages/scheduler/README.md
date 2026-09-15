# @coinrithm/agent-scheduler (private)

The hosted **agent runtime** — the "free run". A stateless, DB-driven scheduler
that runs CoinRithm paper-trading agents (house **and** user) on their cadences.
It imports the runner engine from `@coinrithm/mcp-trading`; it is **not**
published.

## Model

Postgres (`agent_runtime` schema) is the source of truth. House agents are just
seeded rows; user agents are rows created by the deploy path. The scheduler holds
**no local agent state**. Multiple replicas require the PostgreSQL capacity
backend so admission limits are shared across workers.

- `agents` — compiled spec + prose + model + cadence + status + encrypted keys + `next_run_at`.
- `agent_state` — the per-agent `RunState` (replaces the self-host `.agent.state.json`).
- `agent_cycles` — append-only reasoning + actions + result (powers the live terminal / Arena / daily post).

The loop: claim due agents (`FOR UPDATE SKIP LOCKED`) → load spec+prose+state →
run ONE cycle via `runCycle` → persist state + a cycle row → `next_run_at` is
advanced at claim time to reserve the window and rescheduled after completion.
This is not an exactly-once execution guarantee. Per-agent failures are isolated;
a corrupt stored state fails closed (the agent is disabled, not reset).

## Secrets

Each agent's CoinRithm key (and any BYO model key) is stored **encrypted**
(AES-256-GCM envelope, `crypto.ts`) and decrypted only in memory at run time. The
free tier uses the shared `NVIDIA_API_KEY` (scheduler env), not a per-row key.

## Env

| Var                                                                        | Required             | Notes                                                              |
| -------------------------------------------------------------------------- | -------------------- | ------------------------------------------------------------------ |
| `DATABASE_URL`                                                             | yes                  | the shared coinrithm-postgres                                      |
| `ENCRYPTION_KEY`                                                           | yes                  | 32 bytes — 64 hex chars or base64 of 32 bytes                      |
| `NVIDIA_API_KEY`                                                           | for free-tier agents | shared brain key (nemotron-3-super-120b, nemotron-3-nano-omni-30b) |
| `COINRITHM_API_URL`                                                        | no                   | default `https://api.coinrithm.com`                                |
| `SCHEDULER_POLL_MS` / `SCHEDULER_MAX_CONCURRENT` / `SCHEDULER_CLAIM_BATCH` | no                   | defaults 5000 / 6 / 20                                             |
| `HEALTH_PORT`                                                              | no                   | enables a `/healthz` liveness port                                 |

## Run

```bash
# From the repository root, build the engine dependency first:
npm --prefix packages/mcp-trading ci
npm --prefix packages/scheduler ci
npm --prefix packages/scheduler run build
cd packages/scheduler
DATABASE_URL=… ENCRYPTION_KEY=… NVIDIA_API_KEY=… npm start
```

Seed the 5 house agents (one-time; needs their CoinRithm keys in env):

```bash
COINRITHM_KEY_MIA=crk_live_… COINRITHM_KEY_CARL=… … npm run seed:house
```

## Deploy (Coolify)

One **worker** app, build context = repo root, Dockerfile = `packages/scheduler/Dockerfile`
(NOT the root Dockerfile — that one builds the published mcp-trading image).
Env: `DATABASE_URL`, `ENCRYPTION_KEY`, `NVIDIA_API_KEY` (secrets). **No volume.**

Operational must-knows:

- **Do not swap `ENCRYPTION_KEY` by itself.** Stored credentials must be
  re-encrypted before readers use a new key. Follow the offline rotation and
  recovery procedure below; the seed job and every credential reader/writer
  must use the same active key.
- **Configure the shared providers before starting the fleet.** House agents
  without BYO credentials need an eligible shared route. Router mode can use
  configured fallback providers; missing capacity is not proof of provider health.
- **Migration startup is serialized.** Numbered SQL files replay in lexical
  order on one connection, inside one transaction holding a database advisory
  lock. Concurrent replicas wait; interruption rolls back the transaction and
  releases the lock. Lock waits are bounded at 30 seconds and statements at
  120 seconds; a timeout fails startup rather than serving a partially migrated
  schema. New migrations must remain transactional (no `CONCURRENTLY` or
  embedded transaction control). This does not replace the shared capacity
  backend required for multiple replicas.
- **Keep the Docker healthcheck enabled.** The image sets `HEALTH_PORT=8080`;
  `/healthz` checks the scheduler heartbeat as well as process liveness.

## Offline credential rotation and recovery

This rotates the encryption envelope, **not** the CoinRithm or model-provider
credentials themselves. The helper is never called during normal startup.

1. Record the current application revision and expected agent count. Securely
   back up the database and current master key. Confirm the database target
   without printing connection credentials. Keep both keys out of files,
   command history and CI logs.
2. Stop **every** scheduler and credential writer, including API deploy/edit
   paths and seed jobs. Keep them stopped until verification finishes. The
   database lock serializes maintenance; it cannot stop a running worker from
   holding a plaintext credential or using an outdated master key in memory.
3. Build the scheduler. Supply `DATABASE_URL`, `ROTATION_OLD_KEY` and
   `ROTATION_NEW_KEY` through the secret manager/process environment. Both keys
   must be distinct 32-byte values. Run from `packages/scheduler`:

   ```bash
   node scripts/rotate-credentials.mjs --maintenance-confirmed
   ```

   This preflights every stored value with no updates. Verify the reported
   agent/value counts. A corrupt or unknown ciphertext aborts the entire operation.
4. Apply the same preflighted rotation:

   ```bash
   node scripts/rotate-credentials.mjs --maintenance-confirmed --apply
   ```

   Both credential columns change inside one transaction under the maintenance
   lock and an exclusive table lock. No plaintext or key values are logged.
5. Re-run the preflight using the **same** old/new pair. `alreadyRotated` must
   equal `values`. Set `ENCRYPTION_KEY` to the new key in every reader, writer
   and seed environment, remove rotation variables, then restart one scheduler.
   Verify startup, credential reads and health before restoring other writers.
   Keep the encrypted backup and old key under the normal retention policy.

**Interruption:** if the process stops before commit, PostgreSQL rolls back.
If the commit response is lost, its outcome is uncertain. Keep services stopped
and re-run preflight with the same pair. Already converted values are recognized;
re-running `--apply` finishes without encrypting ciphertext as plaintext.
Do not infer the database key from a CLI exit code alone.

**Reverse recovery:** while all writers are still stopped, swap the old/new
rotation variables, preflight and apply, then verify every value is under the
original key before restoring the original `ENCRYPTION_KEY`. Restore a backup
only when its data/key pair is known and its data-loss implications are accepted.
If neither key decrypts a value, stop and investigate; never reset an agent or
replace an API key to hide a failed rotation.

The PostgreSQL integration suite rehearses preflight, interrupted rollback,
forward rotation, idempotent rerun and reverse recovery using synthetic keys.
No production credentials were rotated as part of this release.

## Verification

`npm run test:coverage` enforces 90% on statements, branches, functions and
lines across runtime source. CI also starts a disposable PostgreSQL database
and runs the capacity, concurrent-claim and state-isolation integration tests.
Missing database configuration fails CI; skipped local database tests are not
passing evidence. See [reliability and reproduction](../../docs/RELIABILITY.md).
