import asyncio
import importlib
import pkgutil

import httpx

import coinrithm_sdk
from coinrithm_sdk import AuthenticatedClient, Client
from coinrithm_sdk.api.public_pm_data import get_public_prediction_market_source_health
from coinrithm_sdk.models.error import Error


def test_every_generated_module_imports() -> None:
    modules = pkgutil.walk_packages(coinrithm_sdk.__path__, prefix="coinrithm_sdk.")

    for module in modules:
        importlib.import_module(module.name)


def test_authenticated_client_sends_bearer_token() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.headers["Authorization"] == "Bearer test-key"
        return httpx.Response(500, json={"error": "expected test response"})

    transport = httpx.MockTransport(handler)
    client = AuthenticatedClient(
        base_url="https://api.coinrithm.com",
        token="test-key",
        httpx_args={"transport": transport},
    )

    response = get_public_prediction_market_source_health.sync_detailed(client=client)

    assert response.status_code == 500
    assert isinstance(response.parsed, Error)
    assert response.parsed.error == "expected test response"
    client.get_httpx_client().close()


def test_async_client_calls_the_documented_source_health_path() -> None:
    async def run() -> None:
        def handler(request: httpx.Request) -> httpx.Response:
            assert request.method == "GET"
            assert request.url.path == "/api/prediction-markets/sources/health"
            return httpx.Response(500, json={"error": "expected async test response"})

        transport = httpx.MockTransport(handler)
        client = Client(
            base_url="https://api.coinrithm.com",
            httpx_args={"transport": transport},
        )

        response = await get_public_prediction_market_source_health.asyncio_detailed(client=client)

        assert response.status_code == 500
        assert isinstance(response.parsed, Error)
        assert response.parsed.error == "expected async test response"
        await client.get_async_httpx_client().aclose()

    asyncio.run(run())
