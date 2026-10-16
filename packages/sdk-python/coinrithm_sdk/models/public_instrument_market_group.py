from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

if TYPE_CHECKING:
    from ..models.public_instrument_market_ladder import PublicInstrumentMarketLadder


T = TypeVar("T", bound="PublicInstrumentMarketGroup")


@_attrs_define
class PublicInstrumentMarketGroup:
    """
    Attributes:
        expires_at (datetime.datetime):
        settlement_source (str):
        settlement_note (str):
        ladders (list[PublicInstrumentMarketLadder]):
    """

    expires_at: datetime.datetime
    settlement_source: str
    settlement_note: str
    ladders: list[PublicInstrumentMarketLadder]
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        expires_at = self.expires_at.isoformat()

        settlement_source = self.settlement_source

        settlement_note = self.settlement_note

        ladders = []
        for ladders_item_data in self.ladders:
            ladders_item = ladders_item_data.to_dict()
            ladders.append(ladders_item)

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "expiresAt": expires_at,
                "settlementSource": settlement_source,
                "settlementNote": settlement_note,
                "ladders": ladders,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.public_instrument_market_ladder import PublicInstrumentMarketLadder

        d = dict(src_dict)
        expires_at = datetime.datetime.fromisoformat(d.pop("expiresAt").replace("Z", "+00:00"))

        settlement_source = d.pop("settlementSource")

        settlement_note = d.pop("settlementNote")

        ladders = []
        _ladders = d.pop("ladders")
        for ladders_item_data in _ladders:
            ladders_item = PublicInstrumentMarketLadder.from_dict(ladders_item_data)

            ladders.append(ladders_item)

        public_instrument_market_group = cls(
            expires_at=expires_at,
            settlement_source=settlement_source,
            settlement_note=settlement_note,
            ladders=ladders,
        )

        public_instrument_market_group.additional_properties = d
        return public_instrument_market_group

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
