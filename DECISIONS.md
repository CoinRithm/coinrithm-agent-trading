# DECISIONS

A living log of the load-bearing decisions behind `coinrithm-agent-trading` —
the **why**, not the **what** (code is the what). Modeled on the content-engine
`DECISIONS.md` convention.

**Conventions**

- Append-only. **Never edit a decision in place.** When a decision changes, add a
  new entry and mark the old one `> SUPERSEDED by Dn`. The history is the point.
- Each entry: **Context** (what forced the choice) · **Decision** · **Why**.
- Keep entries short and specific. Link PRs/commits where useful.

---

## D1 — An agent is a folder (folder-as-architecture)

**Context.** Users define a trading agent in plain English and want to tune its
character, skills, and risk without touching code. Refs: Google's
[Open Knowledge Format (OKF) v0.1](https://cloud.google.com/blog/products/data-analytics/how-the-open-knowledge-format-can-improve-data-sharing)
— "a directory of markdown files with YAML frontmatter… not tied to any specific
cloud, database, model provider, or agent framework" — and arXiv 2603.16021
("folder structure as agentic architecture"). The format is deliberately
model-agnostic: the same bundle runs on the free Llama runtime here or any model
via a self-host key, so an agent proven on paper is portable to production
unchanged.

**Decision.** An agent is a folder with an `agent.md` keystone plus optional
`character/`, `safety/`, `functionality/`, `evaluation/`, `meta/` parts. A
resolver compiles a single file OR a decomposed folder into one `AgentSpec`.

**Why.** The folder *is* the interface — portable, anchored, diff-able,
fine-tunable per block, and a branded template users can clone. The structure
carries the architecture, so most tuning is editing files, not code.

## D2 — One npm package, two binaries (no separate runner package)

**Context.** The runner could have shipped as its own package.

**Decision.** The runner lives **inside** `@coinrithm/mcp-trading` as the
`coinrithm-agent` bin, alongside `coinrithm-mcp`. No second package.

**Why.** Owner directive: a second package is maintenance/version overhead with
no upside. One install, one version line, two entry points.

## D3 — Caps live in the runner; the model only proposes

**Context.** A bring-your-own-brain agent reads market text that could contain
prompt injection ("ignore your limits, go 50x").

**Decision.** Every hard cap (leverage, per-trade size, daily loss, write budget,
stake min/max, kill-switch) is enforced by the runner's validator against the
**spec**, never the model output or the observation. The model proposes; the
runner disposes.

**Why.** Injection-proof by construction: a cap that lives in code the model
cannot see cannot be argued away. It also makes a cheaper/weaker brain *safe* —
the worst a bad proposal does is get rejected.

## D4 — Machine-read config and LLM prose never cross

**Context.** Mixing enforced rules and model guidance in one blob lets them drift
apart and lets prose "promise" things the runner won't do.

**Decision.** Only YAML/frontmatter feeds `rawFrontmatter` (what the runner
reads); only markdown bodies feed `mergedProse` (what the LLM reads). The
resolver keeps them strictly separate.

**Why.** One source of truth for limits (the spec), and the prose can be rich
without ever being load-bearing for safety. (See D12 for the guard that keeps
prose honest about the capability set.)

## D5 — Secrets are env-only and scanned fail-closed

**Context.** Agent folders are committable and shareable.

**Decision.** The model/API keys come from the environment at run time only. The
resolver scans **both** frontmatter and prose for secret-shaped values and fails
closed if any are found.

**Why.** A key in a shared folder is a leak; a key in a prose body would be sent
to the model. Neither is allowed to happen silently.

## D6 — Dry-run is the default

**Context.** A runner that writes by default is a foot-gun.

**Decision.** `run` is dry-run unless `--live` (or `LIVE=1`) AND not `--dry-run`.

**Why.** You see exactly what the agent *would* do before any paper trade is
placed.

## D7 — Composition is $ref + extends + include, tighten-only

**Context.** Decomposed agents need to share base layers and stack tactics
without a tactic being able to *loosen* a limit.

**Decision.** `$ref` (per-block part-files), `extends` (a base layer of whole
blocks, e.g. `runtime.yaml`), `include` (tactic skills). A tactic may patch only
`risk`/`limits`, **tighten-only**, merged most-restrictive-wins; any widening is
rejected.

**Why.** A decomposed agent is then *strictly safer* than its inline form can be —
file/merge order can never relax a cap.

## D8 — Deterministic lock + strict key-lint (no silent coercion)

**Context.** A typo like `maxLevrage: 3` silently coercing to a default is a
dangerous footgun.

**Decision.** `manifest.lock.json` is a deterministic content hash of the agent.
`strictLint` flags unknown keys and bad enums (with "did you mean") over the
resolved frontmatter; fatal in hosted mode.

**Why.** A mistyped knob must be surfaced, not silently dropped to a default the
author didn't intend.

## D9 — Two validation modes: self-host vs hosted

**Context.** Self-host runs on the user's machine with their own model key;
hosted is where CoinRithm runs the agent and supplies the brain.

**Decision.** `self-host` requires a model and treats lint/drift as advisory.
`hosted` requires the safety policy blocks (limits/abstention/sync/killSwitch) to
be explicit and treats lint/drift as **fatal**.

**Why.** When CoinRithm runs your agent, the safety envelope must be explicit and
clean — no defaults, no drift. On your own machine, warnings are enough.

## D10 — v1 runner is futures-only

> SUPERSEDED by D11.

**Decision.** Ship the runner for futures first (the `momentum-futures` template).

**Why.** Smallest correct surface to prove the observe→decide→validate→act loop.

## D11 — Widen the runner to spot + prediction markets

**Context.** The all-market house agents (and users) need to trade beyond
futures. (PR #3.)

**Decision.** The runner trades spot, futures, and PM, gated by `venues:`. Spot
sizing reads the backend's real `executionPrice`/`estimatedCostMusd` (NOT
`entryPrice`, which is futures-only) and **fails closed** on an unpriced market
buy; PM discovery parses the real `data[].outcomes[].externalMarketId` shape.

**Why.** Supersedes D10. An adversarial review found two field/shape drifts vs
the live backend (masked by invented test fixtures) — fixed, with fixtures
realigned to the real payloads.

## D12 — Capability drift guard on authored prose

**Context.** Prose (thesis/persona/tactic skills) is authored separately from the
runner, so a skill can name a venue/action/cap the runner doesn't support and rot
silently. We watched a sibling system do exactly this: a knowledge file kept
naming post types the live enum had dropped, and a test pinned the stale names so
the suite stayed green while the model was fed a wrong taxonomy.

**Decision.** `checkCapabilityDrift` asserts that every capability **identifier**
referenced in authored prose (snake_case `<venue>_<verb>` actions; cap/venue
identifiers in code spans) is in the runner's live capability set AND — for
actions/venues — in this agent's enabled `venues`. It flows through the same
`lint` channel as `strictLint`: fatal in hosted, advisory in self-host. Runtime
memory (`journal/notes.md`) is excluded.

**Why.** Stops the content-engine failure mode at the door: a skill can't
reference a venue the runner dropped, or a cap that was renamed, without
`validate --hosted` failing. Deliberately deterministic and low-false-positive
(identifier-shaped tokens only, near-miss caps only).

## D13 — Skills ablation kill-switch

**Context.** Operators want to A/B the value of the skill layer and cap token
cost without editing agents.

**Decision.** `COINRITHM_AGENT_DISABLE_SKILLS=1` drops tactic-skill prose from the
**run-time prompt only**. The resolver, manifest hash, and enforced caps are
untouched — the spec is still enforced in full.

**Why.** Cost control + ablation testing, with zero risk to the safety envelope
(caps live in the runner, D3, not in the skills).

## D14 — Default free brain = `meta/llama-3.1-8b-instruct` via the `nvidia` preset

**Context.** The hosted "free run" needs a default brain at ~$0 to us. NVIDIA NIM
offers free, OpenAI-compatible endpoints. A live JSON probe (`scripts/nim-probe.mjs`)
ran the REAL system prompt + observations through candidates.

**Decision.** Default house-agent / free-tier brain = `meta/llama-3.1-8b-instruct`
on a new `nvidia` provider preset (hard-wired to `integrate.api.nvidia.com/v1`,
key from `NVIDIA_API_KEY`). `meta/llama-3.3-70b-instruct` is the optional "deep"
tier; BYO-key (Claude/GPT) stays the upgrade path.

**Why.** Probe (Mia + Leo, calm + strong tapes): **8b emitted valid `Decision`
JSON 12/12 at ~0.6s**; 70b was valid but the free tier was slow + flaky (60–68s,
intermittent HTTP 504); `nemotron-3-ultra` was rejected (~60s and its thinking
tokens corrupt the JSON — a reasoning model is the wrong tool for trade-decide).
NIM accepts `response_format: json_object`, so the existing openai-compatible
provider works unchanged. Free tier is 40 RPM (plenty when cycles are staggered);
its ToS is prototyping/eval, so production-at-scale moves to cheap serverless or
BYO-key — never enterprise GPUs.

**Caveat / follow-up.** Every model SKIPPED on the synthetic observation — even
Leo on a breakout. Partly correct (don't act on ambiguous price/%-only data), but
for the agents to actually TRADE (Arena + live-terminal showcase), `observe()`
likely needs richer signal (candles / recent highs-lows / volume via the existing
`get_candles` + market context) and/or a stronger brain. Tracked, not a blocker.

## D15 — Hosted runtime = a stateless, DB-driven scheduler (one schema in the shared Postgres)

**Context.** The "free run" must run house **and** user agents 24/7 without a
per-agent process, a custom house scheduler, or any local files.

**Decision.** A separate private package `packages/scheduler` (NOT published)
imports the runner engine and runs every active agent on its cadence. Postgres
(its own `agent_runtime` schema inside the shared coinrithm-postgres) is the
source of truth: `agents` (compiled spec + prose + model + cadence + encrypted
keys), `agent_state` (the RunState), `agent_cycles` (the reasoning/trade feed).
The scheduler is **stateless** — it claims due agents with `FOR UPDATE SKIP
LOCKED` and advances `next_run_at` in the same transaction (at-most-once per
window, multi-replica safe). Per-agent secrets (CoinRithm key + optional BYO
model key) are **AES-256-GCM encrypted at rest**, decrypted only in memory.
House agents are seeded rows; user agents are the same table via the deploy path.

**Why.** No redeploy to add/edit an agent; stateless + horizontally scalable;
house and user agents share one code path; the live terminal, Arena, and daily
post all read `agent_cycles`. The engine needed **zero** changes — `runCycle`
already takes `{spec, mergedProse, state}` as plain objects and `saveState(undefined)`
no-ops. Adversarially reviewed (netHolds, no merge-blockers): the
at-most-once-per-window + server-side idempotent-replay (UNIQUE INDEX on
`idempotencyKey`) invariant holds end-to-end, so a crash never double-trades.
Hardenings applied: config/credential errors disable the agent (vs error-looping),
state+cycle+disable persist atomically, global crash handlers, URL validation.

## D16 — An agent's DATA DIET is declared in its folder; default = compact indicators

**Context.** The free brain (llama-3.1-8b) emits valid `Decision` JSON but always
SKIPS — even a breakout agent on a breakout — because the observation is a fixed
thin bundle (price + 1h/24h/7d change + freshness) every agent shares. The folder
already reserves a `capabilities: [indicators]` knob, but it is **declared-but-dead**:
`observe.ts` never reads `spec.capabilities`. (Two siblings have the same rot —
`onWeakSignal` is defaulted-on but has no runtime consumer, and the loop records
decision OUTPUTS but not the structured INPUT the model saw, so you can't prove
"skipped because RSI was mid-band" vs "because data was thin".)

**Decision.** Make the agent's **data diet** a declared, version-pinned part of the
folder (folder-as-architecture + OKF): an agent opts into richer signal via
`capabilities: [indicators]` (and, later, a `data` block for timeframe/range). The
runner's **default is compact precomputed indicators** (RSI/EMA/ATR/Bollinger +
breakout levels) — the free brain reasons far better over a handful of clean
numbers than over raw OHLCV bars (token + reasoning cost). Raw candles stay an
opt-in for stronger/BYO brains.

**Shipped tonight (probe-free).** `indicators.ts` — deterministic, tested
indicator math (`computeIndicators` → RSI14/EMA20/EMA50/ATR14/Bollinger/recent
high-low + derived `aboveEma20`/`ema20AboveEma50`/`brokeRecentHigh/Low` flags).
Pure functions, 16 tests, no network. This is the runner-computed half of the
`indicators` capability, shipped ahead of the fetch.

**Gated on a live PROBE (Probe-First, owner's morning).** Wiring `observe()` to
FETCH candles. The endpoint exists (`GET /api/agent/market/:coinId/candles`,
`client.candles()`), but per Probe-First we must first probe the real payload:
available vs populated fields, the `range` params, timestamp semantics, the
429/Retry-After shape (so the existing `onRateLimitPressure` kill-switch is fed),
and confirm the 60s shared cache + per-key limiter absorb the +1 call/coin/cycle.
Then: in `observe()`, if `spec.capabilities.includes("indicators")`, fetch candles
per resolved coin, `computeIndicators`, and add an `indicators` field to the
`WatchEntry`; expose it in `prompt.ts`; and **also** stamp
`{ observationHash, indicators, candleRange, indicatorVersion }` into the
trace/manifest so each decision is reproducible against its exact inputs
(closing the reproducible-eval gap). Wiring `onWeakSignal` to gate on a weak
indicator read is the natural follow-on once the data is load-bearing.

**Why.** This makes CoinRithm the platform where an agent's data diet is a
declared, forkable, replayable part of the folder — not a hardcoded runner
constant. The always-SKIP bug becomes a feature: agents skip when their declared
signal is genuinely weak and act when it is genuinely present. Defensible wedge:
reproducible, declarative, evaluable agents (the field's stated gap), while
keeping the free brain viable on compact signal.

---

## Open directions (not yet decided / not implemented)

- **Default brain — DECIDED (see D14):** `meta/llama-3.1-8b-instruct` via the
  `nvidia` preset. Remaining: wire it as the scheduler's default + the observation
  enrichment from D14's caveat so house agents actually trade.
- **Hosted scheduler ("free run").** CoinRithm runs the same engine for users who
  can't self-host 24/7. The runner is the importable core; the scheduler is the
  next build.
