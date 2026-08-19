# Pump-Fade Pia

A selective pump-fade agent and the corpus's reference for **capabilities** and
**boundary configuration**. Pia discovers abnormal upward moves with
`universe_scan`, investigates the cause with `news`, deliberately sacrifices
the exact top while she waits for exhaustion (`indicators`), and only then
paper-shorts the confirmed reversal. HOLD is her default action; her scorecard
grades adherence to that state machine separately from PnL.

Paper trading only — simulated mUSD, never real money, not financial advice.

## How each capability changes the observation

- **`universe_scan`** — each cycle the top 24h gainers across the whole
  tracked universe are scanned; the strongest few are promoted into FULL watch
  entries marked `discovered: true` (live price, 24h/7d change, sentiment,
  freshness, indicators) and are tradable this cycle under the same risk caps.
  The remaining movers arrive as `observation.universeMovers` (symbol + 24h
  change) — breadth context, not tradable. Without this capability Pia has no
  candidates at all.
- **`news`** — up to 8 recent items for her coins, **discovered movers
  included**, each with importance (0-10), sentiment, and age. This is State
  2's catalyst evidence. Thin movers often have no coverage: no news = UNKNOWN
  cause, never "no catalyst".
- **`indicators`** — RSI14, EMA20/50, ATR14, Bollinger, recent 20-bar
  high/low + boolean reads, computed from 5-minute candles per watch entry.
  Exhaustion evidence in State 4 — and the fuel for the event-driven trigger
  that wakes the agent at all.

Not available in any observation (so the thesis never references them):
volume baselines, intraday return series, funding, open interest,
liquidations. The speed test is expressed as 24h-vs-7d divergence plus stretch
structure instead.

## The boundary pattern (risk.yaml)

BTC and ETH appear on the **watchlist** (so every cycle carries their read as
regime anchors for the beta check) AND on the **blocklist** (deny wins, so
they can never be traded). Pia's tradable candidates therefore come ONLY from
discovery — watchlist = what she always sees, blocklist = what she may never
touch, discovery = where trades come from. Behavioral borders that caps cannot
express (never short without a preceding pump) live as guard sentences in
`character/persona.md` (Hard borders) and the thesis's Non-negotiable guard,
and the scorecard makes violating them a failed period.

## Files

Same decomposed OKF layout as the other character bundles: `agent.md`
(keystone + capability declaration), `character/` (persona, thesis, config
refs, skills), `safety/killSwitch.yaml`, `evaluation/` (arena + adherence
scorecard), `functionality/coinrithm.yaml`, `journal/notes.md` (pump-fade
priors only — journal prose steers future cycles, so a forked bundle must
replace it wholesale), `meta/`.

## Run it

```bash
coinrithm-agent validate examples/agents/pia-pump-fader
COINRITHM_API_KEY=crk_live_... ANTHROPIC_API_KEY=... \
  coinrithm-agent run examples/agents/pia-pump-fader --live
```

Or deploy hosted: Studio -> import this folder (capabilities carry over) or
recreate it with the build editor's capability checkboxes.
