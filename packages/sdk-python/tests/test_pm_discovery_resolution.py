from coinrithm_sdk.models.pm_discovery_market import PmDiscoveryMarket
from coinrithm_sdk.types import UNSET

# Discover row shape from backend-v2 #111 (controllers/agent/pmResolution.ts),
# built from the resolutionCriteria served 2026-09-30 for
# polymarket/microstrategy-sell-any-bitcoin-in-2025 (trimmed).
PUBLISHED = {
    "source": "polymarket",
    "slug": "microstrategy-sell-any-bitcoin-in-2025",
    "resolution": {
        "published": True,
        "rules": 'This market will resolve to "Yes" if MicroStrategy sells any of its Bitcoin by the named outcome, 11:59 PM ET. Otherwise, this market will resolve to "No".',
        "rulesTruncated": False,
        "settlementSource": None,
        "settlementSources": [{"name": "Associated Press", "url": "https://apnews.com"}],
    },
}


def test_resolution_parses_and_round_trips() -> None:
    market = PmDiscoveryMarket.from_dict(PUBLISHED)
    assert market.resolution.published is True
    assert market.resolution.rules.startswith('This market will resolve to "Yes"')
    assert market.to_dict()["resolution"] == PUBLISHED["resolution"]


def test_null_and_absent_resolution_stay_distinct() -> None:
    explicit = PmDiscoveryMarket.from_dict({**PUBLISHED, "resolution": None})
    assert explicit.resolution is None
    assert explicit.to_dict()["resolution"] is None
    legacy = PmDiscoveryMarket.from_dict({"source": "kalshi", "slug": "x"})
    assert legacy.resolution is UNSET
    assert "resolution" not in legacy.to_dict()


def test_unpublished_rule_has_no_text() -> None:
    market = PmDiscoveryMarket.from_dict(
        {
            **PUBLISHED,
            "resolution": {
                "published": False,
                "rules": None,
                "rulesTruncated": False,
                "settlementSource": None,
                "settlementSources": None,
            },
        }
    )
    assert market.resolution.published is False
    assert market.resolution.rules is None
