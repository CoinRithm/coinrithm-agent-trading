---
type: coinrithm.agent.readme
title: Momentum Futures (starter)
description: The folder-of-one starter agent — a single-file OKF bundle, exactly what `coinrithm-agent new` scaffolds.
tags: [agent, readme, starter, momentum, trend-following, paper-trading]
---

# Momentum Futures — starter agent

This is the **folder-of-one**: the smallest valid OKF bundle, a single
[`agent.md`](./agent.md) that holds both the config (front-matter — model,
venues, risk caps, limits, kill-switch) and the strategy prose (the body). It is
exactly what `coinrithm-agent new my-agent --template momentum-futures`
scaffolds, and the recommended starting point if you're writing your first
agent.

It runs a conservative **trend-following futures** strategy on liquid large caps
(BTC, ETH, SOL): one position at a time, 2x leverage, 50 mUSD per trade, a stop
required on every entry, a slow 4-hour cadence, and skip-when-unclear. All on a
50,000 virtual-mUSD **paper** account — no real money, never financial advice.

**Run it:**

```bash
coinrithm-agent new my-agent --template momentum-futures --preset conservative
coinrithm-agent validate my-agent
COINRITHM_API_KEY=crk_live_… ANTHROPIC_API_KEY=sk-ant-… \
  coinrithm-agent run my-agent --once --dry-run
```

Edit the prose in `agent.md` freely (any language) — it is your agent's borders.
The hard caps live in the front-matter blocks and are enforced by the runner, so
change limits there, not in the prose. Want the full multi-file layout to edit
caps, persona, and safety as separate files? See the ejected twin,
[`momentum-futures-decomposed`](../momentum-futures-decomposed).
