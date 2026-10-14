from __future__ import annotations

from collections.abc import Mapping
from typing import Any, Literal, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.arena_contract_ranking_non_positive_score import ArenaContractRankingNonPositiveScore
from ..models.arena_contract_ranking_positive_score import ArenaContractRankingPositiveScore
from ..types import UNSET, Unset

T = TypeVar("T", bound="ArenaContractRanking")


@_attrs_define
class ArenaContractRanking:
    """
    Attributes:
        listing_minimum_decided_trades (Literal[0]):
        qualification_decided_trades (Literal[5]):
        positive_score (ArenaContractRankingPositiveScore):
        non_positive_score (ArenaContractRankingNonPositiveScore):
        unrealized_pnl_affects_rank (bool | str): v2 "losses_only" (open losses count, open gains never do); v1 false.
        mark_max_age_hours (int | Unset): v2. A mark older than this leaves the position unpriced.
        rank_pending_unmarked_share (float | Unset): v2. Unpriced open cost above this share of the start balance makes
            the rank pending.
    """

    listing_minimum_decided_trades: Literal[0]
    qualification_decided_trades: Literal[5]
    positive_score: ArenaContractRankingPositiveScore
    non_positive_score: ArenaContractRankingNonPositiveScore
    unrealized_pnl_affects_rank: bool | str
    mark_max_age_hours: int | Unset = UNSET
    rank_pending_unmarked_share: float | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        listing_minimum_decided_trades = self.listing_minimum_decided_trades

        qualification_decided_trades = self.qualification_decided_trades

        positive_score = self.positive_score.value

        non_positive_score = self.non_positive_score.value

        unrealized_pnl_affects_rank: bool | str
        unrealized_pnl_affects_rank = self.unrealized_pnl_affects_rank

        mark_max_age_hours = self.mark_max_age_hours

        rank_pending_unmarked_share = self.rank_pending_unmarked_share

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
        if mark_max_age_hours is not UNSET:
            field_dict["markMaxAgeHours"] = mark_max_age_hours
        if rank_pending_unmarked_share is not UNSET:
            field_dict["rankPendingUnmarkedShare"] = rank_pending_unmarked_share

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

        positive_score = ArenaContractRankingPositiveScore(d.pop("positiveScore"))

        non_positive_score = ArenaContractRankingNonPositiveScore(d.pop("nonPositiveScore"))

        def _parse_unrealized_pnl_affects_rank(data: object) -> bool | str:
            return cast(bool | str, data)

        unrealized_pnl_affects_rank = _parse_unrealized_pnl_affects_rank(d.pop("unrealizedPnlAffectsRank"))

        mark_max_age_hours = d.pop("markMaxAgeHours", UNSET)

        rank_pending_unmarked_share = d.pop("rankPendingUnmarkedShare", UNSET)

        arena_contract_ranking = cls(
            listing_minimum_decided_trades=listing_minimum_decided_trades,
            qualification_decided_trades=qualification_decided_trades,
            positive_score=positive_score,
            non_positive_score=non_positive_score,
            unrealized_pnl_affects_rank=unrealized_pnl_affects_rank,
            mark_max_age_hours=mark_max_age_hours,
            rank_pending_unmarked_share=rank_pending_unmarked_share,
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
