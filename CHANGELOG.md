# Changelog

Release summaries for the MCP server and runner, hosted scheduler, and SDKs.
Each package has its own version; the API contract is versioned separately.

[GitHub releases](https://github.com/CoinRithm/coinrithm-agent-trading/releases) ·
[MCP history](packages/mcp-trading/CHANGELOG.md) ·
[TypeScript history](packages/sdk/CHANGELOG.md) ·
[Python release notes](packages/sdk-python/README.md)

## 0.7.10 — Unreleased

Prepared follow-up to the published 0.7.9 release. The TypeScript SDK remains
0.3.1 and Python remains 1.8.1; their runtime source is unchanged.

- Persist file-backed run identity before execution so a first-cycle process
  crash cannot discard the idempotency identity. Transport uncertainty is still
  not automatically replayed or recorded as a completed trade.
- Add the supported `@coinrithm/mcp-trading/engine` entry point, preserving
  existing deep imports, and separate observation accounting and opportunity
  reporting from cycle ordering.
- Add opt-in, machine-checked crypto return predicates and visible warnings for
  inactive/reserved configuration. Existing agents are not automatically opted in.
- Serialize scheduler migrations in a bounded transaction; add an offline
  credential-rotation helper and interruption/recovery rehearsal.
- Pin workflow actions and verify release-tool checksums. Add installed-package
  compatibility and restart smoke checks across operating systems and runtimes.

Source/CI checks, registry publication and production deployment are separate.
This entry does not claim that 0.7.10 is published or deployed.

## 2026-09-15 — Runner reliability and SDK verification

| Package                     | Published version                                                     | Install                                                 |
| --------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------- |
| MCP server and agent runner | [0.7.9](https://www.npmjs.com/package/@coinrithm/mcp-trading/v/0.7.9) | `npm install --save-exact @coinrithm/mcp-trading@0.7.9` |
| TypeScript SDK              | [0.3.1](https://www.npmjs.com/package/@coinrithm/sdk/v/0.3.1)         | `npm install --save-exact @coinrithm/sdk@0.3.1`         |
| Python SDK                  | [1.8.1](https://pypi.org/project/coinrithm-sdk/1.8.1/)                | `python -m pip install coinrithm-sdk==1.8.1`            |

These versions are published and their registry downloads were verified on
15 September 2026. The API contract remains **1.7.0**. No MCP tool was renamed
or removed. The server still exposes **38 tools**. All trading uses virtual funds.

### Runner reliability

- **Hourly PM budget:** periodic prediction-market evaluations now pass through
  the common hourly model-call budget check. A budget skip makes no provider
  call. PM retains its own cooldown; existing position-management and explicit
  always-on exemptions remain.
- **Retry timing:** missing, blank or malformed `Retry-After` headers use the
  existing five-second API-client fallback. Explicit zero, numeric seconds and
  HTTP dates remain supported.
- **Request deadlines:** one 30-second deadline bounds each runner API operation,
  including response headers, body reads and 429 retry waits. Embedded callers
  can configure the deadline and supply an abort signal. A timeout or transport
  failure leaves execution uncertain; the client does not automatically replay
  that write. This deadline is per API operation, not per agent cycle or model call.
- **State files:** atomic replacement preserves the previous state when
  serialization or replacement fails. Power-loss durability is not guaranteed.
- **Agent export:** `coinrithm-agent eject` preserves `triggerPolicy` and
  `capitalSizing`, including configured budgets, cooldowns and equity sizing.
- **Action memory:** only accepted, executed actions enter completed-action
  memory. Rejected writes, uncertain results and dry-run proposals retain their
  evidence without becoming completed moves.
- **Direct NVIDIA recovery:** a fully received HTTP 500/502/503/504 response can
  receive one retry on the same direct route within the original provider
  deadline. This does not retry trading writes or change shared-pool routing.
- **Capital reconciliation:** tiny negative frozen-balance rounding residue is
  normalized only for sizing after independent reads agree. Negative spendable
  cash still fails closed; wallet balances are not rewritten.

### Market data and decision evidence

- Compact prediction-market responses preserve quote units, methodology,
  normalized probabilities, spread points and settlement-time provenance. Missing
  evidence stays missing; venue-native quotes are not rescaled from their magnitude.
- Candle documentation now states that `v` is a mean rolling 24-hour USD
  quote-volume observation, not volume traded within a candle. Do not sum bars
  or difference successive values as interval turnover.
- Bounded private decision-input records retain nested numeric indicators and
  additional universe-mover context. They remain partial evidence; full prompts
  and raw model outputs are not retained.
- Hosted MCP diagnostics distinguish initialization, discovery, tool outcomes
  and HTTP completion without logging credentials, arguments or response bodies.

### SDKs and hosted scheduler

- Both SDK patches carry the corrected candle documentation and offline client
  contract tests. Generated TypeScript declarations have no executable coverage
  denominator; the Python checks include generated models and sync/async wrappers.
- The scheduler records reason-specific provider admission deferrals, preserving
  existing capacity limits. These are private scheduler diagnostics, not new MCP
  or SDK response fields.
- Scheduler CI now requires a disposable PostgreSQL database and runs all
  **11 integration tests**. Missing CI database configuration fails the job.
- Compatible dependency updates clear the known npm advisories identified during
  review. Scheduler image builds use `npm ci` to honor the reviewed lockfile.

### Verification

The [release CI run](https://github.com/CoinRithm/coinrithm-agent-trading/actions/runs/34956757119)
passed all five jobs on package source
[`d052a7b`](https://github.com/CoinRithm/coinrithm-agent-trading/commit/d052a7bb7ce791623f4e80e72748b75d50ea6b83).

| Package               |                      Passing tests | Line coverage | Branch coverage |
| --------------------- | ---------------------------------: | ------------: | --------------: |
| MCP server and runner |                              1,164 |        96.63% |          91.79% |
| Hosted scheduler      | 211, including 11 PostgreSQL tests |        97.89% |          91.56% |
| TypeScript SDK        |                                  4 |          100% |            100% |
| Python SDK            |                              1,292 |        96.58% |          94.84% |

JavaScript packages enforce 90% on lines, statements, functions and branches.
Python enforces separate 90% line and branch floors plus a combined gate.
Selected client, runner, HTTP and trading-wrapper files have their own floors.
This is not a claim that every file exceeds 90%. The TypeScript SDK runtime is
a small wrapper with three executable statements and one function.

The release CI npm audits reported zero known vulnerabilities for MCP, scheduler
and the TypeScript SDK. A separate audit of the Python runtime dependencies also
reported zero; its development dependencies were outside that audit's scope.
These are dated audit results, not a guarantee against unknown vulnerabilities.

Separate checks downloaded all four published archives and matched their
checksums to the reviewed artifacts. Fresh npm and PyPI installs passed offline
client, MCP initialization and compiled runner checks without provider calls or
trades. Hosted MCP and scheduler deployments were verified separately at
`d052a7bb7ce791623f4e80e72748b75d50ea6b83`, including compiled regressions and
retained rollback images. Natural PM hourly-budget skips were **not observed**
in the bounded post-deployment window. Test coverage does not establish trading
returns or production reliability improvements.

[Verification details and reproduction commands](docs/RELIABILITY.md)

### Source and downloads

The attached npm tarballs, Python wheel and source distribution were built from
`d052a7bb7ce791623f4e80e72748b75d50ea6b83`. The GitHub tag
`mcp-trading-v0.7.9` also includes subsequent release documentation and the
README contribution in PR #8; runtime code and package versions are unchanged.
Use the exact package versions above when pinning an installation. Earlier
hosted records must be compared against their recorded source revision, not
assumed to match this release.

[Download the published artifacts and SHA256SUMS](https://github.com/CoinRithm/coinrithm-agent-trading/releases/tag/mcp-trading-v0.7.9)

### Community thanks

- **Tibor**, for detailed feedback shared by email on runtime behavior,
  observation semantics, decision evidence and reproducibility. Those questions
  helped clarify the runtime documentation and evidence limits.
- **[Nils Friedrichs (@nils-friedrichs)](https://github.com/nils-friedrichs)**,
  for [PR #8](https://github.com/CoinRithm/coinrithm-agent-trading/pull/8), replacing
  the broken discovery badge. The README now uses LightNow's badge and retains
  the working Smithery listing alongside it. This documentation update followed
  npm publication and does not modify the published archives.

Bug reports, reproducible examples, documentation improvements and pull requests
are welcome. See [contributing](README.md#contributing).
