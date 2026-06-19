# Quant Reference

The **gold-standard reference** OKF agent — fork this to build a scientifically
rigorous trading agent. It demonstrates the full upgraded spec:

| File | What it shows |
| --- | --- |
| `agent.md` | Keystone: risk-adjusted mandate, gate-based decision loop, capabilities. |
| `character/sizing.yaml` | **Formula-bound** sizing — fixed-fractional risk + fractional Kelly + vol target, most-conservative-wins. No decorative knobs. |
| `character/abstention.yaml` | The edge gate (skip is a gradeable outcome). |
| `character/skills/*.md` | **Threshold-bound** skills over computed indicators (RSI/EMA/ATR/Bollinger) — reproducible, not eyeballed. |
| `evaluation/scorecard.yaml` | Machine-readable scorecard (Sharpe/Sortino/**deflated Sharpe**/expectancy/alpha-beta/**Brier+ECE**) with explicit pass/warn/fail + hard gates, referencing `_shared/scorecard.metrics.yaml`. |
| `evaluation/benchmark.yaml` | Equal-weight buy-and-hold benchmark for alpha/beta. |

## Why it's rigorous (the two references this standard is built on)
- **Reproducible evaluation** (arXiv 2605.19337): graded by a deterministic engine
  (`computeScorecard`) from the immutable run-evidence ledger — same inputs yield a
  byte-identical, content-hashed report card. Run-evidence IS the field's missing
  evaluation layer.
- **Leakage separation + gate-based execution** (arXiv 2512.02227): the LLM never
  sees evaluation-window outcomes; risk lives behind boolean gates the agent must
  PASS (stop coverage, evidence coverage, leakage-clean), not optimize against; the
  scorecard is computed AFTER the run, so tuning-to-the-metric is impossible.

Caps live in the runner (DECISIONS D3) — the model only proposes a stake within
them. Paper funds only; not financial advice.
