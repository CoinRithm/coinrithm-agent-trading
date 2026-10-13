from __future__ import annotations

from collections.abc import Mapping
from typing import Any, Literal, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

T = TypeVar("T", bound="PmPaperV2NativeIdentityType0")


@_attrs_define
class PmPaperV2NativeIdentityType0:
    """
    Attributes:
        venue (Literal['polymarket']):
        market (str): Condition id.
        token_id (str): The exact token bought.
    """

    venue: Literal["polymarket"]
    market: str
    token_id: str
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        venue = self.venue

        market = self.market

        token_id = self.token_id

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "venue": venue,
                "market": market,
                "tokenId": token_id,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        venue = cast(Literal["polymarket"], d.pop("venue"))
        if venue != "polymarket":
            raise ValueError(f"venue must match const 'polymarket', got '{venue}'")

        market = d.pop("market")

        token_id = d.pop("tokenId")

        pm_paper_v2_native_identity_type_0 = cls(
            venue=venue,
            market=market,
            token_id=token_id,
        )

        pm_paper_v2_native_identity_type_0.additional_properties = d
        return pm_paper_v2_native_identity_type_0

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
