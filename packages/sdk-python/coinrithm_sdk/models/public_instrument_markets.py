from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.public_instrument_markets_horizon import PublicInstrumentMarketsHorizon
from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.public_instrument_market_group import PublicInstrumentMarketGroup
    from ..models.public_instrument_markets_coverage import PublicInstrumentMarketsCoverage
    from ..models.public_instrument_markets_cross_venue_item import PublicInstrumentMarketsCrossVenueItem
    from ..models.public_instrument_markets_instrument import PublicInstrumentMarketsInstrument
    from ..models.public_instrument_markets_meta import PublicInstrumentMarketsMeta
    from ..models.public_instrument_markets_reference import PublicInstrumentMarketsReference
    from ..models.public_instrument_markets_short_term import PublicInstrumentMarketsShortTerm


T = TypeVar("T", bound="PublicInstrumentMarkets")


@_attrs_define
class PublicInstrumentMarkets:
    """
    Attributes:
        version (int):
        instrument (PublicInstrumentMarketsInstrument):
        reference (PublicInstrumentMarketsReference): The live series to read for a current-price marker. The payload
            carries no price.
        generated_at (datetime.datetime):
        horizon (PublicInstrumentMarketsHorizon):
        groups (list[PublicInstrumentMarketGroup]):
        cross_venue (list[PublicInstrumentMarketsCrossVenueItem]): Contracts with an equal equivalence key on two or
            more venues, traded on each leg.
        short_term (PublicInstrumentMarketsShortTerm):
        coverage (PublicInstrumentMarketsCoverage):
        disclaimer (str):
        meta (PublicInstrumentMarketsMeta | Unset):
    """

    version: int
    instrument: PublicInstrumentMarketsInstrument
    reference: PublicInstrumentMarketsReference
    generated_at: datetime.datetime
    horizon: PublicInstrumentMarketsHorizon
    groups: list[PublicInstrumentMarketGroup]
    cross_venue: list[PublicInstrumentMarketsCrossVenueItem]
    short_term: PublicInstrumentMarketsShortTerm
    coverage: PublicInstrumentMarketsCoverage
    disclaimer: str
    meta: PublicInstrumentMarketsMeta | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        version = self.version

        instrument = self.instrument.to_dict()

        reference = self.reference.to_dict()

        generated_at = self.generated_at.isoformat()

        horizon = self.horizon.value

        groups = []
        for groups_item_data in self.groups:
            groups_item = groups_item_data.to_dict()
            groups.append(groups_item)

        cross_venue = []
        for cross_venue_item_data in self.cross_venue:
            cross_venue_item = cross_venue_item_data.to_dict()
            cross_venue.append(cross_venue_item)

        short_term = self.short_term.to_dict()

        coverage = self.coverage.to_dict()

        disclaimer = self.disclaimer

        meta: dict[str, Any] | Unset = UNSET
        if not isinstance(self.meta, Unset):
            meta = self.meta.to_dict()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "version": version,
                "instrument": instrument,
                "reference": reference,
                "generatedAt": generated_at,
                "horizon": horizon,
                "groups": groups,
                "crossVenue": cross_venue,
                "shortTerm": short_term,
                "coverage": coverage,
                "disclaimer": disclaimer,
            }
        )
        if meta is not UNSET:
            field_dict["meta"] = meta

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.public_instrument_market_group import PublicInstrumentMarketGroup
        from ..models.public_instrument_markets_coverage import PublicInstrumentMarketsCoverage
        from ..models.public_instrument_markets_cross_venue_item import PublicInstrumentMarketsCrossVenueItem
        from ..models.public_instrument_markets_instrument import PublicInstrumentMarketsInstrument
        from ..models.public_instrument_markets_meta import PublicInstrumentMarketsMeta
        from ..models.public_instrument_markets_reference import PublicInstrumentMarketsReference
        from ..models.public_instrument_markets_short_term import PublicInstrumentMarketsShortTerm

        d = dict(src_dict)
        version = d.pop("version")

        instrument = PublicInstrumentMarketsInstrument.from_dict(d.pop("instrument"))

        reference = PublicInstrumentMarketsReference.from_dict(d.pop("reference"))

        generated_at = datetime.datetime.fromisoformat(d.pop("generatedAt").replace("Z", "+00:00"))

        horizon = PublicInstrumentMarketsHorizon(d.pop("horizon"))

        groups = []
        _groups = d.pop("groups")
        for groups_item_data in _groups:
            groups_item = PublicInstrumentMarketGroup.from_dict(groups_item_data)

            groups.append(groups_item)

        cross_venue = []
        _cross_venue = d.pop("crossVenue")
        for cross_venue_item_data in _cross_venue:
            cross_venue_item = PublicInstrumentMarketsCrossVenueItem.from_dict(cross_venue_item_data)

            cross_venue.append(cross_venue_item)

        short_term = PublicInstrumentMarketsShortTerm.from_dict(d.pop("shortTerm"))

        coverage = PublicInstrumentMarketsCoverage.from_dict(d.pop("coverage"))

        disclaimer = d.pop("disclaimer")

        _meta = d.pop("meta", UNSET)
        meta: PublicInstrumentMarketsMeta | Unset
        if isinstance(_meta, Unset):
            meta = UNSET
        else:
            meta = PublicInstrumentMarketsMeta.from_dict(_meta)

        public_instrument_markets = cls(
            version=version,
            instrument=instrument,
            reference=reference,
            generated_at=generated_at,
            horizon=horizon,
            groups=groups,
            cross_venue=cross_venue,
            short_term=short_term,
            coverage=coverage,
            disclaimer=disclaimer,
            meta=meta,
        )

        public_instrument_markets.additional_properties = d
        return public_instrument_markets

    @property
    def additional_keys(self) -> list[str]:
        return list(self.additional_properties.keys())

    def __getitem__(self, key: str) -> Any:
        return self.additional_properties[key]

    def __setitem__(self, key: str, value: Any) -> None:
        self.additional_properties[key] = value

    def __delitem__(self, key: str) -> None:
        del self.additional_properties[key]

    def __contains__(self, key: str) -> bool:
        return key in self.additional_properties
