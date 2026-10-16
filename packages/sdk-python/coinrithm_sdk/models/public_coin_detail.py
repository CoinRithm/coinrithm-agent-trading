from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.public_coin_detail_chains_type_0_item import PublicCoinDetailChainsType0Item
    from ..models.public_coin_detail_info_links_type_0 import PublicCoinDetailInfoLinksType0
    from ..models.public_coin_detail_notices_type_0_item import PublicCoinDetailNoticesType0Item
    from ..models.public_coin_socials_type_0_item import PublicCoinSocialsType0Item
    from ..models.public_coin_socials_type_1 import PublicCoinSocialsType1
    from ..models.public_coin_translated_name import PublicCoinTranslatedName


T = TypeVar("T", bound="PublicCoinDetail")


@_attrs_define
class PublicCoinDetail:
    """
    Attributes:
        ucid (str): CoinRithm coin id, the `coinId` of the agent endpoints.
        slug (str):
        symbol (str):
        name (str):
        price_updated_at (datetime.datetime | None): As-of time of the price. On `/api/coins/{slug}` the live-price
            write time; on `/api/coins/{slug}/price` the price-summary row's
            write time (see that operation). Null when unknown.
        price_age_hours (float | None): Hours since `priceUpdatedAt`, one decimal; null when unknown.
        price_stale (bool): true when `priceAgeHours` exceeds `priceStaleAfterHours`; false when the age is unknown.
        price_stale_after_hours (float): Staleness threshold in hours (72).
        current_price_usd (None | str | Unset): Price in USD.
        current_price (None | str | Unset): Price in `fiat`.
        change24h (None | str | Unset): 24h price change in percent.
        high24h (None | str | Unset): 24h high in `fiat`.
        low24h (None | str | Unset): 24h low in `fiat`.
        volume24h (None | str | Unset): 24h volume in `fiat`.
        volume_change_24_h (None | str | Unset): 24h volume change in percent.
        market_cap (None | str | Unset): Market cap in `fiat`.
        market_cap_change_24_h (None | str | Unset): 24h market-cap change in percent.
        market_cap_rank (int | None | Unset):
        market_cap_suspect (bool | None | Unset): true when CoinRithm does not trust the market cap; null without a
            price.
        market_cap_suspect_reason (None | str | Unset):
        ath_usd (None | str | Unset): All-time high, converted to `fiat` despite the name.
        ath_date (datetime.datetime | None | Unset):
        atl_usd (None | str | Unset): All-time low, converted to `fiat` despite the name.
        atl_date (datetime.datetime | None | Unset):
        supply_circulating (None | str | Unset):
        supply_total (None | str | Unset):
        supply_max (None | str | Unset): Maximum supply; `"-1"` means uncapped, null unknown.
        supply_percent (None | str | Unset): Circulating supply as a percent of `supplyMax`. Not meaningful (negative)
            when `supplyMax` is `-1`.
        btc_equivalent (None | str | Unset): Price in BTC.
        btc_change_24_h (None | str | Unset): 24h change of the BTC ratio, in percent.
        eth_equivalent (None | str | Unset): Price in ETH.
        eth_change_24_h (None | str | Unset): 24h change of the ETH ratio, in percent.
        volume_missing_venues (int | None | Unset): Expected venues missing from `volume24h` because their fetch failed;
            0 none known, null unknown.
        website_url (None | str | Unset):
        socials (list[PublicCoinSocialsType0Item] | PublicCoinSocialsType1 | Unset): Social links, normally an array of
            `{url, socialId}` objects (the coin profile adds `name` and `icon`); some directory rows carry an empty object
            instead.
        info_links (None | PublicCoinDetailInfoLinksType0 | Unset): Link groups such as `website`, `whitepaper`,
            `explorers`, `wallets`, `source_code` and `audit`.
        chains (list[PublicCoinDetailChainsType0Item] | None | Unset):
        categories (list[PublicCoinTranslatedName] | None | Unset):
        notices (list[PublicCoinDetailNoticesType0Item] | None | Unset): Editorial notices about the coin in the
            requested `locale`.
        watchlist_count (int | Unset): CoinRithm users watching the coin.
        watchlist_rank (int | None | Unset):
    """

    ucid: str
    slug: str
    symbol: str
    name: str
    price_updated_at: datetime.datetime | None
    price_age_hours: float | None
    price_stale: bool
    price_stale_after_hours: float
    current_price_usd: None | str | Unset = UNSET
    current_price: None | str | Unset = UNSET
    change24h: None | str | Unset = UNSET
    high24h: None | str | Unset = UNSET
    low24h: None | str | Unset = UNSET
    volume24h: None | str | Unset = UNSET
    volume_change_24_h: None | str | Unset = UNSET
    market_cap: None | str | Unset = UNSET
    market_cap_change_24_h: None | str | Unset = UNSET
    market_cap_rank: int | None | Unset = UNSET
    market_cap_suspect: bool | None | Unset = UNSET
    market_cap_suspect_reason: None | str | Unset = UNSET
    ath_usd: None | str | Unset = UNSET
    ath_date: datetime.datetime | None | Unset = UNSET
    atl_usd: None | str | Unset = UNSET
    atl_date: datetime.datetime | None | Unset = UNSET
    supply_circulating: None | str | Unset = UNSET
    supply_total: None | str | Unset = UNSET
    supply_max: None | str | Unset = UNSET
    supply_percent: None | str | Unset = UNSET
    btc_equivalent: None | str | Unset = UNSET
    btc_change_24_h: None | str | Unset = UNSET
    eth_equivalent: None | str | Unset = UNSET
    eth_change_24_h: None | str | Unset = UNSET
    volume_missing_venues: int | None | Unset = UNSET
    website_url: None | str | Unset = UNSET
    socials: list[PublicCoinSocialsType0Item] | PublicCoinSocialsType1 | Unset = UNSET
    info_links: None | PublicCoinDetailInfoLinksType0 | Unset = UNSET
    chains: list[PublicCoinDetailChainsType0Item] | None | Unset = UNSET
    categories: list[PublicCoinTranslatedName] | None | Unset = UNSET
    notices: list[PublicCoinDetailNoticesType0Item] | None | Unset = UNSET
    watchlist_count: int | Unset = UNSET
    watchlist_rank: int | None | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        from ..models.public_coin_detail_info_links_type_0 import PublicCoinDetailInfoLinksType0

        ucid = self.ucid

        slug = self.slug

        symbol = self.symbol

        name = self.name

        price_updated_at: None | str
        if isinstance(self.price_updated_at, datetime.datetime):
            price_updated_at = self.price_updated_at.isoformat()
        else:
            price_updated_at = self.price_updated_at

        price_age_hours: float | None
        price_age_hours = self.price_age_hours

        price_stale = self.price_stale

        price_stale_after_hours = self.price_stale_after_hours

        current_price_usd: None | str | Unset
        if isinstance(self.current_price_usd, Unset):
            current_price_usd = UNSET
        else:
            current_price_usd = self.current_price_usd

        current_price: None | str | Unset
        if isinstance(self.current_price, Unset):
            current_price = UNSET
        else:
            current_price = self.current_price

        change24h: None | str | Unset
        if isinstance(self.change24h, Unset):
            change24h = UNSET
        else:
            change24h = self.change24h

        high24h: None | str | Unset
        if isinstance(self.high24h, Unset):
            high24h = UNSET
        else:
            high24h = self.high24h

        low24h: None | str | Unset
        if isinstance(self.low24h, Unset):
            low24h = UNSET
        else:
            low24h = self.low24h

        volume24h: None | str | Unset
        if isinstance(self.volume24h, Unset):
            volume24h = UNSET
        else:
            volume24h = self.volume24h

        volume_change_24_h: None | str | Unset
        if isinstance(self.volume_change_24_h, Unset):
            volume_change_24_h = UNSET
        else:
            volume_change_24_h = self.volume_change_24_h

        market_cap: None | str | Unset
        if isinstance(self.market_cap, Unset):
            market_cap = UNSET
        else:
            market_cap = self.market_cap

        market_cap_change_24_h: None | str | Unset
        if isinstance(self.market_cap_change_24_h, Unset):
            market_cap_change_24_h = UNSET
        else:
            market_cap_change_24_h = self.market_cap_change_24_h

        market_cap_rank: int | None | Unset
        if isinstance(self.market_cap_rank, Unset):
            market_cap_rank = UNSET
        else:
            market_cap_rank = self.market_cap_rank

        market_cap_suspect: bool | None | Unset
        if isinstance(self.market_cap_suspect, Unset):
            market_cap_suspect = UNSET
        else:
            market_cap_suspect = self.market_cap_suspect

        market_cap_suspect_reason: None | str | Unset
        if isinstance(self.market_cap_suspect_reason, Unset):
            market_cap_suspect_reason = UNSET
        else:
            market_cap_suspect_reason = self.market_cap_suspect_reason

        ath_usd: None | str | Unset
        if isinstance(self.ath_usd, Unset):
            ath_usd = UNSET
        else:
            ath_usd = self.ath_usd

        ath_date: None | str | Unset
        if isinstance(self.ath_date, Unset):
            ath_date = UNSET
        elif isinstance(self.ath_date, datetime.datetime):
            ath_date = self.ath_date.isoformat()
        else:
            ath_date = self.ath_date

        atl_usd: None | str | Unset
        if isinstance(self.atl_usd, Unset):
            atl_usd = UNSET
        else:
            atl_usd = self.atl_usd

        atl_date: None | str | Unset
        if isinstance(self.atl_date, Unset):
            atl_date = UNSET
        elif isinstance(self.atl_date, datetime.datetime):
            atl_date = self.atl_date.isoformat()
        else:
            atl_date = self.atl_date

        supply_circulating: None | str | Unset
        if isinstance(self.supply_circulating, Unset):
            supply_circulating = UNSET
        else:
            supply_circulating = self.supply_circulating

        supply_total: None | str | Unset
        if isinstance(self.supply_total, Unset):
            supply_total = UNSET
        else:
            supply_total = self.supply_total

        supply_max: None | str | Unset
        if isinstance(self.supply_max, Unset):
            supply_max = UNSET
        else:
            supply_max = self.supply_max

        supply_percent: None | str | Unset
        if isinstance(self.supply_percent, Unset):
            supply_percent = UNSET
        else:
            supply_percent = self.supply_percent

        btc_equivalent: None | str | Unset
        if isinstance(self.btc_equivalent, Unset):
            btc_equivalent = UNSET
        else:
            btc_equivalent = self.btc_equivalent

        btc_change_24_h: None | str | Unset
        if isinstance(self.btc_change_24_h, Unset):
            btc_change_24_h = UNSET
        else:
            btc_change_24_h = self.btc_change_24_h

        eth_equivalent: None | str | Unset
        if isinstance(self.eth_equivalent, Unset):
            eth_equivalent = UNSET
        else:
            eth_equivalent = self.eth_equivalent

        eth_change_24_h: None | str | Unset
        if isinstance(self.eth_change_24_h, Unset):
            eth_change_24_h = UNSET
        else:
            eth_change_24_h = self.eth_change_24_h

        volume_missing_venues: int | None | Unset
        if isinstance(self.volume_missing_venues, Unset):
            volume_missing_venues = UNSET
        else:
            volume_missing_venues = self.volume_missing_venues

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
        elif isinstance(self.info_links, PublicCoinDetailInfoLinksType0):
            info_links = self.info_links.to_dict()
        else:
            info_links = self.info_links

        chains: list[dict[str, Any]] | None | Unset
        if isinstance(self.chains, Unset):
            chains = UNSET
        elif isinstance(self.chains, list):
            chains = []
            for chains_type_0_item_data in self.chains:
                chains_type_0_item = chains_type_0_item_data.to_dict()
                chains.append(chains_type_0_item)

        else:
            chains = self.chains

        categories: list[dict[str, Any]] | None | Unset
        if isinstance(self.categories, Unset):
            categories = UNSET
        elif isinstance(self.categories, list):
            categories = []
            for categories_type_0_item_data in self.categories:
                categories_type_0_item = categories_type_0_item_data.to_dict()
                categories.append(categories_type_0_item)

        else:
            categories = self.categories

        notices: list[dict[str, Any]] | None | Unset
        if isinstance(self.notices, Unset):
            notices = UNSET
        elif isinstance(self.notices, list):
            notices = []
            for notices_type_0_item_data in self.notices:
                notices_type_0_item = notices_type_0_item_data.to_dict()
                notices.append(notices_type_0_item)

        else:
            notices = self.notices

        watchlist_count = self.watchlist_count

        watchlist_rank: int | None | Unset
        if isinstance(self.watchlist_rank, Unset):
            watchlist_rank = UNSET
        else:
            watchlist_rank = self.watchlist_rank

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "ucid": ucid,
                "slug": slug,
                "symbol": symbol,
                "name": name,
                "priceUpdatedAt": price_updated_at,
                "priceAgeHours": price_age_hours,
                "priceStale": price_stale,
                "priceStaleAfterHours": price_stale_after_hours,
            }
        )
        if current_price_usd is not UNSET:
            field_dict["currentPriceUsd"] = current_price_usd
        if current_price is not UNSET:
            field_dict["currentPrice"] = current_price
        if change24h is not UNSET:
            field_dict["change24h"] = change24h
        if high24h is not UNSET:
            field_dict["high24h"] = high24h
        if low24h is not UNSET:
            field_dict["low24h"] = low24h
        if volume24h is not UNSET:
            field_dict["volume24h"] = volume24h
        if volume_change_24_h is not UNSET:
            field_dict["volumeChange24h"] = volume_change_24_h
        if market_cap is not UNSET:
            field_dict["marketCap"] = market_cap
        if market_cap_change_24_h is not UNSET:
            field_dict["marketCapChange24h"] = market_cap_change_24_h
        if market_cap_rank is not UNSET:
            field_dict["marketCapRank"] = market_cap_rank
        if market_cap_suspect is not UNSET:
            field_dict["marketCapSuspect"] = market_cap_suspect
        if market_cap_suspect_reason is not UNSET:
            field_dict["marketCapSuspectReason"] = market_cap_suspect_reason
        if ath_usd is not UNSET:
            field_dict["athUsd"] = ath_usd
        if ath_date is not UNSET:
            field_dict["athDate"] = ath_date
        if atl_usd is not UNSET:
            field_dict["atlUsd"] = atl_usd
        if atl_date is not UNSET:
            field_dict["atlDate"] = atl_date
        if supply_circulating is not UNSET:
            field_dict["supplyCirculating"] = supply_circulating
        if supply_total is not UNSET:
            field_dict["supplyTotal"] = supply_total
        if supply_max is not UNSET:
            field_dict["supplyMax"] = supply_max
        if supply_percent is not UNSET:
            field_dict["supplyPercent"] = supply_percent
        if btc_equivalent is not UNSET:
            field_dict["btcEquivalent"] = btc_equivalent
        if btc_change_24_h is not UNSET:
            field_dict["btcChange24h"] = btc_change_24_h
        if eth_equivalent is not UNSET:
            field_dict["ethEquivalent"] = eth_equivalent
        if eth_change_24_h is not UNSET:
            field_dict["ethChange24h"] = eth_change_24_h
        if volume_missing_venues is not UNSET:
            field_dict["volumeMissingVenues"] = volume_missing_venues
        if website_url is not UNSET:
            field_dict["websiteUrl"] = website_url
        if socials is not UNSET:
            field_dict["socials"] = socials
        if info_links is not UNSET:
            field_dict["infoLinks"] = info_links
        if chains is not UNSET:
            field_dict["chains"] = chains
        if categories is not UNSET:
            field_dict["categories"] = categories
        if notices is not UNSET:
            field_dict["notices"] = notices
        if watchlist_count is not UNSET:
            field_dict["watchlistCount"] = watchlist_count
        if watchlist_rank is not UNSET:
            field_dict["watchlistRank"] = watchlist_rank

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.public_coin_detail_chains_type_0_item import PublicCoinDetailChainsType0Item
        from ..models.public_coin_detail_info_links_type_0 import PublicCoinDetailInfoLinksType0
        from ..models.public_coin_detail_notices_type_0_item import PublicCoinDetailNoticesType0Item
        from ..models.public_coin_socials_type_0_item import PublicCoinSocialsType0Item
        from ..models.public_coin_socials_type_1 import PublicCoinSocialsType1
        from ..models.public_coin_translated_name import PublicCoinTranslatedName

        d = dict(src_dict)
        ucid = d.pop("ucid")

        slug = d.pop("slug")

        symbol = d.pop("symbol")

        name = d.pop("name")

        def _parse_price_updated_at(data: object) -> datetime.datetime | None:
            if data is None:
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                price_updated_at_type_0 = datetime.datetime.fromisoformat(data.replace("Z", "+00:00"))

                return price_updated_at_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None, data)

        price_updated_at = _parse_price_updated_at(d.pop("priceUpdatedAt"))

        def _parse_price_age_hours(data: object) -> float | None:
            if data is None:
                return data
            return cast(float | None, data)

        price_age_hours = _parse_price_age_hours(d.pop("priceAgeHours"))

        price_stale = d.pop("priceStale")

        price_stale_after_hours = d.pop("priceStaleAfterHours")

        def _parse_current_price_usd(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        current_price_usd = _parse_current_price_usd(d.pop("currentPriceUsd", UNSET))

        def _parse_current_price(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        current_price = _parse_current_price(d.pop("currentPrice", UNSET))

        def _parse_change24h(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        change24h = _parse_change24h(d.pop("change24h", UNSET))

        def _parse_high24h(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        high24h = _parse_high24h(d.pop("high24h", UNSET))

        def _parse_low24h(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        low24h = _parse_low24h(d.pop("low24h", UNSET))

        def _parse_volume24h(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        volume24h = _parse_volume24h(d.pop("volume24h", UNSET))

        def _parse_volume_change_24_h(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        volume_change_24_h = _parse_volume_change_24_h(d.pop("volumeChange24h", UNSET))

        def _parse_market_cap(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        market_cap = _parse_market_cap(d.pop("marketCap", UNSET))

        def _parse_market_cap_change_24_h(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        market_cap_change_24_h = _parse_market_cap_change_24_h(d.pop("marketCapChange24h", UNSET))

        def _parse_market_cap_rank(data: object) -> int | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(int | None | Unset, data)

        market_cap_rank = _parse_market_cap_rank(d.pop("marketCapRank", UNSET))

        def _parse_market_cap_suspect(data: object) -> bool | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(bool | None | Unset, data)

        market_cap_suspect = _parse_market_cap_suspect(d.pop("marketCapSuspect", UNSET))

        def _parse_market_cap_suspect_reason(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        market_cap_suspect_reason = _parse_market_cap_suspect_reason(d.pop("marketCapSuspectReason", UNSET))

        def _parse_ath_usd(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        ath_usd = _parse_ath_usd(d.pop("athUsd", UNSET))

        def _parse_ath_date(data: object) -> datetime.datetime | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                ath_date_type_0 = datetime.datetime.fromisoformat(data.replace("Z", "+00:00"))

                return ath_date_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None | Unset, data)

        ath_date = _parse_ath_date(d.pop("athDate", UNSET))

        def _parse_atl_usd(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        atl_usd = _parse_atl_usd(d.pop("atlUsd", UNSET))

        def _parse_atl_date(data: object) -> datetime.datetime | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                atl_date_type_0 = datetime.datetime.fromisoformat(data.replace("Z", "+00:00"))

                return atl_date_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None | Unset, data)

        atl_date = _parse_atl_date(d.pop("atlDate", UNSET))

        def _parse_supply_circulating(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        supply_circulating = _parse_supply_circulating(d.pop("supplyCirculating", UNSET))

        def _parse_supply_total(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        supply_total = _parse_supply_total(d.pop("supplyTotal", UNSET))

        def _parse_supply_max(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        supply_max = _parse_supply_max(d.pop("supplyMax", UNSET))

        def _parse_supply_percent(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        supply_percent = _parse_supply_percent(d.pop("supplyPercent", UNSET))

        def _parse_btc_equivalent(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        btc_equivalent = _parse_btc_equivalent(d.pop("btcEquivalent", UNSET))

        def _parse_btc_change_24_h(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        btc_change_24_h = _parse_btc_change_24_h(d.pop("btcChange24h", UNSET))

        def _parse_eth_equivalent(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        eth_equivalent = _parse_eth_equivalent(d.pop("ethEquivalent", UNSET))

        def _parse_eth_change_24_h(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        eth_change_24_h = _parse_eth_change_24_h(d.pop("ethChange24h", UNSET))

        def _parse_volume_missing_venues(data: object) -> int | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(int | None | Unset, data)

        volume_missing_venues = _parse_volume_missing_venues(d.pop("volumeMissingVenues", UNSET))

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

        def _parse_info_links(data: object) -> None | PublicCoinDetailInfoLinksType0 | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                info_links_type_0 = PublicCoinDetailInfoLinksType0.from_dict(data)

                return info_links_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | PublicCoinDetailInfoLinksType0 | Unset, data)

        info_links = _parse_info_links(d.pop("infoLinks", UNSET))

        def _parse_chains(data: object) -> list[PublicCoinDetailChainsType0Item] | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, list):
                    raise TypeError()
                chains_type_0 = []
                _chains_type_0 = data
                for chains_type_0_item_data in _chains_type_0:
                    chains_type_0_item = PublicCoinDetailChainsType0Item.from_dict(chains_type_0_item_data)

                    chains_type_0.append(chains_type_0_item)

                return chains_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(list[PublicCoinDetailChainsType0Item] | None | Unset, data)

        chains = _parse_chains(d.pop("chains", UNSET))

        def _parse_categories(data: object) -> list[PublicCoinTranslatedName] | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, list):
                    raise TypeError()
                categories_type_0 = []
                _categories_type_0 = data
                for categories_type_0_item_data in _categories_type_0:
                    categories_type_0_item = PublicCoinTranslatedName.from_dict(categories_type_0_item_data)

                    categories_type_0.append(categories_type_0_item)

                return categories_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(list[PublicCoinTranslatedName] | None | Unset, data)

        categories = _parse_categories(d.pop("categories", UNSET))

        def _parse_notices(data: object) -> list[PublicCoinDetailNoticesType0Item] | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, list):
                    raise TypeError()
                notices_type_0 = []
                _notices_type_0 = data
                for notices_type_0_item_data in _notices_type_0:
                    notices_type_0_item = PublicCoinDetailNoticesType0Item.from_dict(notices_type_0_item_data)

                    notices_type_0.append(notices_type_0_item)

                return notices_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(list[PublicCoinDetailNoticesType0Item] | None | Unset, data)

        notices = _parse_notices(d.pop("notices", UNSET))

        watchlist_count = d.pop("watchlistCount", UNSET)

        def _parse_watchlist_rank(data: object) -> int | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(int | None | Unset, data)

        watchlist_rank = _parse_watchlist_rank(d.pop("watchlistRank", UNSET))

        public_coin_detail = cls(
            ucid=ucid,
            slug=slug,
            symbol=symbol,
            name=name,
            price_updated_at=price_updated_at,
            price_age_hours=price_age_hours,
            price_stale=price_stale,
            price_stale_after_hours=price_stale_after_hours,
            current_price_usd=current_price_usd,
            current_price=current_price,
            change24h=change24h,
            high24h=high24h,
            low24h=low24h,
            volume24h=volume24h,
            volume_change_24_h=volume_change_24_h,
            market_cap=market_cap,
            market_cap_change_24_h=market_cap_change_24_h,
            market_cap_rank=market_cap_rank,
            market_cap_suspect=market_cap_suspect,
            market_cap_suspect_reason=market_cap_suspect_reason,
            ath_usd=ath_usd,
            ath_date=ath_date,
            atl_usd=atl_usd,
            atl_date=atl_date,
            supply_circulating=supply_circulating,
            supply_total=supply_total,
            supply_max=supply_max,
            supply_percent=supply_percent,
            btc_equivalent=btc_equivalent,
            btc_change_24_h=btc_change_24_h,
            eth_equivalent=eth_equivalent,
            eth_change_24_h=eth_change_24_h,
            volume_missing_venues=volume_missing_venues,
            website_url=website_url,
            socials=socials,
            info_links=info_links,
            chains=chains,
            categories=categories,
            notices=notices,
            watchlist_count=watchlist_count,
            watchlist_rank=watchlist_rank,
        )

        public_coin_detail.additional_properties = d
        return public_coin_detail

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
