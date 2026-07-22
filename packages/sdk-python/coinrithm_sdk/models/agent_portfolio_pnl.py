from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset






T = TypeVar("T", bound="AgentPortfolioPnl")



@_attrs_define
class AgentPortfolioPnl:
    """ 
        Attributes:
            field_24_h_usd (float | Unset):
            field_7_d_usd (float | Unset):
            field_30_d_usd (float | Unset):
            all_time_usd (float | Unset):
            field_24_h_pct (float | Unset): 0..1 fraction
            field_7_d_pct (float | Unset):
            field_30_d_pct (float | Unset):
            all_time_pct (float | Unset):
     """

    field_24_h_usd: float | Unset = UNSET
    field_7_d_usd: float | Unset = UNSET
    field_30_d_usd: float | Unset = UNSET
    all_time_usd: float | Unset = UNSET
    field_24_h_pct: float | Unset = UNSET
    field_7_d_pct: float | Unset = UNSET
    field_30_d_pct: float | Unset = UNSET
    all_time_pct: float | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)





    def to_dict(self) -> dict[str, Any]:
        field_24_h_usd = self.field_24_h_usd

        field_7_d_usd = self.field_7_d_usd

        field_30_d_usd = self.field_30_d_usd

        all_time_usd = self.all_time_usd

        field_24_h_pct = self.field_24_h_pct

        field_7_d_pct = self.field_7_d_pct

        field_30_d_pct = self.field_30_d_pct

        all_time_pct = self.all_time_pct


        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({
        })
        if field_24_h_usd is not UNSET:
            field_dict["24hUsd"] = field_24_h_usd
        if field_7_d_usd is not UNSET:
            field_dict["7dUsd"] = field_7_d_usd
        if field_30_d_usd is not UNSET:
            field_dict["30dUsd"] = field_30_d_usd
        if all_time_usd is not UNSET:
            field_dict["allTimeUsd"] = all_time_usd
        if field_24_h_pct is not UNSET:
            field_dict["24hPct"] = field_24_h_pct
        if field_7_d_pct is not UNSET:
            field_dict["7dPct"] = field_7_d_pct
        if field_30_d_pct is not UNSET:
            field_dict["30dPct"] = field_30_d_pct
        if all_time_pct is not UNSET:
            field_dict["allTimePct"] = all_time_pct

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        field_24_h_usd = d.pop("24hUsd", UNSET)

        field_7_d_usd = d.pop("7dUsd", UNSET)

        field_30_d_usd = d.pop("30dUsd", UNSET)

        all_time_usd = d.pop("allTimeUsd", UNSET)

        field_24_h_pct = d.pop("24hPct", UNSET)

        field_7_d_pct = d.pop("7dPct", UNSET)

        field_30_d_pct = d.pop("30dPct", UNSET)

        all_time_pct = d.pop("allTimePct", UNSET)

        agent_portfolio_pnl = cls(
            field_24_h_usd=field_24_h_usd,
            field_7_d_usd=field_7_d_usd,
            field_30_d_usd=field_30_d_usd,
            all_time_usd=all_time_usd,
            field_24_h_pct=field_24_h_pct,
            field_7_d_pct=field_7_d_pct,
            field_30_d_pct=field_30_d_pct,
            all_time_pct=all_time_pct,
        )


        agent_portfolio_pnl.additional_properties = d
        return agent_portfolio_pnl

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
