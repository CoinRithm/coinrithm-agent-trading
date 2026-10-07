from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, Literal, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

if TYPE_CHECKING:
    from ..models.market_liquidation_window import MarketLiquidationWindow


T = TypeVar("T", bound="MarketLiquidationContext")


@_attrs_define
class MarketLiquidationContext:
    """OKX USDT-margined swaps only, using the coin's resolved OKX contract.
    Sums cover events pushed while CoinRithm capture ran. Null without a
    resolved contract or usable capture-coverage rows. Uncovered spans are
    unknown, never evidence of no liquidations. Windows end at response time.

        Attributes:
            venue (Literal['okx']):
            inst_id (str):
            note (str): Source and capture-completeness limitations.
            last1h (MarketLiquidationWindow):
            last24h (MarketLiquidationWindow):
            last_event_at (datetime.datetime | None): Latest usable captured event in the 24-hour read window; null without
                one. Not a capture heartbeat.
    """

    venue: Literal["okx"]
    inst_id: str
    note: str
    last1h: MarketLiquidationWindow
    last24h: MarketLiquidationWindow
    last_event_at: datetime.datetime | None
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        venue = self.venue

        inst_id = self.inst_id

        note = self.note

        last1h = self.last1h.to_dict()

        last24h = self.last24h.to_dict()

        last_event_at: None | str
        if isinstance(self.last_event_at, datetime.datetime):
            last_event_at = self.last_event_at.isoformat()
        else:
            last_event_at = self.last_event_at

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "venue": venue,
                "instId": inst_id,
                "note": note,
                "last1h": last1h,
                "last24h": last24h,
                "lastEventAt": last_event_at,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.market_liquidation_window import MarketLiquidationWindow

        d = dict(src_dict)
        venue = cast(Literal["okx"], d.pop("venue"))
        if venue != "okx":
            raise ValueError(f"venue must match const 'okx', got '{venue}'")

        inst_id = d.pop("instId")

        note = d.pop("note")

        last1h = MarketLiquidationWindow.from_dict(d.pop("last1h"))

        last24h = MarketLiquidationWindow.from_dict(d.pop("last24h"))

        def _parse_last_event_at(data: object) -> datetime.datetime | None:
            if data is None:
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                last_event_at_type_0 = datetime.datetime.fromisoformat(data.replace("Z", "+00:00"))

                return last_event_at_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None, data)

        last_event_at = _parse_last_event_at(d.pop("lastEventAt"))

        market_liquidation_context = cls(
            venue=venue,
            inst_id=inst_id,
            note=note,
            last1h=last1h,
            last24h=last24h,
            last_event_at=last_event_at,
        )

        market_liquidation_context.additional_properties = d
        return market_liquidation_context

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
