from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.public_coin_candles_range import PublicCoinCandlesRange

if TYPE_CHECKING:
    from ..models.public_coin_candle import PublicCoinCandle
    from ..models.public_coin_candles_coin import PublicCoinCandlesCoin


T = TypeVar("T", bound="PublicCoinCandles")


@_attrs_define
class PublicCoinCandles:
    """
    Attributes:
        coin (PublicCoinCandlesCoin):
        range_ (PublicCoinCandlesRange):
        fiat (str): The requested currency, upper-cased.
        rate_to_usd (float): Latest `fiat`-per-USD rate (1 for USD, and 1 for an untracked code).
        candles (list[PublicCoinCandle]): Oldest first.
    """

    coin: PublicCoinCandlesCoin
    range_: PublicCoinCandlesRange
    fiat: str
    rate_to_usd: float
    candles: list[PublicCoinCandle]
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        coin = self.coin.to_dict()

        range_ = self.range_.value

        fiat = self.fiat

        rate_to_usd = self.rate_to_usd

        candles = []
        for candles_item_data in self.candles:
            candles_item = candles_item_data.to_dict()
            candles.append(candles_item)

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "coin": coin,
                "range": range_,
                "fiat": fiat,
                "rateToUsd": rate_to_usd,
                "candles": candles,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.public_coin_candle import PublicCoinCandle
        from ..models.public_coin_candles_coin import PublicCoinCandlesCoin

        d = dict(src_dict)
        coin = PublicCoinCandlesCoin.from_dict(d.pop("coin"))

        range_ = PublicCoinCandlesRange(d.pop("range"))

        fiat = d.pop("fiat")

        rate_to_usd = d.pop("rateToUsd")

        candles = []
        _candles = d.pop("candles")
        for candles_item_data in _candles:
            candles_item = PublicCoinCandle.from_dict(candles_item_data)

            candles.append(candles_item)

        public_coin_candles = cls(
            coin=coin,
            range_=range_,
            fiat=fiat,
            rate_to_usd=rate_to_usd,
            candles=candles,
        )

        public_coin_candles.additional_properties = d
        return public_coin_candles

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
