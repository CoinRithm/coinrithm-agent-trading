from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset
from typing import cast






T = TypeVar("T", bound="AgentEvaluationStats")



@_attrs_define
class AgentEvaluationStats:
    """ 
        Attributes:
            max_drawdown_musd (float | Unset):
            profit_factor (float | None | Unset):
            average_win_musd (float | None | Unset):
            average_loss_musd (float | None | Unset):
            active_days (int | Unset):
     """

    max_drawdown_musd: float | Unset = UNSET
    profit_factor: float | None | Unset = UNSET
    average_win_musd: float | None | Unset = UNSET
    average_loss_musd: float | None | Unset = UNSET
    active_days: int | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)





    def to_dict(self) -> dict[str, Any]:
        max_drawdown_musd = self.max_drawdown_musd

        profit_factor: float | None | Unset
        if isinstance(self.profit_factor, Unset):
            profit_factor = UNSET
        else:
            profit_factor = self.profit_factor

        average_win_musd: float | None | Unset
        if isinstance(self.average_win_musd, Unset):
            average_win_musd = UNSET
        else:
            average_win_musd = self.average_win_musd

        average_loss_musd: float | None | Unset
        if isinstance(self.average_loss_musd, Unset):
            average_loss_musd = UNSET
        else:
            average_loss_musd = self.average_loss_musd

        active_days = self.active_days


        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({
        })
        if max_drawdown_musd is not UNSET:
            field_dict["maxDrawdownMusd"] = max_drawdown_musd
        if profit_factor is not UNSET:
            field_dict["profitFactor"] = profit_factor
        if average_win_musd is not UNSET:
            field_dict["averageWinMusd"] = average_win_musd
        if average_loss_musd is not UNSET:
            field_dict["averageLossMusd"] = average_loss_musd
        if active_days is not UNSET:
            field_dict["activeDays"] = active_days

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        max_drawdown_musd = d.pop("maxDrawdownMusd", UNSET)

        def _parse_profit_factor(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        profit_factor = _parse_profit_factor(d.pop("profitFactor", UNSET))


        def _parse_average_win_musd(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        average_win_musd = _parse_average_win_musd(d.pop("averageWinMusd", UNSET))


        def _parse_average_loss_musd(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        average_loss_musd = _parse_average_loss_musd(d.pop("averageLossMusd", UNSET))


        active_days = d.pop("activeDays", UNSET)

        agent_evaluation_stats = cls(
            max_drawdown_musd=max_drawdown_musd,
            profit_factor=profit_factor,
            average_win_musd=average_win_musd,
            average_loss_musd=average_loss_musd,
            active_days=active_days,
        )


        agent_evaluation_stats.additional_properties = d
        return agent_evaluation_stats

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
