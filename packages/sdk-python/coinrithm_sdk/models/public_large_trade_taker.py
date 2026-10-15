from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

if TYPE_CHECKING:
    from ..models.public_large_trade_taker_position import PublicLargeTradeTakerPosition


T = TypeVar("T", bound="PublicLargeTradeTaker")


@_attrs_define
class PublicLargeTradeTaker:
    """The taker side of a Hyperliquid print, matched from the taker
    wallet's own fills. `positionNow` is the wallet's position in that
    market when the row was enriched, which can be after the print.

        Attributes:
            address (str): Taker wallet, lower-case 0x address.
            action (str): What the print did to the taker's position: `open`, `add`,
                `reduce`, `close` or `flip` (crossed from long to short or back).
                Treat other values as unknown.
            dir_ (None | str): Hyperliquid's own direction text for the fills, e.g. `Open Long`,
                `Close Short`, or a joined value such as `Close Short / Short >
                Long / Open Long` when one transaction did several things.
            filled_qty (float | None): Size the taker filled, in base units.
            realized_pnl_usd (float | None): Realized PnL of the taker's fills in USD on a reduce, close or flip; null on
                open and add.
            fee_usd (float | None): Fees the taker paid on these fills, USD.
            position_now (None | PublicLargeTradeTakerPosition): The wallet's position in this market at `asOf`; null when
                not read.
    """

    address: str
    action: str
    dir_: None | str
    filled_qty: float | None
    realized_pnl_usd: float | None
    fee_usd: float | None
    position_now: None | PublicLargeTradeTakerPosition
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        from ..models.public_large_trade_taker_position import PublicLargeTradeTakerPosition

        address = self.address

        action = self.action

        dir_: None | str
        dir_ = self.dir_

        filled_qty: float | None
        filled_qty = self.filled_qty

        realized_pnl_usd: float | None
        realized_pnl_usd = self.realized_pnl_usd

        fee_usd: float | None
        fee_usd = self.fee_usd

        position_now: dict[str, Any] | None
        if isinstance(self.position_now, PublicLargeTradeTakerPosition):
            position_now = self.position_now.to_dict()
        else:
            position_now = self.position_now

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "address": address,
                "action": action,
                "dir": dir_,
                "filledQty": filled_qty,
                "realizedPnlUsd": realized_pnl_usd,
                "feeUsd": fee_usd,
                "positionNow": position_now,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.public_large_trade_taker_position import PublicLargeTradeTakerPosition

        d = dict(src_dict)
        address = d.pop("address")

        action = d.pop("action")

        def _parse_dir_(data: object) -> None | str:
            if data is None:
                return data
            return cast(None | str, data)

        dir_ = _parse_dir_(d.pop("dir"))

        def _parse_filled_qty(data: object) -> float | None:
            if data is None:
                return data
            return cast(float | None, data)

        filled_qty = _parse_filled_qty(d.pop("filledQty"))

        def _parse_realized_pnl_usd(data: object) -> float | None:
            if data is None:
                return data
            return cast(float | None, data)

        realized_pnl_usd = _parse_realized_pnl_usd(d.pop("realizedPnlUsd"))

        def _parse_fee_usd(data: object) -> float | None:
            if data is None:
                return data
            return cast(float | None, data)

        fee_usd = _parse_fee_usd(d.pop("feeUsd"))

        def _parse_position_now(data: object) -> None | PublicLargeTradeTakerPosition:
            if data is None:
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                position_now_type_0 = PublicLargeTradeTakerPosition.from_dict(data)

                return position_now_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | PublicLargeTradeTakerPosition, data)

        position_now = _parse_position_now(d.pop("positionNow"))

        public_large_trade_taker = cls(
            address=address,
            action=action,
            dir_=dir_,
            filled_qty=filled_qty,
            realized_pnl_usd=realized_pnl_usd,
            fee_usd=fee_usd,
            position_now=position_now,
        )

        public_large_trade_taker.additional_properties = d
        return public_large_trade_taker

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
