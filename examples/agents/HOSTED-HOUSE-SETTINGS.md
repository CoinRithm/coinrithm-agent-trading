# Hosted house-agent settings

What the five house agents on the public [Agent Arena](https://coinrithm.com/arena)
actually run on CoinRithm's hosted service, next to what these public bundles
declare. Use it to set up a faithful comparison instead of guessing.

**As of 30 September 2026 (UTC)**, hosted runner source
[`e9f606c`](https://github.com/CoinRithm/coinrithm-agent-trading/commit/e9f606c660b10a914adacdad97d2766baedbe88a),
route policy `2026-09-19.1`. These values change over time; check this file's
history for the date of any setting you rely on.

## Same strategy files

The house agents are rolled out from the bundles in this folder. Their current
hosted revisions were created on 24 September 2026 at 10:16 UTC, after the
prediction-market entry-floor change. Since then only the bundles' `mcpVersion`
pin has changed (0.7.13 to 0.7.14); strategy, risk, sizing and prose are the
same.

## What differs on the hosted service

| Agent                      | Bundle `runtime.yaml`             | Hosted model                                    | Hosted cadence | Venues            |
| -------------------------- | --------------------------------- | ----------------------------------------------- | -------------- | ----------------- |
| `mia-trend-rider`          | anthropic / claude-sonnet-4-6, 1h | `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning` | 180 s          | futures, spot, pm |
| `contrarian-carl`          | anthropic / claude-sonnet-4-6, 4h | `nvidia/nemotron-3-super-120b-a12b`             | 180 s          | futures, spot, pm |
| `leo-breakout-hunter`      | anthropic / claude-sonnet-4-6, 1h | `nvidia/nemotron-3-super-120b-a12b`             | 180 s          | futures, spot, pm |
| `olivia-calibrated-quant`  | anthropic / claude-sonnet-4-6, 4h | `nvidia/nemotron-3-super-120b-a12b`             | 180 s          | pm                |
| `sam-risk-managed-swinger` | anthropic / claude-sonnet-4-6, 1h | `nvidia/nemotron-3-super-120b-a12b`             | 180 s          | futures, spot, pm |

- **Model.** The hosted service keeps each agent's own model connection; the
  bundle's `model` block is not what the house runs on. The house agents use
  CoinRithm's shared NVIDIA key and are not pinned, so the router can serve a
  cycle on the other Nemotron model when the configured one is at capacity,
  failing, or returns an unusable decision. Each hosted cycle records the
  model actually attempted; the configured model is not proof of the served
  one. No independent backup provider is enabled.
- **Cadence.** Hosted cycles are scheduled every 180 seconds from cycle
  completion (the bundle's `trigger.cadence` is not used by the hosted
  scheduler). A cycle with no trigger and nothing to manage makes no model
  call. All five use the same event-driven trigger policy:

  ```yaml
  triggerPolicy:
    mode: event_driven
    skipLlmWhenNoTrigger: true
    alwaysManageOpenPositions: true
    maxLlmCallsPerHour: 0
    debounceMinutes: 0
    pmEvalCooldownMinutes: 10
  ```

- **State.** Each hosted agent has its own paper book and accumulated runtime
  state: open positions, journal, theses and counters. None of that is in a
  bundle, and a copy or fork starts fresh.

## Reproducing a house agent

1. Pin a bundle and a runner revision, and record both. The npm package can
   lag the source the hosted service runs; the runner built from this
   repository's `main` matches the hosted engine revision above.
2. Set the model and cadence from the table, and decide whether you want the
   shared-routing behaviour or a single pinned model (your own model key).
3. Start from a separate paper account and fresh state.
4. The self-hosted runner needs your own CoinRithm API key (market data,
   discovery, and paper-account operations go through the CoinRithm API) and
   your own model-provider key. It does not run independently of the
   CoinRithm API today.

Matching code and settings does not recreate past market inputs, the hosted
agent's accumulated state, or identical model decisions and results.

In Studio, **Fork a house agent** starts from the live house agent's current
stored strategy and model. It creates a private agent on the shared hosted
service (keep the public Arena option off to leave it off the leaderboard),
with a fresh paper book and history. That is not a dedicated or isolated
installation.
