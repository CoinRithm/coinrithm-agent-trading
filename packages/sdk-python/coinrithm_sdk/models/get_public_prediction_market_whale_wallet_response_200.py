from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.get_public_prediction_market_whale_wallet_response_200_daily_item import (
        GetPublicPredictionMarketWhaleWalletResponse200DailyItem,
    )
    from ..models.get_public_prediction_market_whale_wallet_response_200_enrichment_type_0 import (
        GetPublicPredictionMarketWhaleWalletResponse200EnrichmentType0,
    )
    from ..models.get_public_prediction_market_whale_wallet_response_200_meta import (
        GetPublicPredictionMarketWhaleWalletResponse200Meta,
    )
    from ..models.get_public_prediction_market_whale_wallet_response_200_recent_fills_item import (
        GetPublicPredictionMarketWhaleWalletResponse200RecentFillsItem,
    )
    from ..models.get_public_prediction_market_whale_wallet_response_200_rollup import (
        GetPublicPredictionMarketWhaleWalletResponse200Rollup,
    )
    from ..models.get_public_prediction_market_whale_wallet_response_200_summary_30d import (
        GetPublicPredictionMarketWhaleWalletResponse200Summary30D,
    )
    from ..models.get_public_prediction_market_whale_wallet_response_200_top_events_30d_item import (
        GetPublicPredictionMarketWhaleWalletResponse200TopEvents30DItem,
    )


T = TypeVar("T", bound="GetPublicPredictionMarketWhaleWalletResponse200")


