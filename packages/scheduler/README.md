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

- **Routing deadline (policy `2026-10-06.1`).** The shared fallback chain has
  one 300-second maximum budget, below the 360-second run lock and heartbeat.
  An alternate receives only the remaining time. Older `2026-08-27.2` runs
  allowed 300 seconds per attempt; retain the source revision when replaying
  historical evidence. Prompts, model pins and configured strategies are unchanged.
  Direct NVIDIA retries (`coinrithm.configured-same-model-retry.v3`) also share
  their original deadline and at most two physical calls. Their evidence
  classifies explicit `ResourceExhausted` 503 responses as capacity pressure;
  ordinary 500/503 errors remain failures. A zero `Retry-After` now gets the
  minimum one-second model cooldown instead of failing cooldown validation.
- **Do not swap `ENCRYPTION_KEY` by itself.** Stored credentials must be
  re-encrypted before readers use a new key. Follow the offline rotation and
  recovery procedure below; the seed job and every credential reader/writer
  must use the same active key.
- **Configure the shared providers before starting the fleet.** House agents
  without BYO credentials need an eligible shared route. Router mode can use
  configured fallback providers; missing capacity is not proof of provider health.
- **Startup checks the schema; it never runs DDL.** The runtime connects as
  `coinrithm_scheduler`, with DML on its seven runtime tables, append-only
  access (SELECT, INSERT) to the paid-brain credit ledger, SELECT, INSERT and
  UPDATE on `paid_calls`, read access
  to migration receipts and the three API-key identity fields used by the
  existing startup repair. Startup refuses missing/changed migration receipts,
  superuser authority, role membership, schema creation or migration-receipt writes.
  Run migrations explicitly with a separate privileged connection before
  deploying a schema change (see below). Shared capacity remains necessary
  for multiple replicas.
- **Keep the Docker healthcheck enabled.** The image sets `HEALTH_PORT=8080`;
  `/healthz` checks the scheduler heartbeat as well as process liveness.

## Shared capacity policy

### Recovery of malformed Super tool output

When the strict parser rejects an official NVIDIA Super tool response because
`actions` is a string, the unused second attempt can request JSON content on
the same model and key. System/user prompts, generation settings, customer
strategy and cadence stay unchanged. Valid first responses, malformed content,
other models and custom endpoints do not trigger this recovery. The new reply
must pass the strict parser; rejected text is never repaired into an action.

Shared recovery rechecks availability and obtains fresh owner/provider capacity
leases. It consumes the existing two-attempt/common-deadline budget, including
for a pinned single-model agent; no third call or paid route is added. Direct
BYO recovery shares its two-call budget with the existing HTTP server-error
retry. Both paths retain attempt diagnostics and sum provider-reported tokens
across responses, including rejected output; missing usage remains unknown.
The runner's `estimatedCostUsd` uses the effective provider's rate and is not a
billing total for a mixed-provider chain. Paid backup remains separately gated.

If this recovery's owner admission lacks only refillable token/request credit,
it can wait once for the locked-snapshot refill hint (at most 60 seconds), with
no leases held and at least 30 seconds left for a response. It then rechecks
availability, deadline and fresh admission. Concurrency/cooldown holds, missing
or invalid hints, a second denial or insufficient time keep the original
failure; quotas are never raised and there is no polling loop.

This automatic recovery runs only after the specific failure. The time-boxed
house/customer gates below separately select JSON content for the first
request. Their exact eligibility and expiry remain in force; expiry does not
disable failure recovery. Transport changes remove the model-visible tool
schema, so identical prompt text does not establish decision equivalence.

### Optional first-attempt routes

`SCHEDULER_LIGHTNING_FALLBACK_ENABLED=true` adds the contract-probed
`nvidia/nemotron-3.5-lightning-30b-a3b` as the first fallback for unpinned house
Nemotron agents. The configured primary model is unchanged; the existing
alternate remains available if earlier routes are ineligible. The two-attempt
and 300-second total limits remain. The same key/owner budget, strict decision
parser, output privacy and effective-model attribution apply. No paid route is
enabled. Customer, BYO and pinned agents keep their current routing. The flag
defaults false and provides rollback. Successful synthetic contract probes
establish request compatibility, not trading quality or independent-provider
availability: all these routes still depend on NVIDIA.

