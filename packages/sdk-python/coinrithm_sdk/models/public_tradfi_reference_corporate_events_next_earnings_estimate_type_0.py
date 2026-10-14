from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.public_tradfi_reference_corporate_events_next_earnings_estimate_type_0_basis import (
    PublicTradfiReferenceCorporateEventsNextEarningsEstimateType0Basis,
)

T = TypeVar("T", bound="PublicTradfiReferenceCorporateEventsNextEarningsEstimateType0")


@_attrs_define
class PublicTradfiReferenceCorporateEventsNextEarningsEstimateType0:
    """
    Attributes:
        date (datetime.date):
        basis (PublicTradfiReferenceCorporateEventsNextEarningsEstimateType0Basis):
        from_releases (int): Releases the cadence was measured from.
    """

    date: datetime.date
    basis: PublicTradfiReferenceCorporateEventsNextEarningsEstimateType0Basis
    from_releases: int
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        date = self.date.isoformat()

        basis = self.basis.value

        from_releases = self.from_releases

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "date": date,
                "basis": basis,
                "fromReleases": from_releases,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        date = datetime.date.fromisoformat(d.pop("date"))

        basis = PublicTradfiReferenceCorporateEventsNextEarningsEstimateType0Basis(d.pop("basis"))

        from_releases = d.pop("fromReleases")

        public_tradfi_reference_corporate_events_next_earnings_estimate_type_0 = cls(
            date=date,
            basis=basis,
            from_releases=from_releases,
        )

        public_tradfi_reference_corporate_events_next_earnings_estimate_type_0.additional_properties = d
        return public_tradfi_reference_corporate_events_next_earnings_estimate_type_0

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
