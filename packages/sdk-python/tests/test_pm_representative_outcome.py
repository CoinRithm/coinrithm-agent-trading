from coinrithm_sdk.models.public_pm_event import PublicPmEvent
from coinrithm_sdk.models.public_pm_event_representative_outcome_basis import (
    PublicPmEventRepresentativeOutcomeBasis,
)
from coinrithm_sdk.models.public_pm_outcome import PublicPmOutcome
from coinrithm_sdk.types import UNSET

# Event-detail shape served for kalshi/kxnfltotal-26oct04indwas (backend #86),
# trimmed to two of its lines.
LINE = {
    "externalMarketId": "KXNFLTOTAL-26OCT04INDWAS-46",
    "name": "Over 46.5 points",
    "probability": 51,
    "hasObservedPrice": True,
    "lifecycle": {"state": "open", "isResult": False},
}
EVENT = {
    "id": "KXNFLTOTAL-26OCT04INDWAS",
    "slug": "kxnfltotal-26oct04indwas",
    "title": "IND Colts vs WAS Commanders: Total Points",
    "status": "open",
    "source": {"id": "kalshi", "name": "Kalshi"},
    "outcomes": [
        {
            "externalMarketId": "KXNFLTOTAL-26OCT04INDWAS-28",
            "name": "Over 28.5 points",
            "probability": 93,
        },
        LINE,
    ],
}


def test_representative_outcome_parses_as_a_full_outcome_and_round_trips() -> None:
    event = PublicPmEvent.from_dict(
        {
            **EVENT,
            "representativeOutcome": LINE,
            "representativeOutcomeBasis": "threshold_ladder_line",
        }
    )
    assert isinstance(event.representative_outcome, PublicPmOutcome)
    assert event.representative_outcome.name == "Over 46.5 points"
    assert event.representative_outcome.probability == 51
    assert (
        event.representative_outcome_basis
        == PublicPmEventRepresentativeOutcomeBasis.THRESHOLD_LADDER_LINE
    )
    served = event.to_dict()
    # Undeclared outcome fields (lifecycle) survive the round trip.
    assert served["representativeOutcome"] == LINE
    assert served["representativeOutcomeBasis"] == "threshold_ladder_line"


def test_null_pick_is_kept_and_both_fields_stay_optional() -> None:
    no_pick = PublicPmEvent.from_dict(
        {
            **EVENT,
            "representativeOutcome": None,
            "representativeOutcomeBasis": "informative_leader",
        }
    )
    assert no_pick.representative_outcome is None
    assert no_pick.to_dict()["representativeOutcome"] is None

    # Closed events and older payloads carry neither field.
    older = PublicPmEvent.from_dict(EVENT)
    assert older.representative_outcome is UNSET
    assert older.representative_outcome_basis is UNSET
    assert "representativeOutcome" not in older.to_dict()
    assert "representativeOutcomeBasis" not in older.to_dict()