`SCHEDULER_HOUSE_SUPER_JSON_CONTENT_ENABLED=true` makes the
`nvidia/nemotron-3-super-120b-a12b` route of house agents on the shared hosted
router request JSON content (`response_format: json_object`) instead of the
forced decision tool call. Hosted Super has returned `actions` as a string
despite the tool schema (519 of 533 malformed attempts in a 24-hour sample on
5 October 2026). Thinking stays off, and the strict decision
parser, capacity leases, fallback chain and output privacy are unchanged. This
includes Super reached as a fallback from a house Nano primary. Other model
routes retain their original transport; this flag never enrolls customers or
BYO keys. Successful and malformed parsed attempts retain the allowlisted
`responseSource` metadata (`content`, `tool_call` or `content_fallback`), without
raw model output. The trial also requires
`SCHEDULER_HOUSE_SUPER_JSON_CONTENT_UNTIL`, an absolute UTC instant such as
`2026-10-05T21:00:00Z`. A missing, malformed, non-UTC or past value keeps the
original transport. The expiry is checked on every route attempt, so a restart
cannot extend it. The flag defaults false and provides rollback. An 8-call
synthetic smoke pilot motivated it; it is not a measured failure-rate result.

### Dormant customer JSON-content gate

A separate gate prepares a narrowly enrolled customer trial. It defaults off
and does not change any stored customer model, key, strategy, cadence or live
setting. All of these runtime-only settings are required to select content:

- `SCHEDULER_CUSTOMER_SUPER_JSON_CONTENT_ENABLED=true`.
- `SCHEDULER_CUSTOMER_SUPER_JSON_CONTENT_UNTIL`: a valid absolute UTC instant
  ending in `Z`, using the same strict date parser as the house trial.
- `SCHEDULER_CUSTOMER_SUPER_JSON_CONTENT_ALLOWLIST`: a JSON array of exact
  `{ "ownerUserId": 19, "agentId": 42 }` pairs (illustrative identities only).
  Missing/empty defaults to `[]`. At most 16 pairs and 4096 characters are
  accepted. IDs must be plain positive decimal safe integers, not strings,
  fractional or exponent notation. Wildcards, ranges, duplicate keys/pairs,
  extra fields and any malformed entry invalidate the
  entire list. An owner match alone never enrolls their other agents.

Eligibility also requires an explicitly non-house agent without a BYO key,
the shared hosted router and a configured NVIDIA Super primary. The attempted
route must also be NVIDIA Super, with absent or exact canonical NVIDIA endpoint
configuration. Nano-to-Super customer fallbacks, other models/providers,
unexpected endpoints and unknown owner identities remain ineligible. Pinned
models keep their existing single-route behavior. Customer prompt compaction
remains disabled, independently of the house compaction flag.

Own-key (BYO) agents never use the hosted router, so the gate above cannot reach
them. `SCHEDULER_CUSTOMER_SUPER_JSON_CONTENT_BYO_ENABLED=true` (default false)
extends the same trial to the direct BYO path. It requires all three customer
settings above as well; listing a pair alone never changes a BYO agent. Only an
explicitly non-house agent with a BYO key, an NVIDIA provider, the NVIDIA Super
model and an absent or exact canonical NVIDIA endpoint qualifies. The agent's own
key, model, strategy and same-model retry are unchanged: only the request asks
for JSON content. The expiry is re-checked on every attempt, including the retry.

`SCHEDULER_SUPER_FALLBACK_JSON_CONTENT_ENABLED` (default true) covers a
different case: Nemotron Super reached as a fallback on the shared hosted router.
When an agent's configured model is not Super, typically Nano after a worker-limit
503 or a capacity defer, its Super route asks for JSON content. That attempt is
the second and last one, so it cannot use the same-model content retry above.
The model, shared key, strict parser, two-attempt limit, admission, usage
accounting and deadline are unchanged, and a failed cycle still writes nothing.
Super-primary agents keep their first-attempt transport, and BYO agents never
reach the hosted router. Rollback is `false`, through the normal scheduler
configuration/restart process.

