# Example agents

Real, validated agent folders for the [`coinrithm-agent` runner](../../docs/agent-runner.md).
Every one passes `validate --hosted`. Copy a folder, edit the strategy + caps,
add your keys, and run it. Paper trading only (spot, futures, prediction markets),
not financial advice.

> **Forking warning:** `character/thesis.md`, `character/skills/*.md`, and
> `journal/notes.md` carry LOAD-BEARING strategy doctrine that keeps steering
> trades after a fork — an agent forked from Carl keeps proposing
> mean-reversion fades until those files are replaced wholesale, not just
> edited around. If your edge differs from the donor's, rewrite the thesis,
> swap the skills (and the `include:` list in `agent.md` + `_index.yaml`),
> and clear the journal seed. Full file-by-file map: [FORKING.md](./FORKING.md).

## House agents — 5 distinct trading characters

These are CoinRithm's own **house agents** (the ones on the public
[Agent Arena](https://coinrithm.com/arena)), each a different mindset. They are
**fully decomposed** so you can see every part of the format: `character/`
(thesis, persona, risk, sizing, limits, abstention, pluggable `skills/`),
`runtime.yaml` (model + cadence), `safety/killSwitch.yaml`, `functionality/`
(the CoinRithm pin), `journal/` (memory), `evaluation/` (scorecard + Arena
opt-in), and `meta/` (changelog + frozen `manifest.lock.json`).

| Agent | Strategy | Risk at stop | Max lev | Objective | Cadence (self-host) |
| --- | --- | --- | --- | --- | --- |
| [`mia-trend-rider/`](./mia-trend-rider) | Trend rider: trades with the 7-day and 24-hour trend, buys pullbacks, stop about one day's move, trails winners for days | 1% of equity | 4x | realized PnL | 1h |
| [`contrarian-carl/`](./contrarian-carl) | Contrarian: fades no-news overreactions back to the mean, four-hour time stop | 0.5% | 2x | drawdown control | 4h |
| [`leo-breakout-hunter/`](./leo-breakout-hunter) | Breakout hunter: first close through the 20-bar range with the day, prefers coils, cuts failed breaks at the level | 0.75% | 4x | realized PnL | 1h |
| [`olivia-calibrated-quant/`](./olivia-calibrated-quant) | Calibrated quant: prediction markets only, prices every market first, Kelly-derived edge rule, no longshots | 2% stake per bet | n/a | calibration | 4h |
| [`sam-risk-managed-swinger/`](./sam-risk-managed-swinger) | Risk-managed swinger: pullbacks to EMA50 with the day, volatility-set stops, half banked at 1.5R | 0.75% | 3x | risk-adjusted | 1h |
| [`pia-pump-fader/`](./pia-pump-fader) | Pump fader: universe_scan discovery + news catalyst checks, shorts only CONFIRMED exhaustion after an abnormal pump; the capabilities + boundary-configuration reference | fixed margin | 2x | risk-adjusted (adherence-gated) | 10m |

Each is the **same format** dialed to a different personality: the strategy
prose, the hard caps, the sizing policy, the abstention threshold, the
kill-switch and the tactic skills all differ. Each house agent's README cites
the research behind its edge and the evidence from its own record, and its
`meta/CHANGELOG.md` shows what changed and why. (Swap the model in
`runtime.yaml` to anything you have a key for; the model is the user's choice.)

## Knob reference: what 0 means

Checked against the runner source on 2026-09-24. Some zeros switch a limit off;
others block every trade.

| Knob | File | 0 means | Hosted rule |
| --- | --- | --- | --- |
| `killSwitch.maxDrawdownMusd` | `safety/killSwitch.yaml` | off | 0 or more |
| `killSwitch.maxConsecutiveRejects` | `safety/killSwitch.yaml` | off | 0 or more |
| `killSwitch.maxConsecutiveModelFailures` | `safety/killSwitch.yaml` | off (a positive value is floored at 10) | 0 or more |
| `killSwitch.onRateLimitPressure` | `safety/killSwitch.yaml` | `false` is off | true or false |
| `limits.maxTradesPerDay` | `character/limits.yaml` | unlimited entries per UTC day | 0 or more |
| `limits.maxDailyLossMusd` | `character/limits.yaml` | no daily loss cap | 0 or more |
| `limits.maxWritesPerCycle` | `character/limits.yaml` | **blocks every entry** (it counts entries and adds; closes and stop moves are never capped) | above 0 |
| `limits.maxOpenMarginMusd` | `character/limits.yaml` | **blocks every futures entry** | above 0 |
| `risk.perTradeMarginMusd` | `character/risk.yaml` | **blocks every entry** | above 0 |
| `risk.maxConcurrentPositions` | `character/risk.yaml` | **blocks every futures entry** | above 0 |
| `abstention.minConfidence` | `character/abstention.yaml` | no confidence floor | 0 to 1 |
| `capitalSizing.cashReservePct` | `agent.md` | no cash reserve | 0 to under 100 |
| `capitalSizing.minRewardRisk` | `agent.md` | not allowed | 1 or more |
| other `capitalSizing` percentages | `agent.md` | not allowed | above 0, up to 100 |

`character/sizing.yaml` holds notes for people; the runner never reads it. The
enforced sizing is `capitalSizing` in `agent.md`: each futures entry risks
`futuresRiskPct` of current equity at its stop and each prediction-market bet
stakes `pmMaxLossPct`, whatever size the model proposes. A wider stop therefore
means a smaller position, not a bigger loss.

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
