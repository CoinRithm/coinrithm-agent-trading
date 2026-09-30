from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

T = TypeVar("T", bound="PublicPmTrade")


@_attrs_define
class PublicPmTrade:
    """
    Attributes:
        side (str): Normalized direction: buy/sell (Polymarket) or the venue's own taker-side label, e.g. yes/no
            (Kalshi). Plain string — new venues may add new labels.
        price (float): Probability 0-1, a fraction.
        size (float): Size in shares (Polymarket) or contracts (Kalshi).
        usd_value (float): Notional USD value, size * price.
        outcome (None | str): Outcome label when the venue reports one on the trade row, else null.
        who (None | str): Public trader handle when the venue exposes one (Polymarket pseudonym); Kalshi trades always
            report null.
        timestamp (datetime.datetime):
    """

    side: str
    price: float
    size: float
    usd_value: float
    outcome: None | str
    who: None | str
    timestamp: datetime.datetime
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        side = self.side

        price = self.price

        size = self.size

        usd_value = self.usd_value

        outcome: None | str
        outcome = self.outcome

        who: None | str
        who = self.who

        timestamp = self.timestamp.isoformat()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "side": side,
                "price": price,
                "size": size,
                "usdValue": usd_value,
                "outcome": outcome,
                "who": who,
                "timestamp": timestamp,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        side = d.pop("side")

        price = d.pop("price")

        size = d.pop("size")

        usd_value = d.pop("usdValue")

        def _parse_outcome(data: object) -> None | str:
            if data is None:
                return data
            return cast(None | str, data)

        outcome = _parse_outcome(d.pop("outcome"))

        def _parse_who(data: object) -> None | str:
            if data is None:
                return data
            return cast(None | str, data)

        who = _parse_who(d.pop("who"))

        timestamp = datetime.datetime.fromisoformat(d.pop("timestamp").replace("Z", "+00:00"))

        public_pm_trade = cls(
            side=side,
            price=price,
            size=size,
            usd_value=usd_value,
            outcome=outcome,
            who=who,
            timestamp=timestamp,
        )

        public_pm_trade.additional_properties = d
        return public_pm_trade

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
