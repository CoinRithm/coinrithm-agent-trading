from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

T = TypeVar("T", bound="PmDiscoveryOutcome")


@_attrs_define
class PmDiscoveryOutcome:
    """
    Attributes:
        external_market_id (str | Unset):
        name (str | Unset):
        probability (float | Unset): 0..100
        token_id (None | str | Unset):
        eligible (bool | None | Unset): Per-outcome openability (structural + 0<p<100 live yes fill). null
            when scalars are unavailable.
    """

    external_market_id: str | Unset = UNSET
    name: str | Unset = UNSET
    probability: float | Unset = UNSET
    token_id: None | str | Unset = UNSET
    eligible: bool | None | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        external_market_id = self.external_market_id

        name = self.name

        probability = self.probability

        token_id: None | str | Unset
        if isinstance(self.token_id, Unset):
            token_id = UNSET
        else:
            token_id = self.token_id

        eligible: bool | None | Unset
        if isinstance(self.eligible, Unset):
            eligible = UNSET
        else:
            eligible = self.eligible

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if external_market_id is not UNSET:
            field_dict["externalMarketId"] = external_market_id
        if name is not UNSET:
            field_dict["name"] = name
        if probability is not UNSET:
            field_dict["probability"] = probability
        if token_id is not UNSET:
            field_dict["tokenId"] = token_id
        if eligible is not UNSET:
            field_dict["eligible"] = eligible

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        external_market_id = d.pop("externalMarketId", UNSET)

        name = d.pop("name", UNSET)

        probability = d.pop("probability", UNSET)

        def _parse_token_id(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        token_id = _parse_token_id(d.pop("tokenId", UNSET))

        def _parse_eligible(data: object) -> bool | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(bool | None | Unset, data)

        eligible = _parse_eligible(d.pop("eligible", UNSET))

        pm_discovery_outcome = cls(
            external_market_id=external_market_id,
            name=name,
            probability=probability,
            token_id=token_id,
            eligible=eligible,
        )

        pm_discovery_outcome.additional_properties = d
        return pm_discovery_outcome

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
