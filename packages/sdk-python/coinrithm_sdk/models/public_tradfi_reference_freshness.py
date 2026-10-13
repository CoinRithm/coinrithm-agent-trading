from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.public_data_status import PublicDataStatus

T = TypeVar("T", bound="PublicTradfiReferenceFreshness")


@_attrs_define
class PublicTradfiReferenceFreshness:
    """
    Attributes:
        status (PublicDataStatus): Freshness of an upstream dataset CoinRithm re-reads on a schedule.
            `stale` data is still served inside its documented maximum age;
            `unavailable` means no usable copy, never zero or empty truth.
        basis (str): `collection`: CoinRithm's batch collection time, not a venue quote time.
        as_of (datetime.datetime | None):
        age_seconds (int | None):
        stale_at (datetime.datetime | None):
    """

    status: PublicDataStatus
    basis: str
    as_of: datetime.datetime | None
    age_seconds: int | None
    stale_at: datetime.datetime | None
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        status = self.status.value

        basis = self.basis

        as_of: None | str
        if isinstance(self.as_of, datetime.datetime):
            as_of = self.as_of.isoformat()
        else:
            as_of = self.as_of

        age_seconds: int | None
        age_seconds = self.age_seconds

        stale_at: None | str
        if isinstance(self.stale_at, datetime.datetime):
            stale_at = self.stale_at.isoformat()
        else:
            stale_at = self.stale_at

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "status": status,
                "basis": basis,
                "asOf": as_of,
                "ageSeconds": age_seconds,
                "staleAt": stale_at,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        status = PublicDataStatus(d.pop("status"))

        basis = d.pop("basis")

        def _parse_as_of(data: object) -> datetime.datetime | None:
            if data is None:
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                as_of_type_0 = datetime.datetime.fromisoformat(data.replace("Z", "+00:00"))

                return as_of_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None, data)

        as_of = _parse_as_of(d.pop("asOf"))

        def _parse_age_seconds(data: object) -> int | None:
            if data is None:
                return data
            return cast(int | None, data)

        age_seconds = _parse_age_seconds(d.pop("ageSeconds"))

        def _parse_stale_at(data: object) -> datetime.datetime | None:
            if data is None:
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                stale_at_type_0 = datetime.datetime.fromisoformat(data.replace("Z", "+00:00"))

                return stale_at_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None, data)

        stale_at = _parse_stale_at(d.pop("staleAt"))

        public_tradfi_reference_freshness = cls(
            status=status,
            basis=basis,
            as_of=as_of,
            age_seconds=age_seconds,
            stale_at=stale_at,
        )

        public_tradfi_reference_freshness.additional_properties = d
        return public_tradfi_reference_freshness

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
