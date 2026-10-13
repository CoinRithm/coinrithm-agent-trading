from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

T = TypeVar("T", bound="PublicPmWhaleStats24HBySourceItem")


@_attrs_define
class PublicPmWhaleStats24HBySourceItem:
    """
    Attributes:
        source (str | Unset):
        count (int | Unset):
        total_usd (float | Unset):
        max_usd (float | Unset):
        p_99_usd_30_d (float | Unset): 99th percentile trade size over 30 days.
    """

    source: str | Unset = UNSET
    count: int | Unset = UNSET
    total_usd: float | Unset = UNSET
    max_usd: float | Unset = UNSET
    p_99_usd_30_d: float | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        source = self.source

        count = self.count

        total_usd = self.total_usd

        max_usd = self.max_usd

        p_99_usd_30_d = self.p_99_usd_30_d

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if source is not UNSET:
            field_dict["source"] = source
        if count is not UNSET:
            field_dict["count"] = count
        if total_usd is not UNSET:
            field_dict["totalUsd"] = total_usd
        if max_usd is not UNSET:
            field_dict["maxUsd"] = max_usd
        if p_99_usd_30_d is not UNSET:
            field_dict["p99Usd30d"] = p_99_usd_30_d

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        source = d.pop("source", UNSET)

        count = d.pop("count", UNSET)

        total_usd = d.pop("totalUsd", UNSET)

        max_usd = d.pop("maxUsd", UNSET)

        p_99_usd_30_d = d.pop("p99Usd30d", UNSET)

        public_pm_whale_stats_24h_by_source_item = cls(
            source=source,
            count=count,
            total_usd=total_usd,
            max_usd=max_usd,
            p_99_usd_30_d=p_99_usd_30_d,
        )

        public_pm_whale_stats_24h_by_source_item.additional_properties = d
        return public_pm_whale_stats_24h_by_source_item

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
