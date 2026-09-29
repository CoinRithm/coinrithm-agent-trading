from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

if TYPE_CHECKING:
    from ..models.public_pm_resolved_events_response_meta_period_type_0 import (
        PublicPmResolvedEventsResponseMetaPeriodType0,
    )


T = TypeVar("T", bound="PublicPmResolvedEventsResponseMeta")


@_attrs_define
class PublicPmResolvedEventsResponseMeta:
    """
    Attributes:
        total_resolved (int | None): Null when minVolume is set (the archive count is not volume-filtered); see
            minVolume.
        min_volume (float | None): Echoes the requested floor when set, else null.
        period (None | PublicPmResolvedEventsResponseMetaPeriodType0):
    """

    total_resolved: int | None
    min_volume: float | None
    period: None | PublicPmResolvedEventsResponseMetaPeriodType0
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        from ..models.public_pm_resolved_events_response_meta_period_type_0 import (
            PublicPmResolvedEventsResponseMetaPeriodType0,
        )

        total_resolved: int | None
        total_resolved = self.total_resolved

        min_volume: float | None
        min_volume = self.min_volume

        period: dict[str, Any] | None
        if isinstance(self.period, PublicPmResolvedEventsResponseMetaPeriodType0):
            period = self.period.to_dict()
        else:
            period = self.period

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "totalResolved": total_resolved,
                "minVolume": min_volume,
                "period": period,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.public_pm_resolved_events_response_meta_period_type_0 import (
            PublicPmResolvedEventsResponseMetaPeriodType0,
        )

        d = dict(src_dict)

        def _parse_total_resolved(data: object) -> int | None:
            if data is None:
                return data
            return cast(int | None, data)

        total_resolved = _parse_total_resolved(d.pop("totalResolved"))

        def _parse_min_volume(data: object) -> float | None:
            if data is None:
                return data
            return cast(float | None, data)

        min_volume = _parse_min_volume(d.pop("minVolume"))

        def _parse_period(data: object) -> None | PublicPmResolvedEventsResponseMetaPeriodType0:
            if data is None:
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                period_type_0 = PublicPmResolvedEventsResponseMetaPeriodType0.from_dict(data)

                return period_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | PublicPmResolvedEventsResponseMetaPeriodType0, data)

        period = _parse_period(d.pop("period"))

        public_pm_resolved_events_response_meta = cls(
            total_resolved=total_resolved,
            min_volume=min_volume,
            period=period,
        )

        public_pm_resolved_events_response_meta.additional_properties = d
        return public_pm_resolved_events_response_meta

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
