from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

T = TypeVar("T", bound="PmPositionOutcome")


@_attrs_define
class PmPositionOutcome:
    """
    Attributes:
        external_market_id (str | Unset):
        label (str | Unset):
        token_id (None | str | Unset):
    """

    external_market_id: str | Unset = UNSET
    label: str | Unset = UNSET
    token_id: None | str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        external_market_id = self.external_market_id

        label = self.label

        token_id: None | str | Unset
        if isinstance(self.token_id, Unset):
            token_id = UNSET
        else:
            token_id = self.token_id

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if external_market_id is not UNSET:
            field_dict["externalMarketId"] = external_market_id
        if label is not UNSET:
            field_dict["label"] = label
        if token_id is not UNSET:
            field_dict["tokenId"] = token_id

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        external_market_id = d.pop("externalMarketId", UNSET)

        label = d.pop("label", UNSET)

        def _parse_token_id(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        token_id = _parse_token_id(d.pop("tokenId", UNSET))

        pm_position_outcome = cls(
            external_market_id=external_market_id,
            label=label,
            token_id=token_id,
        )

        pm_position_outcome.additional_properties = d
        return pm_position_outcome

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
