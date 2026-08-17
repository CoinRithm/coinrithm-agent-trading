from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.opportunity_cohort_context_kind import OpportunityCohortContextKind
from ..types import UNSET, Unset

T = TypeVar("T", bound="OpportunityCohortContext")


@_attrs_define
class OpportunityCohortContext:
    """The decision-time COHORT descriptor frozen into a NON-opened opportunity
    reported via POST /api/agent/pm/opportunity — the opportunity UNIVERSE the
    agent chose from (there is no fill, so no market-fill snapshot to freeze).
    Tagged with `kind: opportunity_cohort` so it is never confused with a market
    EntryContext, and covered by the artifact contentHash.

        Attributes:
            kind (OpportunityCohortContextKind | Unset):
            v (int | Unset): Descriptor schema version (currently 1).
            captured_at (datetime.datetime | Unset): Capture time (server clock).
            universe_size (int | None | Unset): How many markets the agent was choosing from this cycle.
            horizon (None | str | Unset): The agent's forecast/decision horizon label (e.g. 7d).
    """

    kind: OpportunityCohortContextKind | Unset = UNSET
    v: int | Unset = UNSET
    captured_at: datetime.datetime | Unset = UNSET
    universe_size: int | None | Unset = UNSET
    horizon: None | str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        kind: str | Unset = UNSET
        if not isinstance(self.kind, Unset):
            kind = self.kind.value

        v = self.v

        captured_at: str | Unset = UNSET
        if not isinstance(self.captured_at, Unset):
            captured_at = self.captured_at.isoformat()

        universe_size: int | None | Unset
        if isinstance(self.universe_size, Unset):
            universe_size = UNSET
        else:
            universe_size = self.universe_size

        horizon: None | str | Unset
        if isinstance(self.horizon, Unset):
            horizon = UNSET
        else:
            horizon = self.horizon

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if kind is not UNSET:
            field_dict["kind"] = kind
        if v is not UNSET:
            field_dict["v"] = v
        if captured_at is not UNSET:
            field_dict["capturedAt"] = captured_at
        if universe_size is not UNSET:
            field_dict["universeSize"] = universe_size
        if horizon is not UNSET:
            field_dict["horizon"] = horizon

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        _kind = d.pop("kind", UNSET)
        kind: OpportunityCohortContextKind | Unset
        if isinstance(_kind, Unset):
            kind = UNSET
        else:
            kind = OpportunityCohortContextKind(_kind)

        v = d.pop("v", UNSET)

        _captured_at = d.pop("capturedAt", UNSET)
        captured_at: datetime.datetime | Unset
        if isinstance(_captured_at, Unset):
            captured_at = UNSET
        else:
            captured_at = datetime.datetime.fromisoformat(_captured_at)

        def _parse_universe_size(data: object) -> int | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(int | None | Unset, data)

        universe_size = _parse_universe_size(d.pop("universeSize", UNSET))

        def _parse_horizon(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        horizon = _parse_horizon(d.pop("horizon", UNSET))

        opportunity_cohort_context = cls(
            kind=kind,
            v=v,
            captured_at=captured_at,
            universe_size=universe_size,
            horizon=horizon,
        )

        opportunity_cohort_context.additional_properties = d
        return opportunity_cohort_context

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
