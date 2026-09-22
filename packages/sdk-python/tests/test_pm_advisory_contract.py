from coinrithm_sdk.models.edge_sizing import EdgeSizing
from coinrithm_sdk.models.pm_open_request import PmOpenRequest
from coinrithm_sdk.models.pm_quote_request import PmQuoteRequest
from coinrithm_sdk.models.pm_quote_response import PmQuoteResponse
from coinrithm_sdk.models.pm_quote_request_side import PmQuoteRequestSide


def test_pm_quote_optional_advisory_fields_round_trip() -> None:
    request = PmQuoteRequest(
        source="kalshi",
        slug="fixture",
        outcome_external_market_id="yes",
        stake_musd=25,
        side=PmQuoteRequestSide.NO,
        forecast_probability=42,
        bankroll_musd=1000,
    )
    assert request.to_dict()["forecastProbability"] == 42
    assert request.to_dict()["bankrollMusd"] == 1000

    response = PmQuoteResponse.from_dict(
        {
            "entryProbability": 40,
            "edgeSizing": {
                "basis": "fractional_kelly_capped",
                "edgePoints": 2,
                "suggestedStakeMusd": None,
                "noEdge": False,
            },
        }
    )
    assert isinstance(response.edge_sizing, EdgeSizing)
    assert response.edge_sizing.suggested_stake_musd is None
    assert "edgeSizing" not in PmQuoteResponse().to_dict()


def test_pm_open_thesis_and_forecast_are_optional() -> None:
    request = PmOpenRequest(
        source="kalshi",
        slug="fixture",
        outcome_external_market_id="yes",
        stake_musd=25,
        idempotency_key="fixture-1",
        forecast_probability=42,
        thesis="Inflation cools",
    )
    assert request.to_dict()["forecastProbability"] == 42
    assert request.to_dict()["thesis"] == "Inflation cools"
    assert "thesis" not in PmOpenRequest(
        source="kalshi",
        slug="fixture",
        outcome_external_market_id="yes",
        stake_musd=25,
        idempotency_key="fixture-2",
    ).to_dict()
