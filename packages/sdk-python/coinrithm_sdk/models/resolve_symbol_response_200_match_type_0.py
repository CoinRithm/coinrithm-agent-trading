from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

T = TypeVar("T", bound="ResolveSymbolResponse200MatchType0")


@_attrs_define
class ResolveSymbolResponse200MatchType0:
    """
    Attributes:
        coin_id (str | Unset):
        slug (str | Unset):
        symbol (str | Unset):
        name (str | Unset):
        market_cap_rank (int | None | Unset):
        categories (list[str] | Unset): CoinGecko sector tags (canonical English names).
    """

    coin_id: str | Unset = UNSET
    slug: str | Unset = UNSET
    symbol: str | Unset = UNSET
    name: str | Unset = UNSET
    market_cap_rank: int | None | Unset = UNSET
    categories: list[str] | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        coin_id = self.coin_id

        slug = self.slug

        symbol = self.symbol

        name = self.name

        market_cap_rank: int | None | Unset
        if isinstance(self.market_cap_rank, Unset):
            market_cap_rank = UNSET
        else:
            market_cap_rank = self.market_cap_rank

        categories: list[str] | Unset = UNSET
        if not isinstance(self.categories, Unset):
            categories = self.categories

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if coin_id is not UNSET:
            field_dict["coinId"] = coin_id
        if slug is not UNSET:
            field_dict["slug"] = slug
        if symbol is not UNSET:
            field_dict["symbol"] = symbol
        if name is not UNSET:
            field_dict["name"] = name
        if market_cap_rank is not UNSET:
            field_dict["marketCapRank"] = market_cap_rank
        if categories is not UNSET:
            field_dict["categories"] = categories

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        coin_id = d.pop("coinId", UNSET)

        slug = d.pop("slug", UNSET)

        symbol = d.pop("symbol", UNSET)

        name = d.pop("name", UNSET)

        def _parse_market_cap_rank(data: object) -> int | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(int | None | Unset, data)

        market_cap_rank = _parse_market_cap_rank(d.pop("marketCapRank", UNSET))

        categories = cast(list[str], d.pop("categories", UNSET))

        resolve_symbol_response_200_match_type_0 = cls(
            coin_id=coin_id,
            slug=slug,
            symbol=symbol,
            name=name,
            market_cap_rank=market_cap_rank,
            categories=categories,
        )

        resolve_symbol_response_200_match_type_0.additional_properties = d
        return resolve_symbol_response_200_match_type_0

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
