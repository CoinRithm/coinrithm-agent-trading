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
character, skills, and risk without touching code. Refs: Google OKF +
arXiv 2603.16021 ("folder structure as agentic architecture").

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

---

## Open directions (not yet decided / not implemented)

- **Default brain = NVIDIA NIM free endpoints.** Use a free OpenAI-compatible NIM
  model (e.g. nemotron) as the default tier for house agents and the free user
  tier; BYO-key stays the upgrade path ("connect your own brain"). Safe because
  caps live in the runner (D3) — a weaker brain can only propose. Enables the
  hosted "free run" goal economically. *Pending owner go-ahead.*
- **Hosted scheduler ("free run").** CoinRithm runs the same engine for users who
  can't self-host 24/7. The runner is the importable core; the scheduler is the
  next build.
