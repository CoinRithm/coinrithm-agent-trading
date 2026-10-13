from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, Literal, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

T = TypeVar("T", bound="SpotReferenceObservation")


@_attrs_define
class SpotReferenceObservation:
    """
    Attributes:
        venue (Literal['binance']):
        market (Literal['spot']):
        basis (Literal['24h_ticker_last']): Last price of Binance's rolling 24h ticker, not a last-trade receipt.
        pair (str):
        base (str):
        quote_currency (Literal['USDT']):
        price (float): Price in USDT (not USD).
        quote_volume_24_h (float): 24h quote volume in USDT.
        event_at (datetime.datetime): Venue event time of the ticker.
        statistics_close_at (datetime.datetime): Close of the venue's 24h statistics window.
        received_at (datetime.datetime): When CoinRithm received the ticker.
        last_trade_at (None): Not available from this feed; always null.
        local_price_changed_at (datetime.datetime): When CoinRithm last saw this price change.
        captured_at (datetime.datetime): When the snapshot holding this ticker was written.
        expires_at (datetime.datetime): Earliest instant at which any input passes its age limit (10 s per stamp, 10 min
            for universe metadata).
        universe_verified_at (datetime.datetime):
        universe_revision (str): Provenance of the collector's pair cohort.
        connection_generation (int):
    """

    venue: Literal["binance"]
    market: Literal["spot"]
    basis: Literal["24h_ticker_last"]
    pair: str
    base: str
    quote_currency: Literal["USDT"]
    price: float
    quote_volume_24_h: float
    event_at: datetime.datetime
    statistics_close_at: datetime.datetime
    received_at: datetime.datetime
    last_trade_at: None
    local_price_changed_at: datetime.datetime
    captured_at: datetime.datetime
    expires_at: datetime.datetime
    universe_verified_at: datetime.datetime
    universe_revision: str
    connection_generation: int
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        venue = self.venue

        market = self.market

        basis = self.basis

        pair = self.pair

        base = self.base

        quote_currency = self.quote_currency

        price = self.price

        quote_volume_24_h = self.quote_volume_24_h

        event_at = self.event_at.isoformat()

        statistics_close_at = self.statistics_close_at.isoformat()

        received_at = self.received_at.isoformat()

        last_trade_at = self.last_trade_at

        local_price_changed_at = self.local_price_changed_at.isoformat()

        captured_at = self.captured_at.isoformat()

        expires_at = self.expires_at.isoformat()

        universe_verified_at = self.universe_verified_at.isoformat()

        universe_revision = self.universe_revision

        connection_generation = self.connection_generation

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "venue": venue,
                "market": market,
                "basis": basis,
                "pair": pair,
                "base": base,
                "quoteCurrency": quote_currency,
                "price": price,
                "quoteVolume24h": quote_volume_24_h,
                "eventAt": event_at,
                "statisticsCloseAt": statistics_close_at,
                "receivedAt": received_at,
                "lastTradeAt": last_trade_at,
                "localPriceChangedAt": local_price_changed_at,
                "capturedAt": captured_at,
                "expiresAt": expires_at,
                "universeVerifiedAt": universe_verified_at,
                "universeRevision": universe_revision,
                "connectionGeneration": connection_generation,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        venue = cast(Literal["binance"], d.pop("venue"))
        if venue != "binance":
            raise ValueError(f"venue must match const 'binance', got '{venue}'")

        market = cast(Literal["spot"], d.pop("market"))
        if market != "spot":
            raise ValueError(f"market must match const 'spot', got '{market}'")

        basis = cast(Literal["24h_ticker_last"], d.pop("basis"))
        if basis != "24h_ticker_last":
            raise ValueError(f"basis must match const '24h_ticker_last', got '{basis}'")

        pair = d.pop("pair")

        base = d.pop("base")

        quote_currency = cast(Literal["USDT"], d.pop("quoteCurrency"))
        if quote_currency != "USDT":
            raise ValueError(f"quoteCurrency must match const 'USDT', got '{quote_currency}'")

        price = d.pop("price")

        quote_volume_24_h = d.pop("quoteVolume24h")

        event_at = datetime.datetime.fromisoformat(d.pop("eventAt").replace("Z", "+00:00"))

        statistics_close_at = datetime.datetime.fromisoformat(d.pop("statisticsCloseAt").replace("Z", "+00:00"))

        received_at = datetime.datetime.fromisoformat(d.pop("receivedAt").replace("Z", "+00:00"))

        last_trade_at = d.pop("lastTradeAt")

        local_price_changed_at = datetime.datetime.fromisoformat(d.pop("localPriceChangedAt").replace("Z", "+00:00"))

        captured_at = datetime.datetime.fromisoformat(d.pop("capturedAt").replace("Z", "+00:00"))

        expires_at = datetime.datetime.fromisoformat(d.pop("expiresAt").replace("Z", "+00:00"))

        universe_verified_at = datetime.datetime.fromisoformat(d.pop("universeVerifiedAt").replace("Z", "+00:00"))

        universe_revision = d.pop("universeRevision")

        connection_generation = d.pop("connectionGeneration")

        spot_reference_observation = cls(
            venue=venue,
            market=market,
            basis=basis,
            pair=pair,
            base=base,
            quote_currency=quote_currency,
            price=price,
            quote_volume_24_h=quote_volume_24_h,
            event_at=event_at,
            statistics_close_at=statistics_close_at,
            received_at=received_at,
            last_trade_at=last_trade_at,
            local_price_changed_at=local_price_changed_at,
            captured_at=captured_at,
            expires_at=expires_at,
            universe_verified_at=universe_verified_at,
            universe_revision=universe_revision,
            connection_generation=connection_generation,
        )

        spot_reference_observation.additional_properties = d
        return spot_reference_observation

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
