from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.agent_scorecard_response_calibration_basis import AgentScorecardResponseCalibrationBasis
from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.agent_forecast_skill import AgentForecastSkill
    from ..models.scorecard import Scorecard
    from ..models.scorecard_run_pointer import ScorecardRunPointer


T = TypeVar("T", bound="AgentScorecardResponse")


@_attrs_define
class AgentScorecardResponse:
    """The public Verified Scorecard envelope for one agent — two honest tracks
    plus machine-readable basis + policy stamps.

        Attributes:
            scorecard (None | Scorecard | Unset): Track A (`coinrithm.agent.scorecard.v1`) — risk-adjusted ratios +
                MARKET-ENTRY calibration. `null` for a thin record. This object's
                keys and `contentHash` are a fixed shared-engine copy; the track
                label lives in the sibling `calibrationBasis`, never inside it.
            calibration_basis (AgentScorecardResponseCalibrationBasis | Unset): What Track A's
                `scorecard.metrics.brier_score` / `calibration_error`
                measure: MARKET-ENTRY calibration (the price the agent PAID at entry),
                a BASELINE — NOT the agent's forecast skill. Machine-readable so a
                consumer distinguishes Track A from Track B (`forecastSkill.basis`)
                without parsing prose or UI labels.
            forecast_skill (AgentForecastSkill | Unset): Track B — `coinrithm.agent.forecastSkill.v1`. The agent's OWN
                independent
                forecast skill over settled, independently-forecast PM decisions, scored
                vs the market-entry and cross-venue reference baselines, with a
                sample-sufficiency gate so a thin record is never surfaced as a rankable
                number.
            evaluation_policy_version (str | Unset): Versioned evaluation semantics that produced these numbers. Example:
                eval-1.
            execution_policy_version (str | Unset): Versioned paper-execution policy the underlying realized PnL was filled
                under (fees/spread/slippage; never costless). Example: paper_execution_v1.
            latest_run (None | ScorecardRunPointer | Unset): Serve-time pointer to the agent's most recent IMMUTABLE
                scorecard
                snapshot (`ScorecardRun`), so a consumer can jump from this (mutable)
                computed read to a frozen, verifiable point-in-time run. `null` when no
                run has been recorded yet. NOT part of a stored run's `resultJson` (it
                is a decoration added only when serving the live scorecard).
    """

    scorecard: None | Scorecard | Unset = UNSET
    calibration_basis: AgentScorecardResponseCalibrationBasis | Unset = UNSET
    forecast_skill: AgentForecastSkill | Unset = UNSET
    evaluation_policy_version: str | Unset = UNSET
    execution_policy_version: str | Unset = UNSET
    latest_run: None | ScorecardRunPointer | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        from ..models.scorecard import Scorecard
        from ..models.scorecard_run_pointer import ScorecardRunPointer

        scorecard: dict[str, Any] | None | Unset
        if isinstance(self.scorecard, Unset):
            scorecard = UNSET
        elif isinstance(self.scorecard, Scorecard):
            scorecard = self.scorecard.to_dict()
        else:
            scorecard = self.scorecard

        calibration_basis: str | Unset = UNSET
        if not isinstance(self.calibration_basis, Unset):
            calibration_basis = self.calibration_basis.value

        forecast_skill: dict[str, Any] | Unset = UNSET
        if not isinstance(self.forecast_skill, Unset):
            forecast_skill = self.forecast_skill.to_dict()

        evaluation_policy_version = self.evaluation_policy_version

        execution_policy_version = self.execution_policy_version

        latest_run: dict[str, Any] | None | Unset
        if isinstance(self.latest_run, Unset):
            latest_run = UNSET
        elif isinstance(self.latest_run, ScorecardRunPointer):
            latest_run = self.latest_run.to_dict()
        else:
            latest_run = self.latest_run

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if scorecard is not UNSET:
            field_dict["scorecard"] = scorecard
        if calibration_basis is not UNSET:
            field_dict["calibrationBasis"] = calibration_basis
        if forecast_skill is not UNSET:
            field_dict["forecastSkill"] = forecast_skill
        if evaluation_policy_version is not UNSET:
            field_dict["evaluationPolicyVersion"] = evaluation_policy_version
        if execution_policy_version is not UNSET:
            field_dict["executionPolicyVersion"] = execution_policy_version
        if latest_run is not UNSET:
            field_dict["latestRun"] = latest_run

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.agent_forecast_skill import AgentForecastSkill
        from ..models.scorecard import Scorecard
        from ..models.scorecard_run_pointer import ScorecardRunPointer

        d = dict(src_dict)

        def _parse_scorecard(data: object) -> None | Scorecard | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                scorecard_type_0 = Scorecard.from_dict(data)

                return scorecard_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | Scorecard | Unset, data)

        scorecard = _parse_scorecard(d.pop("scorecard", UNSET))

        _calibration_basis = d.pop("calibrationBasis", UNSET)
        calibration_basis: AgentScorecardResponseCalibrationBasis | Unset
        if isinstance(_calibration_basis, Unset):
            calibration_basis = UNSET
        else:
            calibration_basis = AgentScorecardResponseCalibrationBasis(_calibration_basis)

        _forecast_skill = d.pop("forecastSkill", UNSET)
        forecast_skill: AgentForecastSkill | Unset
        if isinstance(_forecast_skill, Unset):
            forecast_skill = UNSET
        else:
            forecast_skill = AgentForecastSkill.from_dict(_forecast_skill)

        evaluation_policy_version = d.pop("evaluationPolicyVersion", UNSET)

        execution_policy_version = d.pop("executionPolicyVersion", UNSET)

        def _parse_latest_run(data: object) -> None | ScorecardRunPointer | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                latest_run_type_0 = ScorecardRunPointer.from_dict(data)

                return latest_run_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | ScorecardRunPointer | Unset, data)

        latest_run = _parse_latest_run(d.pop("latestRun", UNSET))

        agent_scorecard_response = cls(
            scorecard=scorecard,
            calibration_basis=calibration_basis,
            forecast_skill=forecast_skill,
            evaluation_policy_version=evaluation_policy_version,
            execution_policy_version=execution_policy_version,
            latest_run=latest_run,
        )

        agent_scorecard_response.additional_properties = d
        return agent_scorecard_response

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
