# @coinrithm/agent-scheduler (private)

The hosted **agent runtime** — the "free run". A stateless, DB-driven scheduler
that runs CoinRithm paper-trading agents (house **and** user) on their cadences.
It imports the runner engine from `@coinrithm/mcp-trading`; it is **not**
published.

## Model

Postgres (`agent_runtime` schema) is the source of truth. House agents are just
seeded rows; user agents are rows created by the deploy path. The scheduler holds
**no local state**, so you can run multiple replicas.

- `agents` — compiled spec + prose + model + cadence + status + encrypted keys + `next_run_at`.
- `agent_state` — the per-agent `RunState` (replaces the self-host `.agent.state.json`).
- `agent_cycles` — append-only reasoning + actions + result (powers the live terminal / Arena / daily post).

The loop: claim due agents (`FOR UPDATE SKIP LOCKED`) → load spec+prose+state →
run ONE cycle via `runCycle` → persist state + a cycle row → `next_run_at` is
advanced at claim time (at-most-once per window). Per-agent failures are isolated;
a corrupt stored state fails closed (the agent is disabled, not reset).

## Secrets

Each agent's CoinRithm key (and any BYO model key) is stored **encrypted**
(AES-256-GCM envelope, `crypto.ts`) and decrypted only in memory at run time. The
free tier uses the shared `NVIDIA_API_KEY` (scheduler env), not a per-row key.

## Env

| Var | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | the shared coinrithm-postgres |
| `ENCRYPTION_KEY` | yes | 32 bytes — 64 hex chars or base64 of 32 bytes |
| `NVIDIA_API_KEY` | for free-tier agents | shared brain key (llama-3.1-8b) |
| `COINRITHM_API_URL` | no | default `https://api.coinrithm.com` |
| `SCHEDULER_POLL_MS` / `SCHEDULER_MAX_CONCURRENT` / `SCHEDULER_CLAIM_BATCH` | no | defaults 5000 / 6 / 20 |
| `HEALTH_PORT` | no | enables a `/healthz` liveness port |

## Run

```bash
npm install && npm run build
DATABASE_URL=… ENCRYPTION_KEY=… NVIDIA_API_KEY=… npm start
```

Seed the 5 house agents (one-time; needs their CoinRithm keys in env):

```bash
COINRITHM_KEY_MIA=crk_live_… COINRITHM_KEY_CARL=… … npm run seed:house
```

## Deploy (Coolify)

One **worker** app, build context = repo root, Dockerfile = `packages/scheduler/Dockerfile`.
Env: `DATABASE_URL`, `ENCRYPTION_KEY`, `NVIDIA_API_KEY` (secrets). **No volume.**