Expiry is checked per attempt after asynchronous capacity admission and before
constructing the provider. At or after expiry, the original request transport
is used without requiring a restart. A request already sent is not cancelled.
Rollback is the disabled flag or an empty allowlist; changing environment values
uses the normal scheduler configuration/restart process. Neither setting
disables the separate house gate. No customer identities or new settings are
populated by this code change.

The existing provider option preserves the exact system/user messages, model,
credential, token limit, temperature and thinking-off setting. It replaces the
forced tool/schema fields with `response_format: json_object`. Removing that
model-visible tool schema changes generation constraints even when prompt text
is identical; decision equivalence must not be assumed. Strict parsing and
action/risk validation remain mandatory, including rejection of string actions
and capacity-disallowed entries. Key/owner quotas, cooldowns, leases, fallback
order, two-attempt limit and total deadline are unchanged.

The corrected 5 October exploratory same-observation run completed 12 triples
and 36 calls, all from one house agent: content parsed 12/12, primary tool 7/12
and repeat tool 10/12. Only seven triples were jointly valid/action-comparable,
below the predeclared eight-triple screen; five included an action. Content
versus primary had three decision and four target disagreements, the same counts
as repeat tool versus primary. The screen was **inconclusive**. It neither
authorizes customer activation nor establishes improved reliability or decision
quality. The earlier uncontrolled house window is also not causal evidence.

Any future activation needs separately approved exact identities, expiry and
observation/rollback criteria. Successful source tests or a deployment with this
gate disabled are rollout preparation, not customer trial results.

`SCHEDULER_SHARED_POOL_POLICY_ENABLED=true` enables a shared-pool model-call
minimum of 180 seconds and an aggregate owner budget of 25,000 tokens/minute
with one in-flight model request per owner. All house agents share one owner
budget. The budget spans provider keys and fallback models; adding agents or
changing keys cannot multiply it. Tenant-aware queue ordering still applies.
An unusually large prompt may accumulate one request's worth of credit without
raising the refill rate. Local provider admission failure refunds unused owner
credit. Leases expire after a crashed worker, and restarts do not reset budgets.

The stored strategy and cycle cadence are unchanged. Protective thesis exits
still run each cycle before the model-call gate, including during a budget wait.
The terminal reports `shared pool model interval` or `shared pool owner budget
deferred`; neither is a provider failure. BYO, mechanical and self-hosted agents
are unaffected. The minimum interval is a floor, not a promise of a model call
every three minutes when an owner's budget or a provider is unavailable.

Override the limits with `SCHEDULER_SHARED_OWNER_TPM` and
`SCHEDULER_SHARED_MIN_MODEL_INTERVAL_SECONDS`. The policy defaults off for an
explicit rollout; set `SCHEDULER_SHARED_POOL_POLICY_ENABLED=false` to roll it
back without changing customer records or disabling provider-wide admission.
No new migration is required: existing durable capacity tables are reused.

`SCHEDULER_COMPACT_PROMPT_TABLES_ENABLED=true` enables a separate house-agent
canary for shorter prompts. Large lists with identical fields become tables with
explicit columns and rows. Market references and settlement rules always keep
their existing object format. All serialized values, nested evidence,
ordering, precision and absent/null distinctions are preserved; execution inputs
and receipts are unchanged. Small lists stay as objects, and conversion is used
only when it saves characters after including format instructions. Customer
agents, BYO and self-hosted defaults stay unchanged. The flag defaults false and
is the rollback switch. Character savings do not establish token savings or
decision quality; verify both with bounded probes and natural observations.
Only the contract-probed Super and Lightning routes use that presentation.
Nano, BYO and custom endpoints always receive the original prompt, including
when a canary falls back to them; Nano failed the table probe. Capacity admission
uses the actual selected prompt. The original observation remains available to
the router so model fallback never requires reversing a table or losing context.

