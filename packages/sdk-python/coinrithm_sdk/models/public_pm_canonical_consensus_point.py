from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define

from ..models.public_pm_canonical_consensus_point_kind import PublicPmCanonicalConsensusPointKind
from ..models.public_pm_canonical_consensus_point_weight_basis_type_0 import (
    PublicPmCanonicalConsensusPointWeightBasisType0,
)
from ..types import UNSET, Unset

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
        methodology_version (str | Unset): Writer version of this day's row; a day is grouped per (version, weight
            basis).
        weight_basis (None | PublicPmCanonicalConsensusPointWeightBasisType0 | Unset): Unit the venues were weighted in;
            every v2 row is `liquidity`.
    """

    day: datetime.date
    kind: PublicPmCanonicalConsensusPointKind
    outcome_name: None | str
    probability: float
    venue_count: int
    spread_points: float
    methodology_version: str | Unset = UNSET
    weight_basis: None | PublicPmCanonicalConsensusPointWeightBasisType0 | Unset = UNSET

    def to_dict(self) -> dict[str, Any]:
        day = self.day.isoformat()

        kind = self.kind.value

        outcome_name: None | str
        outcome_name = self.outcome_name

        probability = self.probability

        venue_count = self.venue_count

        spread_points = self.spread_points

        methodology_version = self.methodology_version

        weight_basis: None | str | Unset
        if isinstance(self.weight_basis, Unset):
            weight_basis = UNSET
        elif isinstance(self.weight_basis, PublicPmCanonicalConsensusPointWeightBasisType0):
            weight_basis = self.weight_basis.value
        else:
            weight_basis = self.weight_basis

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
        if methodology_version is not UNSET:
            field_dict["methodologyVersion"] = methodology_version
        if weight_basis is not UNSET:
            field_dict["weightBasis"] = weight_basis

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

        methodology_version = d.pop("methodologyVersion", UNSET)

        def _parse_weight_basis(data: object) -> None | PublicPmCanonicalConsensusPointWeightBasisType0 | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                weight_basis_type_0 = PublicPmCanonicalConsensusPointWeightBasisType0(data)

                return weight_basis_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | PublicPmCanonicalConsensusPointWeightBasisType0 | Unset, data)

        weight_basis = _parse_weight_basis(d.pop("weightBasis", UNSET))

        public_pm_canonical_consensus_point = cls(
            day=day,
            kind=kind,
            outcome_name=outcome_name,
            probability=probability,
            venue_count=venue_count,
            spread_points=spread_points,
            methodology_version=methodology_version,
            weight_basis=weight_basis,
        )

        return public_pm_canonical_consensus_point
