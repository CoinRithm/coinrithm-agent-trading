# CoinRithm Agentic Trading — End-to-End Runtime Roadmap

The north-star plan for turning CoinRithm's agentic trading from "an AI bot loop"
into a **sellable agent-trading runtime**. This is the durable reference; update it
as slices land. Status legend: ✅ shipped · 🔜 next · ⏳ planned · 🔒 blocked.

---

## 1. The product in one sentence

> Build a portable **OKF trading agent** (a character: class + skills + risk +
> memory), run a **free hosted demo**, **self-host** with your own model, or
> **upgrade** for always-on CoinRithm-hosted execution with evidence + verification.

## 2. The three layers (the load-bearing rule)

| Layer | What it is | Authority |
|---|---|---|
| **OKF bundle** | The agent's *intent* — strategy, skills, risk, requested runtime | The user authors it |
| **Runner** | Observe → gate → decide → validate → act; caps re-checked every action | The engine enforces; the model cannot bypass a cap |
| **Deployment overlay** | Tier capacity: effective cadence / model class / runs-per-month | **CoinRithm decides, server-side** — a forked OKF can't self-grant Pro |

**Three rules that keep it honest (do not violate):**
1. **No OKF field without engine support** — a config key the runner ignores is theater.
2. **No engine support without metering** — if a cycle does something, record it.
3. **No paid tier without the deployment overlay** — capacity is platform authority, not OKF intent.

## 3. The canonical agentic pipeline

```
Market cycle
  → OBSERVE (watchlist + indicators + setups + PM markets + positions)
  → GATE (deterministic trigger? else cheap heartbeat, no LLM)   ✅ slice 2
  → CONTEXT (compact bundle)                                      ✅ (setups) / ⏳ (regime/funding/liq)
  → SELECTIVE RAG (only after trigger; journal/news/PM rules)     ⏳ slice 5
  → LLM DECISION                                                  ✅
  → CRITIC / NOVELTY (anti-revenge, anti-churn, grounded)         ⏳ slice 4
  → RUNNER VALIDATION (caps, quote-gate, SL/TP, idempotency)      ✅
  → PAPER TRADE / SKIP                                            ✅
  → JOURNAL + EVIDENCE LEDGER + METERING                          ✅ (metering) / ⏳ (journal)
```

---

## 4. Status — what's shipped

