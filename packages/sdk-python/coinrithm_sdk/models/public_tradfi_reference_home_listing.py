from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

T = TypeVar("T", bound="PublicTradfiReferenceHomeListing")


@_attrs_define
class PublicTradfiReferenceHomeListing:
    """Home-market listing of an instrument quoted outside the US.

    Attributes:
        exchange (str): `KRX` or `HKEX`.
        currency (str): `KRW` or `HKD`.
        code (str): Home-market code without the exchange suffix.
    """

    exchange: str
    currency: str
    code: str
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        exchange = self.exchange

        currency = self.currency

        code = self.code

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "exchange": exchange,
                "currency": currency,
                "code": code,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        exchange = d.pop("exchange")

        currency = d.pop("currency")

        code = d.pop("code")

        public_tradfi_reference_home_listing = cls(
            exchange=exchange,
            currency=currency,
            code=code,
        )

        public_tradfi_reference_home_listing.additional_properties = d
        return public_tradfi_reference_home_listing

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
