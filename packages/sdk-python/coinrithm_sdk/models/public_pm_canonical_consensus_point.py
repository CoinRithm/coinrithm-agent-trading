from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define

from ..models.public_pm_canonical_consensus_point_kind import PublicPmCanonicalConsensusPointKind

T = TypeVar("T", bound="PublicPmCanonicalConsensusPoint")


@_attrs_define
class PublicPmCanonicalConsensusPoint:
    """
    Attributes:
        day (datetime.date):
        kind (PublicPmCanonicalConsensusPointKind):
        outcome_name (None | str): This point's own outcome label; null for a binary reference.
        probability (float):
        venue_count (int):
        spread_points (float):
    """

    day: datetime.date
    kind: PublicPmCanonicalConsensusPointKind
    outcome_name: None | str
    probability: float
    venue_count: int
    spread_points: float

    def to_dict(self) -> dict[str, Any]:
        day = self.day.isoformat()

        kind = self.kind.value

        outcome_name: None | str
        outcome_name = self.outcome_name

        probability = self.probability

        venue_count = self.venue_count

        spread_points = self.spread_points

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "day": day,
                "kind": kind,
                "outcomeName": outcome_name,
                "probability": probability,
                "venueCount": venue_count,
                "spreadPoints": spread_points,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        day = datetime.date.fromisoformat(d.pop("day"))

        kind = PublicPmCanonicalConsensusPointKind(d.pop("kind"))

        def _parse_outcome_name(data: object) -> None | str:
            if data is None:
                return data
            return cast(None | str, data)

        outcome_name = _parse_outcome_name(d.pop("outcomeName"))

        probability = d.pop("probability")

        venue_count = d.pop("venueCount")

        spread_points = d.pop("spreadPoints")

        public_pm_canonical_consensus_point = cls(
            day=day,
            kind=kind,
            outcome_name=outcome_name,
            probability=probability,
            venue_count=venue_count,
            spread_points=spread_points,
        )

        return public_pm_canonical_consensus_point
