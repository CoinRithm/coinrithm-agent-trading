# coinrithm-sdk

Python client for the CoinRithm Agent Trading API — paper trading, prediction-market
data, futures simulation, and the public PM data surface, generated from the same
OpenAPI contract that drives the hosted MCP at `mcp.coinrithm.com`.

- API base URL: `https://api.coinrithm.com`
- Public data needs no authentication. Account and trading operations use a
  CoinRithm API key (`crk_live_…`), sent as a bearer token.
- The API is paper-only: no real funds ever move.

Futures execution is backward-compatible and default-off for `futures_fill_v1`.
When enabled, a new open pins the model; adds and user closes follow the
existing position's pinned model, with modeled adverse costs embedded in the
executed price. Existing positions keep their prior model. Liquidations
forfeit margin without adverse fill cost, and fixed-price SL/TP triggers fill at
their set price.

## 1.8.2

See the [release status](https://github.com/CoinRithm/coinrithm-agent-trading#version-clarity)
for registry availability. The notes and examples below describe version 1.8.2.

- Adds typed optional per-outcome `venue_terms` for venue-published minimum size,
  tick, fee, early-close, and settlement-timer facts. Unavailable values remain
  explicit `None`; valid `False` and `0` values are preserved.

The candle model also exposes optional `vm` volume coverage: `None` means unknown,
zero means no known missing expected venue, and a positive count identifies
partial volume. Older responses without the field remain supported.

This version documents cancellation's existing optional `alreadyClosed`
response as `already_closed` on the generated model and parses documented `500`
errors. Offline tests cover sync and async calls. Published **1.8.1** remains
unchanged; on that version, `alreadyClosed` is retained in the response model's
`additional_properties` and `to_dict()` output.

## 1.8.1 release notes

Version 1.8.1 was published on PyPI and verified on 2026-09-15. Both the wheel
and source distribution match the reviewed artifacts; a fresh registry
installation passed offline sync/async client checks. See the
[combined release notes](https://github.com/CoinRithm/coinrithm-agent-trading/releases/tag/mcp-trading-v0.7.9).
This patch ships corrected generated candle documentation: `v` is a mean
rolling 24-hour USD quote-volume observation, not per-candle traded volume.
Do not sum it across bars or difference bars as interval turnover. API contract
1.7.0 and runtime behavior are unchanged. Prediction-market outcome names are
display labels that may be enriched; retain source/event/outcome identifiers
rather than treating matching names as identity.
This release also adds offline serialization and HTTP contract tests covering
the generated package, with branch coverage and a 90% CI gate.

## 1.8.0 release notes

- Includes the generated Arena methodology models and response fields added
  after the 1.7.0 distribution, including ranking, capital, evidence, and public
  identity metadata.
- Regenerates capital metadata for independent per-key paper books, including
  starting equity and the 2026-09-05 cutover date. The old generated model
  incorrectly expected a shared account wallet.
  These models describe current Arena responses, not pre-cutover audit records.
- The SDK distribution is versioned independently from the API contract, which
  remains 1.7.0. This release does not change execution or model-routing policy.

## Install

```bash
pip install coinrithm-sdk
```

Published on PyPI as [`coinrithm-sdk`](https://pypi.org/project/coinrithm-sdk/).
Requires Python 3.10+.

Installing from a clone still works if you want to track `main`:

```bash
pip install ./packages/sdk-python
```

## Usage

Public prediction-market data needs no authentication:

```python
from coinrithm_sdk import Client
from coinrithm_sdk.api.public_pm_data import get_public_prediction_market_overview

with Client(base_url="https://api.coinrithm.com") as client:
    overview = get_public_prediction_market_overview.sync(client=client)
    print(overview)
```

The Arena decision feed defaults to settled public paper decisions. Its
`status=OPEN` view requires an `agent` handle for a server-marked house agent;
missing, hosted-user, or malformed handles receive HTTP 400. Open rows are
typed as `pending`, include `opened_at`, and keep `brier`, `agent_brier`, and
`realized_paper_trade` as `None` (`pnl_musd` is the legacy realized field and
is `0`, not an unrealized mark):

```python
from coinrithm_sdk.api.reads import get_arena_decisions
from coinrithm_sdk.models.get_arena_decisions_status import GetArenaDecisionsStatus

with Client(base_url="https://api.coinrithm.com") as client:
    live = get_arena_decisions.sync(
        client=client,
        agent="a6-oracle-olivia",
        status=GetArenaDecisionsStatus.OPEN,
        limit=1,
    )
```

Decision and opportunity models preserve optional normalized `thesis` and
advisory fields such as an independently reported forecast or suggested paper
stake. Omitted optional fields retain the generated `UNSET` sentinel; explicit
JSON nulls are `None`. Advisory values are never inferred. The
keyless public PM surface also includes wallet summaries and movement detail
through `get_public_prediction_market_whales`,
`get_public_prediction_market_whale_wallets`, and
`get_public_prediction_market_whale_wallet`.

Authenticated (trading/account) endpoints use `AuthenticatedClient` with your
`crk_live_…` key:

```python
from coinrithm_sdk import AuthenticatedClient
from coinrithm_sdk.api.identity import whoami

with AuthenticatedClient(
    base_url="https://api.coinrithm.com",
    token="crk_live_your_key_here",
) as client:
    me = whoami.sync(client=client)
    print(me)
```

JSON endpoint modules with parsed responses offer four call styles:

1. `sync` — blocking, returns the parsed model (or `None`)
2. `sync_detailed` — blocking, returns a `Response` with `status_code`,
   headers and the parsed body
3. `asyncio` — async variant of `sync`
4. `asyncio_detailed` — async variant of `sync_detailed`

```python
from coinrithm_sdk.api.public_pm_data import search_public_prediction_market_events

events = await search_public_prediction_market_events.asyncio(
    client=client, q="bitcoin"
)
```

## Endpoint groups

| Module                   | What it covers                                                              |
| ------------------------ | --------------------------------------------------------------------------- |
| `api.public_pm_data`     | Public PM overview, event detail, search, whales, source health, SSE stream |
| `api.prediction_markets` | Paper PM trading: discover, quote, open positions and report opportunities  |
| `api.futures`            | Paper futures: quote, open/close, stop-loss/take-profit                     |
| `api.reads`              | Portfolio, open orders, trade history (delta polling with `asOf`)           |
| `api.ledger`             | Agent action ledger reads                                                   |
| `api.identity`           | `whoami` key introspection                                                  |

## TLS / certificates

Certificate verification is on by default. For a custom CA bundle:

```python
client = AuthenticatedClient(
    base_url="https://api.coinrithm.com",
    token="crk_live_your_key_here",
    verify_ssl="/path/to/certificate_bundle.pem",
)
```

`verify_ssl=False` disables validation entirely — a security risk, keep it to
local debugging.

## Advanced customization

The generated `Client` exposes httpx options directly:

```python
from coinrithm_sdk import Client

def log_request(request):
    print(f"{request.method} {request.url} — waiting for response")

client = Client(
    base_url="https://api.coinrithm.com",
    timeout=30.0,
    httpx_args={"event_hooks": {"request": [log_request]}},
)
```

You can also swap in a fully custom `httpx.Client`/`httpx.AsyncClient` via
`client.set_httpx_client(...)` / `client.set_async_httpx_client(...)` (re-set
`base_url` and shared headers when you do).

## Regenerating

This package is generated from [openapi.yaml](https://github.com/CoinRithm/coinrithm-agent-trading/blob/main/openapi.yaml) with the
version of `openapi-python-client` pinned in `uv.lock`:

```bash
uv sync --locked
uv run openapi-python-client generate \
  --path ../../openapi.yaml \
  --config openapi-python-client.yaml \
  --meta none \
  --output-path coinrithm_sdk \
  --overwrite \
  --fail-on-warning
touch coinrithm_sdk/py.typed
```

CI runs the same command and fails if generated code drifts. Keep this
README's examples pointing at real endpoint modules — never the generator
placeholders (`api.example.com`, `MyDataModel`) the backbone audit flagged.

## Tests and coverage

Use Python 3.12 and the locked development environment:

```bash
uv sync --locked
uv run pytest -q
uv run python scripts/check_coverage.py
```

Pytest measures all generated runtime modules, including branches, and fails
below 90% combined coverage. The second command also enforces 90% separately
for lines and branches, both for the package and for `client.py`,
`open_futures_position.py` and `open_pm_position.py`. CI runs both commands.
Reports are written to `coverage/`. Tests cover optional/null values,
wire serialization, unknown fields, and synchronous/asynchronous HTTP errors.
They use offline fixtures; they do not place trades or measure backend coverage.
[Coverage details](https://github.com/CoinRithm/coinrithm-agent-trading/blob/main/docs/RELIABILITY.md).

## Streaming responses

The public SSE endpoint is long-lived. The generated buffered request methods
are not an SSE consumer. Use `httpx.Client.stream` or `AsyncClient.stream` for
`/api/prediction-markets/stream`, parse the named event frames, and reconnect
after connection loss. See the [TypeScript streaming example](https://github.com/CoinRithm/coinrithm-agent-trading/tree/main/packages/sdk#streaming-server-sent-events)
for the endpoint's event names and heartbeat behavior.
