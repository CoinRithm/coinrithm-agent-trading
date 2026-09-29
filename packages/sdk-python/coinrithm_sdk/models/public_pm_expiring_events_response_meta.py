from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

if TYPE_CHECKING:
    from ..models.public_pm_expiring_events_response_meta_window import PublicPmExpiringEventsResponseMetaWindow


T = TypeVar("T", bound="PublicPmExpiringEventsResponseMeta")


@_attrs_define
class PublicPmExpiringEventsResponseMeta:
    """
    Attributes:
        total_expiring (int):
        window (PublicPmExpiringEventsResponseMetaWindow):
    """

    total_expiring: int
    window: PublicPmExpiringEventsResponseMetaWindow
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        total_expiring = self.total_expiring

        window = self.window.to_dict()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "totalExpiring": total_expiring,
                "window": window,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.public_pm_expiring_events_response_meta_window import PublicPmExpiringEventsResponseMetaWindow

        d = dict(src_dict)
        total_expiring = d.pop("totalExpiring")

        window = PublicPmExpiringEventsResponseMetaWindow.from_dict(d.pop("window"))

        public_pm_expiring_events_response_meta = cls(
            total_expiring=total_expiring,
            window=window,
        )

        public_pm_expiring_events_response_meta.additional_properties = d
        return public_pm_expiring_events_response_meta

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
