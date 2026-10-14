from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

T = TypeVar("T", bound="GetPublicPredictionMarketConsensusMethodologyResponse200MethodologyWeightingBasis")


@_attrs_define
class GetPublicPredictionMarketConsensusMethodologyResponse200MethodologyWeightingBasis:
    """When each `weightBasis` applies.

    Attributes:
        open_interest (str | Unset):
        liquidity (str | Unset):
    """

    open_interest: str | Unset = UNSET
    liquidity: str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        open_interest = self.open_interest

        liquidity = self.liquidity

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if open_interest is not UNSET:
            field_dict["open_interest"] = open_interest
        if liquidity is not UNSET:
            field_dict["liquidity"] = liquidity

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        open_interest = d.pop("open_interest", UNSET)

        liquidity = d.pop("liquidity", UNSET)

        get_public_prediction_market_consensus_methodology_response_200_methodology_weighting_basis = cls(
            open_interest=open_interest,
            liquidity=liquidity,
        )

        get_public_prediction_market_consensus_methodology_response_200_methodology_weighting_basis.additional_properties = d
        return get_public_prediction_market_consensus_methodology_response_200_methodology_weighting_basis

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
