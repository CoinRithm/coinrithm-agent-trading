from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.realized_paper_trade_cost_basis import RealizedPaperTradeCostBasis
from ..models.realized_paper_trade_schema import RealizedPaperTradeSchema

T = TypeVar("T", bound="RealizedPaperTrade")


@_attrs_define
class RealizedPaperTrade:
    """
    Attributes:
        schema (RealizedPaperTradeSchema):
        position_id (int):
        stake_musd (float):
        realized_pnl_musd (float):
        return_on_stake_pct (float):
        settled_at (datetime.datetime):
        cost_basis (RealizedPaperTradeCostBasis):
        included_in_decision_hash (bool):
    """

    schema: RealizedPaperTradeSchema
    position_id: int
    stake_musd: float
    realized_pnl_musd: float
    return_on_stake_pct: float
    settled_at: datetime.datetime
    cost_basis: RealizedPaperTradeCostBasis
    included_in_decision_hash: bool
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        schema = self.schema.value

        position_id = self.position_id

        stake_musd = self.stake_musd

        realized_pnl_musd = self.realized_pnl_musd

        return_on_stake_pct = self.return_on_stake_pct

        settled_at = self.settled_at.isoformat()

        cost_basis = self.cost_basis.value

        included_in_decision_hash = self.included_in_decision_hash

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "schema": schema,
                "positionId": position_id,
                "stakeMusd": stake_musd,
                "realizedPnlMusd": realized_pnl_musd,
                "returnOnStakePct": return_on_stake_pct,
                "settledAt": settled_at,
                "costBasis": cost_basis,
                "includedInDecisionHash": included_in_decision_hash,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        schema = RealizedPaperTradeSchema(d.pop("schema"))

        position_id = d.pop("positionId")

        stake_musd = d.pop("stakeMusd")

        realized_pnl_musd = d.pop("realizedPnlMusd")

        return_on_stake_pct = d.pop("returnOnStakePct")

        settled_at = datetime.datetime.fromisoformat(d.pop("settledAt"))

        cost_basis = RealizedPaperTradeCostBasis(d.pop("costBasis"))

        included_in_decision_hash = d.pop("includedInDecisionHash")

        realized_paper_trade = cls(
            schema=schema,
            position_id=position_id,
            stake_musd=stake_musd,
            realized_pnl_musd=realized_pnl_musd,
            return_on_stake_pct=return_on_stake_pct,
            settled_at=settled_at,
            cost_basis=cost_basis,
            included_in_decision_hash=included_in_decision_hash,
        )

        realized_paper_trade.additional_properties = d
        return realized_paper_trade

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
