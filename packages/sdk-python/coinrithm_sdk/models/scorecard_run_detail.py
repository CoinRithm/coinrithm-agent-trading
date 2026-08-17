from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.agent_scorecard_response import AgentScorecardResponse
    from ..models.scorecard_run_cohort import ScorecardRunCohort
    from ..models.scorecard_run_contributions_summary import ScorecardRunContributionsSummary


T = TypeVar("T", bound="ScorecardRunDetail")


@_attrs_define
class ScorecardRunDetail:
    """One full IMMUTABLE scorecard run: the frozen two-track envelope exactly as
    served when snapshotted, plus its fingerprint, cohort definition and
    contribution summary.

        Attributes:
            id (int | Unset):
            api_key_id (int | None | Unset):
            agent (str | Unset): Public handle a{apiKeyId}-{slug}.
            computed_at (datetime.datetime | Unset):
            evaluation_policy_version (str | Unset):  Example: eval-1.
            execution_policy_version (str | Unset):  Example: paper_execution_v1.
            window_key (None | str | Unset):
            input_count (int | Unset):
            forecasted_count (int | Unset):
            settled_forecast_count (int | Unset):
            content_hash (str | Unset): sha256 (hex) of resultJson — recompute to verify the snapshot.
            cohort (None | ScorecardRunCohort | Unset):
            result_json (AgentScorecardResponse | Unset): The public Verified Scorecard envelope for one agent — two honest
                tracks
                plus machine-readable basis + policy stamps.
            contributions (ScorecardRunContributionsSummary | Unset): Summary of the run's immutable inclusion/exclusion
                record. The mean of the
                INCLUDED per-decision contributions reconciles to
                resultJson.forecastSkill.metrics when the run was ranked.
    """

    id: int | Unset = UNSET
    api_key_id: int | None | Unset = UNSET
    agent: str | Unset = UNSET
    computed_at: datetime.datetime | Unset = UNSET
    evaluation_policy_version: str | Unset = UNSET
    execution_policy_version: str | Unset = UNSET
    window_key: None | str | Unset = UNSET
    input_count: int | Unset = UNSET
    forecasted_count: int | Unset = UNSET
    settled_forecast_count: int | Unset = UNSET
    content_hash: str | Unset = UNSET
    cohort: None | ScorecardRunCohort | Unset = UNSET
    result_json: AgentScorecardResponse | Unset = UNSET
    contributions: ScorecardRunContributionsSummary | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        from ..models.scorecard_run_cohort import ScorecardRunCohort

        id = self.id

        api_key_id: int | None | Unset
        if isinstance(self.api_key_id, Unset):
            api_key_id = UNSET
        else:
            api_key_id = self.api_key_id

        agent = self.agent

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

        cohort: dict[str, Any] | None | Unset
        if isinstance(self.cohort, Unset):
            cohort = UNSET
        elif isinstance(self.cohort, ScorecardRunCohort):
            cohort = self.cohort.to_dict()
        else:
            cohort = self.cohort

        result_json: dict[str, Any] | Unset = UNSET
        if not isinstance(self.result_json, Unset):
            result_json = self.result_json.to_dict()

        contributions: dict[str, Any] | Unset = UNSET
        if not isinstance(self.contributions, Unset):
            contributions = self.contributions.to_dict()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if id is not UNSET:
            field_dict["id"] = id
        if api_key_id is not UNSET:
            field_dict["apiKeyId"] = api_key_id
        if agent is not UNSET:
            field_dict["agent"] = agent
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
        if cohort is not UNSET:
            field_dict["cohort"] = cohort
        if result_json is not UNSET:
            field_dict["resultJson"] = result_json
        if contributions is not UNSET:
            field_dict["contributions"] = contributions

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.agent_scorecard_response import AgentScorecardResponse
        from ..models.scorecard_run_cohort import ScorecardRunCohort
        from ..models.scorecard_run_contributions_summary import ScorecardRunContributionsSummary

        d = dict(src_dict)
        id = d.pop("id", UNSET)

        def _parse_api_key_id(data: object) -> int | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(int | None | Unset, data)

        api_key_id = _parse_api_key_id(d.pop("apiKeyId", UNSET))

        agent = d.pop("agent", UNSET)

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

        def _parse_cohort(data: object) -> None | ScorecardRunCohort | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                cohort_type_0 = ScorecardRunCohort.from_dict(data)

                return cohort_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | ScorecardRunCohort | Unset, data)

        cohort = _parse_cohort(d.pop("cohort", UNSET))

        _result_json = d.pop("resultJson", UNSET)
        result_json: AgentScorecardResponse | Unset
        if isinstance(_result_json, Unset):
            result_json = UNSET
        else:
            result_json = AgentScorecardResponse.from_dict(_result_json)

        _contributions = d.pop("contributions", UNSET)
        contributions: ScorecardRunContributionsSummary | Unset
        if isinstance(_contributions, Unset):
            contributions = UNSET
        else:
            contributions = ScorecardRunContributionsSummary.from_dict(_contributions)

        scorecard_run_detail = cls(
            id=id,
            api_key_id=api_key_id,
            agent=agent,
            computed_at=computed_at,
            evaluation_policy_version=evaluation_policy_version,
            execution_policy_version=execution_policy_version,
            window_key=window_key,
            input_count=input_count,
            forecasted_count=forecasted_count,
            settled_forecast_count=settled_forecast_count,
            content_hash=content_hash,
            cohort=cohort,
            result_json=result_json,
            contributions=contributions,
        )

        scorecard_run_detail.additional_properties = d
        return scorecard_run_detail

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
