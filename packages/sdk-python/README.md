# coinrithm-sdk

Python client for the CoinRithm Agent Trading API — paper trading, prediction-market
data, futures simulation, and the public PM data surface, generated from the same
OpenAPI contract that drives the hosted MCP at `mcp.coinrithm.com`.

- API base URL: `https://api.coinrithm.com`
- Authentication: CoinRithm API key (`crk_live_…`), created in the CoinRithm
  dashboard, sent as a bearer token.
- The API is paper-only: no real funds ever move.

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

Every endpoint module offers four call styles:

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

| Module | What it covers |
| --- | --- |
| `api.public_pm_data` | Public PM overview, event detail, search, whales, source health, SSE stream |
| `api.prediction_markets` | Paper PM trading: discover, quote, open/close mock positions |
| `api.futures` | Paper futures: quote, open/close, stop-loss/take-profit |
| `api.reads` | Portfolio, open orders, trade history (delta polling with `asOf`) |
| `api.ledger` | Agent action ledger reads |
| `api.identity` | `whoami` key introspection |

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

This package is generated from [`openapi.yaml`](../../openapi.yaml) with
`openapi-python-client`. Regenerate after any contract change, and keep this
README's examples pointing at real endpoint modules — never the generator
placeholders (`api.example.com`, `MyDataModel`) the backbone audit flagged.
