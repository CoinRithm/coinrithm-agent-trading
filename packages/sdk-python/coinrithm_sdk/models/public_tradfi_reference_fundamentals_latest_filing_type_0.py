from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

T = TypeVar("T", bound="PublicTradfiReferenceFundamentalsLatestFilingType0")


@_attrs_define
class PublicTradfiReferenceFundamentalsLatestFilingType0:
    """
    Attributes:
        form (str):
        date (datetime.date):
    """

    form: str
    date: datetime.date
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        form = self.form

        date = self.date.isoformat()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "form": form,
                "date": date,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        form = d.pop("form")

        date = datetime.date.fromisoformat(d.pop("date"))

        public_tradfi_reference_fundamentals_latest_filing_type_0 = cls(
            form=form,
            date=date,
        )

        public_tradfi_reference_fundamentals_latest_filing_type_0.additional_properties = d
        return public_tradfi_reference_fundamentals_latest_filing_type_0

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
