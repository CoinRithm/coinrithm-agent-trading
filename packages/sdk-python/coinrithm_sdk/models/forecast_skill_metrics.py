from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset
from typing import cast






T = TypeVar("T", bound="ForecastSkillMetrics")



@_attrs_define
class ForecastSkillMetrics:
    """ Track B metrics; all `null` until the sufficiency gate is met. Brier is
    lower = better.

        Attributes:
            agent_brier (float | None | Unset): Brier over the agent's OWN forecast — the honest skill number.
            agent_log_score (float | None | Unset): Mean negative log-loss over the agent's own forecast (punishes confident
                wrong calls harder).
            market_brier (float | None | Unset): Baseline Brier over the MARKET entry price on the same forecasted rows.
            reference_brier (float | None | Unset): Baseline Brier over the cross-venue reference on the referenced subset;
                `null` when none.
            brier_skill_vs_market (float | None | Unset): 1 − agentBrier/marketBrier (matched subset). >0 = beat the market
                baseline; `null` when unavailable.
            brier_skill_vs_reference (float | None | Unset): 1 − agentBrier/referenceBrier (matched subset). >0 = beat the
                reference baseline; `null` when unavailable.
     """

    agent_brier: float | None | Unset = UNSET
    agent_log_score: float | None | Unset = UNSET
    market_brier: float | None | Unset = UNSET
    reference_brier: float | None | Unset = UNSET
    brier_skill_vs_market: float | None | Unset = UNSET
    brier_skill_vs_reference: float | None | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)





    def to_dict(self) -> dict[str, Any]:
        agent_brier: float | None | Unset
        if isinstance(self.agent_brier, Unset):
            agent_brier = UNSET
        else:
            agent_brier = self.agent_brier

        agent_log_score: float | None | Unset
        if isinstance(self.agent_log_score, Unset):
            agent_log_score = UNSET
        else:
            agent_log_score = self.agent_log_score

        market_brier: float | None | Unset
        if isinstance(self.market_brier, Unset):
            market_brier = UNSET
        else:
            market_brier = self.market_brier

        reference_brier: float | None | Unset
        if isinstance(self.reference_brier, Unset):
            reference_brier = UNSET
        else:
            reference_brier = self.reference_brier

        brier_skill_vs_market: float | None | Unset
        if isinstance(self.brier_skill_vs_market, Unset):
            brier_skill_vs_market = UNSET
        else:
            brier_skill_vs_market = self.brier_skill_vs_market

        brier_skill_vs_reference: float | None | Unset
        if isinstance(self.brier_skill_vs_reference, Unset):
            brier_skill_vs_reference = UNSET
        else:
            brier_skill_vs_reference = self.brier_skill_vs_reference


        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({
        })
        if agent_brier is not UNSET:
            field_dict["agentBrier"] = agent_brier
        if agent_log_score is not UNSET:
            field_dict["agentLogScore"] = agent_log_score
        if market_brier is not UNSET:
            field_dict["marketBrier"] = market_brier
        if reference_brier is not UNSET:
            field_dict["referenceBrier"] = reference_brier
        if brier_skill_vs_market is not UNSET:
            field_dict["brierSkillVsMarket"] = brier_skill_vs_market
        if brier_skill_vs_reference is not UNSET:
            field_dict["brierSkillVsReference"] = brier_skill_vs_reference

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        def _parse_agent_brier(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        agent_brier = _parse_agent_brier(d.pop("agentBrier", UNSET))


        def _parse_agent_log_score(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        agent_log_score = _parse_agent_log_score(d.pop("agentLogScore", UNSET))


        def _parse_market_brier(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        market_brier = _parse_market_brier(d.pop("marketBrier", UNSET))


        def _parse_reference_brier(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        reference_brier = _parse_reference_brier(d.pop("referenceBrier", UNSET))


        def _parse_brier_skill_vs_market(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        brier_skill_vs_market = _parse_brier_skill_vs_market(d.pop("brierSkillVsMarket", UNSET))


        def _parse_brier_skill_vs_reference(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        brier_skill_vs_reference = _parse_brier_skill_vs_reference(d.pop("brierSkillVsReference", UNSET))


        forecast_skill_metrics = cls(
            agent_brier=agent_brier,
            agent_log_score=agent_log_score,
            market_brier=market_brier,
            reference_brier=reference_brier,
            brier_skill_vs_market=brier_skill_vs_market,
            brier_skill_vs_reference=brier_skill_vs_reference,
        )


        forecast_skill_metrics.additional_properties = d
        return forecast_skill_metrics

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
