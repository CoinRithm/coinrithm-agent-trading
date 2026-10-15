"""Typed cross-source comparison rows (pairing, bothSidesTraded, evidence count).

Fixtures are production bodies served by api.coinrithm.com on 2026-10-15 at
04:08 UTC, trimmed by dropping array rows only:
- `pm_cross_source_match.json`: `crossSourceMatches[0]` of the Kalshi
  `kxsb-27` event detail, three of 32 comparison rows (two paired by
  different methods) and two of the matched event's outcomes.
- `pm_disagreements_compact.json`: `/matches/public?view=compact&limit=10`
  with one of ten clusters (a paired row and a `bothSidesTraded: false` row).
Tests make no network calls.
"""

import json
from pathlib import Path

import attrs

from coinrithm_sdk.models import (
    PublicPmComparison,
    PublicPmComparisonOutcome,
    PublicPmDisagreementsResponse,
    PublicPmEventDetailResponseCrossSourceMatchesItem,
    PublicPmOutcomePairing,
)
from coinrithm_sdk.types import UNSET

FIXTURES = Path(__file__).parent / "fixtures"


def fixture(name):
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


def assert_typed(value):
    """Every field the server sent on a comparison is a declared attribute."""
    if attrs.has(type(value)):
        assert not value.additional_keys, (type(value).__name__, value.additional_keys)
        for field in attrs.fields(type(value)):
            assert_typed(getattr(value, field.name))
    elif isinstance(value, list):
        for item in value:
            assert_typed(item)


def test_event_detail_match_types_pairing_and_evidence():
    body = fixture("pm_cross_source_match.json")
    match = PublicPmEventDetailResponseCrossSourceMatchesItem.from_dict(body)
    assert match.to_dict() == body

    comparison = match.comparison
    assert isinstance(comparison, PublicPmComparison)
    assert_typed(comparison)
    summary = comparison.summary
    assert summary.evidenced_shared_outcome_count >= 0
    assert summary.book_structure_a in ("independent", "exclusive", "incomplete")

    paired = [row for row in comparison.outcomes if row.pairing is not UNSET]
    assert {row.pairing.method for row in paired} == {"token_containment", "team_abbreviation"}
    for row in paired:
        assert isinstance(row.pairing, PublicPmOutcomePairing)
        assert row.label == row.pairing.event_a_name
        assert 0 < row.pairing.confidence <= 1
        assert row.both_sides_traded is True
    # Untyped neighbours of `comparison` stay reachable as additional keys.
    assert "matchId" in match.additional_keys


def test_disagreements_rows_keep_untraded_rows_out_of_the_headline():
    body = fixture("pm_disagreements_compact.json")
    response = PublicPmDisagreementsResponse.from_dict(body)
    assert response.to_dict() == body
    cluster = response.data[0]
    rows: list[PublicPmComparisonOutcome] = []
    for entry in cluster.comparisons:
        assert isinstance(entry.event_id, str)
        comparison = entry.pair.comparison
        assert_typed(comparison)
        rows.extend(comparison.outcomes)
        shared = [row for row in comparison.outcomes if row.is_shared]
        evidenced = [row for row in shared if row.both_sides_traded is True]
        assert comparison.summary.evidenced_shared_outcome_count == len(evidenced)
    assert any(row.both_sides_traded is False for row in rows)
    assert any(row.pairing is not UNSET for row in rows)


def test_rows_from_an_older_server_leave_new_fields_unset():
    row = PublicPmComparisonOutcome.from_dict(
        {
            "key": "yes",
            "label": "Yes",
            "eventAProbability": None,
            "eventBProbability": 40,
            "deltaPoints": 0,
            "presentInA": True,
            "presentInB": True,
            "isShared": True,
        }
    )
    assert row.pairing is UNSET and row.both_sides_traded is UNSET
    assert row.event_a_probability is None
