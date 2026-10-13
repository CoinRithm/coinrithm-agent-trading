from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

T = TypeVar("T", bound="PublicTradfiReferenceUnit")


@_attrs_define
class PublicTradfiReferenceUnit:
    """The index denomination is deliberately not inferred; `status` is `unverified`.

    Attributes:
        status (str):
        currency (None | str):
        per (None | str):
    """

    status: str
    currency: None | str
    per: None | str
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        status = self.status

        currency: None | str
        currency = self.currency

        per: None | str
        per = self.per

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "status": status,
                "currency": currency,
                "per": per,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        status = d.pop("status")

        def _parse_currency(data: object) -> None | str:
            if data is None:
                return data
            return cast(None | str, data)

        currency = _parse_currency(d.pop("currency"))

        def _parse_per(data: object) -> None | str:
            if data is None:
                return data
            return cast(None | str, data)

        per = _parse_per(d.pop("per"))

        public_tradfi_reference_unit = cls(
            status=status,
            currency=currency,
            per=per,
        )

        public_tradfi_reference_unit.additional_properties = d
        return public_tradfi_reference_unit

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
