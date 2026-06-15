# Agent runner (`coinrithm-agent`)

Author and **self-host** a CoinRithm paper-trading agent from a single folder.
You write the agent's strategy and caps in plain markdown + YAML; the runner
compiles it, then runs an `observe → decide → validate → act` loop that asks
*your* model (bring-your-own key) for structured decisions and executes only the
ones that pass your hard caps — against the CoinRithm **paper** API.

This ships **inside [`@coinrithm/mcp-trading`](https://www.npmjs.com/package/@coinrithm/mcp-trading)**
as the `coinrithm-agent` binary (alongside the `coinrithm-mcp` server) — it is
not a separate package. The CoinRithm **hosted scheduler** runs this same engine
for you (managed); you can also self-host it.

> ## 🧪 Paper trading only — not financial advice
> Every order this places moves **virtual funds** (50,000 mUSD). Nothing here
> touches real money, a real exchange, or a brokerage. v1 trades **futures
> only**. You are responsible for what your agent does.

## Use

```bash
# Installed with the package:
npm install -g @coinrithm/mcp-trading      # gives you `coinrithm-mcp` + `coinrithm-agent`
# or one-off:
npx -p @coinrithm/mcp-trading coinrithm-agent <command>
# or from this repo:
cd packages/mcp-trading && npm install && npm run build
node dist/agent/index.js <command>
```

## Quickstart

```bash
# 1. Scaffold a folder-of-one agent (one agent.md, safe conservative preset)
coinrithm-agent new my-agent --template momentum-futures --preset conservative

# 2. Check it compiles + validates (also: --hosted to require the policy blocks)
coinrithm-agent validate my-agent

# 3. See the resolved spec, provenance, and file hashes
coinrithm-agent inspect my-agent --json

# 4. Freeze the resolved spec to meta/manifest.lock.json (reproducibility)
coinrithm-agent lock my-agent

# 5. Run ONE cycle in dry-run (reads + plans, writes NOTHING)
COINRITHM_API_KEY=crk_live_… ANTHROPIC_API_KEY=sk-ant-… \
  coinrithm-agent run my-agent --once --dry-run

# 6. When you trust it, let it place paper trades (loops on the skill's cadence)
COINRITHM_API_KEY=crk_live_… ANTHROPIC_API_KEY=sk-ant-… \
  coinrithm-agent run my-agent --live
```

**Dry-run is the default.** A write happens only with `--live` (or `LIVE=1`).

## Environment

| Var | Required | What |
| --- | --- | --- |
| `COINRITHM_API_KEY` | yes (for `run`) | your `crk_live_…` paper key. Used for reads + paper writes. |
| `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `GROQ_API_KEY` | yes (for `run`) | the model key for the provider named in the agent. **Keys come from the env only — never from an agent file.** |
| `COINRITHM_API_URL` | no | override the API base URL (defaults to production). |

`new` / `validate` / `inspect` / `lock` / `eject` need **no keys** — they only
touch local files.

## Commands

| Command | Does |
| --- | --- |
| `new <dir> --template momentum-futures --preset conservative\|balanced\|bold` | scaffold a folder-of-one agent |
| `validate <path> [--hosted\|--self-host]` | compile + check (hosted requires the policy blocks) |
| `inspect <path> [--json]` | resolved config + provenance + content hashes + validation |
| `eject <agent.md\|dir>` | explode a folder-of-one into the decomposed folder (same spec) |
| `lock <path>` | write the frozen `meta/manifest.lock.json` |
| `run <path> [--once] [--live] [--dry-run] [--state <file>]` | run the loop (dry-run by default) |

## Examples

Two ready-made, validated agent folders live in
[`examples/agents/`](../examples/agents) — a folder-of-one (`momentum-futures/`)
and its decomposed, ejected + locked twin (`momentum-futures-decomposed/`). Copy
one to start.

## Folder-of-one vs the ejected folder

The smallest valid agent is a **single `agent.md`** (frontmatter config + a
plain-language strategy body). When you want fine-grained control, `eject` it
into a directory that resolves to the *same* spec:

```text
my-agent/
  agent.md                 # the keystone (extends runtime.yaml, $ref's the caps)
  runtime.yaml             # model + cadence (no secrets)
  character/
    thesis.md  persona.md  # prose the model reads
    risk.yaml              # HARD caps the runner enforces
    limits.yaml abstention.yaml
  safety/killSwitch.yaml   # circuit-breakers (override the model)
  functionality/coinrithm.yaml   # API version pin
  meta/manifest.lock.json  # frozen resolved spec (generated)
```

The machine-read config (YAML/frontmatter) and the prose the model reads
(markdown bodies) never cross: the runner reads only the config, the model reads
only the prose. Secrets are never permitted in any file (scanned, fail-closed).

## Fail-closed guarantees

The runner is designed so an error, a bad model, or a prompt-injection can never
cause an unintended or oversized trade:

- **Caps live in the runner, not the model.** Every proposed action is
  re-validated against the spec's caps (leverage, per-trade + aggregate open
  margin, max positions, writes/day, writes/cycle, daily-loss, min-confidence,
  required side-aware stop-loss, quote eligibility + freshness, poll-before-write,
  available cash). A model that proposes over a cap is rejected.
- **Quote-gated.** No open executes without a runner-fetched, eligible, **fresh**
  quote (missing freshness is treated as not-fresh).
- **Fail-closed everywhere.** Any failed read, network error, model error, bad
  JSON, stale data, or `401/403/409/422` results in **skip**, never a write.
- **Kill-switch.** Drawdown (realized + unrealized), consecutive model failures,
  consecutive reject cycles, or rate-limit pressure disable the agent.
- **No double-trade.** Idempotency keys are deterministic per intent and advance
  only on confirmed success; a corrupt state file refuses to run; a per-agent
  lock prevents two runners racing one state file.

## v1 scope

Futures only (the shipped `momentum-futures` template). Spot and prediction-market
actions are rejected as out-of-scope. The **hosted** scheduler (running this same
agent spec for you, managed) is a later step — this is the self-host path.

## Develop

```bash
cd packages/mcp-trading
npm install
npm run typecheck
npm test            # vitest, no network / no model / no live calls
npm run build
npm run smoke:agent # builds, then exercises the CLI with no keys (fails closed)
```
