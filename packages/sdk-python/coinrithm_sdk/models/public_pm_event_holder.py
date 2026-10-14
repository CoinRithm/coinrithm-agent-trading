from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

T = TypeVar("T", bound="PublicPmEventHolder")


@_attrs_define
class PublicPmEventHolder:
    """
    Attributes:
        wallet (str): Full proxy wallet, lower-case.
        wallet_short (str):
        shares (float):
        name (None | str | Unset): Public display name; null when hidden or absent.
        pseudonym (None | str | Unset):
        avg_price (float | None | Unset): Average entry price as a probability 0-1.
        current_value_usd (float | None | Unset):
        realized_pnl_usd (float | None | Unset):
        unrealized_pnl_usd (float | None | Unset):
        wallet_page_path (None | str | Unset): Unlocalized CoinRithm wallet page path, only when that page exists.
    """

    wallet: str
    wallet_short: str
    shares: float
    name: None | str | Unset = UNSET
    pseudonym: None | str | Unset = UNSET
    avg_price: float | None | Unset = UNSET
    current_value_usd: float | None | Unset = UNSET
    realized_pnl_usd: float | None | Unset = UNSET
    unrealized_pnl_usd: float | None | Unset = UNSET
    wallet_page_path: None | str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        wallet = self.wallet

        wallet_short = self.wallet_short

        shares = self.shares

        name: None | str | Unset
        if isinstance(self.name, Unset):
            name = UNSET
        else:
            name = self.name

        pseudonym: None | str | Unset
        if isinstance(self.pseudonym, Unset):
            pseudonym = UNSET
        else:
            pseudonym = self.pseudonym

        avg_price: float | None | Unset
        if isinstance(self.avg_price, Unset):
            avg_price = UNSET
        else:
            avg_price = self.avg_price

        current_value_usd: float | None | Unset
        if isinstance(self.current_value_usd, Unset):
            current_value_usd = UNSET
        else:
            current_value_usd = self.current_value_usd

        realized_pnl_usd: float | None | Unset
        if isinstance(self.realized_pnl_usd, Unset):
            realized_pnl_usd = UNSET
        else:
            realized_pnl_usd = self.realized_pnl_usd

        unrealized_pnl_usd: float | None | Unset
        if isinstance(self.unrealized_pnl_usd, Unset):
            unrealized_pnl_usd = UNSET
        else:
            unrealized_pnl_usd = self.unrealized_pnl_usd

        wallet_page_path: None | str | Unset
        if isinstance(self.wallet_page_path, Unset):
            wallet_page_path = UNSET
        else:
            wallet_page_path = self.wallet_page_path

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "wallet": wallet,
                "walletShort": wallet_short,
                "shares": shares,
            }
        )
        if name is not UNSET:
            field_dict["name"] = name
        if pseudonym is not UNSET:
            field_dict["pseudonym"] = pseudonym
        if avg_price is not UNSET:
            field_dict["avgPrice"] = avg_price
        if current_value_usd is not UNSET:
            field_dict["currentValueUsd"] = current_value_usd
        if realized_pnl_usd is not UNSET:
            field_dict["realizedPnlUsd"] = realized_pnl_usd
        if unrealized_pnl_usd is not UNSET:
            field_dict["unrealizedPnlUsd"] = unrealized_pnl_usd
        if wallet_page_path is not UNSET:
            field_dict["walletPagePath"] = wallet_page_path

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        wallet = d.pop("wallet")

        wallet_short = d.pop("walletShort")

        shares = d.pop("shares")

        def _parse_name(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        name = _parse_name(d.pop("name", UNSET))

        def _parse_pseudonym(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        pseudonym = _parse_pseudonym(d.pop("pseudonym", UNSET))

        def _parse_avg_price(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        avg_price = _parse_avg_price(d.pop("avgPrice", UNSET))

        def _parse_current_value_usd(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        current_value_usd = _parse_current_value_usd(d.pop("currentValueUsd", UNSET))

        def _parse_realized_pnl_usd(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        realized_pnl_usd = _parse_realized_pnl_usd(d.pop("realizedPnlUsd", UNSET))

        def _parse_unrealized_pnl_usd(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        unrealized_pnl_usd = _parse_unrealized_pnl_usd(d.pop("unrealizedPnlUsd", UNSET))

        def _parse_wallet_page_path(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        wallet_page_path = _parse_wallet_page_path(d.pop("walletPagePath", UNSET))

        public_pm_event_holder = cls(
            wallet=wallet,
            wallet_short=wallet_short,
            shares=shares,
            name=name,
            pseudonym=pseudonym,
            avg_price=avg_price,
            current_value_usd=current_value_usd,
            realized_pnl_usd=realized_pnl_usd,
            unrealized_pnl_usd=unrealized_pnl_usd,
            wallet_page_path=wallet_page_path,
        )

        public_pm_event_holder.additional_properties = d
        return public_pm_event_holder

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
