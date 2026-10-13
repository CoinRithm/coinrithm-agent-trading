"""Keyless /api/market/* reads (API contract 1.8.0).

Fixtures are production bodies served by api.coinrithm.com on 2026-10-13
between 22:32 and 22:50 UTC, trimmed by dropping array rows (and adjusting
the dependent `count`); every other key and value is as served. Tests make
no network calls.
"""

import asyncio
import datetime
import json
from pathlib import Path

import attrs
import httpx
import pytest

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
from coinrithm_sdk.models import (
    GetPublicLargeTradesAssetClass,
    GetPublicLargeTradesVenue,
    GetPublicLiquidationsVenue,
    GetPublicTradfiReferenceWindow,
    PublicCftcPositioningResponse,
    PublicCryptoTreasuryResponse,
    PublicDataStatus,
    PublicLargeTradesResponse,
    PublicLiquidationsResponse,
    PublicMessageError,
    PublicSecFilingsResponse,
    PublicTickerTreasuryResponse,
    PublicTradfiReferenceCatalog,
    PublicTradfiReferenceDetail,
)
from coinrithm_sdk.types import UNSET

FIXTURES = Path(__file__).parent / "fixtures"


def fixture(name):
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


def normalized(value):
    """Compare instants, not the generator's ISO timezone/fraction spelling."""
    if isinstance(value, dict):
        return {key: normalized(item) for key, item in value.items()}
    if isinstance(value, list):
        return [normalized(item) for item in value]
    if isinstance(value, str) and "T" in value and (value.endswith("Z") or value.endswith("+00:00")):
        return datetime.datetime.fromisoformat(value.replace("Z", "+00:00"))
    return value


def assert_typed(value):
    """An undeclared field hidden in additional_properties is not SDK support."""
    if attrs.has(type(value)):
        assert not value.additional_keys, (type(value).__name__, value.additional_keys)
        for field in attrs.fields(type(value)):
            assert_typed(getattr(value, field.name))
    elif isinstance(value, list):
        for item in value:
            assert_typed(item)


def keyless_client(path, body, *, status=200, query=None):
    def handler(request):
        assert request.method == "GET"
        assert request.url.path == path
        assert "authorization" not in request.headers
        assert dict(request.url.params) == (query or {})
        return httpx.Response(status, json=body)

    return Client(
        base_url="https://fixture.example.test",
        httpx_args={"transport": httpx.MockTransport(handler)},
    )


CASES = [
    (
        "large_trades.json",
        "/api/market/large-trades",
        lambda client: get_public_large_trades.sync(
            client=client,
            symbol="BTC",
            venue=GetPublicLargeTradesVenue.BINANCE,
            asset_class=GetPublicLargeTradesAssetClass.CRYPTO,
            limit=2,
        ),
        {"symbol": "BTC", "venue": "binance", "assetClass": "crypto", "limit": "2"},
        PublicLargeTradesResponse,
    ),
    (
        "liquidations.json",
        "/api/market/liquidations",
        lambda client: get_public_liquidations.sync(
            client=client, base="XAU", limit=2, venue=GetPublicLiquidationsVenue.OKX
        ),
        {"base": "XAU", "limit": "2", "venue": "okx"},
        PublicLiquidationsResponse,
    ),
    (
        "crypto_treasury.json",
        "/api/market/treasuries/bitcoin",
        lambda client: get_public_crypto_treasuries.sync("bitcoin", client=client),
        {},
        PublicCryptoTreasuryResponse,
    ),
    (
        "ticker_treasury.json",
        "/api/market/references/MSTR/treasury",
        lambda client: get_public_tradfi_reference_treasury.sync("MSTR", client=client),
        {},
        PublicTickerTreasuryResponse,
    ),
    (
        "ticker_treasury_none.json",
        "/api/market/references/AAPL/treasury",
        lambda client: get_public_tradfi_reference_treasury.sync("AAPL", client=client),
        {},
        PublicTickerTreasuryResponse,
    ),
    (
        "sec_filings.json",
        "/api/market/references/HOOD/filings",
        lambda client: get_public_tradfi_reference_filings.sync("HOOD", client=client),
        {},
        PublicSecFilingsResponse,
    ),
    (
        "cftc_positioning.json",
        "/api/market/references/XAU/positioning",
        lambda client: get_public_tradfi_reference_positioning.sync("XAU", client=client),
        {},
        PublicCftcPositioningResponse,
    ),
    (
        "cftc_positioning_not_applicable.json",
        "/api/market/references/MSTR/positioning",
        lambda client: get_public_tradfi_reference_positioning.sync("MSTR", client=client),
        {},
        PublicCftcPositioningResponse,
    ),
    (
        "tradfi_reference_catalog.json",
        "/api/market/references",
        lambda client: list_public_tradfi_references.sync(client=client),
        {},
        PublicTradfiReferenceCatalog,
    ),
    (
        "tradfi_reference_detail.json",
        "/api/market/references/XAU",
        lambda client: get_public_tradfi_reference.sync(
            "XAU", client=client, window=GetPublicTradfiReferenceWindow.VALUE_1
        ),
        {"window": "7d"},
        PublicTradfiReferenceDetail,
    ),
]


@pytest.mark.parametrize(("name", "path", "call", "query", "model"), CASES, ids=[case[0] for case in CASES])
def test_keyless_market_reads_parse_observed_bodies(name, path, call, query, model):
    body = fixture(name)
    with keyless_client(path, body, query=query) as client:
        result = call(client)
    assert isinstance(result, model)
    assert_typed(result)
    assert normalized(result.to_dict()) == normalized(body)


