import asyncio
import importlib
import pkgutil
from importlib.metadata import version
from pathlib import Path

import httpx

import coinrithm_sdk
from coinrithm_sdk import AuthenticatedClient, Client
from coinrithm_sdk.api.public_pm_data import get_public_prediction_market_source_health
from coinrithm_sdk.models.arena_contract_capital import ArenaContractCapital
from coinrithm_sdk.models.arena_contract_ranking import ArenaContractRanking
from coinrithm_sdk.models.error import Error


def test_distribution_version_matches_generator_override() -> None:
    config = Path(__file__).resolve().parents[1] / "openapi-python-client.yaml"
    configured_version = next(
        line.partition(":")[2].strip()
        for line in config.read_text(encoding="utf-8").splitlines()
        if line.startswith("package_version_override:")
    )

    assert version("coinrithm-sdk") == configured_version


def test_arena_ranking_contract_round_trip_preserves_wire_fields() -> None:
    payload = {
        "listingMinimumDecidedTrades": 0,
        "qualificationDecidedTrades": 5,
        "positiveScore": "wilson_95_lower_bound_x_realized_pnl",
        "nonPositiveScore": "realized_pnl",
        "unrealizedPnlAffectsRank": False,
        "futureMetadata": "preserved",
    }

    ranking = ArenaContractRanking.from_dict(payload)

    assert ranking.qualification_decided_trades == 5
    assert ranking.unrealized_pnl_affects_rank is False
    assert ranking.to_dict() == payload


def test_every_generated_module_imports() -> None:
    modules = pkgutil.walk_packages(coinrithm_sdk.__path__, prefix="coinrithm_sdk.")

    for module in modules:
        importlib.import_module(module.name)


def test_arena_capital_parses_current_independent_paper_book_contract() -> None:
    # Public /api/arena contract observed 2026-09-07; no account rows or keys.
    payload = {
        "normalizedBaselineMusd": 50000,
        "startingEquityMusd": 50000,
        "executionWalletScope": "api_key",
        "performanceAttributionScope": "api_key",
        "independentWalletPerAgent": True,
        "independentWalletSince": "2026-09-05",
    }

    capital = ArenaContractCapital.from_dict(payload)

    assert capital.execution_wallet_scope == "api_key"
    assert capital.starting_equity_musd == 50000
    assert capital.independent_wallet_since == "2026-09-05"
    assert capital.to_dict() == payload


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
