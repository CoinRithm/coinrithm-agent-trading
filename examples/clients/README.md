# Runnable API examples

Start with public event discovery. Then, if needed, use a personal key to inspect
your account, preview a paper quote or read realized paper-trade history.
These examples do not submit orders.

| Integration                                    | What you get                                                                          |
| ---------------------------------------------- | ------------------------------------------------------------------------------------- |
| HTTP + JSON                                    | Access from any language with an HTTP client. Public operations need no key.          |
| CoinRithm TypeScript / Python SDK              | Maintained packages with types or models generated from the API contract.             |
| Scalar's HTTP client options                   | Generated request snippets for the selected endpoint, not additional maintained SDKs. |
| [CoinRithm runner](../../docs/agent-runner.md) | The Node.js agent cycle, configured strategy limits and execution evidence.           |

Direct SDK and HTTP calls do **not** run through the limits in a local `agent.md`.
API authentication, scopes and execution rules still apply. A ready-made Python
strategy adapter is not part of these examples.

## JavaScript and TypeScript SDK

From a checkout, with Node.js 20+:

```sh
cd examples/clients
npm ci
node sdk/events.mjs
```

The runnable files are plain JavaScript modules using the maintained TypeScript
SDK, pinned to `@coinrithm/sdk@0.3.2`. In your own JavaScript or TypeScript project,
install it with `npm install @coinrithm/sdk@0.3.2`, then copy an example. TypeScript
also infers request and response types from the same `createClient` interface.

## Python SDK

From `examples/clients`, with Python 3.10+, create a virtual environment:

```sh
python -m venv .venv
```

On PowerShell:

```powershell
.venv\Scripts\python.exe -m pip install -r requirements.txt
.venv\Scripts\python.exe python/events.py
```

On macOS or Linux:

```sh
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python python/events.py
```

This uses the published `coinrithm-sdk==1.8.2`, not a local unreleased SDK build.

## Choose a request

Replace `events` in the command with another file name:

| File       | Request                                      | Access        | What to inspect                                                                                                                           |
| ---------- | -------------------------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `events`   | `GET /api/prediction-markets/events?limit=3` | Anonymous     | `data`, `pagination`, `meta`; each event's freshness, quality and decision support.                                                       |
| `identity` | `GET /api/agent/me`                          | Any valid key | Account identity and key scopes.                                                                                                          |
| `quote`    | `POST /api/agent/spot/quote`                 | `read` scope  | A hypothetical buy of 0.01 units of coin ID `1`. Check `eligible`, `blockReasons`, costs and freshness. A quote does not submit an order. |
| `trades`   | `GET /api/agent/trades?limit=3`              | `read` scope  | Realized paper results and `asOf`. An empty `trades` array is valid.                                                                      |

For protected requests, set `COINRITHM_API_KEY` in your local environment using
your normal secret-management method. See [creating a key](../../QUICKSTART.md#1-create-an-api-key).
The examples stop with a clear error when it is missing. The public examples
never attach this key, even when the variable is set.

All examples default to `https://api.coinrithm.com`. `COINRITHM_BASE_URL` is an
optional override for local development and tests; only point authenticated
examples at an API you trust. The production service uses **virtual funds** for
trading. A public research event is not necessarily eligible for a paper trade.

## HTTP without an SDK

These public event examples use only their language's standard HTTP facilities:

```sh
node http/events.mjs
python http/events.py
go run http/events.go
```

The Node.js example requires Node.js 20+, Python requires 3.10+, and the Go
example is tested with Go 1.27. They provide a starting point for HTTP callers;
they are not separate CoinRithm SDKs.

## Errors, timeouts and verification

The examples make one request and exit unsuccessfully on HTTP or transport
errors. They do not automatically retry a `429` or replay a write. The JavaScript
abort signal and Go client limit the operation to 30 seconds. Python's HTTPX and
urllib timeouts limit network waits; they are not the runner's overall request
deadline. Check a quote's eligibility even after HTTP 200.

CI executes these exact files against a local HTTP fixture using the published
SDKs. It verifies paths, methods, parameters, quote bodies, anonymous versus
authenticated headers, empty results, ineligible quotes, missing credentials,
HTTP failures and malformed JSON. No production credentials or trades are used
by that suite. This does not claim verification of every library Scalar offers.

To run the same checks, install the dependencies above and Go, then run `npm test`
in this directory. On Windows the test runner uses `.venv\Scripts\python.exe`;
on other platforms it uses `.venv/bin/python`. `PYTHON` and `GO` can override the
executable paths.

The API reference embeds the contents of these files during its Pages build.
Updating an example therefore updates both its test input and its displayed
code; the build fails if its operation no longer matches the contract.
