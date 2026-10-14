from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.public_tradfi_reference_corporate_events_last_earnings_type_0_timing_type_0 import (
    PublicTradfiReferenceCorporateEventsLastEarningsType0TimingType0,
)

T = TypeVar("T", bound="PublicTradfiReferenceCorporateEventsLastEarningsType0")


@_attrs_define
class PublicTradfiReferenceCorporateEventsLastEarningsType0:
    """
    Attributes:
        date (datetime.date): US Eastern date of EDGAR acceptance.
        timing (None | PublicTradfiReferenceCorporateEventsLastEarningsType0TimingType0): Acceptance time against the
            09:30-16:00 ET session; null when unknown.
        url (str): The SEC filing.
    """

    date: datetime.date
    timing: None | PublicTradfiReferenceCorporateEventsLastEarningsType0TimingType0
    url: str
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        date = self.date.isoformat()

        timing: None | str
        if isinstance(self.timing, PublicTradfiReferenceCorporateEventsLastEarningsType0TimingType0):
            timing = self.timing.value
        else:
            timing = self.timing

        url = self.url

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "date": date,
                "timing": timing,
                "url": url,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        date = datetime.date.fromisoformat(d.pop("date"))

        def _parse_timing(data: object) -> None | PublicTradfiReferenceCorporateEventsLastEarningsType0TimingType0:
            if data is None:
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                timing_type_0 = PublicTradfiReferenceCorporateEventsLastEarningsType0TimingType0(data)

                return timing_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | PublicTradfiReferenceCorporateEventsLastEarningsType0TimingType0, data)

        timing = _parse_timing(d.pop("timing"))

        url = d.pop("url")

        public_tradfi_reference_corporate_events_last_earnings_type_0 = cls(
            date=date,
            timing=timing,
            url=url,
        )

        public_tradfi_reference_corporate_events_last_earnings_type_0.additional_properties = d
        return public_tradfi_reference_corporate_events_last_earnings_type_0

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
