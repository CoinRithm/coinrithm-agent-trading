from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

T = TypeVar("T", bound="GetMarketContextResponse200FearGreedType0")


@_attrs_define
class GetMarketContextResponse200FearGreedType0:
    """
    Attributes:
        value (int | Unset):
        label (str | Unset):
        fetched_at (datetime.datetime | None | Unset): Last successful collection time. The provider observation
            timestamp is not retained.
    """

    value: int | Unset = UNSET
    label: str | Unset = UNSET
    fetched_at: datetime.datetime | None | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        value = self.value

        label = self.label

        fetched_at: None | str | Unset
        if isinstance(self.fetched_at, Unset):
            fetched_at = UNSET
        elif isinstance(self.fetched_at, datetime.datetime):
            fetched_at = self.fetched_at.isoformat()
        else:
            fetched_at = self.fetched_at

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if value is not UNSET:
            field_dict["value"] = value
        if label is not UNSET:
            field_dict["label"] = label
        if fetched_at is not UNSET:
            field_dict["fetchedAt"] = fetched_at

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        value = d.pop("value", UNSET)

        label = d.pop("label", UNSET)

        def _parse_fetched_at(data: object) -> datetime.datetime | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                fetched_at_type_0 = datetime.datetime.fromisoformat(data.replace("Z", "+00:00"))

                return fetched_at_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None | Unset, data)

        fetched_at = _parse_fetched_at(d.pop("fetchedAt", UNSET))

        get_market_context_response_200_fear_greed_type_0 = cls(
            value=value,
            label=label,
            fetched_at=fetched_at,
        )

        get_market_context_response_200_fear_greed_type_0.additional_properties = d
        return get_market_context_response_200_fear_greed_type_0

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
