from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

T = TypeVar("T", bound="AgentVenuePerf")


@_attrs_define
class AgentVenuePerf:
    """
    Attributes:
        realized_pnl_musd (float | Unset):
        trade_count (int | Unset):
        win_count (int | Unset):
        loss_count (int | Unset):
        neutral_count (int | Unset):
        win_rate (float | None | Unset):
    """

    realized_pnl_musd: float | Unset = UNSET
    trade_count: int | Unset = UNSET
    win_count: int | Unset = UNSET
    loss_count: int | Unset = UNSET
    neutral_count: int | Unset = UNSET
    win_rate: float | None | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        realized_pnl_musd = self.realized_pnl_musd

        trade_count = self.trade_count

        win_count = self.win_count

        loss_count = self.loss_count

        neutral_count = self.neutral_count

        win_rate: float | None | Unset
        if isinstance(self.win_rate, Unset):
            win_rate = UNSET
        else:
            win_rate = self.win_rate

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if realized_pnl_musd is not UNSET:
            field_dict["realizedPnlMusd"] = realized_pnl_musd
        if trade_count is not UNSET:
            field_dict["tradeCount"] = trade_count
        if win_count is not UNSET:
            field_dict["winCount"] = win_count
        if loss_count is not UNSET:
            field_dict["lossCount"] = loss_count
        if neutral_count is not UNSET:
            field_dict["neutralCount"] = neutral_count
        if win_rate is not UNSET:
            field_dict["winRate"] = win_rate

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        realized_pnl_musd = d.pop("realizedPnlMusd", UNSET)

        trade_count = d.pop("tradeCount", UNSET)

        win_count = d.pop("winCount", UNSET)

        loss_count = d.pop("lossCount", UNSET)

        neutral_count = d.pop("neutralCount", UNSET)

        def _parse_win_rate(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        win_rate = _parse_win_rate(d.pop("winRate", UNSET))

        agent_venue_perf = cls(
            realized_pnl_musd=realized_pnl_musd,
            trade_count=trade_count,
            win_count=win_count,
            loss_count=loss_count,
            neutral_count=neutral_count,
            win_rate=win_rate,
        )

        agent_venue_perf.additional_properties = d
        return agent_venue_perf

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
