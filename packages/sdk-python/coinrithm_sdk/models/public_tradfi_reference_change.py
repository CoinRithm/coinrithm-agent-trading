from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

T = TypeVar("T", bound="PublicTradfiReferenceChange")


@_attrs_define
class PublicTradfiReferenceChange:
    """Change against a validated recorded snapshot at the comparison time (within 30 minutes); never interpolated.

    Attributes:
        pct (float):
        reference_price (float):
        reference_bucket_start (datetime.datetime):
    """

    pct: float
    reference_price: float
    reference_bucket_start: datetime.datetime
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        pct = self.pct

        reference_price = self.reference_price

        reference_bucket_start = self.reference_bucket_start.isoformat()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "pct": pct,
                "referencePrice": reference_price,
                "referenceBucketStart": reference_bucket_start,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        pct = d.pop("pct")

        reference_price = d.pop("referencePrice")

        reference_bucket_start = datetime.datetime.fromisoformat(d.pop("referenceBucketStart").replace("Z", "+00:00"))

        public_tradfi_reference_change = cls(
            pct=pct,
            reference_price=reference_price,
            reference_bucket_start=reference_bucket_start,
        )

        public_tradfi_reference_change.additional_properties = d
        return public_tradfi_reference_change

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
