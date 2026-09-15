# Reliability and test coverage

[Quick start](../QUICKSTART.md) · [API reference](https://coinrithm.github.io/coinrithm-agent-trading/) · [Runner](agent-runner.md) · [CI](https://github.com/CoinRithm/coinrithm-agent-trading/actions/workflows/ci.yml)

## What is measured

Local measurements on 15 September 2026, using Vitest 4.1.11 with V8 coverage
and pytest-cov with branch measurement enabled:

| Package               | Statements | Branches | Functions |  Lines |
| --------------------- | ---------: | -------: | --------: | -----: |
| MCP server and runner |     94.31% |   90.33% |    93.27% | 95.03% |
| Hosted scheduler      |     96.45% |   91.02% |    93.43% | 97.36% |
| TypeScript SDK        |       100% |     100% |      100% |   100% |
| Python SDK            |     96.18% |   94.11% |         — | 96.18% |

The three JavaScript packages enforce **90% on each of the four metrics**.
Python enforces **90% combined statement and branch coverage** (measured
95.71%); both individual measures also exceed 90%. Python does not report
a separate function metric.

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
- A self-host state save writes a temporary file and atomically replaces the
  prior file. Failed serialization/replacement preserves the old state. This
  is not an fsync or power-loss durability guarantee.
- Ejecting a preset preserves `triggerPolicy` and `capitalSizing`, including
  the hourly cap, PM cooldown and equity-based sizing.
- Client keys remain isolated. Failed optional observations, stale quotes,
  invalid decisions and provider failures have targeted regressions.

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
```

In PowerShell, set the database variable with `$env:CAPACITY_TEST_DATABASE_URL`
instead of `export`. Never use a production database for the integration suite.

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
Prepared package versions are MCP **0.7.9**, TypeScript **0.3.1**, and Python
**1.8.1**. Check npm/PyPI for publication; a version in this repository alone
does not mean users can install it yet.
