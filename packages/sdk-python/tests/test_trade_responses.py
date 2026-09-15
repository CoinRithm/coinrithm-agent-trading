"""Trade request/response contracts over MockTransport, never a trading account."""

import asyncio
import json

import httpx
import pytest

from coinrithm_sdk import AuthenticatedClient
from coinrithm_sdk.api.futures import open_futures_position
from coinrithm_sdk.api.prediction_markets import open_pm_position
from coinrithm_sdk.api.spot import cancel_spot_order
from coinrithm_sdk.models.cancel_spot_order_response_200 import CancelSpotOrderResponse200
from coinrithm_sdk.models.error import Error
from coinrithm_sdk.models.futures_open_request import FuturesOpenRequest
from coinrithm_sdk.models.futures_position_envelope import FuturesPositionEnvelope
from coinrithm_sdk.models.open_futures_position_response_422 import OpenFuturesPositionResponse422
from coinrithm_sdk.models.open_pm_position_response_422 import OpenPmPositionResponse422
from coinrithm_sdk.models.pm_open_request import PmOpenRequest
from coinrithm_sdk.models.pm_position_envelope import PmPositionEnvelope
from coinrithm_sdk.types import UNSET


@pytest.mark.parametrize(
    "status,payload,already_closed",
    [
        (200, {"ok": True}, UNSET),
        (200, {"ok": True, "alreadyClosed": True}, True),
        (500, {"error": "cancel_failed"}, None),
    ],
)
def test_cancellation_preserves_absent_orders_and_server_failures(status, payload, already_closed):
    requests = []

    def handle(request):
        requests.append(request)
        assert request.method == "POST"
        assert request.url.path == "/api/agent/spot/order/42/cancel"
        return httpx.Response(status, json=payload)

    options = {
        "base_url": "https://fixture.invalid",
        "token": "fixture",
        "raise_on_unexpected_status": True,
        "httpx_args": {"transport": httpx.MockTransport(handle)},
    }

    def check(result):
        assert isinstance(result, CancelSpotOrderResponse200 if status == 200 else Error)
        assert result.to_dict() == payload
        if status == 200:
            assert result.already_closed is already_closed

    with AuthenticatedClient(**options) as client:
        detailed = cancel_spot_order.sync_detailed(42, client=client)
        assert detailed.status_code == status
        check(detailed.parsed)
        check(cancel_spot_order.sync(42, client=client))

    async def run():
        async with AuthenticatedClient(**options) as client:
            detailed = await cancel_spot_order.asyncio_detailed(42, client=client)
            assert detailed.status_code == status
            check(detailed.parsed)
            check(await cancel_spot_order.asyncio(42, client=client))

    asyncio.run(run())
    assert len(requests) == 4  # One call per entrypoint, including server errors.


@pytest.mark.parametrize(
    "venue,status",
    [
        (venue, status)
        for venue in ["futures", "pm"]
        for status in [200, 201, 400, 401, 403, 404, 409, 422, 429, 503]
        if not (venue == "pm" and status == 503)
    ],
)
def test_documented_trade_responses_and_idempotency_are_preserved(venue, status):
    module = open_futures_position if venue == "futures" else open_pm_position
    path = "/api/agent/futures/open" if venue == "futures" else "/api/agent/pm/open"
    payload = (
        {
            "coinId": "1",
            "side": "long",
            "leverage": 2,
            "marginMusd": 50,
            "stopLossPrice": 60_000,
            "idempotencyKey": "same-fixture-intent",
        }
        if venue == "futures"
        else {
            "source": "kalshi",
            "slug": "fixture",
            "outcomeExternalMarketId": "yes-1",
            "side": "yes",
            "stakeMusd": 20,
            "idempotencyKey": "same-fixture-intent",
        }
    )
    body = (FuturesOpenRequest if venue == "futures" else PmOpenRequest).from_dict(payload)
    response_payload = (
        {"position": {"id": 7}, "idempotentReplay": True}
        if status < 300
        else {"error": "fixture-rejection", "reason": "fixture-risk-check"}
    )
    expected = (
        (FuturesPositionEnvelope if venue == "futures" else PmPositionEnvelope)
        if status < 300
        else (
            (OpenFuturesPositionResponse422 if venue == "futures" else OpenPmPositionResponse422)
            if status == 422
            else Error
        )
    )
    requests = []

    def handle(request):
        requests.append(request)
        assert request.method == "POST" and request.url.path == path
        assert json.loads(request.content) == payload
        assert request.headers["Authorization"] == "Bearer fixture"
        return httpx.Response(status, json=response_payload, headers={"Retry-After": "5"})

    options = {
        "base_url": "https://fixture.invalid",
        "token": "fixture",
        "httpx_args": {"transport": httpx.MockTransport(handle)},
    }

    def check(result):
        assert isinstance(result, expected)
        assert result.to_dict() == response_payload

    with AuthenticatedClient(**options) as client:
        detailed = module.sync_detailed(client=client, body=body)
        assert detailed.status_code == status
        assert detailed.headers["Retry-After"] == "5"
        check(detailed.parsed)
        check(module.sync(client=client, body=body))

    async def run():
        async with AuthenticatedClient(**options) as client:
            detailed = await module.asyncio_detailed(client=client, body=body)
            assert detailed.status_code == status
            check(detailed.parsed)
            check(await module.asyncio(client=client, body=body))

    asyncio.run(run())
    assert len(requests) == 4  # One transport call per entrypoint, including 429.
