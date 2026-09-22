from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

T = TypeVar("T", bound="PublicPmOutcomePriorProbabilityType0")


@_attrs_define
class PublicPmOutcomePriorProbabilityType0:
    """Last stored provider quote before the outcome closed, when available.

    Attributes:
        value (float | Unset):
        as_of (datetime.datetime | Unset):
        cutoff (datetime.datetime | Unset):
    """

    value: float | Unset = UNSET
    as_of: datetime.datetime | Unset = UNSET
    cutoff: datetime.datetime | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        value = self.value

        as_of: str | Unset = UNSET
        if not isinstance(self.as_of, Unset):
            as_of = self.as_of.isoformat()

        cutoff: str | Unset = UNSET
        if not isinstance(self.cutoff, Unset):
            cutoff = self.cutoff.isoformat()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if value is not UNSET:
            field_dict["value"] = value
        if as_of is not UNSET:
            field_dict["asOf"] = as_of
        if cutoff is not UNSET:
            field_dict["cutoff"] = cutoff

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        value = d.pop("value", UNSET)

        _as_of = d.pop("asOf", UNSET)
        as_of: datetime.datetime | Unset
        if isinstance(_as_of, Unset):
            as_of = UNSET
        else:
            as_of = datetime.datetime.fromisoformat(_as_of)

        _cutoff = d.pop("cutoff", UNSET)
        cutoff: datetime.datetime | Unset
        if isinstance(_cutoff, Unset):
            cutoff = UNSET
        else:
            cutoff = datetime.datetime.fromisoformat(_cutoff)

        public_pm_outcome_prior_probability_type_0 = cls(
            value=value,
            as_of=as_of,
            cutoff=cutoff,
        )

        public_pm_outcome_prior_probability_type_0.additional_properties = d
        return public_pm_outcome_prior_probability_type_0

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
