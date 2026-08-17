from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.get_public_prediction_market_consensus_methodology_response_200_schema import (
    GetPublicPredictionMarketConsensusMethodologyResponse200Schema,
)
from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.get_public_prediction_market_consensus_methodology_response_200_methodology import (
        GetPublicPredictionMarketConsensusMethodologyResponse200Methodology,
    )


T = TypeVar("T", bound="GetPublicPredictionMarketConsensusMethodologyResponse200")


@_attrs_define
class GetPublicPredictionMarketConsensusMethodologyResponse200:
    """
    Attributes:
        schema (GetPublicPredictionMarketConsensusMethodologyResponse200Schema | Unset):
        version (str | Unset): e.g. consensus_probability_v1. Pin this next to any stored number.
        methodology (GetPublicPredictionMarketConsensusMethodologyResponse200Methodology | Unset):
        licence (str | Unset):
    """

    schema: GetPublicPredictionMarketConsensusMethodologyResponse200Schema | Unset = UNSET
    version: str | Unset = UNSET
    methodology: GetPublicPredictionMarketConsensusMethodologyResponse200Methodology | Unset = UNSET
    licence: str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        schema: str | Unset = UNSET
        if not isinstance(self.schema, Unset):
            schema = self.schema.value

        version = self.version

        methodology: dict[str, Any] | Unset = UNSET
        if not isinstance(self.methodology, Unset):
            methodology = self.methodology.to_dict()

        licence = self.licence

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if schema is not UNSET:
            field_dict["schema"] = schema
        if version is not UNSET:
            field_dict["version"] = version
        if methodology is not UNSET:
            field_dict["methodology"] = methodology
        if licence is not UNSET:
            field_dict["licence"] = licence

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.get_public_prediction_market_consensus_methodology_response_200_methodology import (
            GetPublicPredictionMarketConsensusMethodologyResponse200Methodology,
        )

        d = dict(src_dict)
        _schema = d.pop("schema", UNSET)
        schema: GetPublicPredictionMarketConsensusMethodologyResponse200Schema | Unset
        if isinstance(_schema, Unset):
            schema = UNSET
        else:
            schema = GetPublicPredictionMarketConsensusMethodologyResponse200Schema(_schema)

        version = d.pop("version", UNSET)

        _methodology = d.pop("methodology", UNSET)
        methodology: GetPublicPredictionMarketConsensusMethodologyResponse200Methodology | Unset
        if isinstance(_methodology, Unset):
            methodology = UNSET
        else:
            methodology = GetPublicPredictionMarketConsensusMethodologyResponse200Methodology.from_dict(_methodology)

        licence = d.pop("licence", UNSET)

        get_public_prediction_market_consensus_methodology_response_200 = cls(
            schema=schema,
            version=version,
            methodology=methodology,
            licence=licence,
        )

        get_public_prediction_market_consensus_methodology_response_200.additional_properties = d
        return get_public_prediction_market_consensus_methodology_response_200

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
