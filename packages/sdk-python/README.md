# coinrithm-sdk

Python client for the CoinRithm Agent Trading API: paper trading, futures
simulation, and keyless prediction-market, crypto and TradFi market data,
generated from the same OpenAPI contract that drives the hosted MCP at
`mcp.coinrithm.com`.

- API base URL: `https://api.coinrithm.com`
- Public data needs no authentication. Account and trading operations use a
  CoinRithm API key (`crk_live_…`), sent as a bearer token.
- The API is paper-only: no real funds ever move.

## 1.9.1

Released on 2026-10-15, generated from API contract **1.9.0** (additive).

- Arena `arena-ranking-v2` contract fields (`losses_only`, `markMaxAgeHours`,
  `rankPendingUnmarkedShare`) and row fields `open_loss_musd`, `rank_pending`.
- Audit export futures events: `entry_fee_allocated_musd`.
- Prediction-market open interest, Polymarket top holders, cross-venue
  pairing (whether both legs traded is described, not a typed field) and
  consensus v3 `weight_basis`.
- TradFi fundamentals, 52-week range and corporate events.
- Correction: the 1.9.1 package notes listed a Hyperliquid large-trade `taker`
  block; the live API serves it but the contract does not type it yet.

## 1.9.0

Released on 2026-10-13, generated from API contract **1.8.0**.

