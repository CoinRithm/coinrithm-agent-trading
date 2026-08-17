from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

T = TypeVar("T", bound="ScorecardMetrics")


@_attrs_define
class ScorecardMetrics:
    """Named metric map; any value is `null` when undefined for this record.
    `brier_score` and `calibration_error` measure MARKET-ENTRY calibration
    (see the response `calibrationBasis`), NOT agent forecast skill.

        Attributes:
            realized_pnl_musd (float | None | Unset):
            trade_count (float | None | Unset):
            decided_count (float | None | Unset):
            win_rate (float | None | Unset):
            expectancy_musd (float | None | Unset):
            profit_factor (float | None | Unset): null = infinity (no losing trades).
            reward_to_risk (float | None | Unset):
            sharpe (float | None | Unset):
            sortino (float | None | Unset):
            deflated_sharpe (float | None | Unset): Skill-vs-luck deflated Sharpe (Bailey and Lopez de Prado).
            max_drawdown_musd (float | None | Unset):
            brier_score (float | None | Unset): MARKET-ENTRY calibration baseline: mean((entry price − outcome)^2) over the
                agent's settled PM entries. NOT agent forecast skill. `null` when the record has no probabilistic (PM) calls.
            calibration_error (float | None | Unset): Expected calibration error (ECE, 10 buckets) of the MARKET-ENTRY price
                vs realized outcomes — a baseline, not agent skill. `null` with no PM calls.
            stop_coverage (float | None | Unset):
            evidence_coverage (float | None | Unset):
            leakage_clean (float | None | Unset): 1 = every write quoted before trade; 0 = not; null = unknown.
    """

    realized_pnl_musd: float | None | Unset = UNSET
    trade_count: float | None | Unset = UNSET
    decided_count: float | None | Unset = UNSET
    win_rate: float | None | Unset = UNSET
    expectancy_musd: float | None | Unset = UNSET
    profit_factor: float | None | Unset = UNSET
    reward_to_risk: float | None | Unset = UNSET
    sharpe: float | None | Unset = UNSET
    sortino: float | None | Unset = UNSET
    deflated_sharpe: float | None | Unset = UNSET
    max_drawdown_musd: float | None | Unset = UNSET
    brier_score: float | None | Unset = UNSET
    calibration_error: float | None | Unset = UNSET
    stop_coverage: float | None | Unset = UNSET
    evidence_coverage: float | None | Unset = UNSET
    leakage_clean: float | None | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        realized_pnl_musd: float | None | Unset
        if isinstance(self.realized_pnl_musd, Unset):
            realized_pnl_musd = UNSET
        else:
            realized_pnl_musd = self.realized_pnl_musd

        trade_count: float | None | Unset
        if isinstance(self.trade_count, Unset):
            trade_count = UNSET
        else:
            trade_count = self.trade_count

        decided_count: float | None | Unset
        if isinstance(self.decided_count, Unset):
            decided_count = UNSET
        else:
            decided_count = self.decided_count

        win_rate: float | None | Unset
        if isinstance(self.win_rate, Unset):
            win_rate = UNSET
        else:
            win_rate = self.win_rate

        expectancy_musd: float | None | Unset
        if isinstance(self.expectancy_musd, Unset):
            expectancy_musd = UNSET
        else:
            expectancy_musd = self.expectancy_musd

        profit_factor: float | None | Unset
        if isinstance(self.profit_factor, Unset):
            profit_factor = UNSET
        else:
            profit_factor = self.profit_factor

        reward_to_risk: float | None | Unset
        if isinstance(self.reward_to_risk, Unset):
            reward_to_risk = UNSET
        else:
            reward_to_risk = self.reward_to_risk

        sharpe: float | None | Unset
        if isinstance(self.sharpe, Unset):
            sharpe = UNSET
        else:
            sharpe = self.sharpe

        sortino: float | None | Unset
        if isinstance(self.sortino, Unset):
            sortino = UNSET
        else:
            sortino = self.sortino

        deflated_sharpe: float | None | Unset
        if isinstance(self.deflated_sharpe, Unset):
            deflated_sharpe = UNSET
        else:
            deflated_sharpe = self.deflated_sharpe

        max_drawdown_musd: float | None | Unset
        if isinstance(self.max_drawdown_musd, Unset):
            max_drawdown_musd = UNSET
        else:
            max_drawdown_musd = self.max_drawdown_musd

        brier_score: float | None | Unset
        if isinstance(self.brier_score, Unset):
            brier_score = UNSET
        else:
            brier_score = self.brier_score

        calibration_error: float | None | Unset
        if isinstance(self.calibration_error, Unset):
            calibration_error = UNSET
        else:
            calibration_error = self.calibration_error

        stop_coverage: float | None | Unset
        if isinstance(self.stop_coverage, Unset):
            stop_coverage = UNSET
        else:
            stop_coverage = self.stop_coverage

        evidence_coverage: float | None | Unset
        if isinstance(self.evidence_coverage, Unset):
            evidence_coverage = UNSET
        else:
            evidence_coverage = self.evidence_coverage

        leakage_clean: float | None | Unset
        if isinstance(self.leakage_clean, Unset):
            leakage_clean = UNSET
        else:
            leakage_clean = self.leakage_clean

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if realized_pnl_musd is not UNSET:
            field_dict["realized_pnl_musd"] = realized_pnl_musd
        if trade_count is not UNSET:
            field_dict["trade_count"] = trade_count
        if decided_count is not UNSET:
            field_dict["decided_count"] = decided_count
        if win_rate is not UNSET:
            field_dict["win_rate"] = win_rate
        if expectancy_musd is not UNSET:
            field_dict["expectancy_musd"] = expectancy_musd
        if profit_factor is not UNSET:
            field_dict["profit_factor"] = profit_factor
        if reward_to_risk is not UNSET:
            field_dict["reward_to_risk"] = reward_to_risk
        if sharpe is not UNSET:
            field_dict["sharpe"] = sharpe
        if sortino is not UNSET:
            field_dict["sortino"] = sortino
        if deflated_sharpe is not UNSET:
            field_dict["deflated_sharpe"] = deflated_sharpe
        if max_drawdown_musd is not UNSET:
            field_dict["max_drawdown_musd"] = max_drawdown_musd
        if brier_score is not UNSET:
            field_dict["brier_score"] = brier_score
        if calibration_error is not UNSET:
            field_dict["calibration_error"] = calibration_error
        if stop_coverage is not UNSET:
            field_dict["stop_coverage"] = stop_coverage
        if evidence_coverage is not UNSET:
            field_dict["evidence_coverage"] = evidence_coverage
        if leakage_clean is not UNSET:
            field_dict["leakage_clean"] = leakage_clean

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)

        def _parse_realized_pnl_musd(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        realized_pnl_musd = _parse_realized_pnl_musd(d.pop("realized_pnl_musd", UNSET))

        def _parse_trade_count(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        trade_count = _parse_trade_count(d.pop("trade_count", UNSET))

        def _parse_decided_count(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        decided_count = _parse_decided_count(d.pop("decided_count", UNSET))

        def _parse_win_rate(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        win_rate = _parse_win_rate(d.pop("win_rate", UNSET))

        def _parse_expectancy_musd(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        expectancy_musd = _parse_expectancy_musd(d.pop("expectancy_musd", UNSET))

        def _parse_profit_factor(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        profit_factor = _parse_profit_factor(d.pop("profit_factor", UNSET))

        def _parse_reward_to_risk(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        reward_to_risk = _parse_reward_to_risk(d.pop("reward_to_risk", UNSET))

        def _parse_sharpe(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        sharpe = _parse_sharpe(d.pop("sharpe", UNSET))

        def _parse_sortino(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        sortino = _parse_sortino(d.pop("sortino", UNSET))

        def _parse_deflated_sharpe(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        deflated_sharpe = _parse_deflated_sharpe(d.pop("deflated_sharpe", UNSET))

        def _parse_max_drawdown_musd(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        max_drawdown_musd = _parse_max_drawdown_musd(d.pop("max_drawdown_musd", UNSET))

        def _parse_brier_score(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        brier_score = _parse_brier_score(d.pop("brier_score", UNSET))

        def _parse_calibration_error(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        calibration_error = _parse_calibration_error(d.pop("calibration_error", UNSET))

        def _parse_stop_coverage(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        stop_coverage = _parse_stop_coverage(d.pop("stop_coverage", UNSET))

        def _parse_evidence_coverage(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        evidence_coverage = _parse_evidence_coverage(d.pop("evidence_coverage", UNSET))

        def _parse_leakage_clean(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        leakage_clean = _parse_leakage_clean(d.pop("leakage_clean", UNSET))

        scorecard_metrics = cls(
            realized_pnl_musd=realized_pnl_musd,
            trade_count=trade_count,
            decided_count=decided_count,
            win_rate=win_rate,
            expectancy_musd=expectancy_musd,
            profit_factor=profit_factor,
            reward_to_risk=reward_to_risk,
            sharpe=sharpe,
            sortino=sortino,
            deflated_sharpe=deflated_sharpe,
            max_drawdown_musd=max_drawdown_musd,
            brier_score=brier_score,
            calibration_error=calibration_error,
            stop_coverage=stop_coverage,
            evidence_coverage=evidence_coverage,
            leakage_clean=leakage_clean,
        )

        scorecard_metrics.additional_properties = d
        return scorecard_metrics

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
