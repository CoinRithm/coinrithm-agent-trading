from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

if TYPE_CHECKING:
    from ..models.public_tradfi_reference_change import PublicTradfiReferenceChange
    from ..models.public_tradfi_reference_freshness import PublicTradfiReferenceFreshness
    from ..models.public_tradfi_reference_history_window import PublicTradfiReferenceHistoryWindow
    from ..models.public_tradfi_reference_instrument import PublicTradfiReferenceInstrument
    from ..models.public_tradfi_reference_live import PublicTradfiReferenceLive
    from ..models.public_tradfi_reference_methodology import PublicTradfiReferenceMethodology
    from ..models.public_tradfi_reference_range import PublicTradfiReferenceRange
    from ..models.public_tradfi_reference_snapshot import PublicTradfiReferenceSnapshot


T = TypeVar("T", bound="PublicTradfiReferenceDetail")


@_attrs_define
class PublicTradfiReferenceDetail:
    """
    Attributes:
        version (int):
        generated_at (datetime.datetime):
        methodology (PublicTradfiReferenceMethodology):
        instrument (PublicTradfiReferenceInstrument):
        availability (str): `available` or `unavailable`.
        freshness (PublicTradfiReferenceFreshness):
        latest (None | PublicTradfiReferenceSnapshot):
        change24h (None | PublicTradfiReferenceChange):
        change7d (None | PublicTradfiReferenceChange):
        range24h (None | PublicTradfiReferenceRange):
        live (None | PublicTradfiReferenceLive):
        history (list[PublicTradfiReferenceSnapshot]): Recorded 15-minute snapshots in the window, oldest first.
        history_window (PublicTradfiReferenceHistoryWindow):
    """

    version: int
    generated_at: datetime.datetime
    methodology: PublicTradfiReferenceMethodology
    instrument: PublicTradfiReferenceInstrument
    availability: str
    freshness: PublicTradfiReferenceFreshness
    latest: None | PublicTradfiReferenceSnapshot
    change24h: None | PublicTradfiReferenceChange
    change7d: None | PublicTradfiReferenceChange
    range24h: None | PublicTradfiReferenceRange
    live: None | PublicTradfiReferenceLive
    history: list[PublicTradfiReferenceSnapshot]
    history_window: PublicTradfiReferenceHistoryWindow
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        from ..models.public_tradfi_reference_change import PublicTradfiReferenceChange
        from ..models.public_tradfi_reference_live import PublicTradfiReferenceLive
        from ..models.public_tradfi_reference_range import PublicTradfiReferenceRange
        from ..models.public_tradfi_reference_snapshot import PublicTradfiReferenceSnapshot

        version = self.version

        generated_at = self.generated_at.isoformat()

        methodology = self.methodology.to_dict()

        instrument = self.instrument.to_dict()

        availability = self.availability

        freshness = self.freshness.to_dict()

        latest: dict[str, Any] | None
        if isinstance(self.latest, PublicTradfiReferenceSnapshot):
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

        live: dict[str, Any] | None
        if isinstance(self.live, PublicTradfiReferenceLive):
            live = self.live.to_dict()
        else:
            live = self.live

        history = []
        for history_item_data in self.history:
            history_item = history_item_data.to_dict()
            history.append(history_item)

        history_window = self.history_window.to_dict()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "version": version,
                "generatedAt": generated_at,
                "methodology": methodology,
                "instrument": instrument,
                "availability": availability,
                "freshness": freshness,
                "latest": latest,
                "change24h": change24h,
                "change7d": change7d,
                "range24h": range24h,
                "live": live,
                "history": history,
                "historyWindow": history_window,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.public_tradfi_reference_change import PublicTradfiReferenceChange
        from ..models.public_tradfi_reference_freshness import PublicTradfiReferenceFreshness
        from ..models.public_tradfi_reference_history_window import PublicTradfiReferenceHistoryWindow
        from ..models.public_tradfi_reference_instrument import PublicTradfiReferenceInstrument
        from ..models.public_tradfi_reference_live import PublicTradfiReferenceLive
        from ..models.public_tradfi_reference_methodology import PublicTradfiReferenceMethodology
        from ..models.public_tradfi_reference_range import PublicTradfiReferenceRange
        from ..models.public_tradfi_reference_snapshot import PublicTradfiReferenceSnapshot

        d = dict(src_dict)
        version = d.pop("version")

        generated_at = datetime.datetime.fromisoformat(d.pop("generatedAt").replace("Z", "+00:00"))

        methodology = PublicTradfiReferenceMethodology.from_dict(d.pop("methodology"))

        instrument = PublicTradfiReferenceInstrument.from_dict(d.pop("instrument"))

        availability = d.pop("availability")

        freshness = PublicTradfiReferenceFreshness.from_dict(d.pop("freshness"))

        def _parse_latest(data: object) -> None | PublicTradfiReferenceSnapshot:
            if data is None:
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                latest_type_0 = PublicTradfiReferenceSnapshot.from_dict(data)

                return latest_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | PublicTradfiReferenceSnapshot, data)

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

        history = []
        _history = d.pop("history")
        for history_item_data in _history:
            history_item = PublicTradfiReferenceSnapshot.from_dict(history_item_data)

            history.append(history_item)

        history_window = PublicTradfiReferenceHistoryWindow.from_dict(d.pop("historyWindow"))

        public_tradfi_reference_detail = cls(
            version=version,
            generated_at=generated_at,
            methodology=methodology,
            instrument=instrument,
            availability=availability,
            freshness=freshness,
            latest=latest,
            change24h=change24h,
            change7d=change7d,
            range24h=range24h,
            live=live,
            history=history,
            history_window=history_window,
        )

        public_tradfi_reference_detail.additional_properties = d
        return public_tradfi_reference_detail

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
