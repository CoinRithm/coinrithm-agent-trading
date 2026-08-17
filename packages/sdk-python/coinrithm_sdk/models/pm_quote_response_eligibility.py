from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

T = TypeVar("T", bound="PmQuoteResponseEligibility")


@_attrs_define
class PmQuoteResponseEligibility:
    """
    Attributes:
        settlement_state (str | Unset):
        shape (str | Unset):
        entry_eligible (bool | Unset):
        alert_eligible (bool | Unset):
        settlement_eligible (bool | Unset):
        limbo (Any | Unset):
    """

    settlement_state: str | Unset = UNSET
    shape: str | Unset = UNSET
    entry_eligible: bool | Unset = UNSET
    alert_eligible: bool | Unset = UNSET
    settlement_eligible: bool | Unset = UNSET
    limbo: Any | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        settlement_state = self.settlement_state

        shape = self.shape

        entry_eligible = self.entry_eligible

        alert_eligible = self.alert_eligible

        settlement_eligible = self.settlement_eligible

        limbo = self.limbo

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if settlement_state is not UNSET:
            field_dict["settlementState"] = settlement_state
        if shape is not UNSET:
            field_dict["shape"] = shape
        if entry_eligible is not UNSET:
            field_dict["entryEligible"] = entry_eligible
        if alert_eligible is not UNSET:
            field_dict["alertEligible"] = alert_eligible
        if settlement_eligible is not UNSET:
            field_dict["settlementEligible"] = settlement_eligible
        if limbo is not UNSET:
            field_dict["limbo"] = limbo

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        settlement_state = d.pop("settlementState", UNSET)

        shape = d.pop("shape", UNSET)

        entry_eligible = d.pop("entryEligible", UNSET)

        alert_eligible = d.pop("alertEligible", UNSET)

        settlement_eligible = d.pop("settlementEligible", UNSET)

        limbo = d.pop("limbo", UNSET)

        pm_quote_response_eligibility = cls(
            settlement_state=settlement_state,
            shape=shape,
            entry_eligible=entry_eligible,
            alert_eligible=alert_eligible,
            settlement_eligible=settlement_eligible,
            limbo=limbo,
        )

        pm_quote_response_eligibility.additional_properties = d
        return pm_quote_response_eligibility

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
