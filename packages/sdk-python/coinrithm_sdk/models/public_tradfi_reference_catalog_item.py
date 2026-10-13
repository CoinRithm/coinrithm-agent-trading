from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

if TYPE_CHECKING:
    from ..models.public_tradfi_reference_change import PublicTradfiReferenceChange
    from ..models.public_tradfi_reference_freshness import PublicTradfiReferenceFreshness
    from ..models.public_tradfi_reference_instrument import PublicTradfiReferenceInstrument
    from ..models.public_tradfi_reference_live import PublicTradfiReferenceLive
    from ..models.public_tradfi_reference_range import PublicTradfiReferenceRange
    from ..models.public_tradfi_reference_snapshot_summary import PublicTradfiReferenceSnapshotSummary


T = TypeVar("T", bound="PublicTradfiReferenceCatalogItem")


@_attrs_define
class PublicTradfiReferenceCatalogItem:
    """
    Attributes:
        instrument (PublicTradfiReferenceInstrument):
        availability (str): `available` or `unavailable`.
        freshness (PublicTradfiReferenceFreshness):
        latest (None | PublicTradfiReferenceSnapshotSummary):
        change24h (None | PublicTradfiReferenceChange):
        change7d (None | PublicTradfiReferenceChange):
        range24h (None | PublicTradfiReferenceRange):
        spark7d (list[float]): Last validated median of each 3-hour UTC block over the 7 days
            ending at `latest`, oldest first, rounded to 5 significant
            digits; blocks without a validated row are skipped.
        latest_venues (list[str]): Venues that contributed to `latest`.
        live (None | PublicTradfiReferenceLive):
    """

    instrument: PublicTradfiReferenceInstrument
    availability: str
    freshness: PublicTradfiReferenceFreshness
    latest: None | PublicTradfiReferenceSnapshotSummary
    change24h: None | PublicTradfiReferenceChange
    change7d: None | PublicTradfiReferenceChange
    range24h: None | PublicTradfiReferenceRange
    spark7d: list[float]
    latest_venues: list[str]
    live: None | PublicTradfiReferenceLive
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        from ..models.public_tradfi_reference_change import PublicTradfiReferenceChange
        from ..models.public_tradfi_reference_live import PublicTradfiReferenceLive
        from ..models.public_tradfi_reference_range import PublicTradfiReferenceRange
        from ..models.public_tradfi_reference_snapshot_summary import PublicTradfiReferenceSnapshotSummary

        instrument = self.instrument.to_dict()

        availability = self.availability

        freshness = self.freshness.to_dict()

        latest: dict[str, Any] | None
        if isinstance(self.latest, PublicTradfiReferenceSnapshotSummary):
            latest = self.latest.to_dict()
        else:
            latest = self.latest

        change24h: dict[str, Any] | None
        if isinstance(self.change24h, PublicTradfiReferenceChange):
            change24h = self.change24h.to_dict()
        else:
            change24h = self.change24h

        change7d: dict[str, Any] | None
        if isinstance(self.change7d, PublicTradfiReferenceChange):
            change7d = self.change7d.to_dict()
        else:
            change7d = self.change7d

        range24h: dict[str, Any] | None
        if isinstance(self.range24h, PublicTradfiReferenceRange):
            range24h = self.range24h.to_dict()
        else:
            range24h = self.range24h

        spark7d = self.spark7d

        latest_venues = self.latest_venues

        live: dict[str, Any] | None
        if isinstance(self.live, PublicTradfiReferenceLive):
            live = self.live.to_dict()
        else:
            live = self.live

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "instrument": instrument,
                "availability": availability,
                "freshness": freshness,
                "latest": latest,
                "change24h": change24h,
                "change7d": change7d,
                "range24h": range24h,
                "spark7d": spark7d,
                "latestVenues": latest_venues,
                "live": live,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.public_tradfi_reference_change import PublicTradfiReferenceChange
        from ..models.public_tradfi_reference_freshness import PublicTradfiReferenceFreshness
        from ..models.public_tradfi_reference_instrument import PublicTradfiReferenceInstrument
        from ..models.public_tradfi_reference_live import PublicTradfiReferenceLive
        from ..models.public_tradfi_reference_range import PublicTradfiReferenceRange
        from ..models.public_tradfi_reference_snapshot_summary import PublicTradfiReferenceSnapshotSummary

        d = dict(src_dict)
        instrument = PublicTradfiReferenceInstrument.from_dict(d.pop("instrument"))

        availability = d.pop("availability")

        freshness = PublicTradfiReferenceFreshness.from_dict(d.pop("freshness"))

        def _parse_latest(data: object) -> None | PublicTradfiReferenceSnapshotSummary:
            if data is None:
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                latest_type_0 = PublicTradfiReferenceSnapshotSummary.from_dict(data)

                return latest_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | PublicTradfiReferenceSnapshotSummary, data)

        latest = _parse_latest(d.pop("latest"))

        def _parse_change24h(data: object) -> None | PublicTradfiReferenceChange:
            if data is None:
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                change24h_type_0 = PublicTradfiReferenceChange.from_dict(data)

                return change24h_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | PublicTradfiReferenceChange, data)

        change24h = _parse_change24h(d.pop("change24h"))

        def _parse_change7d(data: object) -> None | PublicTradfiReferenceChange:
            if data is None:
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                change7d_type_0 = PublicTradfiReferenceChange.from_dict(data)

                return change7d_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | PublicTradfiReferenceChange, data)

        change7d = _parse_change7d(d.pop("change7d"))

        def _parse_range24h(data: object) -> None | PublicTradfiReferenceRange:
            if data is None:
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                range24h_type_0 = PublicTradfiReferenceRange.from_dict(data)

                return range24h_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | PublicTradfiReferenceRange, data)

        range24h = _parse_range24h(d.pop("range24h"))

        spark7d = cast(list[float], d.pop("spark7d"))

        latest_venues = cast(list[str], d.pop("latestVenues"))

        def _parse_live(data: object) -> None | PublicTradfiReferenceLive:
            if data is None:
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                live_type_0 = PublicTradfiReferenceLive.from_dict(data)

                return live_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | PublicTradfiReferenceLive, data)

        live = _parse_live(d.pop("live"))

        public_tradfi_reference_catalog_item = cls(
            instrument=instrument,
            availability=availability,
            freshness=freshness,
            latest=latest,
            change24h=change24h,
            change7d=change7d,
            range24h=range24h,
            spark7d=spark7d,
            latest_venues=latest_venues,
            live=live,
        )

        public_tradfi_reference_catalog_item.additional_properties = d
        return public_tradfi_reference_catalog_item

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
