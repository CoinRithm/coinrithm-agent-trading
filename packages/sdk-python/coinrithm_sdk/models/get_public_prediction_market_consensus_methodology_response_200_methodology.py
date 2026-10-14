from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.get_public_prediction_market_consensus_methodology_response_200_methodology_estimator import (
        GetPublicPredictionMarketConsensusMethodologyResponse200MethodologyEstimator,
    )
    from ..models.get_public_prediction_market_consensus_methodology_response_200_methodology_previous_versions_item import (
        GetPublicPredictionMarketConsensusMethodologyResponse200MethodologyPreviousVersionsItem,
    )
    from ..models.get_public_prediction_market_consensus_methodology_response_200_methodology_weighting import (
        GetPublicPredictionMarketConsensusMethodologyResponse200MethodologyWeighting,
    )


T = TypeVar("T", bound="GetPublicPredictionMarketConsensusMethodologyResponse200Methodology")


@_attrs_define
class GetPublicPredictionMarketConsensusMethodologyResponse200Methodology:
    """
    Attributes:
        version (str | Unset):
        accepted_versions (list[str] | Unset): Writer versions currently served; each reference row carries its own.
        summary (str | Unset):
        weighting (GetPublicPredictionMarketConsensusMethodologyResponse200MethodologyWeighting | Unset):
        estimator (GetPublicPredictionMarketConsensusMethodologyResponse200MethodologyEstimator | Unset):
        previous_versions (list[GetPublicPredictionMarketConsensusMethodologyResponse200MethodologyPreviousVersionsItem]
            | Unset): Earlier versions still served, with the weight each used.
    """

    version: str | Unset = UNSET
    accepted_versions: list[str] | Unset = UNSET
    summary: str | Unset = UNSET
    weighting: GetPublicPredictionMarketConsensusMethodologyResponse200MethodologyWeighting | Unset = UNSET
    estimator: GetPublicPredictionMarketConsensusMethodologyResponse200MethodologyEstimator | Unset = UNSET
    previous_versions: (
        list[GetPublicPredictionMarketConsensusMethodologyResponse200MethodologyPreviousVersionsItem] | Unset
    ) = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        version = self.version

        accepted_versions: list[str] | Unset = UNSET
        if not isinstance(self.accepted_versions, Unset):
            accepted_versions = self.accepted_versions

        summary = self.summary

        weighting: dict[str, Any] | Unset = UNSET
        if not isinstance(self.weighting, Unset):
            weighting = self.weighting.to_dict()

        estimator: dict[str, Any] | Unset = UNSET
        if not isinstance(self.estimator, Unset):
            estimator = self.estimator.to_dict()

        previous_versions: list[dict[str, Any]] | Unset = UNSET
        if not isinstance(self.previous_versions, Unset):
            previous_versions = []
            for previous_versions_item_data in self.previous_versions:
                previous_versions_item = previous_versions_item_data.to_dict()
                previous_versions.append(previous_versions_item)

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if version is not UNSET:
            field_dict["version"] = version
        if accepted_versions is not UNSET:
            field_dict["acceptedVersions"] = accepted_versions
        if summary is not UNSET:
            field_dict["summary"] = summary
        if weighting is not UNSET:
            field_dict["weighting"] = weighting
        if estimator is not UNSET:
            field_dict["estimator"] = estimator
        if previous_versions is not UNSET:
            field_dict["previousVersions"] = previous_versions

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.get_public_prediction_market_consensus_methodology_response_200_methodology_estimator import (
            GetPublicPredictionMarketConsensusMethodologyResponse200MethodologyEstimator,
        )
        from ..models.get_public_prediction_market_consensus_methodology_response_200_methodology_previous_versions_item import (
            GetPublicPredictionMarketConsensusMethodologyResponse200MethodologyPreviousVersionsItem,
        )
        from ..models.get_public_prediction_market_consensus_methodology_response_200_methodology_weighting import (
            GetPublicPredictionMarketConsensusMethodologyResponse200MethodologyWeighting,
        )

        d = dict(src_dict)
        version = d.pop("version", UNSET)

        accepted_versions = cast(list[str], d.pop("acceptedVersions", UNSET))

        summary = d.pop("summary", UNSET)

        _weighting = d.pop("weighting", UNSET)
        weighting: GetPublicPredictionMarketConsensusMethodologyResponse200MethodologyWeighting | Unset
        if isinstance(_weighting, Unset):
            weighting = UNSET
        else:
            weighting = GetPublicPredictionMarketConsensusMethodologyResponse200MethodologyWeighting.from_dict(
                _weighting
            )

        _estimator = d.pop("estimator", UNSET)
        estimator: GetPublicPredictionMarketConsensusMethodologyResponse200MethodologyEstimator | Unset
        if isinstance(_estimator, Unset):
            estimator = UNSET
        else:
            estimator = GetPublicPredictionMarketConsensusMethodologyResponse200MethodologyEstimator.from_dict(
                _estimator
            )

        _previous_versions = d.pop("previousVersions", UNSET)
        previous_versions: (
            list[GetPublicPredictionMarketConsensusMethodologyResponse200MethodologyPreviousVersionsItem] | Unset
        ) = UNSET
        if _previous_versions is not UNSET:
            previous_versions = []
            for previous_versions_item_data in _previous_versions:
                previous_versions_item = (
                    GetPublicPredictionMarketConsensusMethodologyResponse200MethodologyPreviousVersionsItem.from_dict(
                        previous_versions_item_data
                    )
                )

                previous_versions.append(previous_versions_item)

        get_public_prediction_market_consensus_methodology_response_200_methodology = cls(
            version=version,
            accepted_versions=accepted_versions,
            summary=summary,
            weighting=weighting,
            estimator=estimator,
            previous_versions=previous_versions,
        )

        get_public_prediction_market_consensus_methodology_response_200_methodology.additional_properties = d
        return get_public_prediction_market_consensus_methodology_response_200_methodology

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
