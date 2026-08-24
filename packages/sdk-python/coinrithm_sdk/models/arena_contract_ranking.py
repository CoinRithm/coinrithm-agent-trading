from __future__ import annotations

from collections.abc import Mapping
from typing import Any, Literal, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

T = TypeVar("T", bound="ArenaContractRanking")


@_attrs_define
class ArenaContractRanking:
    """
    Attributes:
        listing_minimum_decided_trades (Literal[0]):
        qualification_decided_trades (Literal[5]):
        positive_score (Literal['wilson_95_lower_bound_x_realized_pnl']):
        non_positive_score (Literal['realized_pnl']):
        unrealized_pnl_affects_rank (bool):
    """

    listing_minimum_decided_trades: Literal[0]
    qualification_decided_trades: Literal[5]
    positive_score: Literal["wilson_95_lower_bound_x_realized_pnl"]
    non_positive_score: Literal["realized_pnl"]
    unrealized_pnl_affects_rank: bool
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        listing_minimum_decided_trades = self.listing_minimum_decided_trades

        qualification_decided_trades = self.qualification_decided_trades

        positive_score = self.positive_score

        non_positive_score = self.non_positive_score

        unrealized_pnl_affects_rank = self.unrealized_pnl_affects_rank

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "listingMinimumDecidedTrades": listing_minimum_decided_trades,
                "qualificationDecidedTrades": qualification_decided_trades,
                "positiveScore": positive_score,
                "nonPositiveScore": non_positive_score,
                "unrealizedPnlAffectsRank": unrealized_pnl_affects_rank,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        listing_minimum_decided_trades = cast(Literal[0], d.pop("listingMinimumDecidedTrades"))
        if listing_minimum_decided_trades != 0:
            raise ValueError(f"listingMinimumDecidedTrades must match const 0, got '{listing_minimum_decided_trades}'")

        qualification_decided_trades = cast(Literal[5], d.pop("qualificationDecidedTrades"))
        if qualification_decided_trades != 5:
            raise ValueError(f"qualificationDecidedTrades must match const 5, got '{qualification_decided_trades}'")

        positive_score = cast(Literal["wilson_95_lower_bound_x_realized_pnl"], d.pop("positiveScore"))
        if positive_score != "wilson_95_lower_bound_x_realized_pnl":
            raise ValueError(
                f"positiveScore must match const 'wilson_95_lower_bound_x_realized_pnl', got '{positive_score}'"
            )

        non_positive_score = cast(Literal["realized_pnl"], d.pop("nonPositiveScore"))
        if non_positive_score != "realized_pnl":
            raise ValueError(f"nonPositiveScore must match const 'realized_pnl', got '{non_positive_score}'")

        unrealized_pnl_affects_rank = d.pop("unrealizedPnlAffectsRank")

        arena_contract_ranking = cls(
            listing_minimum_decided_trades=listing_minimum_decided_trades,
            qualification_decided_trades=qualification_decided_trades,
            positive_score=positive_score,
            non_positive_score=non_positive_score,
            unrealized_pnl_affects_rank=unrealized_pnl_affects_rank,
        )

        arena_contract_ranking.additional_properties = d
        return arena_contract_ranking

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
