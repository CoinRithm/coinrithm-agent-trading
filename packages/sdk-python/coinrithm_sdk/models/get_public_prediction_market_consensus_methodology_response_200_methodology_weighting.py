from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.get_public_prediction_market_consensus_methodology_response_200_methodology_weighting_basis import (
        GetPublicPredictionMarketConsensusMethodologyResponse200MethodologyWeightingBasis,
    )


T = TypeVar("T", bound="GetPublicPredictionMarketConsensusMethodologyResponse200MethodologyWeighting")


@_attrs_define
class GetPublicPredictionMarketConsensusMethodologyResponse200MethodologyWeighting:
    """
    Attributes:
        weight (str | Unset): The weight expression.
        floor (float | Unset):
        cap (float | Unset):
        basis (GetPublicPredictionMarketConsensusMethodologyResponse200MethodologyWeightingBasis | Unset): When each
            `weightBasis` applies.
    """

    weight: str | Unset = UNSET
    floor: float | Unset = UNSET
    cap: float | Unset = UNSET
    basis: GetPublicPredictionMarketConsensusMethodologyResponse200MethodologyWeightingBasis | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        weight = self.weight

        floor = self.floor

        cap = self.cap

        basis: dict[str, Any] | Unset = UNSET
        if not isinstance(self.basis, Unset):
            basis = self.basis.to_dict()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if weight is not UNSET:
            field_dict["weight"] = weight
        if floor is not UNSET:
            field_dict["floor"] = floor
        if cap is not UNSET:
            field_dict["cap"] = cap
        if basis is not UNSET:
            field_dict["basis"] = basis

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.get_public_prediction_market_consensus_methodology_response_200_methodology_weighting_basis import (
            GetPublicPredictionMarketConsensusMethodologyResponse200MethodologyWeightingBasis,
        )

        d = dict(src_dict)
        weight = d.pop("weight", UNSET)

        floor = d.pop("floor", UNSET)

        cap = d.pop("cap", UNSET)

        _basis = d.pop("basis", UNSET)
        basis: GetPublicPredictionMarketConsensusMethodologyResponse200MethodologyWeightingBasis | Unset
        if isinstance(_basis, Unset):
            basis = UNSET
        else:
            basis = GetPublicPredictionMarketConsensusMethodologyResponse200MethodologyWeightingBasis.from_dict(_basis)

        get_public_prediction_market_consensus_methodology_response_200_methodology_weighting = cls(
            weight=weight,
            floor=floor,
            cap=cap,
            basis=basis,
        )

        get_public_prediction_market_consensus_methodology_response_200_methodology_weighting.additional_properties = d
        return get_public_prediction_market_consensus_methodology_response_200_methodology_weighting

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
