from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define

from ..models.public_pm_canonical_consensus_kind import PublicPmCanonicalConsensusKind

if TYPE_CHECKING:
    from ..models.public_pm_canonical_consensus_listings_item import PublicPmCanonicalConsensusListingsItem


T = TypeVar("T", bound="PublicPmCanonicalConsensus")


@_attrs_define
class PublicPmCanonicalConsensus:
    """The cross-venue reference probability for one canonical question. Every
    open member holding a current reference must agree on the full tuple
    (cluster, kind, outcome, probability, venueCount, spread); a binary
    reference additionally needs every holder aligned with the canonical
    anchor. Any disagreement yields null instead of a pick.

        Attributes:
            kind (PublicPmCanonicalConsensusKind): binary = the Yes side; leader = the leading named outcome.
            outcome_name (None | str): Label of the leading outcome; null for a binary reference.
            probability (float): Consensus probability in percent (0-100).
            venue_count (int): Number of venues that contributed a voice.
            spread_points (float): Cross-venue spread in probability points.
            computed_at (datetime.datetime): Validated computation (heartbeat) time, not a quote or trade time.
            methodology_version (str):
            listings (list[PublicPmCanonicalConsensusListingsItem]): Public listings of member events that hold this
                reference. May be a
                subset of the contributing venues and may include several listings
                of one venue; its length is not venueCount.
    """

    kind: PublicPmCanonicalConsensusKind
    outcome_name: None | str
    probability: float
    venue_count: int
    spread_points: float
    computed_at: datetime.datetime
    methodology_version: str
    listings: list[PublicPmCanonicalConsensusListingsItem]

    def to_dict(self) -> dict[str, Any]:
        kind = self.kind.value

        outcome_name: None | str
        outcome_name = self.outcome_name

        probability = self.probability

        venue_count = self.venue_count

        spread_points = self.spread_points

        computed_at = self.computed_at.isoformat()

        methodology_version = self.methodology_version

        listings = []
        for listings_item_data in self.listings:
            listings_item = listings_item_data.to_dict()
            listings.append(listings_item)

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "kind": kind,
                "outcomeName": outcome_name,
                "probability": probability,
                "venueCount": venue_count,
                "spreadPoints": spread_points,
                "computedAt": computed_at,
                "methodologyVersion": methodology_version,
                "listings": listings,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.public_pm_canonical_consensus_listings_item import PublicPmCanonicalConsensusListingsItem

        d = dict(src_dict)
        kind = PublicPmCanonicalConsensusKind(d.pop("kind"))

        def _parse_outcome_name(data: object) -> None | str:
            if data is None:
                return data
            return cast(None | str, data)

        outcome_name = _parse_outcome_name(d.pop("outcomeName"))

        probability = d.pop("probability")

        venue_count = d.pop("venueCount")

        spread_points = d.pop("spreadPoints")

        computed_at = datetime.datetime.fromisoformat(d.pop("computedAt"))

        methodology_version = d.pop("methodologyVersion")

        listings = []
        _listings = d.pop("listings")
        for listings_item_data in _listings:
            listings_item = PublicPmCanonicalConsensusListingsItem.from_dict(listings_item_data)

            listings.append(listings_item)

        public_pm_canonical_consensus = cls(
            kind=kind,
            outcome_name=outcome_name,
            probability=probability,
            venue_count=venue_count,
            spread_points=spread_points,
            computed_at=computed_at,
            methodology_version=methodology_version,
            listings=listings,
        )

        return public_pm_canonical_consensus
