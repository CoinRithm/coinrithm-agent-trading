from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define

T = TypeVar("T", bound="PublicPmExpiringEventsResponseMetaWindow")


@_attrs_define
class PublicPmExpiringEventsResponseMetaWindow:
    """
    Attributes:
        from_ (datetime.datetime):
        to (datetime.datetime):
    """

    from_: datetime.datetime
    to: datetime.datetime

    def to_dict(self) -> dict[str, Any]:
        from_ = self.from_.isoformat()

        to = self.to.isoformat()

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "from": from_,
                "to": to,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        from_ = datetime.datetime.fromisoformat(d.pop("from").replace("Z", "+00:00"))

        to = datetime.datetime.fromisoformat(d.pop("to").replace("Z", "+00:00"))

        public_pm_expiring_events_response_meta_window = cls(
            from_=from_,
            to=to,
        )

        return public_pm_expiring_events_response_meta_window
