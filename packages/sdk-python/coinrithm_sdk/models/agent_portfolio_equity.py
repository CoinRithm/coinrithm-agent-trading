from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

T = TypeVar("T", bound="AgentPortfolioEquity")


@_attrs_define
class AgentPortfolioEquity:
    """
    Attributes:
        total_usd (float | Unset): Current paper equity in USD (cash + positions).
        available (float | Unset): spendable cash (mUSD)
        frozen (float | Unset): cash reserved by open spot orders (mUSD)
        frozen_pm (float | Unset): cash reserved by open PM positions (mUSD)
        frozen_futures (float | Unset): cash reserved as futures margin (mUSD)
        cash_total (float | Unset): available + frozen + frozenPm + frozenFutures — the canonical
            spendable-plus-held cash total (mUSD).
    """

    total_usd: float | Unset = UNSET
    available: float | Unset = UNSET
    frozen: float | Unset = UNSET
    frozen_pm: float | Unset = UNSET
    frozen_futures: float | Unset = UNSET
    cash_total: float | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        total_usd = self.total_usd

        available = self.available

        frozen = self.frozen

        frozen_pm = self.frozen_pm

        frozen_futures = self.frozen_futures

        cash_total = self.cash_total

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if total_usd is not UNSET:
            field_dict["totalUsd"] = total_usd
        if available is not UNSET:
            field_dict["available"] = available
        if frozen is not UNSET:
            field_dict["frozen"] = frozen
        if frozen_pm is not UNSET:
            field_dict["frozenPm"] = frozen_pm
        if frozen_futures is not UNSET:
            field_dict["frozenFutures"] = frozen_futures
        if cash_total is not UNSET:
            field_dict["cashTotal"] = cash_total

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        total_usd = d.pop("totalUsd", UNSET)

        available = d.pop("available", UNSET)

        frozen = d.pop("frozen", UNSET)

        frozen_pm = d.pop("frozenPm", UNSET)

        frozen_futures = d.pop("frozenFutures", UNSET)

        cash_total = d.pop("cashTotal", UNSET)

        agent_portfolio_equity = cls(
            total_usd=total_usd,
            available=available,
            frozen=frozen,
            frozen_pm=frozen_pm,
            frozen_futures=frozen_futures,
            cash_total=cash_total,
        )

        agent_portfolio_equity.additional_properties = d
        return agent_portfolio_equity

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