- ✅ **Prompt bloat fix** — observation was 69k tokens (PM block uncapped) → 413'd free models. Capped to ~4.8k.
- ✅ **Deterministic setup scan** (`setups.ts`) — flags breakout/breakdown/trend/stretched per coin; the model acts on structure instead of "no clear setup". Contrarian **fade** signal for mean-reversion agents. **Position-aware** (`held` tag → manage, don't re-open).
- ✅ **Gemini provider** — first-class, the easy BYO key (free, no card). BYO-key = each user's own quota = real scale.
- ✅ **Reliability**: sequential scheduling, self-heal revive, **5-min model timeout** (was 90s → killed slow 70Bs), **auto-migrate house agents off Groq** (free 6k TPM can't fit our prompt). Groq stays BYO-only.
- ✅ **Slice 2 — preflight GATE + METERING** (`gate.ts`): a cycle spends an LLM call only on a trigger (entry setup or open position); flat tape → heartbeat, zero tokens. Per-cycle metering (triggerCodes, llmCallMade, tokensIn/out, estimatedCostUsd, decisionType, writeAttempted/Accepted) persisted to `agent_cycles`. `TriggerPolicy` = OKF intent + `DEFAULT_TRIGGER_POLICY`. **Verified live**: triggers populated, agents trading, no regression.
- ✅ **CI green** (OpenAPI 3.1 nullable fix). **Frontend new-agent defaults** decisive (floor 0.5, tolerance 15, margin 750, 5-coin watchlist).

## 5. Roadmap — pending slices (in order)

### 🔜 PM TRADING (recurring gap — promote to top)
Agents have the `pm` venue + see `pmMarkets`, but **never bet PM**. Causes: (a) the gate has no PM trigger, so PM never "fires" like a price setup; (b) the model has no clear *edge* signal (model-implied vs market probability); (c) PM markets carry no probability-delta in the observation.
**Build:** add `PM_PROB_MOVE` / `PM_EDGE_DIVERGENCE` triggers to the gate (needs probability + delta in `discoverPmMarkets`); a `pm-edge` skill that bets when |model − market| is large; surface the divergence in the prompt. Olivia (PM specialist) is the proving ground.

### 🔜 Mini Arena polish (visible win)
- Backend: **unrealized PnL** sum from open-position MTM (arena controller already has realized + quoteCount + writeCount + lastActiveAt).
- Frontend: show **quoteCount / writeCount**; split **Live-active** (recent `lastActiveAt`) vs **Recently-traded** (recent `lastTradeAt`); **equal left/right sidebar widths**; recently-active panel shows each agent's **last action** (public agents → details; private → action only); **compress the disclaimer banner**.

### ⏳ OKF v2 sample (first load-bearing v2 section)
Wire the OKF parser to read `runtime/trigger-policy.yaml` → `spec.triggerPolicy` (so it's load-bearing, not decorative). Add it to the house bundles + one rich sample. Supported keys only: `mode, skipLlmWhenNoTrigger, alwaysManageOpenPositions, maxLlmCallsPerHour, debounceMinutes, triggerCodes`. `memory/ rag/ critic/` stay **roadmap docs**, not active config, until their engine slice lands.

### ⏳ Slice 3 — Memory / journal
Agent journal: open thesis, last decision, stopped-out ideas, closed-trade reflection. Compact injection into the prompt (continuity, not re-deciding cold). `memory/` OKF section only when the runner reads it. Tests + metering.

### ⏳ Slice 4 — Critic / novelty
Anti-revenge, anti-churn, **duplicate-intent suppression** (the runner already blocks `open_margin_exceeds_cap` — the critic stops the model proposing it), grounded-thesis check. `critic/` OKF section when read.

### ⏳ Slice 5 — Selective RAG + Pro web search
Only **after** a trigger. Sources: journal, market regime, funding/liq context, PM rules, news summaries. Web search = **Pro-only**, trigger-gated, capped (cost + hallucination risk).

## 6. Monetization + PAYMENT FLOW (after the engine deliberates)

Sell the **infrastructure**, not the prompt: *"CoinRithm runs, monitors, evaluates, and proves my agent."* Don't remove free — redefine it as **proof, not unlimited production**.

| Tier | Price | Hosted agents | Runs/mo | Cadence | Brain | PM scan | Verified badge |
|---|---|---|---|---|---|---|---|
| **Free Demo** | $0 | 1 | 25–50 | 1h / event | default-fast | view | after N decided |
| **Builder** | €9.99/mo | 3 | 1,000 | 15m | default | basic | ✓ |
| **Pro** | €29.99/mo | 10 | 5–10k | event-fast | premium | full + web | ✓ |
| **BYOK** | infra-only | per key quota | — | — | user's key | — | ✓ |

**Payment flow (build last, only when engine is sellable):**
1. `runtime/deployment-intent.yaml` (OKF) declares `requestedTier/cadence/modelClass` — **intent only**.
2. Platform stores the **effective** policy server-side (`effectiveTier`, `effectiveCadence`, `maxRunsPerMonth`, `maxLlmCallsPerHour`) — the authority. The gate's `TriggerPolicy` is where it's enforced.
3. **`effectivePolicy` display** in the agent UI: show OKF-requested vs platform-enforced side by side (transparency: "the agent asks, CoinRithm decides").
4. **Agent Credits** meter from `agent_cycles` metering (tokens × provider rate). Stripe subscription gates `effectiveTier`. **A lapsed subscription pauses the agent** (don't delete).
5. UI flow: **Choose Class → Loadout → Risk → Deploy**, with "Edit OKF" for advanced. Loadout modules: technical-indicators (default), position-manager (required), risk/kill-switch (required), journal (default), PM-scanner (opt-in), news/RAG (opt-in), web-search (Pro).

**Guardrails:** no fake paid claims; no Stripe until explicitly scoped; no "$0 / 1 min / 100% free" messaging; never break paper-only/no-real-money positioning.

## 7. Operational notes / owner actions

- **`npm run seed:house`** — applies the latest house-bundle defaults (floors/caps/kill-switch) + Olivia→NVIDIA. (Engine behaviour — gate/setups/timeout/prompt — applies automatically on redeploy; seed is only for per-agent spec.)
- **Redeploy `d34825f`+** — gets the 5-min timeout + the auto-de-Groq migration (fixes Olivia with no manual step).
- **Existing user agents:** engine improvements apply automatically; their per-agent floors are **not** overwritten (respect user config). Only the *new-agent defaults* changed.
- **No prod DB from local** — `DATABASE_URL` is `127.0.0.1` on the aggregator server, unreachable from a dev machine. DB-side tasks (enrichment, metering verification, agent-spec migration) run server-side or via a `migrate*` boot hook (like de-Groq).
- **Data enrichment** (news/PM labeling) — owner routine; runs where the DB is reachable.

---

## Overnight session log (2026-06-24) — shipped / blocked / next

**Shipped + auto-deployed (~20 commits, all tested):** CI green (OpenAPI 3.1
nullable), 5-min model timeout (run-lock + heartbeat raised to match), auto-de-Groq
on boot (Olivia fixed, verified live on Nemotron), decisive new-agent defaults,
PM odds passthrough + PM_PERIODIC trigger + price-thesis→crypto-PM link, Arena
frontend polish (equal sidebars, disclaimer inline next to LIVE, recently-active
above deploy CTA, rail trade-count + unrealized), **memory/journal** slice (rides
in state JSON, no DB change), **held setups carry win/loss state** (add-to-winner
with room, stop the open_margin_exceeds_cap re-open churn), **OKF v2 triggerPolicy
parser** (first load-bearing v2 section). All 5 house agents verified healthy +
trading on NVIDIA.

**BLOCKED on access I don't have from a dev machine (precise owner unblock):**
- **PM betting (#1 gap, groundwork done, agents still don't bet):** the model sees
  PM markets + odds but won't bet — likely the discovered markets aren't
  crypto-relevant (no edge) or carry no probability. PROBE-FIRST rule forbids
  changing discovery blind. **Owner, run with a house key:**
  `curl -H "Authorization: Bearer <crk_live_key>" "https://api.coinrithm.com/api/agent/pm/discover?limit=8"`
  → if markets are non-crypto, bias `discoverPmMarkets` toward crypto/watchlist (q
  param is a real WHERE filter); if crypto-but-no-probability, the observe
  extraction needs fixing. Paste the result and I'll finish it.
- **Slice 4 critic / anti-revenge:** needs the `newClosedTrades` shape (what
  close-reason fields exist) to detect a stop-out. Probe `/api/agent/trades` with a
  key first.
- **Data enrichment (news/PM):** runs server-side where the DB is reachable
  (`DATABASE_URL` is `127.0.0.1` on the aggregator host, not a dev machine).

**Big remaining slices (better fresh, scoped here):** Slice 5 selective RAG (gives
non-crypto PM the event context the model needs to bet) + Pro-gated web search;
Monetization + payment flow (deployment overlay = effectivePolicy authority,
Class→Loadout→Risk→Deploy UI, tiers, Agent Credits from the metering table, Stripe
gates effectiveTier, lapse=pause).

## FINAL deliverable (after the list) — Remotion social-video system

Internal content tooling only (no auto-post). Generate MP4 + thumbnail + caption +
alt-text + sources.json into `output/social/YYYY-MM-DD/`. Read-only DB; **every
claim from a timestamped DB/API row** (no invented facts); keep paper-trading
disclaimers on agent videos; no financial-advice language; skip on low-confidence
or stale data. Three templates (vertical short, 15–30s, strong first 2s, big
numbers, CoinRithm brand + footer): **MarketMoveVideo** (gainer/loser, BTC/ETH/SOL,
liquidation shock), **AgentArenaVideo** (agent card, trigger/setup, quote/action/
reject, PnL, paper footer), **NewsPulseVideo** (3 news cards w/ source+timestamp+
asset). Content formats A–D (Daily Market Pulse, Agent Arena Update, Prediction
Market Watch, News Pulse). Scripts: `social:preview`, `social:render:sample`,
`social:render:daily` + a daily story-builder (query → select 3–5 → write JSON
props → render → caption.md/alt-text.md/sources.json). Decide package location
(`tools/social-video` vs a Remotion app) on inspection; mock the data shape if env
is missing + document the queries. Ship in a clean slice with a README + JSON
schema.

---
_Last updated by the agentic build session (2026-06-24 overnight)._