def test_large_trade_rows_keep_venue_specific_nulls():
    result = PublicLargeTradesResponse.from_dict(fixture("large_trades.json"))
    binance, hyperliquid = result.items
    assert binance.venue == "binance"
    assert binance.buyer is None and binance.links.tx is None
    assert binance.links.market.startswith("https://www.binance.com/")
    assert hyperliquid.venue == "hyperliquid"
    assert hyperliquid.links.tx is not None
    assert isinstance(hyperliquid.threshold_usd, (int, float))
    assert result.source.coverage is not UNSET
    assert result.filters.limit == 200


def test_liquidation_capture_coverage_is_not_exchange_completeness():
    result = PublicLiquidationsResponse.from_dict(fixture("liquidations.json"))
    assert result.venue == "okx"
    assert result.window.hours == 24
    assert result.totals.events == result.totals.long_events + result.totals.short_events
    assert result.venues[0].captured_pct == 99.4
    assert result.truncated is False
    # The liquidation source carries per-venue notes but no coverage line.
    assert result.source.coverage is UNSET
    assert result.source.venues[0].note is not UNSET


def test_treasury_null_symbol_and_status_enum():
    result = PublicCryptoTreasuryResponse.from_dict(fixture("crypto_treasury.json"))
    assert result.status is PublicDataStatus.FRESH
    assert any(company.symbol is None for company in result.companies)
    assert result.companies[0].tradfi_ticker == "MSTR"
    assert result.source.attribution == "Data provided by CoinGecko"

    none = PublicTickerTreasuryResponse.from_dict(fixture("ticker_treasury_none.json"))
    assert none.treasury is None
    assert none.status is PublicDataStatus.FRESH


def test_sec_filing_dates_stay_plain_strings_and_nulls_survive():
    result = PublicSecFilingsResponse.from_dict(fixture("sec_filings.json"))
    assert result.coverage.value == "available"
    first = result.insider_transactions[0]
    assert first.filed_at == "2026-10-07"
    assert first.transaction_date == "2026-10-05"
    assert first.price_per_share is None and first.value_usd is None
    assert first.reporter.officer_title == "Chief Executive Officer"
    assert all(row.is_open_market for row in result.open_market_transactions)


def test_cftc_positioning_reports_and_not_applicable():
    result = PublicCftcPositioningResponse.from_dict(fixture("cftc_positioning.json"))
    report = result.reports[0]
    assert report.report_date == "2026-10-06"
    assert report.non_commercial.net == report.non_commercial.long - report.non_commercial.short
    assert result.contract is not None and result.contract.code == "088691"

    missing = PublicCftcPositioningResponse.from_dict(fixture("cftc_positioning_not_applicable.json"))
    assert missing.coverage.value == "not_applicable"
    assert missing.contract is None
    assert missing.reports == []
    assert missing.as_of is None


def test_tradfi_live_overlay_is_optional_and_typed():
    detail = PublicTradfiReferenceDetail.from_dict(fixture("tradfi_reference_detail.json"))
    assert detail.live is not None
    assert detail.live.venue_count == len(detail.live.venues)
    assert detail.change7d is None
    assert detail.history_window.window == "7d"
    assert detail.latest is not None and detail.latest.venues[0].source_observed_at is None

    catalog = PublicTradfiReferenceCatalog.from_dict(fixture("tradfi_reference_catalog.json"))
    instruments = [item.instrument for item in catalog.items]
    assert instruments[0].leverage is None and instruments[0].home_listing is None
    assert any(instrument.leverage is not None for instrument in instruments)
    assert any(instrument.home_listing is not None for instrument in instruments)
    assert catalog.methodology.live_max_age_seconds == 90

    unavailable = fixture("tradfi_reference_catalog.json")
    unavailable["items"][0]["live"] = None
    parsed = PublicTradfiReferenceCatalog.from_dict(unavailable)
    assert parsed.items[0].live is None
    assert normalized(parsed.to_dict()) == normalized(unavailable)


@pytest.mark.parametrize(
    ("path", "call", "status", "message"),
    [
        (
            "/api/market/liquidations",
            lambda client: get_public_liquidations.sync_detailed(client=client, base="BTC"),
            400,
            "Invalid liquidations request. Options: base (required, e.g. BTC or XAU), limit (1-50), venue (binance|okx).",
        ),
        (
            "/api/market/treasuries/btc",
            lambda client: get_public_crypto_treasuries.sync_detailed("btc", client=client),
            404,
            "Treasury data is not available for this coin",
        ),
        (
            "/api/market/references/ZZZZ/filings",
            lambda client: get_public_tradfi_reference_filings.sync_detailed("ZZZZ", client=client),
            404,
            "Reference instrument not found",
        ),
    ],
)
def test_market_read_errors_are_message_bodies(path, call, status, message):
    def handler(request):
        assert request.url.path == path
        return httpx.Response(status, json={"message": message})

    with Client(
        base_url="https://fixture.example.test",
        httpx_args={"transport": httpx.MockTransport(handler)},
    ) as client:
        response = call(client)
    assert response.status_code == status
    assert isinstance(response.parsed, PublicMessageError)
    assert response.parsed.message == message


def test_async_large_trades_read():
    async def run():
        body = fixture("large_trades.json")
        client = keyless_client("/api/market/large-trades", body, query={"limit": "2"})
        result = await get_public_large_trades.asyncio(client=client, limit=2)
        assert isinstance(result, PublicLargeTradesResponse)
        assert result.count == 2
        await client.get_async_httpx_client().aclose()

    asyncio.run(run())
