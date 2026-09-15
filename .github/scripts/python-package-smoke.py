"""Offline installed-wheel smoke. No repository imports or real API requests."""
import asyncio
import importlib
import pkgutil
import sys

import httpx
import coinrithm_sdk
from coinrithm_sdk import AuthenticatedClient
from coinrithm_sdk.api.public_pm_data import get_public_prediction_market_source_health

for module in pkgutil.walk_packages(coinrithm_sdk.__path__, prefix="coinrithm_sdk."):
    importlib.import_module(module.name)

calls = []


def handler(request):
    assert request.headers["Authorization"] == "Bearer offline-fixture"
    assert request.url.path == "/api/prediction-markets/sources/health"
    calls.append(request.method)
    return httpx.Response(500, json={"error": "fixture"})


def make_client():
    return AuthenticatedClient(base_url="https://fixture.invalid", token="offline-fixture",
                               httpx_args={"transport": httpx.MockTransport(handler)})


with make_client() as client:
    result = get_public_prediction_market_source_health.sync_detailed(client=client)
    assert result.status_code == 500 and result.parsed.error == "fixture"


async def run():
    async with make_client() as client:
        result = await get_public_prediction_market_source_health.asyncio_detailed(client=client)
        assert result.status_code == 500 and result.parsed.error == "fixture"


asyncio.run(run())
assert calls == ["GET", "GET"]
print(f"Installed Python wheel smoke passed: {sys.platform}, {sys.version}")
