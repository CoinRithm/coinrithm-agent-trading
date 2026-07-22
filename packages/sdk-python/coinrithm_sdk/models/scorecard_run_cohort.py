from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..models.scorecard_run_cohort_universe import ScorecardRunCohortUniverse
from ..types import UNSET, Unset
from typing import cast






T = TypeVar("T", bound="ScorecardRunCohort")



@_attrs_define
class ScorecardRunCohort:
    """ The frozen cohort DEFINITION a run scored over (the folded EvaluationCohort).
    Today the scorecard is all-universe, so this records that; a future cohort
    run pins category/source/horizon.

        Attributes:
            v (int | Unset):  Example: 1.
            universe (ScorecardRunCohortUniverse | Unset):
            category (None | str | Unset):
            source (None | str | Unset):
            horizon (None | str | Unset):
     """

    v: int | Unset = UNSET
    universe: ScorecardRunCohortUniverse | Unset = UNSET
    category: None | str | Unset = UNSET
    source: None | str | Unset = UNSET
    horizon: None | str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)





    def to_dict(self) -> dict[str, Any]:
        v = self.v

        universe: str | Unset = UNSET
        if not isinstance(self.universe, Unset):
            universe = self.universe.value


        category: None | str | Unset
        if isinstance(self.category, Unset):
            category = UNSET
        else:
            category = self.category

        source: None | str | Unset
        if isinstance(self.source, Unset):
            source = UNSET
        else:
            source = self.source

        horizon: None | str | Unset
        if isinstance(self.horizon, Unset):
            horizon = UNSET
        else:
            horizon = self.horizon


        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({
        })
        if v is not UNSET:
            field_dict["v"] = v
        if universe is not UNSET:
            field_dict["universe"] = universe
        if category is not UNSET:
            field_dict["category"] = category
        if source is not UNSET:
            field_dict["source"] = source
        if horizon is not UNSET:
            field_dict["horizon"] = horizon

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        v = d.pop("v", UNSET)

        _universe = d.pop("universe", UNSET)
        universe: ScorecardRunCohortUniverse | Unset
        if isinstance(_universe,  Unset):
            universe = UNSET
        else:
            universe = ScorecardRunCohortUniverse(_universe)




        def _parse_category(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        category = _parse_category(d.pop("category", UNSET))


        def _parse_source(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        source = _parse_source(d.pop("source", UNSET))


        def _parse_horizon(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        horizon = _parse_horizon(d.pop("horizon", UNSET))


        scorecard_run_cohort = cls(
            v=v,
            universe=universe,
            category=category,
            source=source,
            horizon=horizon,
        )


        scorecard_run_cohort.additional_properties = d
        return scorecard_run_cohort

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
