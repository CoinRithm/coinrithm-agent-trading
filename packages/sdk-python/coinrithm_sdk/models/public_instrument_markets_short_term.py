from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.public_instrument_markets_short_term_items_item import PublicInstrumentMarketsShortTermItemsItem
    from ..models.public_instrument_markets_short_term_venues import PublicInstrumentMarketsShortTermVenues


T = TypeVar("T", bound="PublicInstrumentMarketsShortTerm")


@_attrs_define
class PublicInstrumentMarketsShortTerm:
    """
    Attributes:
        up_down_open (int): Open short-term up/down markets on this instrument (not ladders).
        next_expires_at (datetime.datetime | None | Unset):
        venues (PublicInstrumentMarketsShortTermVenues | Unset):
        items (list[PublicInstrumentMarketsShortTermItemsItem] | Unset):
    """

    up_down_open: int
    next_expires_at: datetime.datetime | None | Unset = UNSET
    venues: PublicInstrumentMarketsShortTermVenues | Unset = UNSET
    items: list[PublicInstrumentMarketsShortTermItemsItem] | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        up_down_open = self.up_down_open

        next_expires_at: None | str | Unset
        if isinstance(self.next_expires_at, Unset):
            next_expires_at = UNSET
        elif isinstance(self.next_expires_at, datetime.datetime):
            next_expires_at = self.next_expires_at.isoformat()
        else:
            next_expires_at = self.next_expires_at

        venues: dict[str, Any] | Unset = UNSET
        if not isinstance(self.venues, Unset):
            venues = self.venues.to_dict()

        items: list[dict[str, Any]] | Unset = UNSET
        if not isinstance(self.items, Unset):
            items = []
            for items_item_data in self.items:
                items_item = items_item_data.to_dict()
                items.append(items_item)

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "upDownOpen": up_down_open,
            }
        )
        if next_expires_at is not UNSET:
            field_dict["nextExpiresAt"] = next_expires_at
        if venues is not UNSET:
            field_dict["venues"] = venues
        if items is not UNSET:
            field_dict["items"] = items

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.public_instrument_markets_short_term_items_item import PublicInstrumentMarketsShortTermItemsItem
        from ..models.public_instrument_markets_short_term_venues import PublicInstrumentMarketsShortTermVenues

        d = dict(src_dict)
        up_down_open = d.pop("upDownOpen")

        def _parse_next_expires_at(data: object) -> datetime.datetime | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                next_expires_at_type_0 = datetime.datetime.fromisoformat(data.replace("Z", "+00:00"))

                return next_expires_at_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None | Unset, data)

        next_expires_at = _parse_next_expires_at(d.pop("nextExpiresAt", UNSET))

        _venues = d.pop("venues", UNSET)
        venues: PublicInstrumentMarketsShortTermVenues | Unset
        if isinstance(_venues, Unset):
            venues = UNSET
        else:
            venues = PublicInstrumentMarketsShortTermVenues.from_dict(_venues)

        _items = d.pop("items", UNSET)
        items: list[PublicInstrumentMarketsShortTermItemsItem] | Unset = UNSET
        if _items is not UNSET:
            items = []
            for items_item_data in _items:
                items_item = PublicInstrumentMarketsShortTermItemsItem.from_dict(items_item_data)

                items.append(items_item)

        public_instrument_markets_short_term = cls(
            up_down_open=up_down_open,
            next_expires_at=next_expires_at,
            venues=venues,
            items=items,
        )

        public_instrument_markets_short_term.additional_properties = d
        return public_instrument_markets_short_term

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
