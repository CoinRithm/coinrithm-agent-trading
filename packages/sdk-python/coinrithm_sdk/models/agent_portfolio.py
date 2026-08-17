from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.agent_portfolio_equity import AgentPortfolioEquity
    from ..models.agent_portfolio_open_orders_item import AgentPortfolioOpenOrdersItem
    from ..models.agent_portfolio_pnl import AgentPortfolioPnl
    from ..models.agent_portfolio_progression_type_0 import AgentPortfolioProgressionType0


T = TypeVar("T", bound="AgentPortfolio")


@_attrs_define
class AgentPortfolio:
    """Lean, PII-free portfolio projection served to agents (NOT the human
    dashboard — no email/username, no per-asset list, no order history).
    Equity and PnL come from the exact same computation as the human
    dashboard; only the projection differs.

        Attributes:
            wallet_id (int | Unset):
            equity (AgentPortfolioEquity | Unset):
            pnl (AgentPortfolioPnl | Unset):
            open_orders (list[AgentPortfolioOpenOrdersItem] | Unset): Open (resting) spot orders, same projection as the
                dashboard.
            progression (AgentPortfolioProgressionType0 | None | Unset): Compact, non-identifying gamification block.
    """

    wallet_id: int | Unset = UNSET
    equity: AgentPortfolioEquity | Unset = UNSET
    pnl: AgentPortfolioPnl | Unset = UNSET
    open_orders: list[AgentPortfolioOpenOrdersItem] | Unset = UNSET
    progression: AgentPortfolioProgressionType0 | None | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        from ..models.agent_portfolio_progression_type_0 import AgentPortfolioProgressionType0

        wallet_id = self.wallet_id

        equity: dict[str, Any] | Unset = UNSET
        if not isinstance(self.equity, Unset):
            equity = self.equity.to_dict()

        pnl: dict[str, Any] | Unset = UNSET
        if not isinstance(self.pnl, Unset):
            pnl = self.pnl.to_dict()

        open_orders: list[dict[str, Any]] | Unset = UNSET
        if not isinstance(self.open_orders, Unset):
            open_orders = []
            for open_orders_item_data in self.open_orders:
                open_orders_item = open_orders_item_data.to_dict()
                open_orders.append(open_orders_item)

        progression: dict[str, Any] | None | Unset
        if isinstance(self.progression, Unset):
            progression = UNSET
        elif isinstance(self.progression, AgentPortfolioProgressionType0):
            progression = self.progression.to_dict()
        else:
            progression = self.progression

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if wallet_id is not UNSET:
            field_dict["walletId"] = wallet_id
        if equity is not UNSET:
            field_dict["equity"] = equity
        if pnl is not UNSET:
            field_dict["pnl"] = pnl
        if open_orders is not UNSET:
            field_dict["openOrders"] = open_orders
        if progression is not UNSET:
            field_dict["progression"] = progression

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.agent_portfolio_equity import AgentPortfolioEquity
        from ..models.agent_portfolio_open_orders_item import AgentPortfolioOpenOrdersItem
        from ..models.agent_portfolio_pnl import AgentPortfolioPnl
        from ..models.agent_portfolio_progression_type_0 import AgentPortfolioProgressionType0

        d = dict(src_dict)
        wallet_id = d.pop("walletId", UNSET)

        _equity = d.pop("equity", UNSET)
        equity: AgentPortfolioEquity | Unset
        if isinstance(_equity, Unset):
            equity = UNSET
        else:
            equity = AgentPortfolioEquity.from_dict(_equity)

        _pnl = d.pop("pnl", UNSET)
        pnl: AgentPortfolioPnl | Unset
        if isinstance(_pnl, Unset):
            pnl = UNSET
        else:
            pnl = AgentPortfolioPnl.from_dict(_pnl)

        _open_orders = d.pop("openOrders", UNSET)
        open_orders: list[AgentPortfolioOpenOrdersItem] | Unset = UNSET
        if _open_orders is not UNSET:
            open_orders = []
            for open_orders_item_data in _open_orders:
                open_orders_item = AgentPortfolioOpenOrdersItem.from_dict(open_orders_item_data)

                open_orders.append(open_orders_item)

        def _parse_progression(data: object) -> AgentPortfolioProgressionType0 | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                progression_type_0 = AgentPortfolioProgressionType0.from_dict(data)

                return progression_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(AgentPortfolioProgressionType0 | None | Unset, data)

        progression = _parse_progression(d.pop("progression", UNSET))

        agent_portfolio = cls(
            wallet_id=wallet_id,
            equity=equity,
            pnl=pnl,
            open_orders=open_orders,
            progression=progression,
        )

        agent_portfolio.additional_properties = d
        return agent_portfolio

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
