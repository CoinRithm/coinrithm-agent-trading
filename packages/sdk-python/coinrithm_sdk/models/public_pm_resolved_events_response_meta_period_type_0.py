from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define

from ..types import UNSET, Unset

T = TypeVar("T", bound="PublicPmResolvedEventsResponseMetaPeriodType0")


@_attrs_define
class PublicPmResolvedEventsResponseMetaPeriodType0:
    """
    Attributes:
        year (int | Unset):
        month (int | None | Unset):
    """

    year: int | Unset = UNSET
    month: int | None | Unset = UNSET

    def to_dict(self) -> dict[str, Any]:
        year = self.year

        month: int | None | Unset
        if isinstance(self.month, Unset):
            month = UNSET
        else:
            month = self.month

        field_dict: dict[str, Any] = {}

        field_dict.update({})
        if year is not UNSET:
            field_dict["year"] = year
        if month is not UNSET:
            field_dict["month"] = month

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        year = d.pop("year", UNSET)

        def _parse_month(data: object) -> int | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(int | None | Unset, data)

        month = _parse_month(d.pop("month", UNSET))

        public_pm_resolved_events_response_meta_period_type_0 = cls(
            year=year,
            month=month,
        )

        return public_pm_resolved_events_response_meta_period_type_0
