from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.edge_sizing_basis import EdgeSizingBasis
from ..types import UNSET, Unset

T = TypeVar("T", bound="EdgeSizing")


@_attrs_define
class EdgeSizing:
    """Advisory quarter-Kelly sizing suggestion; never changes the requested stake.

    Attributes:
        basis (EdgeSizingBasis | Unset):
        kelly_multiplier (float | Unset):
        max_fraction (float | Unset):
        edge_points (float | Unset):
        kelly_fraction (float | Unset):
        applied_fraction (float | Unset):
        suggested_stake_musd (float | None | Unset):
        no_edge (bool | Unset):
    """

    basis: EdgeSizingBasis | Unset = UNSET
    kelly_multiplier: float | Unset = UNSET
    max_fraction: float | Unset = UNSET
    edge_points: float | Unset = UNSET
    kelly_fraction: float | Unset = UNSET
    applied_fraction: float | Unset = UNSET
    suggested_stake_musd: float | None | Unset = UNSET
    no_edge: bool | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        basis: str | Unset = UNSET
        if not isinstance(self.basis, Unset):
            basis = self.basis.value

        kelly_multiplier = self.kelly_multiplier

        max_fraction = self.max_fraction

        edge_points = self.edge_points

        kelly_fraction = self.kelly_fraction

        applied_fraction = self.applied_fraction

        suggested_stake_musd: float | None | Unset
        if isinstance(self.suggested_stake_musd, Unset):
            suggested_stake_musd = UNSET
        else:
            suggested_stake_musd = self.suggested_stake_musd

        no_edge = self.no_edge

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if basis is not UNSET:
            field_dict["basis"] = basis
        if kelly_multiplier is not UNSET:
            field_dict["kellyMultiplier"] = kelly_multiplier
        if max_fraction is not UNSET:
            field_dict["maxFraction"] = max_fraction
        if edge_points is not UNSET:
            field_dict["edgePoints"] = edge_points
        if kelly_fraction is not UNSET:
            field_dict["kellyFraction"] = kelly_fraction
        if applied_fraction is not UNSET:
            field_dict["appliedFraction"] = applied_fraction
        if suggested_stake_musd is not UNSET:
            field_dict["suggestedStakeMusd"] = suggested_stake_musd
        if no_edge is not UNSET:
            field_dict["noEdge"] = no_edge

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        _basis = d.pop("basis", UNSET)
        basis: EdgeSizingBasis | Unset
        if isinstance(_basis, Unset):
            basis = UNSET
        else:
            basis = EdgeSizingBasis(_basis)

        kelly_multiplier = d.pop("kellyMultiplier", UNSET)

        max_fraction = d.pop("maxFraction", UNSET)

        edge_points = d.pop("edgePoints", UNSET)

        kelly_fraction = d.pop("kellyFraction", UNSET)

        applied_fraction = d.pop("appliedFraction", UNSET)

        def _parse_suggested_stake_musd(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        suggested_stake_musd = _parse_suggested_stake_musd(d.pop("suggestedStakeMusd", UNSET))

        no_edge = d.pop("noEdge", UNSET)

        edge_sizing = cls(
            basis=basis,
            kelly_multiplier=kelly_multiplier,
            max_fraction=max_fraction,
            edge_points=edge_points,
            kelly_fraction=kelly_fraction,
            applied_fraction=applied_fraction,
            suggested_stake_musd=suggested_stake_musd,
            no_edge=no_edge,
        )

        edge_sizing.additional_properties = d
        return edge_sizing

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
