# Example agents

Real, validated agent folders for the [`coinrithm-agent` runner](../../docs/agent-runner.md).
Every one passes `validate --hosted`. Copy a folder, edit the strategy + caps,
add your keys, and run it. Paper trading only, futures in v1, not financial advice.

## House agents — 5 distinct trading characters

These are CoinRithm's own **house agents** (the ones on the public
[Agent Arena](https://coinrithm.com/arena)), each a different mindset. They are
**fully decomposed** so you can see every part of the format: `character/`
(thesis, persona, risk, sizing, limits, abstention, pluggable `skills/`),
`runtime.yaml` (model + cadence), `safety/killSwitch.yaml`, `functionality/`
(the CoinRithm pin), `journal/` (memory), `evaluation/` (scorecard + Arena
opt-in), and `meta/` (changelog + frozen `manifest.lock.json`).

| Agent | Character | Cadence | Max lev | Objective | Model |
| --- | --- | --- | --- | --- | --- |
| [`mia-trend-rider/`](./mia-trend-rider) | Trend rider — joins confirmed two-timescale momentum, trails winners | 1h | 5x | realized PnL | claude-sonnet-4-6 |
| [`contrarian-carl/`](./contrarian-carl) | Careful contrarian — fades overextensions, patient + small | 4h | 2x | drawdown control | claude-sonnet-4-6 |
| [`leo-breakout-hunter/`](./leo-breakout-hunter) | Breakout hunter — waits for range breaks with volume, wider stops | 1h | 5x | realized PnL | claude-sonnet-4-6 |
| [`olivia-calibrated-quant/`](./olivia-calibrated-quant) | Calibrated quant — states a probability, abstains a lot, tiny size | 4h | 2x | calibration | claude-sonnet-4-6 |
| [`sam-risk-managed-swinger/`](./sam-risk-managed-swinger) | Risk-managed swinger — multi-cycle holds, drawdown-averse | 1h | 3x | risk-adjusted | claude-sonnet-4-6 |

Each is the **same format** dialed to a different personality — the strategy
prose, the hard caps, the sizing rules, the abstention threshold, the kill-switch,
and the tactic skills all differ. (Swap the model in `runtime.yaml` to anything
you have a key for; the model is the user's choice.)

## Starter examples

| Folder | What it shows |
| --- | --- |
| [`momentum-futures/`](./momentum-futures) | **Folder-of-one** — the smallest valid agent: a single `agent.md`. What `coinrithm-agent new` produces. |
| [`momentum-futures-decomposed/`](./momentum-futures-decomposed) | The **ejected** form of the same agent — split into files, resolves to the identical spec. |

## Try one (no keys needed for these three)

```bash
coinrithm-agent validate examples/agents/olivia-calibrated-quant --hosted
coinrithm-agent inspect  examples/agents/olivia-calibrated-quant --json
coinrithm-agent eject    examples/agents/momentum-futures        # round-trips to the decomposed layout

# Run one (paper, DRY-RUN by default — needs your keys):
COINRITHM_API_KEY=crk_live_… ANTHROPIC_API_KEY=sk-ant-… \
  coinrithm-agent run examples/agents/mia-trend-rider --once --dry-run
```

> The model key comes from the environment; it is **never** stored in an agent
> file. The runner enforces every cap before any order — the model only proposes.
