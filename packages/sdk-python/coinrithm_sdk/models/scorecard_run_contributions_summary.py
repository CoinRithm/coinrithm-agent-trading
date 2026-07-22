from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset
from typing import cast

if TYPE_CHECKING:
  from ..models.scorecard_run_contributions_summary_exclusion_reasons import ScorecardRunContributionsSummaryExclusionReasons





T = TypeVar("T", bound="ScorecardRunContributionsSummary")



@_attrs_define
class ScorecardRunContributionsSummary:
    """ Summary of the run's immutable inclusion/exclusion record. The mean of the
    INCLUDED per-decision contributions reconciles to
    resultJson.forecastSkill.metrics when the run was ranked.

        Attributes:
            total (int | Unset): Candidate decisions on the record for this run.
            included (int | Unset): Decisions that fed the run's ranked forecast-skill number.
            excluded (int | Unset):
            exclusion_reasons (ScorecardRunContributionsSummaryExclusionReasons | Unset): Count of excluded decisions per
                reason.
            mean_brier_contribution (float | None | Unset): Mean of the included per-decision Brier contributions (null when
                none included).
            mean_log_score_contribution (float | None | Unset): Mean of the included per-decision log-score contributions.
     """

    total: int | Unset = UNSET
    included: int | Unset = UNSET
    excluded: int | Unset = UNSET
    exclusion_reasons: ScorecardRunContributionsSummaryExclusionReasons | Unset = UNSET
    mean_brier_contribution: float | None | Unset = UNSET
    mean_log_score_contribution: float | None | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)





    def to_dict(self) -> dict[str, Any]:
        from ..models.scorecard_run_contributions_summary_exclusion_reasons import ScorecardRunContributionsSummaryExclusionReasons
        total = self.total

        included = self.included

        excluded = self.excluded

        exclusion_reasons: dict[str, Any] | Unset = UNSET
        if not isinstance(self.exclusion_reasons, Unset):
            exclusion_reasons = self.exclusion_reasons.to_dict()

        mean_brier_contribution: float | None | Unset
        if isinstance(self.mean_brier_contribution, Unset):
            mean_brier_contribution = UNSET
        else:
            mean_brier_contribution = self.mean_brier_contribution

        mean_log_score_contribution: float | None | Unset
        if isinstance(self.mean_log_score_contribution, Unset):
            mean_log_score_contribution = UNSET
        else:
            mean_log_score_contribution = self.mean_log_score_contribution


        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({
        })
        if total is not UNSET:
            field_dict["total"] = total
        if included is not UNSET:
            field_dict["included"] = included
        if excluded is not UNSET:
            field_dict["excluded"] = excluded
        if exclusion_reasons is not UNSET:
            field_dict["exclusionReasons"] = exclusion_reasons
        if mean_brier_contribution is not UNSET:
            field_dict["meanBrierContribution"] = mean_brier_contribution
        if mean_log_score_contribution is not UNSET:
            field_dict["meanLogScoreContribution"] = mean_log_score_contribution

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.scorecard_run_contributions_summary_exclusion_reasons import ScorecardRunContributionsSummaryExclusionReasons
        d = dict(src_dict)
        total = d.pop("total", UNSET)

        included = d.pop("included", UNSET)

        excluded = d.pop("excluded", UNSET)

        _exclusion_reasons = d.pop("exclusionReasons", UNSET)
        exclusion_reasons: ScorecardRunContributionsSummaryExclusionReasons | Unset
        if isinstance(_exclusion_reasons,  Unset):
            exclusion_reasons = UNSET
        else:
            exclusion_reasons = ScorecardRunContributionsSummaryExclusionReasons.from_dict(_exclusion_reasons)




        def _parse_mean_brier_contribution(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        mean_brier_contribution = _parse_mean_brier_contribution(d.pop("meanBrierContribution", UNSET))


        def _parse_mean_log_score_contribution(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        mean_log_score_contribution = _parse_mean_log_score_contribution(d.pop("meanLogScoreContribution", UNSET))


        scorecard_run_contributions_summary = cls(
            total=total,
            included=included,
            excluded=excluded,
            exclusion_reasons=exclusion_reasons,
            mean_brier_contribution=mean_brier_contribution,
            mean_log_score_contribution=mean_log_score_contribution,
        )


        scorecard_run_contributions_summary.additional_properties = d
        return scorecard_run_contributions_summary

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
