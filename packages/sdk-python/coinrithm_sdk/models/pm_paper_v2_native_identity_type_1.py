from __future__ import annotations

from collections.abc import Mapping
from typing import Any, Literal, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.pm_paper_v2_native_identity_type_1_side import PmPaperV2NativeIdentityType1Side

T = TypeVar("T", bound="PmPaperV2NativeIdentityType1")


@_attrs_define
class PmPaperV2NativeIdentityType1:
    """
    Attributes:
        venue (Literal['kalshi']):
        requested_ticker (str):
        side (PmPaperV2NativeIdentityType1Side): Native Kalshi side bought.
    """

    venue: Literal["kalshi"]
    requested_ticker: str
    side: PmPaperV2NativeIdentityType1Side
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        venue = self.venue

        requested_ticker = self.requested_ticker

        side = self.side.value

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "venue": venue,
                "requestedTicker": requested_ticker,
                "side": side,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        venue = cast(Literal["kalshi"], d.pop("venue"))
        if venue != "kalshi":
            raise ValueError(f"venue must match const 'kalshi', got '{venue}'")

        requested_ticker = d.pop("requestedTicker")

        side = PmPaperV2NativeIdentityType1Side(d.pop("side"))

        pm_paper_v2_native_identity_type_1 = cls(
            venue=venue,
            requested_ticker=requested_ticker,
            side=side,
        )

        pm_paper_v2_native_identity_type_1.additional_properties = d
        return pm_paper_v2_native_identity_type_1

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
