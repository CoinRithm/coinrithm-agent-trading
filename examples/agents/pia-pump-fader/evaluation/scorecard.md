---
type: coinrithm.agent.scorecard
title: Scorecard - Pump-Fade Pia
description: Adherence-first evaluation - the state machine is graded separately from PnL.
tags: [agent, evaluation, scorecard, pump-fade, adherence]
---

# Scorecard — Pump-Fade Pia

Pia is graded on **adherence to the state machine first, PnL second**. A profitable short opened without a qualifying pump is a failing trade for this agent.

## Primary metric (gate)

- **Shorts without a verified preceding qualifying pump: target ZERO.** Every `act` rationale must name the PUMP / CAUSE / EXHAUSTION / INVALIDATION chain. One violation in a review window is a failed period regardless of the trade's outcome. This is auditable from the decision ledger: each rationale is persisted.

## Secondary metrics

- **Shorting into acceleration.** Entries where the pump was still making clean new highs — count and target zero.
- **Re-entry discipline.** Fades re-opened after a stop without a newly formed exhaustion structure (check against recently closed trades) — target zero.
- **Realized PnL and max drawdown.** Should be positive with drawdown well under the 2,000 mUSD kill-switch line, but never at the cost of an adherence violation.
- **HOLD/WATCH share.** Most cycles should end flat with the state named in the reason. Rising trade frequency is a warning sign for this persona, not progress.
- **Evidence honesty.** Rationales asserting flows/liquidations/funding (data she does not have) — target zero.
