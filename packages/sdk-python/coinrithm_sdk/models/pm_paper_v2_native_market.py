from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.pm_paper_v2_native_market_venue import PmPaperV2NativeMarketVenue

T = TypeVar("T", bound="PmPaperV2NativeMarket")


@_attrs_define
class PmPaperV2NativeMarket:
    """
    Attributes:
        venue (PmPaperV2NativeMarketVenue):
        key (str): Venue market key independent of side and token: `polymarket:<conditionId,
            lowercased>` or `kalshi:<ticker>`. One open v2 position per key
            per wallet (`duplicate_native_market`).
    """

    venue: PmPaperV2NativeMarketVenue
    key: str
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        venue = self.venue.value

        key = self.key

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "venue": venue,
                "key": key,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        venue = PmPaperV2NativeMarketVenue(d.pop("venue"))

        key = d.pop("key")

        pm_paper_v2_native_market = cls(
            venue=venue,
            key=key,
        )

        pm_paper_v2_native_market.additional_properties = d
        return pm_paper_v2_native_market

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
