from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

T = TypeVar("T", bound="ScorecardRunListEntry")


@_attrs_define
class ScorecardRunListEntry:
    """One compact history entry (no heavy resultJson) — the counts + policy
    versions + fingerprint of a frozen snapshot.

        Attributes:
            id (int | Unset):
            computed_at (datetime.datetime | Unset):
            evaluation_policy_version (str | Unset):  Example: eval-1.
            execution_policy_version (str | Unset):  Example: paper_execution_v1.
            window_key (None | str | Unset): null = the all-time window; a value pins a windowed snapshot.
            input_count (int | Unset): Candidate PM decisions considered by this snapshot.
            forecasted_count (int | Unset): Of the candidates, how many carried an independent agent forecast.
            settled_forecast_count (int | Unset): Of those, how many were settled forecasts (the Track B scored sample).
            content_hash (str | Unset):
    """

    id: int | Unset = UNSET
    computed_at: datetime.datetime | Unset = UNSET
    evaluation_policy_version: str | Unset = UNSET
    execution_policy_version: str | Unset = UNSET
    window_key: None | str | Unset = UNSET
    input_count: int | Unset = UNSET
    forecasted_count: int | Unset = UNSET
    settled_forecast_count: int | Unset = UNSET
    content_hash: str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = self.id

        computed_at: str | Unset = UNSET
        if not isinstance(self.computed_at, Unset):
            computed_at = self.computed_at.isoformat()

        evaluation_policy_version = self.evaluation_policy_version

        execution_policy_version = self.execution_policy_version

        window_key: None | str | Unset
        if isinstance(self.window_key, Unset):
            window_key = UNSET
        else:
            window_key = self.window_key

        input_count = self.input_count

        forecasted_count = self.forecasted_count

        settled_forecast_count = self.settled_forecast_count

        content_hash = self.content_hash

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if id is not UNSET:
            field_dict["id"] = id
        if computed_at is not UNSET:
            field_dict["computedAt"] = computed_at
        if evaluation_policy_version is not UNSET:
            field_dict["evaluationPolicyVersion"] = evaluation_policy_version
        if execution_policy_version is not UNSET:
            field_dict["executionPolicyVersion"] = execution_policy_version
        if window_key is not UNSET:
            field_dict["windowKey"] = window_key
        if input_count is not UNSET:
            field_dict["inputCount"] = input_count
        if forecasted_count is not UNSET:
            field_dict["forecastedCount"] = forecasted_count
        if settled_forecast_count is not UNSET:
            field_dict["settledForecastCount"] = settled_forecast_count
        if content_hash is not UNSET:
            field_dict["contentHash"] = content_hash

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        id = d.pop("id", UNSET)

        _computed_at = d.pop("computedAt", UNSET)
        computed_at: datetime.datetime | Unset
        if isinstance(_computed_at, Unset):
            computed_at = UNSET
        else:
            computed_at = datetime.datetime.fromisoformat(_computed_at)

        evaluation_policy_version = d.pop("evaluationPolicyVersion", UNSET)

        execution_policy_version = d.pop("executionPolicyVersion", UNSET)

        def _parse_window_key(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        window_key = _parse_window_key(d.pop("windowKey", UNSET))

        input_count = d.pop("inputCount", UNSET)

        forecasted_count = d.pop("forecastedCount", UNSET)

        settled_forecast_count = d.pop("settledForecastCount", UNSET)

        content_hash = d.pop("contentHash", UNSET)

        scorecard_run_list_entry = cls(
            id=id,
            computed_at=computed_at,
            evaluation_policy_version=evaluation_policy_version,
            execution_policy_version=execution_policy_version,
            window_key=window_key,
            input_count=input_count,
            forecasted_count=forecasted_count,
            settled_forecast_count=settled_forecast_count,
            content_hash=content_hash,
        )

        scorecard_run_list_entry.additional_properties = d
        return scorecard_run_list_entry

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
