from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset






T = TypeVar("T", bound="PmOpportunityRequestCohort")



@_attrs_define
class PmOpportunityRequestCohort:
    """ Opportunity-cohort breadth, frozen into the artifact's decisionContext.

        Attributes:
            universe_size (int | Unset): How many markets you were choosing from this cycle.
            horizon (str | Unset): Your forecast/decision horizon label (e.g. 7d).
     """

    universe_size: int | Unset = UNSET
    horizon: str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)





    def to_dict(self) -> dict[str, Any]:
        universe_size = self.universe_size

        horizon = self.horizon


        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({
        })
        if universe_size is not UNSET:
            field_dict["universeSize"] = universe_size
        if horizon is not UNSET:
            field_dict["horizon"] = horizon

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        universe_size = d.pop("universeSize", UNSET)

        horizon = d.pop("horizon", UNSET)

        pm_opportunity_request_cohort = cls(
            universe_size=universe_size,
            horizon=horizon,
        )


        pm_opportunity_request_cohort.additional_properties = d
        return pm_opportunity_request_cohort

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
