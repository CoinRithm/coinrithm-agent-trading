---
type: coinrithm.agent.readme
title: Momentum Futures — decomposed (ejected twin)
description: The same starter agent ejected into the full multi-file OKF layout — character/, safety/, functionality/, locked manifest.
tags: [agent, readme, starter, momentum, decomposed, paper-trading]
---

# Momentum Futures — decomposed

This is the **ejected twin** of [`momentum-futures`](../momentum-futures): the
*same* conservative trend-following futures agent, expanded from a single
`agent.md` into the full OKF multi-file layout. `coinrithm-agent eject
momentum-futures` produces exactly this shape, and it resolves to the identical
spec — useful when a folder-of-one outgrows one file.

The config and prose are split across:

| Path | Holds |
| --- | --- |
| [`agent.md`](./agent.md) | Top-level spec + references to the blocks below |
| [`character/persona.md`](./character/persona.md) · [`thesis.md`](./character/thesis.md) | Voice and trading thesis (prose) |
| [`character/risk.yaml`](./character/risk.yaml) · [`limits.yaml`](./character/limits.yaml) · [`abstention.yaml`](./character/abstention.yaml) | Hard caps, daily limits, skip rules |
| [`safety/killSwitch.yaml`](./safety/killSwitch.yaml) | Drawdown / consecutive-failure kill-switch |
| [`functionality/coinrithm.yaml`](./functionality/coinrithm.yaml) | Venue + tool wiring |
| [`runtime.yaml`](./runtime.yaml) | Cadence + execution settings |
| [`meta/manifest.lock.json`](./meta/manifest.lock.json) | Content-hash lock over every file — drift is detected |

Use the decomposed layout when you want to edit caps, persona, and safety
independently (or diff them cleanly in review). Use the
[folder-of-one](../momentum-futures) when you just want one file. Both compile to
the same runtime agent, on a 50,000 virtual-mUSD **paper** account.

**Run it:** same commands as the folder-of-one — `coinrithm-agent validate .`
then `coinrithm-agent run . --once --dry-run`, with your `COINRITHM_API_KEY` and
model key in env.