Capacity cooldowns are shared across replicas for each key/model pair. Explicit
`Retry-After` is honored with the existing one-second minimum and one-hour cap.
Without that header, backoff starts at 10–15 seconds, doubles on repeated
failures and caps at 120–125 seconds. A valid decision resets older backoff;
it cannot clear a failure newer than that request. Five quiet minutes also reset
the failure sequence. This is bounded retry policy, not a guarantee that NVIDIA
recovers within seconds. Set `SCHEDULER_ADAPTIVE_COOLDOWN_ENABLED=false` to
restore the previous 60-second default; explicit `Retry-After` still applies.

## Paid brains

An agent can opt into a paid model (contract v2, 2026-10-07, with the root and
Data corrections). It runs on prepaid credits under a monthly cap per agent,
and only provider-reported usage is charged. Free agents, BYO keys and the free
brain are unchanged and never touch the ledger.

| Var                      | Notes                                                                     |
| ------------------------ | ------------------------------------------------------------------------- |
| `PAID_ANTHROPIC_API_KEY` | platform key for the Claude paid brains; scheduler env only, never logged |
| `PAID_GEMINI_API_KEY`    | platform key for Gemini; the Gemini brains ship disabled for now          |
| `PAID_BRAIN_MARGIN_PCT`  | whole-percent markup on provider cost; default 20 (same env in backend)   |

**Schema.** `sql/008_paid_brain_credits.sql` creates:

- `credit_ledger`, append-only integer micro-USD. Positive kinds: grant,
  topup, refund, release. Negative kinds: reserve, debit, reversal. Each row has
  a unique idempotency key.
- `paid_calls`, the durable state of each paid call:
  `reserved -> dispatched -> answered | rejected | uncertain -> released | finalized`.
  The price row and margin are snapshotted on the call.
- `credit_checkouts`, written only by the backend.

The runtime role gets ledger `SELECT, INSERT`, `paid_calls`
`SELECT, INSERT, UPDATE`, and nothing on checkouts. `coinrithm_app` gets ledger
`SELECT, INSERT`, `paid_calls` `SELECT`, and checkouts `SELECT, INSERT, UPDATE`.
No role gets DELETE. Run the operator migration, then re-run `runtime-role.sql`.

**One paid cycle** (`src/runtime.ts`; SQL in `src/db.ts`; pricing in
`src/paidBrain.ts`). Every balance-changing transaction first takes
`pg_advisory_xact_lock(734202, owner_user_id)`.

1. **Reserve.** The reservation is refused when any of these holds:
   - the owner has an uncertain call;
   - the balance is below the worst case;
   - the agent's month spend plus the worst case exceeds the cap.

   The worst case is an estimated input allowance (160,000 bytes of prompt
   text at one token per byte, plus 512 framing tokens; an estimate, not a
   provider tokenizer guarantee) priced as uncached input, plus the
   4,096-token output cap, at the price row valid now, with margin. The hard
   guarantee is the credit hold: nothing is ever charged above it. A prompt over 160,000 bytes is never sent (and never truncated):
   the call is released. Should reported usage still exceed the reserve, the
   debit is capped at the reserve and the call is flagged uncertain for root
   review. Month spend counts each call in the
   UTC month it was reserved in: finalized calls count their debit, open calls
   their worst case.

   On refusal the agent follows the owner's explicit `onExhausted` choice:
   - `"free"` runs this cycle on `spec.paidBrain.fallback` like any
     shared-pool agent;
   - `"pause"` pauses the agent.

   A spec without an explicit choice is not paid. A missing platform key skips
   the cycle with no reservation.

2. **Dispatch.** `dispatched` is committed before the HTTP call; without it the
   provider is never called. The call goes straight to the paid model with
   `max_tokens` 4096 (thinking included): no shared router, no retry, no other
   model. The answer is recorded at once:
   - usage => `answered`;
   - a known pre-processing rejection without usage (400, 401, 403, 404,
     413, 429) => `rejected`;
   - anything else without usage (an answer, a 5xx, a 529 overload, a
     timeout) => `uncertain`, which blocks the owner's next paid call
     immediately.
3. **Finalise**, from the durable state:
   - never dispatched, or rejected => release;
   - answered => release plus a debit of the reported input, output, cache
     reads and 5m/1h cache writes at the snapshotted price;
   - dispatched without a recorded result => uncertain.
