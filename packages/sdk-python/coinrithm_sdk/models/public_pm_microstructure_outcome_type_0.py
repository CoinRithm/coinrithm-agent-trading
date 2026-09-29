from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

T = TypeVar("T", bound="PublicPmMicrostructureOutcomeType0")


@_attrs_define
class PublicPmMicrostructureOutcomeType0:
    """Which outcome this microstructure read describes; null when the event has neither an outcome name nor id.

    Attributes:
        name (None | str | Unset):
        external_market_id (None | str | Unset):
    """

    name: None | str | Unset = UNSET
    external_market_id: None | str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        name: None | str | Unset
        if isinstance(self.name, Unset):
            name = UNSET
        else:
            name = self.name

        external_market_id: None | str | Unset
        if isinstance(self.external_market_id, Unset):
            external_market_id = UNSET
        else:
            external_market_id = self.external_market_id

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if name is not UNSET:
            field_dict["name"] = name
        if external_market_id is not UNSET:
            field_dict["externalMarketId"] = external_market_id

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)

        def _parse_name(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        name = _parse_name(d.pop("name", UNSET))

        def _parse_external_market_id(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        external_market_id = _parse_external_market_id(d.pop("externalMarketId", UNSET))

        public_pm_microstructure_outcome_type_0 = cls(
            name=name,
            external_market_id=external_market_id,
        )

        public_pm_microstructure_outcome_type_0.additional_properties = d
        return public_pm_microstructure_outcome_type_0

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
