"""Market context contracts traced to backend-v2 a15406f8's serializers.

The shared fixture combines public BTC blocks from the 2026-10-07 05:37
market, 07:18 DeFi and 08:06 depth HTTP receipts; it is not one simultaneous
snapshot. Funding and price values are synthetic examples of that serializer.
Tests make no network/provider calls.
"""

import copy
import datetime
import json
from pathlib import Path

import attrs
import httpx
import pytest

from coinrithm_sdk import AuthenticatedClient
from coinrithm_sdk.api.reads import get_market_context
from coinrithm_sdk.models import GetMarketContextResponse200
from coinrithm_sdk.types import UNSET

FIXTURE = json.loads((Path(__file__).parent / "fixtures" / "market_context.json").read_text(encoding="utf-8"))


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
        assert not value.additional_keys
        for field in attrs.fields(type(value)):
            assert_typed(getattr(value, field.name))
    elif isinstance(value, list):
        for item in value:
            assert_typed(item)


def test_market_context_endpoint_preserves_typed_source_blocks():
    def handler(request):
        assert request.method == "GET"
        assert request.url.path == "/api/agent/market/1"
        return httpx.Response(200, json=FIXTURE)

    with AuthenticatedClient(
        base_url="https://fixture.example.test",
        token="fixture-key",
        httpx_args={"transport": httpx.MockTransport(handler)},
    ) as client:
        result = get_market_context.sync("1", client=client)

    assert isinstance(result, GetMarketContextResponse200)
    assert_typed(result)
    assert normalized(result.to_dict()) == normalized(FIXTURE)
    assert result.derivatives.funding_by_venue.rates[0].rate_fraction == 0
    assert result.derivatives.funding_by_venue.rates[0].source_at is None
    assert result.derivatives.funding_by_venue.same_time is False
    assert result.funding.rate_pct == -0.0056
    assert result.funding.annualized_pct == -6.13
    assert result.derivatives.liquidations.last1h.events == 0
    assert result.derivatives.open_interest.change_24_h_pct is None
    assert result.derivatives.depth.bid.levels == 20
    assert result.derivatives.depth.bid.complete is False
    assert result.defi.chain_tvl.source_observed_at is None
    assert result.price.as_of != result.derivatives.depth.as_of


def test_old_market_payload_keeps_new_fields_unset():
    result = GetMarketContextResponse200.from_dict({"derivatives": {"openInterest": None}})
    assert result.price_timing is UNSET
    assert result.funding is UNSET
    assert result.macro is UNSET
    assert result.defi is UNSET
    assert result.derivatives.funding_by_venue is UNSET
    assert result.derivatives.depth is UNSET
    assert result.derivatives.positioning is UNSET
    assert result.derivatives.liquidations is UNSET
    assert result.to_dict() == {"derivatives": {"openInterest": None}}


def test_unavailable_context_is_null_not_unset_or_zero():
    payload = {
        "funding": None,
        "macro": None,
        "defi": None,
        "derivatives": {"openInterest": None, "positioning": None, "liquidations": None, "depth": None, "fundingByVenue": None},
    }
    result = GetMarketContextResponse200.from_dict(payload)
    assert_typed(result)
    assert result.to_dict() == payload


def test_funding_unknown_interval_stays_null():
    payload = copy.deepcopy(FIXTURE)
    row = payload["derivatives"]["fundingByVenue"]["rates"][0]
    row.update(role="settlement_reference", venue="bybit", source="paper_futures_reference",
               intervalHours=None, hourlyEquivalentFraction=None)
    result = GetMarketContextResponse200.from_dict(payload)
    assert_typed(result)
    assert result.derivatives.funding_by_venue.rates[0].interval_hours is None
    assert result.derivatives.funding_by_venue.rates[0].hourly_equivalent_fraction is None


@pytest.mark.parametrize(
    "block,key",
    [
        ("positioning", "longShortAccountRatio"),
        ("positioning", "longAccountPct"),
        ("positioning", "topTraderPositionRatio"),
        ("positioning", "takerBuySellRatio"),
        ("depth", "bid"),
        ("depth", "ask"),
    ],
)
def test_partially_available_derivatives_keep_nullable_members(block, key):
    payload = copy.deepcopy(FIXTURE)
    payload["derivatives"][block][key] = None
    result = GetMarketContextResponse200.from_dict(payload)
    assert_typed(result)
    assert normalized(result.to_dict()) == normalized(payload)


@pytest.mark.parametrize("key", ["chainTvl", "stablecoinSupply"])
def test_defi_members_are_independently_nullable(key):
    payload = copy.deepcopy(FIXTURE)
    payload["defi"][key] = None
    result = GetMarketContextResponse200.from_dict(payload)
    assert_typed(result)
    assert normalized(result.to_dict()) == normalized(payload)
