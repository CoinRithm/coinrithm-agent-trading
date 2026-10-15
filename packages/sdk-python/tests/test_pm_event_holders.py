"""Keyless event holders read (API contract 1.9.0).

Fixtures are production bodies served by api.coinrithm.com on 2026-10-15 at
03:10 UTC. `event_holders.json` keeps two of five outcomes and two of ten
holders each (array rows dropped only); the echoed `marketsCovered`,
`marketsTotal` and `holdersPerOutcome` are as served. Tests make no network
calls.
"""

import datetime
import json
from pathlib import Path

import attrs
import httpx

from coinrithm_sdk import Client
from coinrithm_sdk.api.public_pm_data import get_public_prediction_market_event_holders
from coinrithm_sdk.models import (
    Error,
    PublicPmEventHoldersResponse,
    PublicPmEventHoldersResponseProvider,
    PublicPmEventHoldersResponseReason,
    PublicPmSourceSlug,
)
from coinrithm_sdk.types import UNSET

FIXTURES = Path(__file__).parent / "fixtures"


def fixture(name):
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


def normalized(value):
    if isinstance(value, dict):
        return {key: normalized(item) for key, item in value.items()}
    if isinstance(value, list):
        return [normalized(item) for item in value]
    if isinstance(value, str) and "T" in value and (value.endswith("Z") or value.endswith("+00:00")):
        return datetime.datetime.fromisoformat(value.replace("Z", "+00:00"))
    return value


def assert_typed(value):
    if attrs.has(type(value)):
        assert not value.additional_keys, (type(value).__name__, value.additional_keys)
        for field in attrs.fields(type(value)):
            assert_typed(getattr(value, field.name))
    elif isinstance(value, list):
        for item in value:
            assert_typed(item)


def client_for(path, body, status=200):
    def handler(request):
        assert request.method == "GET"
        assert request.url.path == path
        assert "authorization" not in request.headers
        assert not request.url.params
        return httpx.Response(status, json=body)

    return Client(
        base_url="https://fixture.example.test",
        httpx_args={"transport": httpx.MockTransport(handler)},
    )


def test_polymarket_holders_parse_and_round_trip():
    body = fixture("event_holders.json")
    slug = "fed-decision-in-october-20260617190323537"
    with client_for(f"/api/prediction-markets/events/polymarket/{slug}/holders", body) as client:
        result = get_public_prediction_market_event_holders.sync(PublicPmSourceSlug.POLYMARKET, slug, client=client)
    assert isinstance(result, PublicPmEventHoldersResponse)
    assert_typed(result)
    assert normalized(result.to_dict()) == normalized(body)

    assert result.available is True
    assert result.reason is UNSET
    assert result.provider is PublicPmEventHoldersResponseProvider.POLYMARKET_DATA_API_V2
    assert result.cache_ttl_seconds == 600
    assert result.markets_covered == result.markets_total
    top = result.outcomes[0].holders[0]
    assert 0 <= top.avg_price <= 1
    assert top.wallet == top.wallet.lower()
    assert top.wallet_page_path == f"/prediction-markets/whales/polymarket/{top.wallet}"
    rows = [holder for outcome in result.outcomes for holder in outcome.holders]
    assert any(holder.wallet_page_path is None for holder in rows)
    assert any(holder.name is None for holder in rows)


def test_venue_without_public_holders_is_available_false():
    body = fixture("event_holders_unavailable.json")
    with client_for("/api/prediction-markets/events/kalshi/kxmenworldcup-26/holders", body) as client:
        result = get_public_prediction_market_event_holders.sync(
            PublicPmSourceSlug.KALSHI, "kxmenworldcup-26", client=client
        )
    assert result.available is False
    assert result.reason is PublicPmEventHoldersResponseReason.VENUE_HAS_NO_PUBLIC_HOLDERS
    assert result.outcomes is UNSET
    assert result.to_dict() == body


def test_query_parameters_are_refused_with_400():
    # Observed 2026-10-15: any query key answers 400 with the unknown names.
    body = {"error": "Unknown query parameter(s)", "parameters": ["x"]}

    def handler(request):
        return httpx.Response(400, json=body)

    with Client(
        base_url="https://fixture.example.test",
        httpx_args={"transport": httpx.MockTransport(handler)},
    ) as client:
        response = get_public_prediction_market_event_holders.sync_detailed(
            PublicPmSourceSlug.POLYMARKET, "any", client=client
        )
    assert response.status_code == 400
    assert isinstance(response.parsed, Error)
    assert response.parsed.error == "Unknown query parameter(s)"
