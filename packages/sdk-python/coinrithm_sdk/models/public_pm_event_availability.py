from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.public_pm_event_availability_status import PublicPmEventAvailabilityStatus

T = TypeVar("T", bound="PublicPmEventAvailability")


@_attrs_define
class PublicPmEventAvailability:
    """Event detail only, and only for an open event whose venue CoinRithm
    has paused: its prices stopped updating at `lastCollectedAt`.
    Absent otherwise.

        Attributes:
            status (PublicPmEventAvailabilityStatus):
            last_collected_at (datetime.datetime | None):
    """

    status: PublicPmEventAvailabilityStatus
    last_collected_at: datetime.datetime | None
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        status = self.status.value

        last_collected_at: None | str
        if isinstance(self.last_collected_at, datetime.datetime):
            last_collected_at = self.last_collected_at.isoformat()
        else:
            last_collected_at = self.last_collected_at

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "status": status,
                "lastCollectedAt": last_collected_at,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        status = PublicPmEventAvailabilityStatus(d.pop("status"))

        def _parse_last_collected_at(data: object) -> datetime.datetime | None:
            if data is None:
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                last_collected_at_type_0 = datetime.datetime.fromisoformat(data.replace("Z", "+00:00"))

                return last_collected_at_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None, data)

        last_collected_at = _parse_last_collected_at(d.pop("lastCollectedAt"))

        public_pm_event_availability = cls(
            status=status,
            last_collected_at=last_collected_at,
        )

        public_pm_event_availability.additional_properties = d
        return public_pm_event_availability

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
