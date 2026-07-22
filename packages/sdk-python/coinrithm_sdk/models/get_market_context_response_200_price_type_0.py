from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset
from typing import cast






T = TypeVar("T", bound="GetMarketContextResponse200PriceType0")



@_attrs_define
class GetMarketContextResponse200PriceType0:
    """ 
        Attributes:
            usd (float | Unset):
            change1h (float | None | Unset):
            change24h (float | None | Unset):
            change7d (float | None | Unset):
            market_cap_usd (float | None | Unset):
     """

    usd: float | Unset = UNSET
    change1h: float | None | Unset = UNSET
    change24h: float | None | Unset = UNSET
    change7d: float | None | Unset = UNSET
    market_cap_usd: float | None | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)





    def to_dict(self) -> dict[str, Any]:
        usd = self.usd

        change1h: float | None | Unset
        if isinstance(self.change1h, Unset):
            change1h = UNSET
        else:
            change1h = self.change1h

        change24h: float | None | Unset
        if isinstance(self.change24h, Unset):
            change24h = UNSET
        else:
            change24h = self.change24h

        change7d: float | None | Unset
        if isinstance(self.change7d, Unset):
            change7d = UNSET
        else:
            change7d = self.change7d

        market_cap_usd: float | None | Unset
        if isinstance(self.market_cap_usd, Unset):
            market_cap_usd = UNSET
        else:
            market_cap_usd = self.market_cap_usd


        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({
        })
        if usd is not UNSET:
            field_dict["usd"] = usd
        if change1h is not UNSET:
            field_dict["change1h"] = change1h
        if change24h is not UNSET:
            field_dict["change24h"] = change24h
        if change7d is not UNSET:
            field_dict["change7d"] = change7d
        if market_cap_usd is not UNSET:
            field_dict["marketCapUsd"] = market_cap_usd

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        usd = d.pop("usd", UNSET)

        def _parse_change1h(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        change1h = _parse_change1h(d.pop("change1h", UNSET))


        def _parse_change24h(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        change24h = _parse_change24h(d.pop("change24h", UNSET))


        def _parse_change7d(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        change7d = _parse_change7d(d.pop("change7d", UNSET))


        def _parse_market_cap_usd(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        market_cap_usd = _parse_market_cap_usd(d.pop("marketCapUsd", UNSET))


        get_market_context_response_200_price_type_0 = cls(
            usd=usd,
            change1h=change1h,
            change24h=change24h,
            change7d=change7d,
            market_cap_usd=market_cap_usd,
        )


        get_market_context_response_200_price_type_0.additional_properties = d
        return get_market_context_response_200_price_type_0

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
