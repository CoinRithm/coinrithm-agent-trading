# Reliability and test coverage

[Quick start](../QUICKSTART.md) · [API reference](https://coinrithm.github.io/coinrithm-agent-trading/) · [Runner](agent-runner.md) · [CI](https://github.com/CoinRithm/coinrithm-agent-trading/actions/workflows/ci.yml)

## What is measured

Published 0.7.9 release measurements on 15 September 2026, using Vitest 4.1.11 with V8 coverage
and pytest-cov with branch measurement enabled:

| Package               | Statements | Branches | Functions |  Lines |
| --------------------- | ---------: | -------: | --------: | -----: |
| MCP server and runner |     96.00% |   91.79% |    94.24% | 96.63% |
| Hosted scheduler      |     97.10% |   91.56% |    94.89% | 97.89% |
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
| MCP `src/agent/runner.ts`                           |     99.00% |   90.76% |    97.87% | 98.94% |
| MCP `src/http.ts`                                   |       100% |     100% |      100% |   100% |
| Scheduler `src/capacity.ts`                         |       100% |   95.00% |      100% |   100% |
| Python `client.py`                                  |       100% |     100% |         — |   100% |
| Python `api/futures/open_futures_position.py`       |       100% |     100% |         — |   100% |
| Python `api/prediction_markets/open_pm_position.py` |       100% |     100% |         — |   100% |

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

The scheduler job starts PostgreSQL 17 and runs **11 integration tests** against
a disposable `capacity_admission_test` database. They cover shared reservations,
concurrent worker claims, owner isolation and protected stopped-agent states.
The test setup applies the existing numbered migrations to that test database.

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

## Follow-up assurance checks (0.7.10 candidate)

The CI compatibility lane installs the built archives into a clean directory
whose path contains spaces. It checks CLI startup, MCP initialization and
38-tool discovery, supported/legacy engine imports, state replacement and
failure on corrupt state. SDK calls use offline transports.

| Lane | Environments | Scope |
| --- | --- | --- |
| Node | Linux, Windows, macOS × Node 18, 20, 22, 24 | Installed MCP/runner and TypeScript SDK |
| Python | Linux 3.10–3.14; Windows/macOS 3.12 | Installed wheel imports and sync/async requests |
| PostgreSQL | Disposable PostgreSQL 17 in CI | Capacity, concurrent migration replay, interrupted transactions, credential rotation/recovery |

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
the missing first-run state file when killed after acceptance; the candidate
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

Source tests, a successful CI run, a healthy deployed image, a naturally
observed agent cycle and a registry publication are different evidence.
None establishes the others. See the [release sequence](../packages/mcp-trading/DEPLOY.md#release-sequencing-source-hosted-npm-and-registry).
On **15 September 2026**, registry downloads of [MCP **0.7.9**](https://www.npmjs.com/package/@coinrithm/mcp-trading/v/0.7.9),
[TypeScript **0.3.1**](https://www.npmjs.com/package/@coinrithm/sdk/v/0.3.1), and
[Python **1.8.1**](https://pypi.org/project/coinrithm-sdk/1.8.1/) matched all four
prepared archives byte for byte. Clean installs from npm/PyPI passed MCP
initialization, 38-tool discovery, runner deadline/retry/budget checks and
offline SDK requests. These checks made no provider calls or trades.

The release source is [`d052a7b`](https://github.com/CoinRithm/coinrithm-agent-trading/commit/d052a7bb7ce791623f4e80e72748b75d50ea6b83),
with [all five CI jobs passing](https://github.com/CoinRithm/coinrithm-agent-trading/actions/runs/34956757119).
Hosted MCP and scheduler were separately verified on that exact source, with
their compiled API clients identical to the prepared npm package.
