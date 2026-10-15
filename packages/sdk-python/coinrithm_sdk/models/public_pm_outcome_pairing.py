from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

T = TypeVar("T", bound="PublicPmOutcomePairing")


@_attrs_define
class PublicPmOutcomePairing:
    """Present on a comparison row only when the two venues name the
    outcome differently and the server paired them ("San Francisco" /
    "San Francisco 49ers"); `label` stays event A's name. Rows paired by
    an identical name carry no `pairing`.

        Attributes:
            method (str): How the two names were paired: `normalized_label`,
                `rate_decision`, `strike`, `range`, `draw`, `team_abbreviation`,
                `token_containment` or `first_initial`. Treat other values as
                unknown.
            confidence (float): 0-1, fixed per method.
            reason (str): Human-readable reason, e.g. "san francisco" is contained in "san francisco 49ers".
            event_a_name (str):
            event_b_name (str):
    """

    method: str
    confidence: float
    reason: str
    event_a_name: str
    event_b_name: str
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        method = self.method

        confidence = self.confidence

        reason = self.reason

        event_a_name = self.event_a_name

        event_b_name = self.event_b_name

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "method": method,
                "confidence": confidence,
                "reason": reason,
                "eventAName": event_a_name,
                "eventBName": event_b_name,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        method = d.pop("method")

        confidence = d.pop("confidence")

        reason = d.pop("reason")

        event_a_name = d.pop("eventAName")

        event_b_name = d.pop("eventBName")

        public_pm_outcome_pairing = cls(
            method=method,
            confidence=confidence,
            reason=reason,
            event_a_name=event_a_name,
            event_b_name=event_b_name,
        )

        public_pm_outcome_pairing.additional_properties = d
        return public_pm_outcome_pairing

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
