from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.agent_forecast_skill_basis import AgentForecastSkillBasis
from ..models.agent_forecast_skill_schema import AgentForecastSkillSchema
from ..models.agent_forecast_skill_state import AgentForecastSkillState
from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.agent_forecast_skill_cohorts_type_0 import AgentForecastSkillCohortsType0
    from ..models.forecast_skill_metrics import ForecastSkillMetrics


T = TypeVar("T", bound="AgentForecastSkill")


@_attrs_define
class AgentForecastSkill:
    """Track B — `coinrithm.agent.forecastSkill.v1`. The agent's OWN independent
    forecast skill over settled, independently-forecast PM decisions, scored
    vs the market-entry and cross-venue reference baselines, with a
    sample-sufficiency gate so a thin record is never surfaced as a rankable
    number.

        Attributes:
            schema (AgentForecastSkillSchema | Unset):
            basis (AgentForecastSkillBasis | Unset): Marks this block as the agent's OWN forecast skill (as opposed to
                Track A's `calibrationBasis: market_entry`). A constant identity
                descriptor.
            evaluation_policy_version (str | Unset):  Example: eval-1.
            state (AgentForecastSkillState | Unset): `ranked` once `forecastedCount >= minSettledForecasts`; otherwise
                `insufficient_data` — the counts are shown but `metrics` stay `null`
                (no rankable number over a thin sample).
            decided_count (int | Unset): All settled (win/loss) PM decisions in the record (coverage denominator).
            forecasted_count (int | Unset): Of the decided, how many carried an independent agent forecast we can score.
            referenced_count (int | Unset): Of the forecasted, how many also had a cross-venue reference.
            forecast_coverage (float | None | Unset): forecastedCount / decidedCount in [0,1]; `null` when there are no
                decided trades.
            min_settled_forecasts (int | Unset): Sample-sufficiency gate (echoed so the client never hard-codes it).
            metrics (ForecastSkillMetrics | Unset): Track B metrics; all `null` until the sufficiency gate is met. Brier is
                lower = better.
            cohorts (AgentForecastSkillCohortsType0 | None | Unset): Reserved eval-2 extension point (per-
                source/category/horizon); always null under eval-1.
            content_hash (str | Unset): SHA-256 (hex) of the canonicalized block — reproducible fingerprint.
    """

    schema: AgentForecastSkillSchema | Unset = UNSET
    basis: AgentForecastSkillBasis | Unset = UNSET
    evaluation_policy_version: str | Unset = UNSET
    state: AgentForecastSkillState | Unset = UNSET
    decided_count: int | Unset = UNSET
    forecasted_count: int | Unset = UNSET
    referenced_count: int | Unset = UNSET
    forecast_coverage: float | None | Unset = UNSET
    min_settled_forecasts: int | Unset = UNSET
    metrics: ForecastSkillMetrics | Unset = UNSET
    cohorts: AgentForecastSkillCohortsType0 | None | Unset = UNSET
    content_hash: str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        from ..models.agent_forecast_skill_cohorts_type_0 import AgentForecastSkillCohortsType0

        schema: str | Unset = UNSET
        if not isinstance(self.schema, Unset):
            schema = self.schema.value

        basis: str | Unset = UNSET
        if not isinstance(self.basis, Unset):
            basis = self.basis.value

        evaluation_policy_version = self.evaluation_policy_version

        state: str | Unset = UNSET
        if not isinstance(self.state, Unset):
            state = self.state.value

        decided_count = self.decided_count

        forecasted_count = self.forecasted_count

        referenced_count = self.referenced_count

        forecast_coverage: float | None | Unset
        if isinstance(self.forecast_coverage, Unset):
            forecast_coverage = UNSET
        else:
            forecast_coverage = self.forecast_coverage

        min_settled_forecasts = self.min_settled_forecasts

        metrics: dict[str, Any] | Unset = UNSET
        if not isinstance(self.metrics, Unset):
            metrics = self.metrics.to_dict()

        cohorts: dict[str, Any] | None | Unset
        if isinstance(self.cohorts, Unset):
            cohorts = UNSET
        elif isinstance(self.cohorts, AgentForecastSkillCohortsType0):
            cohorts = self.cohorts.to_dict()
        else:
            cohorts = self.cohorts

        content_hash = self.content_hash

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if schema is not UNSET:
            field_dict["schema"] = schema
        if basis is not UNSET:
            field_dict["basis"] = basis
        if evaluation_policy_version is not UNSET:
            field_dict["evaluationPolicyVersion"] = evaluation_policy_version
        if state is not UNSET:
            field_dict["state"] = state
        if decided_count is not UNSET:
            field_dict["decidedCount"] = decided_count
        if forecasted_count is not UNSET:
            field_dict["forecastedCount"] = forecasted_count
        if referenced_count is not UNSET:
            field_dict["referencedCount"] = referenced_count
        if forecast_coverage is not UNSET:
            field_dict["forecastCoverage"] = forecast_coverage
        if min_settled_forecasts is not UNSET:
            field_dict["minSettledForecasts"] = min_settled_forecasts
        if metrics is not UNSET:
            field_dict["metrics"] = metrics
        if cohorts is not UNSET:
            field_dict["cohorts"] = cohorts
        if content_hash is not UNSET:
            field_dict["contentHash"] = content_hash

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.agent_forecast_skill_cohorts_type_0 import AgentForecastSkillCohortsType0
        from ..models.forecast_skill_metrics import ForecastSkillMetrics

        d = dict(src_dict)
        _schema = d.pop("schema", UNSET)
        schema: AgentForecastSkillSchema | Unset
        if isinstance(_schema, Unset):
            schema = UNSET
        else:
            schema = AgentForecastSkillSchema(_schema)

        _basis = d.pop("basis", UNSET)
        basis: AgentForecastSkillBasis | Unset
        if isinstance(_basis, Unset):
            basis = UNSET
        else:
            basis = AgentForecastSkillBasis(_basis)

        evaluation_policy_version = d.pop("evaluationPolicyVersion", UNSET)

        _state = d.pop("state", UNSET)
        state: AgentForecastSkillState | Unset
        if isinstance(_state, Unset):
            state = UNSET
        else:
            state = AgentForecastSkillState(_state)

        decided_count = d.pop("decidedCount", UNSET)

        forecasted_count = d.pop("forecastedCount", UNSET)

        referenced_count = d.pop("referencedCount", UNSET)

        def _parse_forecast_coverage(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        forecast_coverage = _parse_forecast_coverage(d.pop("forecastCoverage", UNSET))

        min_settled_forecasts = d.pop("minSettledForecasts", UNSET)

        _metrics = d.pop("metrics", UNSET)
        metrics: ForecastSkillMetrics | Unset
        if isinstance(_metrics, Unset):
            metrics = UNSET
        else:
            metrics = ForecastSkillMetrics.from_dict(_metrics)

        def _parse_cohorts(data: object) -> AgentForecastSkillCohortsType0 | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                cohorts_type_0 = AgentForecastSkillCohortsType0.from_dict(data)

                return cohorts_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(AgentForecastSkillCohortsType0 | None | Unset, data)

        cohorts = _parse_cohorts(d.pop("cohorts", UNSET))

        content_hash = d.pop("contentHash", UNSET)

        agent_forecast_skill = cls(
            schema=schema,
            basis=basis,
            evaluation_policy_version=evaluation_policy_version,
            state=state,
            decided_count=decided_count,
            forecasted_count=forecasted_count,
            referenced_count=referenced_count,
            forecast_coverage=forecast_coverage,
            min_settled_forecasts=min_settled_forecasts,
            metrics=metrics,
            cohorts=cohorts,
            content_hash=content_hash,
        )

        agent_forecast_skill.additional_properties = d
        return agent_forecast_skill

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