@_attrs_define
class GetPublicPredictionMarketWhaleWalletResponse200:
    """
    Attributes:
        source (str | Unset):
        source_name (str | Unset):
        source_icon (None | str | Unset):
        wallet (str | Unset):
        wallet_short (None | str | Unset):
        trader_name (None | str | Unset):
        summary30d (GetPublicPredictionMarketWhaleWalletResponse200Summary30D | Unset):
        rollup (GetPublicPredictionMarketWhaleWalletResponse200Rollup | Unset):
        daily (list[GetPublicPredictionMarketWhaleWalletResponse200DailyItem] | Unset):
        top_events_30_d (list[GetPublicPredictionMarketWhaleWalletResponse200TopEvents30DItem] | Unset):
        recent_fills (list[GetPublicPredictionMarketWhaleWalletResponse200RecentFillsItem] | Unset):
        as_of (datetime.datetime | Unset):
        enrichment (GetPublicPredictionMarketWhaleWalletResponse200EnrichmentType0 | None | Unset): Provider-reported
            wallet context; null for limitless and
            myriad. For polymarket: `{provider, asOf, profile, pnl,
            positions, closedPositions}`, where each section is either
            `{available: false, reason}` or `{available: true, ...}`.
            `pnl.allTime.pnlUsd` is realized-only lifetime PnL,
            `pnl.month.pnlUsd` is a mark-to-market change, ranks are
            PnL ranks (null when 0 or absent), and `volumeUsd` is null
            without a leaderboard standing. `positions.rows[].endDate`
            is a `YYYY-MM-DD` date. These are the provider's figures,
            not CoinRithm-derived holdings or PnL.
        meta (GetPublicPredictionMarketWhaleWalletResponse200Meta | Unset): Present only when enrichment hit its time
            budget; `freshUntil` is epoch milliseconds.
    """

    source: str | Unset = UNSET
    source_name: str | Unset = UNSET
    source_icon: None | str | Unset = UNSET
    wallet: str | Unset = UNSET
    wallet_short: None | str | Unset = UNSET
    trader_name: None | str | Unset = UNSET
    summary30d: GetPublicPredictionMarketWhaleWalletResponse200Summary30D | Unset = UNSET
    rollup: GetPublicPredictionMarketWhaleWalletResponse200Rollup | Unset = UNSET
    daily: list[GetPublicPredictionMarketWhaleWalletResponse200DailyItem] | Unset = UNSET
    top_events_30_d: list[GetPublicPredictionMarketWhaleWalletResponse200TopEvents30DItem] | Unset = UNSET
    recent_fills: list[GetPublicPredictionMarketWhaleWalletResponse200RecentFillsItem] | Unset = UNSET
    as_of: datetime.datetime | Unset = UNSET
    enrichment: GetPublicPredictionMarketWhaleWalletResponse200EnrichmentType0 | None | Unset = UNSET
    meta: GetPublicPredictionMarketWhaleWalletResponse200Meta | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        from ..models.get_public_prediction_market_whale_wallet_response_200_enrichment_type_0 import (
            GetPublicPredictionMarketWhaleWalletResponse200EnrichmentType0,
        )

        source = self.source

        source_name = self.source_name

        source_icon: None | str | Unset
        if isinstance(self.source_icon, Unset):
            source_icon = UNSET
        else:
            source_icon = self.source_icon

        wallet = self.wallet

        wallet_short: None | str | Unset
        if isinstance(self.wallet_short, Unset):
            wallet_short = UNSET
        else:
            wallet_short = self.wallet_short

        trader_name: None | str | Unset
        if isinstance(self.trader_name, Unset):
            trader_name = UNSET
        else:
            trader_name = self.trader_name

        summary30d: dict[str, Any] | Unset = UNSET
        if not isinstance(self.summary30d, Unset):
            summary30d = self.summary30d.to_dict()

        rollup: dict[str, Any] | Unset = UNSET
        if not isinstance(self.rollup, Unset):
            rollup = self.rollup.to_dict()

        daily: list[dict[str, Any]] | Unset = UNSET
        if not isinstance(self.daily, Unset):
            daily = []
            for daily_item_data in self.daily:
                daily_item = daily_item_data.to_dict()
                daily.append(daily_item)

        top_events_30_d: list[dict[str, Any]] | Unset = UNSET
        if not isinstance(self.top_events_30_d, Unset):
            top_events_30_d = []
            for top_events_30_d_item_data in self.top_events_30_d:
                top_events_30_d_item = top_events_30_d_item_data.to_dict()
                top_events_30_d.append(top_events_30_d_item)

        recent_fills: list[dict[str, Any]] | Unset = UNSET
        if not isinstance(self.recent_fills, Unset):
            recent_fills = []
            for recent_fills_item_data in self.recent_fills:
                recent_fills_item = recent_fills_item_data.to_dict()
                recent_fills.append(recent_fills_item)

        as_of: str | Unset = UNSET
        if not isinstance(self.as_of, Unset):
            as_of = self.as_of.isoformat()

        enrichment: dict[str, Any] | None | Unset
        if isinstance(self.enrichment, Unset):
            enrichment = UNSET
        elif isinstance(self.enrichment, GetPublicPredictionMarketWhaleWalletResponse200EnrichmentType0):
            enrichment = self.enrichment.to_dict()
        else:
            enrichment = self.enrichment

        meta: dict[str, Any] | Unset = UNSET
        if not isinstance(self.meta, Unset):
            meta = self.meta.to_dict()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if source is not UNSET:
            field_dict["source"] = source
        if source_name is not UNSET:
            field_dict["sourceName"] = source_name
        if source_icon is not UNSET:
            field_dict["sourceIcon"] = source_icon
        if wallet is not UNSET:
            field_dict["wallet"] = wallet
        if wallet_short is not UNSET:
            field_dict["walletShort"] = wallet_short
        if trader_name is not UNSET:
            field_dict["traderName"] = trader_name
        if summary30d is not UNSET:
            field_dict["summary30d"] = summary30d
        if rollup is not UNSET:
            field_dict["rollup"] = rollup
        if daily is not UNSET:
            field_dict["daily"] = daily
        if top_events_30_d is not UNSET:
            field_dict["topEvents30d"] = top_events_30_d
        if recent_fills is not UNSET:
            field_dict["recentFills"] = recent_fills
        if as_of is not UNSET:
            field_dict["asOf"] = as_of
        if enrichment is not UNSET:
            field_dict["enrichment"] = enrichment
        if meta is not UNSET:
            field_dict["meta"] = meta

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.get_public_prediction_market_whale_wallet_response_200_daily_item import (
            GetPublicPredictionMarketWhaleWalletResponse200DailyItem,
        )
        from ..models.get_public_prediction_market_whale_wallet_response_200_enrichment_type_0 import (
            GetPublicPredictionMarketWhaleWalletResponse200EnrichmentType0,
        )
        from ..models.get_public_prediction_market_whale_wallet_response_200_meta import (
            GetPublicPredictionMarketWhaleWalletResponse200Meta,
        )
        from ..models.get_public_prediction_market_whale_wallet_response_200_recent_fills_item import (
            GetPublicPredictionMarketWhaleWalletResponse200RecentFillsItem,
        )
        from ..models.get_public_prediction_market_whale_wallet_response_200_rollup import (
            GetPublicPredictionMarketWhaleWalletResponse200Rollup,
        )
        from ..models.get_public_prediction_market_whale_wallet_response_200_summary_30d import (
            GetPublicPredictionMarketWhaleWalletResponse200Summary30D,
        )
        from ..models.get_public_prediction_market_whale_wallet_response_200_top_events_30d_item import (
            GetPublicPredictionMarketWhaleWalletResponse200TopEvents30DItem,
        )

        d = dict(src_dict)
        source = d.pop("source", UNSET)

        source_name = d.pop("sourceName", UNSET)

        def _parse_source_icon(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        source_icon = _parse_source_icon(d.pop("sourceIcon", UNSET))

        wallet = d.pop("wallet", UNSET)

        def _parse_wallet_short(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        wallet_short = _parse_wallet_short(d.pop("walletShort", UNSET))

        def _parse_trader_name(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        trader_name = _parse_trader_name(d.pop("traderName", UNSET))

        _summary30d = d.pop("summary30d", UNSET)
        summary30d: GetPublicPredictionMarketWhaleWalletResponse200Summary30D | Unset
        if isinstance(_summary30d, Unset):
            summary30d = UNSET
        else:
            summary30d = GetPublicPredictionMarketWhaleWalletResponse200Summary30D.from_dict(_summary30d)

        _rollup = d.pop("rollup", UNSET)
        rollup: GetPublicPredictionMarketWhaleWalletResponse200Rollup | Unset
        if isinstance(_rollup, Unset):
            rollup = UNSET
        else:
            rollup = GetPublicPredictionMarketWhaleWalletResponse200Rollup.from_dict(_rollup)

        _daily = d.pop("daily", UNSET)
        daily: list[GetPublicPredictionMarketWhaleWalletResponse200DailyItem] | Unset = UNSET
        if _daily is not UNSET:
            daily = []
            for daily_item_data in _daily:
                daily_item = GetPublicPredictionMarketWhaleWalletResponse200DailyItem.from_dict(daily_item_data)

                daily.append(daily_item)

        _top_events_30_d = d.pop("topEvents30d", UNSET)
        top_events_30_d: list[GetPublicPredictionMarketWhaleWalletResponse200TopEvents30DItem] | Unset = UNSET
        if _top_events_30_d is not UNSET:
            top_events_30_d = []
            for top_events_30_d_item_data in _top_events_30_d:
                top_events_30_d_item = GetPublicPredictionMarketWhaleWalletResponse200TopEvents30DItem.from_dict(
                    top_events_30_d_item_data
                )

                top_events_30_d.append(top_events_30_d_item)

        _recent_fills = d.pop("recentFills", UNSET)
        recent_fills: list[GetPublicPredictionMarketWhaleWalletResponse200RecentFillsItem] | Unset = UNSET
        if _recent_fills is not UNSET:
            recent_fills = []
            for recent_fills_item_data in _recent_fills:
                recent_fills_item = GetPublicPredictionMarketWhaleWalletResponse200RecentFillsItem.from_dict(
                    recent_fills_item_data
                )

                recent_fills.append(recent_fills_item)

        _as_of = d.pop("asOf", UNSET)
        as_of: datetime.datetime | Unset
        if isinstance(_as_of, Unset):
            as_of = UNSET
        else:
            as_of = datetime.datetime.fromisoformat(_as_of.replace("Z", "+00:00"))

        def _parse_enrichment(
            data: object,
        ) -> GetPublicPredictionMarketWhaleWalletResponse200EnrichmentType0 | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                enrichment_type_0 = GetPublicPredictionMarketWhaleWalletResponse200EnrichmentType0.from_dict(data)

                return enrichment_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(GetPublicPredictionMarketWhaleWalletResponse200EnrichmentType0 | None | Unset, data)

        enrichment = _parse_enrichment(d.pop("enrichment", UNSET))

        _meta = d.pop("meta", UNSET)
        meta: GetPublicPredictionMarketWhaleWalletResponse200Meta | Unset
        if isinstance(_meta, Unset):
            meta = UNSET
        else:
            meta = GetPublicPredictionMarketWhaleWalletResponse200Meta.from_dict(_meta)

        get_public_prediction_market_whale_wallet_response_200 = cls(
            source=source,
            source_name=source_name,
            source_icon=source_icon,
            wallet=wallet,
            wallet_short=wallet_short,
            trader_name=trader_name,
            summary30d=summary30d,
            rollup=rollup,
            daily=daily,
            top_events_30_d=top_events_30_d,
            recent_fills=recent_fills,
            as_of=as_of,
            enrichment=enrichment,
            meta=meta,
        )

        get_public_prediction_market_whale_wallet_response_200.additional_properties = d
        return get_public_prediction_market_whale_wallet_response_200

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
