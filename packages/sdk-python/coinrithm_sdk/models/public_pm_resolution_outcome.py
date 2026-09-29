from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

T = TypeVar("T", bound="PublicPmResolutionOutcome")


@_attrs_define
class PublicPmResolutionOutcome:
    """The winning outcome as recorded at resolution.

    Attributes:
        external_market_id (str):
        name (str):
        probability (float): The winning outcome's provider-implied probability on a 0-100 scale, as last recorded.
        basis (str): How the winner was determined. Currently `source` (the venue's own resolved-outcome marker matched
            a stored outcome) or `final_probability` (no venue marker, but exactly one outcome closed at >=99.5). A plain
            string: treat an unknown value as unknown.
    """

    external_market_id: str
    name: str
    probability: float
    basis: str
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        external_market_id = self.external_market_id

        name = self.name

        probability = self.probability

        basis = self.basis

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "externalMarketId": external_market_id,
                "name": name,
                "probability": probability,
                "basis": basis,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        external_market_id = d.pop("externalMarketId")

        name = d.pop("name")

        probability = d.pop("probability")

        basis = d.pop("basis")

        public_pm_resolution_outcome = cls(
            external_market_id=external_market_id,
            name=name,
            probability=probability,
            basis=basis,
        )

        public_pm_resolution_outcome.additional_properties = d
        return public_pm_resolution_outcome

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