4. **Recovery.** At most once a minute, calls idle for 15 minutes are resolved
   by the same rules. Uncertain calls are alerted once per process
   (`paid_brain_metering_uncertain`) and are never auto-refunded; root
   reconciles them.

Ledger or finalisation errors never fail the trading cycle. They leave the
reservation open, which is the safe direction.

Alert events: `paid_brain_metering_uncertain`, `paid_brain_finalize_failed`,
`paid_brain_dispatch_unrecorded`, `paid_brain_result_unrecorded`,
`paid_brain_recovery_failed`, `paid_brain_platform_key_missing`,
`paid_brain_admission_failed`, `paid_brain_spec_invalid`,
`paid_brain_pause_failed`.

**Not part of the scheduler.** Top-ups, payment collection and refunds belong
to the backend: Paddle checkouts, the signed webhook, and `topup`/`reversal`
rows under the same lock.

## Schema deployment and runtime role

1. Build the scheduler image and retain the previous image and runtime secret
   configuration. Record the database target and take the established backup.
2. Run `node scripts/migrate-schema.mjs --maintenance-confirmed` in an isolated
   operator process with `MIGRATION_DATABASE_URL` supplied through the secret
   manager. Do not configure that variable on the scheduler application.
   Migration SQL and its SHA-256 receipt commit together under the existing
   maintenance lock. First adoption explicitly reapplies the existing idempotent
   files before recording them; it does not infer their historical execution.
   Later runs apply only new files and reject changes to recorded files.
3. Apply `sql/maintenance/runtime-role.sql` with `psql -X -v ON_ERROR_STOP=1` on
   the same database. The API's `public."ApiKey"` table must already exist.
   Provision the new role's login/password securely and configure the scheduler's
   runtime-only `DATABASE_URL` to use it. Other applications keep their own roles.
4. Deploy the scheduler and verify the exact revision, heartbeat, read-only
   schema check and a natural completed cycle. A readiness failure must be fixed
   with the operator process, never by granting runtime DDL.

Startup refuses two opposite mistakes. Too much authority (DDL, ownership,
role membership, writable migration receipts) fails as "must have DML-only
privileges". Too little fails as "missing required grants: <privilege> on
<table>", listing each one: every grant in `src/runtimeGrants.ts` is checked on
its own, and `runtime-role.sql` is pinned to that same list by a test.

**Re-provision after schema changes.** `GRANT ... ON ALL SEQUENCES` and the
explicit table list cover only what exists when the file runs. After any
migration that adds a table or sequence the scheduler uses, add it to
`src/runtimeGrants.ts` and `runtime-role.sql` in the same change, then re-run
`runtime-role.sql` (idempotent) with the operator connection before deploying
the image that needs it. Otherwise readiness names the missing grant and the
new image does not start; the running one is unaffected.

**Operator scripts and their connection.** Scripts that stay inside the
runtime grants (`seed-house-agents`, `seedBenchmarkAgents`,
`update-house-models`, `rollout-house-capital-sizing`, `rotate-credentials`)
keep using `DATABASE_URL`. Two scripts write beyond them and take
`OPERATOR_DATABASE_URL`, supplied for that run only through the secret manager
and never configured on the application; both refuse to run as
`coinrithm_scheduler` before their first statement:

- `house-rollout.mjs` reads and, with `--apply`, writes
  `agent_runtime.agent_revisions`;
- `seedBenchmarkIdentities.mjs` inserts into `public."User"` and
  `public."ApiKey"`.

New numbered files must remain transactional (no `CONCURRENTLY` or embedded
transaction control); use new files instead of editing recorded migrations.
SQL checksums normalize CRLF to LF. Extra receipts from later additive migrations
do not prevent an older compatible image from starting. Review schema rollback
compatibility separately.

**Rollback is an (image, connection) pair.** Rolling back to a pre-separation
image also requires restoring its previous runtime connection, since those
images replay DDL at startup and fail under the DML-only role; retain that
secret configuration securely until those rollback images are retired. The
`coinrithm_scheduler` role, its grants and the migration receipts can stay in
place during such a rollback: nothing else uses them, and re-deploying the
separated image later needs only its runtime connection switched back.

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
