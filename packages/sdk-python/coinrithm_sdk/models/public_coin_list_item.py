from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.public_coin_list_item_categories_item import PublicCoinListItemCategoriesItem
    from ..models.public_coin_list_item_coin_chains_item import PublicCoinListItemCoinChainsItem
    from ..models.public_coin_list_item_info_links_type_0 import PublicCoinListItemInfoLinksType0
    from ..models.public_coin_socials_type_0_item import PublicCoinSocialsType0Item
    from ..models.public_coin_socials_type_1 import PublicCoinSocialsType1


T = TypeVar("T", bound="PublicCoinListItem")


@_attrs_define
class PublicCoinListItem:
    """One directory row. With `view=options` only `ucid`, `slug`, `name`,
    `symbol`, `isActive` and `marketCapRank` are present.

        Attributes:
            ucid (str): CoinRithm coin id, the `coinId` of the agent endpoints.
            slug (str):
            symbol (str): Ticker symbol. Symbols collide across listings; key on `ucid` or `slug`.
            name (str):
            market_cap_rank (int | None):
            is_active (bool): false for a delisted or inactive listing, which has no live price.
            external_id (str | Unset):
            logo_url (None | str | Unset):
            supply_circulating (float | None | Unset):
            supply_total (float | None | Unset):
            supply_max (float | None | Unset): Maximum supply; `-1` means uncapped, null unknown.
            website_url (None | str | Unset):
            socials (list[PublicCoinSocialsType0Item] | PublicCoinSocialsType1 | Unset): Social links, normally an array of
                `{url, socialId}` objects (the coin profile adds `name` and `icon`); some directory rows carry an empty object
                instead.
            info_links (None | PublicCoinListItemInfoLinksType0 | Unset): Link groups such as `website`, `whitepaper`,
                `explorers`, `wallets`, `source_code` and `audit`, each an array of `{url, name}` objects.
            created_at (datetime.datetime | Unset):
            updated_at (datetime.datetime | Unset): Last write to the directory row (metadata), not a price time.
            price_history_valid_from (datetime.datetime | None | Unset): Earliest time from which stored price history is
                considered valid, when set.
            categories (list[PublicCoinListItemCategoriesItem] | Unset):
            coin_chains (list[PublicCoinListItemCoinChainsItem] | Unset):
    """

    ucid: str
    slug: str
    symbol: str
    name: str
    market_cap_rank: int | None
    is_active: bool
    external_id: str | Unset = UNSET
    logo_url: None | str | Unset = UNSET
    supply_circulating: float | None | Unset = UNSET
    supply_total: float | None | Unset = UNSET
    supply_max: float | None | Unset = UNSET
    website_url: None | str | Unset = UNSET
    socials: list[PublicCoinSocialsType0Item] | PublicCoinSocialsType1 | Unset = UNSET
    info_links: None | PublicCoinListItemInfoLinksType0 | Unset = UNSET
    created_at: datetime.datetime | Unset = UNSET
    updated_at: datetime.datetime | Unset = UNSET
    price_history_valid_from: datetime.datetime | None | Unset = UNSET
    categories: list[PublicCoinListItemCategoriesItem] | Unset = UNSET
    coin_chains: list[PublicCoinListItemCoinChainsItem] | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        from ..models.public_coin_list_item_info_links_type_0 import PublicCoinListItemInfoLinksType0

        ucid = self.ucid

        slug = self.slug

        symbol = self.symbol

        name = self.name

        market_cap_rank: int | None
        market_cap_rank = self.market_cap_rank

        is_active = self.is_active

        external_id = self.external_id

        logo_url: None | str | Unset
        if isinstance(self.logo_url, Unset):
            logo_url = UNSET
        else:
            logo_url = self.logo_url

        supply_circulating: float | None | Unset
        if isinstance(self.supply_circulating, Unset):
            supply_circulating = UNSET
        else:
            supply_circulating = self.supply_circulating

        supply_total: float | None | Unset
        if isinstance(self.supply_total, Unset):
            supply_total = UNSET
        else:
            supply_total = self.supply_total

        supply_max: float | None | Unset
        if isinstance(self.supply_max, Unset):
            supply_max = UNSET
        else:
            supply_max = self.supply_max

        website_url: None | str | Unset
        if isinstance(self.website_url, Unset):
            website_url = UNSET
        else:
            website_url = self.website_url

        socials: dict[str, Any] | list[dict[str, Any]] | Unset
        if isinstance(self.socials, Unset):
            socials = UNSET
        elif isinstance(self.socials, list):
            socials = []
            for componentsschemas_public_coin_socials_type_0_item_data in self.socials:
                componentsschemas_public_coin_socials_type_0_item = (
                    componentsschemas_public_coin_socials_type_0_item_data.to_dict()
                )
                socials.append(componentsschemas_public_coin_socials_type_0_item)

        else:
            socials = self.socials.to_dict()

        info_links: dict[str, Any] | None | Unset
        if isinstance(self.info_links, Unset):
            info_links = UNSET
        elif isinstance(self.info_links, PublicCoinListItemInfoLinksType0):
            info_links = self.info_links.to_dict()
        else:
            info_links = self.info_links

        created_at: str | Unset = UNSET
        if not isinstance(self.created_at, Unset):
            created_at = self.created_at.isoformat()

        updated_at: str | Unset = UNSET
        if not isinstance(self.updated_at, Unset):
            updated_at = self.updated_at.isoformat()

        price_history_valid_from: None | str | Unset
        if isinstance(self.price_history_valid_from, Unset):
            price_history_valid_from = UNSET
        elif isinstance(self.price_history_valid_from, datetime.datetime):
            price_history_valid_from = self.price_history_valid_from.isoformat()
        else:
            price_history_valid_from = self.price_history_valid_from

        categories: list[dict[str, Any]] | Unset = UNSET
        if not isinstance(self.categories, Unset):
            categories = []
            for categories_item_data in self.categories:
                categories_item = categories_item_data.to_dict()
                categories.append(categories_item)

        coin_chains: list[dict[str, Any]] | Unset = UNSET
        if not isinstance(self.coin_chains, Unset):
            coin_chains = []
            for coin_chains_item_data in self.coin_chains:
                coin_chains_item = coin_chains_item_data.to_dict()
                coin_chains.append(coin_chains_item)

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "ucid": ucid,
                "slug": slug,
                "symbol": symbol,
                "name": name,
                "marketCapRank": market_cap_rank,
                "isActive": is_active,
            }
        )
        if external_id is not UNSET:
            field_dict["externalId"] = external_id
        if logo_url is not UNSET:
            field_dict["logoUrl"] = logo_url
        if supply_circulating is not UNSET:
            field_dict["supplyCirculating"] = supply_circulating
        if supply_total is not UNSET:
            field_dict["supplyTotal"] = supply_total
        if supply_max is not UNSET:
            field_dict["supplyMax"] = supply_max
        if website_url is not UNSET:
            field_dict["websiteUrl"] = website_url
        if socials is not UNSET:
            field_dict["socials"] = socials
        if info_links is not UNSET:
            field_dict["infoLinks"] = info_links
        if created_at is not UNSET:
            field_dict["createdAt"] = created_at
        if updated_at is not UNSET:
            field_dict["updatedAt"] = updated_at
        if price_history_valid_from is not UNSET:
            field_dict["priceHistoryValidFrom"] = price_history_valid_from
        if categories is not UNSET:
            field_dict["categories"] = categories
        if coin_chains is not UNSET:
            field_dict["coinChains"] = coin_chains

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.public_coin_list_item_categories_item import PublicCoinListItemCategoriesItem
        from ..models.public_coin_list_item_coin_chains_item import PublicCoinListItemCoinChainsItem
        from ..models.public_coin_list_item_info_links_type_0 import PublicCoinListItemInfoLinksType0
        from ..models.public_coin_socials_type_0_item import PublicCoinSocialsType0Item
        from ..models.public_coin_socials_type_1 import PublicCoinSocialsType1

        d = dict(src_dict)
        ucid = d.pop("ucid")

        slug = d.pop("slug")

        symbol = d.pop("symbol")

        name = d.pop("name")

        def _parse_market_cap_rank(data: object) -> int | None:
            if data is None:
                return data
            return cast(int | None, data)

        market_cap_rank = _parse_market_cap_rank(d.pop("marketCapRank"))

        is_active = d.pop("isActive")

        external_id = d.pop("externalId", UNSET)

        def _parse_logo_url(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        logo_url = _parse_logo_url(d.pop("logoUrl", UNSET))

        def _parse_supply_circulating(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        supply_circulating = _parse_supply_circulating(d.pop("supplyCirculating", UNSET))

        def _parse_supply_total(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        supply_total = _parse_supply_total(d.pop("supplyTotal", UNSET))

        def _parse_supply_max(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        supply_max = _parse_supply_max(d.pop("supplyMax", UNSET))

        def _parse_website_url(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        website_url = _parse_website_url(d.pop("websiteUrl", UNSET))

        def _parse_socials(data: object) -> list[PublicCoinSocialsType0Item] | PublicCoinSocialsType1 | Unset:
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, list):
                    raise TypeError()
                componentsschemas_public_coin_socials_type_0 = []
                _componentsschemas_public_coin_socials_type_0 = data
                for (
                    componentsschemas_public_coin_socials_type_0_item_data
                ) in _componentsschemas_public_coin_socials_type_0:
                    componentsschemas_public_coin_socials_type_0_item = PublicCoinSocialsType0Item.from_dict(
                        componentsschemas_public_coin_socials_type_0_item_data
                    )

                    componentsschemas_public_coin_socials_type_0.append(
                        componentsschemas_public_coin_socials_type_0_item
                    )

                return componentsschemas_public_coin_socials_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            if not isinstance(data, dict):
                raise TypeError()
            componentsschemas_public_coin_socials_type_1 = PublicCoinSocialsType1.from_dict(data)

            return componentsschemas_public_coin_socials_type_1

        socials = _parse_socials(d.pop("socials", UNSET))

        def _parse_info_links(data: object) -> None | PublicCoinListItemInfoLinksType0 | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                info_links_type_0 = PublicCoinListItemInfoLinksType0.from_dict(data)

                return info_links_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | PublicCoinListItemInfoLinksType0 | Unset, data)

        info_links = _parse_info_links(d.pop("infoLinks", UNSET))

        _created_at = d.pop("createdAt", UNSET)
        created_at: datetime.datetime | Unset
        if isinstance(_created_at, Unset):
            created_at = UNSET
        else:
            created_at = datetime.datetime.fromisoformat(_created_at.replace("Z", "+00:00"))

        _updated_at = d.pop("updatedAt", UNSET)
        updated_at: datetime.datetime | Unset
        if isinstance(_updated_at, Unset):
            updated_at = UNSET
        else:
            updated_at = datetime.datetime.fromisoformat(_updated_at.replace("Z", "+00:00"))

        def _parse_price_history_valid_from(data: object) -> datetime.datetime | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                price_history_valid_from_type_0 = datetime.datetime.fromisoformat(data.replace("Z", "+00:00"))

                return price_history_valid_from_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None | Unset, data)

        price_history_valid_from = _parse_price_history_valid_from(d.pop("priceHistoryValidFrom", UNSET))

        _categories = d.pop("categories", UNSET)
        categories: list[PublicCoinListItemCategoriesItem] | Unset = UNSET
        if _categories is not UNSET:
            categories = []
            for categories_item_data in _categories:
                categories_item = PublicCoinListItemCategoriesItem.from_dict(categories_item_data)

                categories.append(categories_item)

        _coin_chains = d.pop("coinChains", UNSET)
        coin_chains: list[PublicCoinListItemCoinChainsItem] | Unset = UNSET
        if _coin_chains is not UNSET:
            coin_chains = []
            for coin_chains_item_data in _coin_chains:
                coin_chains_item = PublicCoinListItemCoinChainsItem.from_dict(coin_chains_item_data)

                coin_chains.append(coin_chains_item)

        public_coin_list_item = cls(
            ucid=ucid,
            slug=slug,
            symbol=symbol,
            name=name,
            market_cap_rank=market_cap_rank,
            is_active=is_active,
            external_id=external_id,
            logo_url=logo_url,
            supply_circulating=supply_circulating,
            supply_total=supply_total,
            supply_max=supply_max,
            website_url=website_url,
            socials=socials,
            info_links=info_links,
            created_at=created_at,
            updated_at=updated_at,
            price_history_valid_from=price_history_valid_from,
            categories=categories,
            coin_chains=coin_chains,
        )

        public_coin_list_item.additional_properties = d
        return public_coin_list_item

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
