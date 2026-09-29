from coinrithm_sdk.models.public_pm_event import PublicPmEvent
from coinrithm_sdk.types import UNSET

# Served 2026-09-29 by GET /api/prediction-markets/events/kalshi/
# kxdota2totalmaps-26sep290200iapyg (trimmed): the title leaves out what Yes
# means; marketSubtitle carries it. Outcome names stay "Yes"/"No".
SERVED = {
    "id": "KXDOTA2TOTALMAPS-26SEP290200IAPYG",
    "slug": "kxdota2totalmaps-26sep290200iapyg",
    "title": "InterActive Philippines vs. Yangon Galacticos: Total Maps",
    "marketSubtitle": "Over 2.5 maps",
    "status": "open",
    "source": {"id": "kalshi", "name": "Kalshi"},
    "outcomes": [
        {"externalMarketId": "KXDOTA2TOTALMAPS-26SEP290200IAPYG-2:no", "name": "No", "probability": 40},
        {"externalMarketId": "KXDOTA2TOTALMAPS-26SEP290200IAPYG-2:yes", "name": "Yes", "probability": 60},
    ],
}


def test_market_subtitle_parses_and_round_trips() -> None:
    event = PublicPmEvent.from_dict(SERVED)
    assert event.market_subtitle == "Over 2.5 maps"
    assert event.to_dict()["marketSubtitle"] == "Over 2.5 maps"
    assert [o.name for o in event.outcomes] == ["No", "Yes"]


def test_market_subtitle_is_optional() -> None:
    other = {k: v for k, v in SERVED.items() if k != "marketSubtitle"}
    event = PublicPmEvent.from_dict(other)
    assert event.market_subtitle is UNSET
    assert "marketSubtitle" not in event.to_dict()