- **Keyless public market data** in the new `api.public_market_data` module:
  TradFi reference catalog and detail with the near-real-time `live` overlay,
  large perpetual-futures trades, 24-hour liquidations, CFTC positioning, SEC
  Form 4 insider filings and public-company crypto treasuries. See
  [Public market data](#public-market-data). Errors on these routes parse as
  `PublicMessageError` (`message`), not `Error`.
- **Agent operations** already served by the API: `get_agent_universe` and
  `get_agent_universe_sectors` (market-boundary screener), `get_spot_reference`
  (dated spot reference), and the house-agent `pm_paper_v2` lifecycle
  (`discover_pm_paper_v2`, `get_pm_paper_v2_positions`, `open_pm_paper_v2`,
  `replay_pm_paper_v2_open`, `close_pm_paper_v2`). PM v2 opens from an API key
  must send `forecast_probability` (a decimal string); a missing forecast
  returns 422 `forecast_required` and a forecast that does not beat the
  fee-inclusive cost returns 422 `entry_forecast_not_above_cost`.
- **New optional parameters**: `min_usd` tiers on the whale tape; `view`,
  `lead`, `dedupe`, `min_volume_24h` and `include_quote_evidence` on event
  search; `view`, `full`, `lang` and `include_quote_evidence` on event detail;
  `outcome_external_market_id` on the order book; `view` and
  `max_end_date_difference_days` on disagreements; candle range `1Y`.
- **Newly typed fields** the API already returned: whale wallet, trader and
  event fields plus `stats_24h`; event `availability` (paused venue),
  `quote_evidence` and `outcomes_total`; order-book `received_at` and
  `side_evidence`; calibration `methodology_version`, `final_price` and
  `own_capture`; wallet `enrichment`; `whoami` `usage`; price freshness on top
  gainers and losers. Values that previously landed in `additional_properties`
  now have attributes.
- **Corrections that can affect callers**: whale `outcome` can be `None`;
  portfolio all-time PnL fields can be `None`; event-search pagination exposes
  `has_more` and marks the never-sent `total` deprecated. The never-returned
  ledger-export `futures`/`futures_events` and opportunity `thesis` are
  deprecated.

Runtime dependencies and Python 3.10+ support are unchanged from 1.8.5.

## 1.8.5

Published on PyPI and verified on 2026-10-07. The wheel and source archive
match the reviewed release manifest; fresh installation checks passed. See the
[release status](https://github.com/CoinRithm/coinrithm-agent-trading#version-clarity).

- Adds typed optional market-context `price_timing`, `funding`, `derivatives`,
  `macro` and `defi`, including open interest, positioning, captured liquidations,
  observed depth, associated-chain TVL and stablecoin supply. Each block keeps
  its own source/coverage/freshness. Depth is one venue's observed 20-level book;
  macro quotes are derivative proxies, and chain association does not imply
  the coin is its native token.
- Adds `derivatives.funding_by_venue` with independently collected
  settlement-reference and Hyperliquid context rates. `rate_fraction` is a raw
  fraction per `interval_hours`; `hourly_equivalent_fraction` is simple division,
  not APR or expected return. Unknown intervals/times remain `None`, `source_at`
  is `None` and `same_time` is `False`. The existing funding reference and
  futures-entry rules are unchanged.
- Adds optional PM discovery/position `related_coins` and position
  `event_end_date`. Missing links and implausible venue dates remain unknown;
  shared links are not a correlation model.
- Generated from API contract 1.7.0. Omitted optional fields retain `UNSET`,
  explicit nulls remain `None`, and valid zero rates remain zero. Runtime
  dependencies and Python 3.10+ support are unchanged from published 1.8.4.

## 1.8.4

See the [release status](https://github.com/CoinRithm/coinrithm-agent-trading#version-clarity)
for registry availability. Version 1.8.4 was published and verified on 2026-10-02.

- Prediction-market events gain optional `representative_outcome` (a full
  `PublicPmOutcome`, or `None`) and `representative_outcome_basis`
  (`THRESHOLD_LADDER_LINE` or `INFORMATIVE_LEADER`). Both are served on open
  events only: on event detail, and on compact lists requested with
  `lead=representative`. `INFORMATIVE_LEADER` is not necessarily the leading
  outcome.
- Canonical detail gains `consensus` (the current cross-venue reference, or
  `None`) and `consensus_history` (a daily tape in which every point carries
  its own outcome label). `listings` may be a subset of the contributing venues.
- Outcomes type the optional `has_observed_price` flag and nullable
  `source_observation` provenance.
- Adds public resolved/surprise/expiring, order-book and trade endpoints;
  event subtitles, price basis and per-outcome settlement rules.
- Adds optional futures-entry eligibility, spot `price_timing`, fill `order_id`
  and replay evidence. Snapshot timing is informational, not a per-fill receipt.
- Corrects price-history models to one outcome's `points` over a lookback
  interval and fixes parsing of nullable spot replay evidence. These corrections
  describe existing wire behavior and may require caller adjustments.
- Generated from API contract 1.7.0. Most other fields are optional additions.
  The basis and consensus kind are strict enums, so a future value needs a
  matching SDK release. These notes include changes after the frozen
  September 28 draft; that draft is not the complete current release.

## 1.8.3

- PM quote and open requests accept optional `min_entry_probability_pct`, a
  chosen-side entry probability floor in percentage points before fees. It is
  omitted by default; `0` is a valid explicit value. Generated from the
  unchanged API contract 1.7.0.

Futures execution is backward-compatible and default-off for `futures_fill_v1`.
When enabled, a new open pins the model; adds and user closes follow the
existing position's pinned model, with modeled adverse costs embedded in the
executed price. Existing positions keep their prior model. Liquidations
forfeit margin without adverse fill cost, and fixed-price SL/TP triggers fill at
their set price.

## 1.8.2

Published on PyPI and verified on 2026-09-23.

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

| Module                   | What it covers                                                                                  |
| ------------------------ | ----------------------------------------------------------------------------------------------- |
| `api.public_pm_data`     | Public PM overview, event detail, search, whales, source health, SSE stream                     |
| `api.public_crypto_data` | Keyless top gainers and losers (universe scan)                                                  |
| `api.public_market_data` | Keyless TradFi references, large trades, liquidations, CFTC positioning, SEC filings, treasuries |
| `api.prediction_markets` | Paper PM trading: discover, quote, open, report opportunities, and the house `pm_paper_v2` flow |
| `api.futures`            | Paper futures: quote, open/close, stop-loss/take-profit                                         |
| `api.spot`               | Paper spot: quote, place and cancel orders, and the dated spot reference                        |
| `api.reads`              | Portfolio, positions, trades, market context, candles, universe screener, Arena reads           |
| `api.ledger`             | Agent action ledger reads                                                                       |
| `api.identity`           | `whoami` key introspection                                                                      |

## Public market data

The `api.public_market_data` module needs no API key. Each response names its
source; keep the CoinGecko attribution next to any display of treasury data.

| Function                                  | Returns                                                                                  |
| ----------------------------------------- | ---------------------------------------------------------------------------------------- |
| `list_public_tradfi_references`           | Every TradFi reference with latest consensus, 24h/7d change, range, sparkline and `live` |
| `get_public_tradfi_reference`             | One reference with venue constituents and 15-minute history (`window` 24h or 7d)         |
| `get_public_tradfi_reference_treasury`    | The listed company's BTC/ETH/SOL/BNB holdings, or `treasury=None`                        |
| `get_public_tradfi_reference_filings`     | SEC Form 4 insider and open-market transactions with filing links                        |
| `get_public_tradfi_reference_positioning` | Weekly CFTC Commitments of Traders for references with a US futures equivalent           |
| `get_public_crypto_treasuries`            | Public companies holding `bitcoin`, `ethereum`, `solana` or `binancecoin`                |
| `get_public_large_trades`                 | Large Binance USD-M and Hyperliquid perpetual prints, newest first                       |
| `get_public_liquidations`                 | Last-24h liquidation totals and the biggest/latest events for one base                   |

```python
from coinrithm_sdk import Client
from coinrithm_sdk.api.public_market_data import (
    get_public_crypto_treasuries,
    get_public_large_trades,
    get_public_liquidations,
    get_public_tradfi_reference,
    get_public_tradfi_reference_filings,
    get_public_tradfi_reference_positioning,
    get_public_tradfi_reference_treasury,
    list_public_tradfi_references,
)
from coinrithm_sdk.models import GetPublicLargeTradesAssetClass, GetPublicTradfiReferenceWindow

with Client(base_url="https://api.coinrithm.com") as client:
    catalog = list_public_tradfi_references.sync(client=client)
    gold = get_public_tradfi_reference.sync("XAU", client=client, window=GetPublicTradfiReferenceWindow.VALUE_1)
    holdings = get_public_tradfi_reference_treasury.sync("MSTR", client=client)
    filings = get_public_tradfi_reference_filings.sync("HOOD", client=client)
    cot = get_public_tradfi_reference_positioning.sync("XAU", client=client)
    btc_treasuries = get_public_crypto_treasuries.sync("bitcoin", client=client)
    prints = get_public_large_trades.sync(client=client, asset_class=GetPublicLargeTradesAssetClass.EQUITY, limit=20)
    liquidations = get_public_liquidations.sync(client=client, base="BTC")
```

`GetPublicTradfiReferenceWindow.VALUE_0` is `24h` (the default) and `VALUE_1`
is `7d`. What to keep in mind:

- A reference price is the median of 2-3 derivatives-venue index prices in
  USDT, not an exchange last trade. `live` is `None` whenever the overlay is
  off, invalid or older than `methodology.live_max_age_seconds`; `latest` and
  the derived fields never depend on it.
- Large trades and liquidations cover only what CoinRithm's collectors saw while
  connected. An empty list or a zero total is not proof that nothing happened,
  and liquidation `captured_pct` measures capture uptime, not exchange
  completeness.
- Filings `coverage` is `not_applicable` for instruments that do not file Form 4
  and `none_recorded` before the first collected transaction. Filing dates are
  `YYYY-MM-DD` strings. Treasury and positioning reads report `status`
  (`PublicDataStatus`) and still answer 200 when the upstream source fails.
- Errors parse as `PublicMessageError`: 400 for an invalid or unknown query
  parameter, 404 for a ticker outside the catalog or an unsupported coin.

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
  --custom-template-path templates \
  --meta none \
  --output-path coinrithm_sdk \
  --overwrite \
  --fail-on-warning
touch coinrithm_sdk/py.typed
```

The datetime template preserves Python 3.10 support by normalizing the API's
UTC `Z` suffix to `+00:00` before parsing. Explicit offsets stay unchanged.
Keep the override aligned with the pinned generator when upgrading it.

CI runs the same command and fails if generated code drifts. It also tests
the installed wheel on Python 3.10, our oldest supported version. Keep this
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
