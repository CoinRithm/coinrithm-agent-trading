# Reliability and test coverage

[Quick start](../QUICKSTART.md) · [API reference](https://coinrithm.github.io/coinrithm-agent-trading/) · [Runner](agent-runner.md) · [CI](https://github.com/CoinRithm/coinrithm-agent-trading/actions/workflows/ci.yml)

## What is measured

Release 0.7.11 source measurements on 15 September 2026, using Vitest 4.1.11
with V8 coverage and pytest-cov with branch measurement enabled.
[All 25 CI jobs passed for `7e8ebe8`](https://github.com/CoinRithm/coinrithm-agent-trading/actions/runs/34982139090).

| Package               | Statements | Branches | Functions |  Lines |
| --------------------- | ---------: | -------: | --------: | -----: |
| MCP server and runner |     96.08% |   92.21% |    94.33% | 96.68% |
| Hosted scheduler      |     97.27% |   91.71% |    95.10% | 98.02% |
| TypeScript SDK        |       100% |     100% |      100% |   100% |
| Python SDK            |     96.58% |   94.84% |         — | 96.58% |

The three JavaScript packages enforce **90% on each of the four metrics**.
Python enforces **90% combined statement and branch coverage** (measured
96.19%), plus separate 90% line and branch floors. Python does not report
a separate function metric. Local scheduler tests used disposable PostgreSQL
16.1; CI uses PostgreSQL 17.

### Targeted file gates

The reviewed files also enforce their own 90% floors, so package averages
cannot hide a regression in these paths. Other files still use package gates;
this is not a claim that every file exceeds 90%.

| Runtime file                                        | Statements | Branches | Functions |  Lines |
| --------------------------------------------------- | ---------: | -------: | --------: | -----: |
| MCP `src/agent/client.ts`                           |       100% |   98.73% |    97.05% |   100% |
| MCP `src/agent/runner.ts`                           |     98.96% |   91.02% |    97.82% | 98.89% |
| MCP `src/http.ts`                                   |       100% |     100% |      100% |   100% |
| Scheduler `src/capacity.ts`                         |       100% |     100% |      100% |   100% |
| Python `client.py`                                  |       100% |     100% |         — |   100% |
| Python `api/futures/open_futures_position.py`       |       100% |     100% |         — |   100% |
| Python `api/prediction_markets/open_pm_position.py` |       100% |     100% |         — |   100% |

Additional 90% per-file gates cover the entry-predicate, observation-reconciliation
and opportunity-reporting modules, plus scheduler maintenance and credential
rotation. Each currently measures 100% on all four metrics in CI.

Coverage includes all runtime source, including unimported modules. Test files
and TypeScript declarations are excluded. The TypeScript SDK is a small
`openapi-fetch` wrapper: just three executable statements and one function.
Its generated schema is type declarations; 100% here does not mean that the
external transport library or production API has 100% coverage.

The Python measurement includes the generated client and model modules.
Deterministic fixtures exercise model serialization, response handling and
synchronous/asynchronous wrappers. These are offline contract checks, not an
independent verification of every response the live API might return.

Vitest 4 uses a different coverage mapping from the earlier Vitest 2 setup.
Do not interpret a change between those reports as entirely new test coverage.
CI uploads complete HTML/JSON reports for each package, including failures.

## Behaviors protected

- Opportunity reports confirm only successful API results. HTTP errors remain
  unconfirmed; transport failures and exceptions have an unknown outcome. The
  attempted payload is retained separately, with no extra reporter retries.
  Skip/act regressions verify unchanged trading results and runner state.

- Periodic prediction-market evaluations obey the runner's hourly model-call
  budget. Existing position-management and explicit always-on exemptions remain;
  this setting is not an absolute cap on every model call.
- Missing, blank or malformed `Retry-After` uses the existing retry fallback.
  Valid seconds, an explicit zero, and HTTP dates are handled deliberately.
  Retries retain the original idempotency key and request body.
- Runner API operations have a 30-second total deadline, including response
  bodies and retry waits, with optional caller cancellation. Tests cover
  stalled headers and bodies, retry exhaustion, listener cleanup and a real
  loopback socket abort. Uncertain writes are not automatically replayed.
- A self-host state save writes a temporary file and atomically replaces the
  prior file. Failed serialization/replacement preserves the old state. This
  is not an fsync or power-loss durability guarantee.
- Ejecting a preset preserves `triggerPolicy` and `capitalSizing`, including
  the hourly cap, PM cooldown and equity-based sizing.
- Client keys remain isolated. Failed optional observations, stale quotes,
  invalid decisions and provider failures have targeted regressions.
- Drawdown and authentication failures stop model calls at their existing
  thresholds. HTTP startup and request failures clean up resources. PostgreSQL
  connection release preserves the original error even when rollback fails.
- Python client lifecycle and both trade-open wrappers are exercised through
  sync/async calls and every documented status, preserving authentication,
  idempotency keys and error details without live requests.

## PostgreSQL tests are mandatory in CI

The scheduler job starts PostgreSQL 17 and runs **13 integration tests** against
a disposable `capacity_admission_test` database. They cover shared reservations,
concurrent worker claims, owner isolation and protected stopped-agent states.
They also rehearse concurrent migration startup and interrupted credential
rotation/recovery. The test setup applies the existing numbered migrations to
that test database. All 222 scheduler tests and 1,201 MCP/runner tests passed.

CI fails if `CAPACITY_TEST_DATABASE_URL` is missing. Local runs may omit the
database and skip these tests, but that does not satisfy the release gate.
Tests reject non-loopback hosts and any database name other than
`capacity_admission_test` before executing SQL.

## Reproduce

Use Node 20.19+ or 22.12+ and Python 3.12. From the repository root:

```sh
npm --prefix packages/mcp-trading ci
npm --prefix packages/mcp-trading run test:coverage
npm --prefix packages/sdk ci
npm --prefix packages/sdk run typecheck
npm --prefix packages/sdk run test:coverage
npm --prefix packages/scheduler ci
# Supply credentials for your disposable local test database only:
export CAPACITY_TEST_DATABASE_URL='postgresql://postgres:local-ci-only@127.0.0.1:5432/capacity_admission_test'
npm --prefix packages/scheduler run test:coverage
cd packages/sdk-python
uv sync --locked
uv run pytest -q
uv run python scripts/check_coverage.py
```

In PowerShell, set the database variable with `$env:CAPACITY_TEST_DATABASE_URL`
instead of `export`. Never use a production database for the integration suite.

## Follow-up assurance checks (0.7.10)

The CI compatibility lane installs the built archives into a clean directory
whose path contains spaces. It checks CLI startup, MCP initialization and
38-tool discovery, supported/legacy engine imports, state replacement and
failure on corrupt state. SDK calls use offline transports.

| Lane       | Environments                                | Scope                                                                                         |
| ---------- | ------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Node       | Linux, Windows, macOS × Node 18, 20, 22, 24 | Installed MCP/runner and TypeScript SDK                                                       |
| Python     | Linux 3.10–3.14; Windows/macOS 3.12         | Installed wheel imports and sync/async requests                                               |
| PostgreSQL | Disposable PostgreSQL 17 in CI              | Capacity, concurrent migration replay, interrupted transactions, credential rotation/recovery |

These are focused compatibility smokes; the complete suites still run on
Ubuntu/Node 20 and Python 3.12. Future runtime releases are not implicitly
verified by an open-ended package engine declaration.

The installed runner lifecycle fixture combines a real loopback HTTP service
and separate processes:

```mermaid
sequenceDiagram
  participant A as First runner process
  participant S as Fixture execution service
  participant B as Restarted runner
  A->>A: Save run identity before execution
  A->>S: Open with stable intent key
  S->>S: Record one fixture position
  S--xA: Lose response or kill process
  B->>B: Reload saved state
  B->>S: Observe a deliberately lagged position read
  B->>S: Repeated intent uses the same key
  S-->>B: Return original result, no second opening
  B->>S: Observe current position
  B->>B: Reject duplicate intent
```

Assertions separate uncertain transport results from confirmed writes, retain
the run identity, keep one entry in the fixture ledger and prevent a third
write after position reconciliation. The published 0.7.9 archive reproduced
the missing first-run state file when killed after acceptance; 0.7.10
persists identity before execution. This is synthetic service-contract evidence,
not proof of every production failure mode or an exactly-once guarantee.
The execution service must honor idempotency keys, and embedded database hosts
remain responsible for their own persistence contract.

Main requires pull requests and named CI checks. Action references use full
commit SHAs; gitleaks and the MCP registry publisher are downloaded at pinned
versions and checksum-verified before execution. Rotation is an explicitly
offline operator procedure, rehearsed with fixture keys only; see the
[scheduler runbook](../packages/scheduler/README.md#offline-credential-rotation-and-recovery).

## Dependency review

The earlier MCP installation reported 14 advisories, including one critical;
the scheduler reported nine. These counts overlap and must not be added.
The production-only MCP audit reported five (one high and four moderate).
The critical Vitest finding concerned its development UI server, not proof
of an exploitable hosted trading service.

Vitest and its coverage provider are now pinned to 4.1.11. Compatible lockfile
updates address the remaining reported advisories without forced upgrades.
Full npm audits of all three package dependency trees report **zero known
vulnerabilities** as of this review. The resolved Python runtime dependencies
also pass `pip-audit`; Python development tools were not included in that audit.
No exploit test or guarantee against unknown vulnerabilities is claimed.

References: [Vitest UI advisory](https://github.com/vitest-dev/vitest/security/advisories/GHSA-5xrq-8626-4rwp),
[Vitest follow-up advisory](https://github.com/vitest-dev/vitest/security/advisories/GHSA-82fw-gwwq-j7x9).
CI rejects high/critical npm advisories, in addition to the coverage, lint,
format, type, generation-drift, build and secret-scanning checks.

## Release status is separate

**Current verification, 23 September 2026:** npm serves MCP **0.7.13** and
TypeScript SDK **0.3.2**; PyPI serves Python SDK **1.8.2**. All four downloaded
archives match the reviewed release manifest byte for byte. The official MCP
Registry separately lists **0.7.13** as active and latest, verified after the
[registry workflow](https://github.com/CoinRithm/coinrithm-agent-trading/actions/runs/35926812905).

The hosted MCP separately reports 0.7.13 and 40 tools
(13 keyless data tools), including the current calibration definitions, from
`4b39cd057765f0ab995d0ec4db2cfde665fa4bdd`. The scheduler is separately deployed
at `184201069cbf888989870e71243ba725fc98b634`.

Release source `726d8f0466d0cfd02ab5a9d46aed6ca12a45ff06` passed all 26
[CI jobs](https://github.com/CoinRithm/coinrithm-agent-trading/actions/runs/35920620125)
and the [Pages build](https://github.com/CoinRithm/coinrithm-agent-trading/actions/runs/35920620098).
Its tree is identical to archive build source
`9ea286cacceb4d0a0da31c71f4f0b726e8c8b262`. The live YAML matches the canonical
contract, including house-only open decisions and whale-wallet routes. Source,
hosted and registry checks are recorded separately; none implies the others.
Follow the [publishing procedure](./PUBLISHING.md) for the delivery sequence.

### Earlier verified deliveries

Source tests, a successful CI run, a healthy deployed image, a naturally
observed agent cycle and a registry publication are different evidence.
None establishes the others. See the [release sequence](../packages/mcp-trading/DEPLOY.md#release-sequencing-source-hosted-npm-and-registry).
On **15 September 2026**, registry downloads of [MCP **0.7.9**](https://www.npmjs.com/package/@coinrithm/mcp-trading/v/0.7.9),
[TypeScript **0.3.1**](https://www.npmjs.com/package/@coinrithm/sdk/v/0.3.1), and
[Python **1.8.1**](https://pypi.org/project/coinrithm-sdk/1.8.1/) matched all four
prepared archives byte for byte. Clean installs from npm/PyPI passed MCP
initialization, 38-tool discovery, runner deadline/retry/budget checks and
offline SDK requests. These checks made no provider calls or trades.

The 0.7.9 release source is [`d052a7b`](https://github.com/CoinRithm/coinrithm-agent-trading/commit/d052a7bb7ce791623f4e80e72748b75d50ea6b83),
with [all five CI jobs passing](https://github.com/CoinRithm/coinrithm-agent-trading/actions/runs/34956757119).
Hosted MCP and scheduler were separately verified on that exact source, with
their compiled API clients identical to the prepared npm package.

**0.7.10 delivery was verified separately on 15 September 2026.** The npm and
[GitHub release](https://github.com/CoinRithm/coinrithm-agent-trading/releases/tag/mcp-trading-v0.7.10)
downloads matched the exact archive tested by compatibility CI. A clean npm
installation on Windows/Node 24.11.0 passed startup, engine imports, locking,
persistence, 38-tool discovery, both restart scenarios and compiled
deadline/retry/budget checks. These checks used offline or loopback fixtures.

Hosted MCP deployment **2499** and scheduler deployment **2501** finished in
sequence on `9dc6e6ed470b47222d97e370fc04427fc83e0a92`. All 52 compiled MCP/runner
JavaScript files in each image match the archive; health and public MCP reads
passed. Both prior images are retained for rollback. Production credentials
were not rotated. The official MCP Registry lists the same version, verified
after [its release workflow](https://github.com/CoinRithm/coinrithm-agent-trading/actions/runs/34977695186).
SDK runtime versions remain TypeScript 0.3.1 and Python 1.8.1.

**0.7.11 delivery was verified on 15 September 2026.** The npm and
[GitHub release](https://github.com/CoinRithm/coinrithm-agent-trading/releases/tag/mcp-trading-v0.7.11)
archives match the exact artifact tested in compatibility CI. A clean registry
installation passed startup, engine imports, locking, persistence, 38-tool
discovery and the compiled reporting-outcome probes. These are controlled checks.

Hosted MCP deployment **2502** and scheduler deployment **2503** finished on
`7e8ebe8b75ffb328b34316afc5ef01501895b848`. Both images' 52 compiled MCP/runner
JavaScript files match the archive; their success/error/timeout/exception probes
passed without provider calls or trades. Public MCP reported 0.7.11 and returned
market data at verification. Rollback images were retained, and all 58 agent configuration
fingerprints were unchanged. No opportunity-report events were observed in the
bounded scheduler-log sample from 14:37:59 to 14:39:54 UTC.

The official MCP Registry listed 0.7.11 as latest at that verification, after its
[release workflow](https://github.com/CoinRithm/coinrithm-agent-trading/actions/runs/34985466551).
SDK runtime versions remain TypeScript 0.3.1 and Python 1.8.1.

**0.7.12 delivery was verified on 15 September 2026.** This release clarifies
`whoami`, `cancel_spot_order` and `report_pm_opportunity` descriptions and
side-effect/retry annotations; all 38 tools and their accepted inputs remain.
[All 25 CI jobs passed for `394b3b3`](https://github.com/CoinRithm/coinrithm-agent-trading/actions/runs/34991197700),
including 1,215 MCP/runner tests. MCP coverage remains 96.68% lines and 92.21%
branches. The historical package measurements above are from the 0.7.11 run.

The npm and [GitHub release](https://github.com/CoinRithm/coinrithm-agent-trading/releases/tag/mcp-trading-v0.7.12)
downloads match the CI artifact. A clean Windows/Node 24.11.0 registry install
passed stdio initialization, 38-tool discovery and the corrected definition
checks, with all 52 compiled JavaScript files matching the artifact. Those
metadata checks made no provider calls or trades.

Hosted MCP deployment **2505** finished on
`394b3b39cd13e31256504ad3704817808c7e97ad`; its 52 compiled JavaScript files match
the artifact. Public initialization reports 0.7.12, tool definitions match,
health and a bounded public-data read passed, and the prior image is retained
for rollback. The scheduler remains on its verified 0.7.11 engine.
The official MCP Registry lists 0.7.12 as latest after its
[release workflow](https://github.com/CoinRithm/coinrithm-agent-trading/actions/runs/34993755405).
SDK versions remain TypeScript 0.3.1 and Python 1.8.1. Glama release numbers and
profile scores are separate from npm versions and runtime reliability evidence.
