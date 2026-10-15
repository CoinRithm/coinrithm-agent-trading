from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.public_pm_outcome_pairing import PublicPmOutcomePairing


T = TypeVar("T", bound="PublicPmComparisonOutcome")


@_attrs_define
class PublicPmComparisonOutcome:
    """
    Attributes:
        key (str | Unset):
        label (str | Unset): Event A's outcome name.
        event_a_probability (float | None | Unset): 0-100.
        event_b_probability (float | None | Unset): 0-100.
        delta_points (float | Unset):
        present_in_a (bool | Unset):
        present_in_b (bool | Unset):
        is_shared (bool | Unset):
        pairing (PublicPmOutcomePairing | Unset): Present on a comparison row only when the two venues name the
            outcome differently and the server paired them ("San Francisco" /
            "San Francisco 49ers"); `label` stays event A's name. Rows paired by
            an identical name carry no `pairing`.
        both_sides_traded (bool | Unset): On rows both venues list, while the server's trading-evidence
            rule is on: whether both legs show real trading. A false row
            stays listed and shared but never sets the `maxSharedOutcome*`
            headline. Absent means an older server or a one-venue row; do
            not infer false.
    """

    key: str | Unset = UNSET
    label: str | Unset = UNSET
    event_a_probability: float | None | Unset = UNSET
    event_b_probability: float | None | Unset = UNSET
    delta_points: float | Unset = UNSET
    present_in_a: bool | Unset = UNSET
    present_in_b: bool | Unset = UNSET
    is_shared: bool | Unset = UNSET
    pairing: PublicPmOutcomePairing | Unset = UNSET
    both_sides_traded: bool | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        key = self.key

        label = self.label

        event_a_probability: float | None | Unset
        if isinstance(self.event_a_probability, Unset):
            event_a_probability = UNSET
        else:
            event_a_probability = self.event_a_probability

        event_b_probability: float | None | Unset
        if isinstance(self.event_b_probability, Unset):
            event_b_probability = UNSET
        else:
            event_b_probability = self.event_b_probability

        delta_points = self.delta_points

        present_in_a = self.present_in_a

        present_in_b = self.present_in_b

        is_shared = self.is_shared

        pairing: dict[str, Any] | Unset = UNSET
        if not isinstance(self.pairing, Unset):
            pairing = self.pairing.to_dict()

        both_sides_traded = self.both_sides_traded

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if key is not UNSET:
            field_dict["key"] = key
        if label is not UNSET:
            field_dict["label"] = label
        if event_a_probability is not UNSET:
            field_dict["eventAProbability"] = event_a_probability
        if event_b_probability is not UNSET:
            field_dict["eventBProbability"] = event_b_probability
        if delta_points is not UNSET:
            field_dict["deltaPoints"] = delta_points
        if present_in_a is not UNSET:
            field_dict["presentInA"] = present_in_a
        if present_in_b is not UNSET:
            field_dict["presentInB"] = present_in_b
        if is_shared is not UNSET:
            field_dict["isShared"] = is_shared
        if pairing is not UNSET:
            field_dict["pairing"] = pairing
        if both_sides_traded is not UNSET:
            field_dict["bothSidesTraded"] = both_sides_traded

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.public_pm_outcome_pairing import PublicPmOutcomePairing

        d = dict(src_dict)
        key = d.pop("key", UNSET)

        label = d.pop("label", UNSET)

        def _parse_event_a_probability(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        event_a_probability = _parse_event_a_probability(d.pop("eventAProbability", UNSET))

        def _parse_event_b_probability(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        event_b_probability = _parse_event_b_probability(d.pop("eventBProbability", UNSET))

        delta_points = d.pop("deltaPoints", UNSET)

        present_in_a = d.pop("presentInA", UNSET)

        present_in_b = d.pop("presentInB", UNSET)

        is_shared = d.pop("isShared", UNSET)

        _pairing = d.pop("pairing", UNSET)
        pairing: PublicPmOutcomePairing | Unset
        if isinstance(_pairing, Unset):
            pairing = UNSET
        else:
            pairing = PublicPmOutcomePairing.from_dict(_pairing)

        both_sides_traded = d.pop("bothSidesTraded", UNSET)

        public_pm_comparison_outcome = cls(
            key=key,
            label=label,
            event_a_probability=event_a_probability,
            event_b_probability=event_b_probability,
            delta_points=delta_points,
            present_in_a=present_in_a,
            present_in_b=present_in_b,
            is_shared=is_shared,
            pairing=pairing,
            both_sides_traded=both_sides_traded,
        )

        public_pm_comparison_outcome.additional_properties = d
        return public_pm_comparison_outcome

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
