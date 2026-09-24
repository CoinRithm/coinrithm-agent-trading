# Forking a bundle — what carries strategy and what is plumbing

Forking an example agent is the fastest way to start — and the fastest way to
ship someone else's strategy by accident. A real user forked Contrarian Carl
for a pump-fade experiment, edited the obvious files, and the agent kept
proposing mean-reversion breakdown shorts: the donor's doctrine lives in more
files than the ones with "strategy" in the name, and it keeps steering trades
until it is REPLACED, not edited around.

## The file map

The four strategy-section files below require runner version **0.7.14** or the
runner source; published **0.7.13** does not load them. Check the
[bundle compatibility note](./README.md) before running a current house fork locally.

| File | Carries | On fork |
| --- | --- | --- |
| `character/thesis.md` | **STRATEGY DOCTRINE** — the edge, regime, cycle, skip rules. Merged into the system prompt. | Rewrite wholesale if your edge differs. |
| `character/entries.md`, `exits.md`, `sizing.md`, `research.md` | **STRATEGY DOCTRINE**, one aspect per file, merged after the persona in that order. They are the Studio's strategy tabs; the house agents keep all of their rules here. | Rewrite each aspect you change; delete one only if its rules move elsewhere. |
| `character/skills/*.md` | **STRATEGY DOCTRINE** — per-tactic prose, merged into the prompt when active. | Replace with your own tactics. Delete the donor's files. |
| `agent.md` `include:` + `character/skills/_index.yaml` | **Which skills are ACTIVE.** `include:` in `agent.md` wins; `_index.yaml` is the fallback when `include:` is absent. Deleting `include:` does NOT deactivate skills — `_index.yaml` takes over. | Update BOTH to list only your skills. |
| `journal/notes.md` | **STRATEGY DOCTRINE** — seed priors injected as memory; the donor's lessons keep nudging every cycle. | Clear it or seed your own priors. |
| `character/persona.md` | Temperament + voice. Shapes tone and discipline, lightly shapes decisions. | Rewrite to fit your agent's character. |
| `character/guards.md` | **YOUR HARD BORDERS** — injected last, adjacent to the runner's caps section, with a guards-win-conflicts rule. | Replace with your own non-negotiables (see `pia-pump-fader`). |
| `character/risk.yaml`, `limits.yaml`, `abstention.yaml`, `safety/killSwitch.yaml` | **Machine-enforced caps** — leverage, margin, positions, watchlist/blocklist, confidence floor, drawdown stop. | Tune to your risk. These are enforced; prose is not. |
| `character/sizing.yaml` | Notes for people. The runner never reads it and the model never sees it. | Describe your sizing intent here; put the enforced numbers in `capitalSizing` (`agent.md`) and risk/limits. |
| `agent.md` frontmatter (`capabilities`, `venues`, `objective`) | What the observation carries, where the agent may act, how it is graded. | Set deliberately: keep `indicators` (the event-driven trigger needs it); add `universe_scan`/`news` if your strategy uses discovery/catalysts. |
| `runtime.yaml` | Model + cadence. | Your choice; cadence should match how fast your setups develop. |
| `functionality/coinrithm.yaml` | API/tool pin (reproducibility metadata). Never sent to the model. | Leave as-is; the runner warns when stale. |
| `evaluation/*` | Scorecard + Arena opt-in. | Rewrite the scorecard around YOUR failure metric (adherence beats PnL for rule-driven strategies). |
| `meta/manifest.lock.json` | Frozen resolution of everything above. | Regenerate: `coinrithm-agent lock <folder>`. |

## The two fork paths

- **Different personality, same strategy family** (a faster Carl, a stricter
  Mia): fork the bundle, edit persona/caps, keep the doctrine files.
- **Different strategy** (the pump-fade case): do NOT fork a
  different-strategy donor. Either fork the nearest-strategy bundle
  (`pia-pump-fader` for anything discovery/fade-shaped) or start clean with
  `coinrithm-agent new --template momentum-futures` and write thesis, skills,
  journal, and guards yourself. If you do fork across strategies anyway:
  rewrite `thesis.md`, replace every skill AND both activation lists, clear
  `journal/notes.md`, and replace `guards.md` — then `validate` + `lock`.

## Verifying the fork took

Run a few dry cycles and read the rationales: an agent still citing the
donor's concepts (fades, breakouts, calibration bands you never wrote) is
still running donor doctrine — find the file you missed in the table above.
The decision ledger plus an adherence scorecard (see
`pia-pump-fader/evaluation/scorecard.md`) turns this into a measurable gate.
