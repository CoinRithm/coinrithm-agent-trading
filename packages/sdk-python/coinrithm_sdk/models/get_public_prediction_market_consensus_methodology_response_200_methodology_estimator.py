from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

T = TypeVar("T", bound="GetPublicPredictionMarketConsensusMethodologyResponse200MethodologyEstimator")


@_attrs_define
class GetPublicPredictionMarketConsensusMethodologyResponse200MethodologyEstimator:
    """
    Attributes:
        kind (str | Unset):
        why (str | Unset):
    """

    kind: str | Unset = UNSET
    why: str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        kind = self.kind

        why = self.why

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if kind is not UNSET:
            field_dict["kind"] = kind
        if why is not UNSET:
            field_dict["why"] = why

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        kind = d.pop("kind", UNSET)

        why = d.pop("why", UNSET)

        get_public_prediction_market_consensus_methodology_response_200_methodology_estimator = cls(
            kind=kind,
            why=why,
        )

        get_public_prediction_market_consensus_methodology_response_200_methodology_estimator.additional_properties = d
        return get_public_prediction_market_consensus_methodology_response_200_methodology_estimator

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
