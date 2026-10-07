from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

T = TypeVar("T", bound="MarketPositioningMetric")


@_attrs_define
class MarketPositioningMetric:
    """
    Attributes:
        value (float): Unit is defined by the containing metric (ratio or percent).
        as_of (datetime.datetime): Provider period timestamp for this metric.
        stale (bool): True when the provider period timestamp is more than 2700 seconds (45 minutes) old.
    """

    value: float
    as_of: datetime.datetime
    stale: bool
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        value = self.value

        as_of = self.as_of.isoformat()

        stale = self.stale

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "value": value,
                "asOf": as_of,
                "stale": stale,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        value = d.pop("value")

        as_of = datetime.datetime.fromisoformat(d.pop("asOf").replace("Z", "+00:00"))

        stale = d.pop("stale")

        market_positioning_metric = cls(
            value=value,
            as_of=as_of,
            stale=stale,
        )

        market_positioning_metric.additional_properties = d
        return market_positioning_metric

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
