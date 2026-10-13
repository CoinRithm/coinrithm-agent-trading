from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

if TYPE_CHECKING:
    from ..models.public_tradfi_reference_home_listing import PublicTradfiReferenceHomeListing
    from ..models.public_tradfi_reference_leverage import PublicTradfiReferenceLeverage
    from ..models.public_tradfi_reference_unit import PublicTradfiReferenceUnit


T = TypeVar("T", bound="PublicTradfiReferenceInstrument")


@_attrs_define
class PublicTradfiReferenceInstrument:
    """
    Attributes:
        ticker (str):
        name (str):
        asset_class (str): Currently equity, etf, metal, commodity or fx.
        unit (PublicTradfiReferenceUnit): The index denomination is deliberately not inferred; `status` is `unverified`.
        venue_quote_asset (str): Contract quote asset (`USDT`).
        issuer (None | str): Fund issuer, set for leveraged or inverse ETFs.
        leverage (None | PublicTradfiReferenceLeverage):
        home_listing (None | PublicTradfiReferenceHomeListing):
    """

    ticker: str
    name: str
    asset_class: str
    unit: PublicTradfiReferenceUnit
    venue_quote_asset: str
    issuer: None | str
    leverage: None | PublicTradfiReferenceLeverage
    home_listing: None | PublicTradfiReferenceHomeListing
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        from ..models.public_tradfi_reference_home_listing import PublicTradfiReferenceHomeListing
        from ..models.public_tradfi_reference_leverage import PublicTradfiReferenceLeverage

        ticker = self.ticker

        name = self.name

        asset_class = self.asset_class

        unit = self.unit.to_dict()

        venue_quote_asset = self.venue_quote_asset

        issuer: None | str
        issuer = self.issuer

        leverage: dict[str, Any] | None
        if isinstance(self.leverage, PublicTradfiReferenceLeverage):
            leverage = self.leverage.to_dict()
        else:
            leverage = self.leverage

        home_listing: dict[str, Any] | None
        if isinstance(self.home_listing, PublicTradfiReferenceHomeListing):
            home_listing = self.home_listing.to_dict()
        else:
            home_listing = self.home_listing

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "ticker": ticker,
                "name": name,
                "assetClass": asset_class,
                "unit": unit,
                "venueQuoteAsset": venue_quote_asset,
                "issuer": issuer,
                "leverage": leverage,
                "homeListing": home_listing,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.public_tradfi_reference_home_listing import PublicTradfiReferenceHomeListing
        from ..models.public_tradfi_reference_leverage import PublicTradfiReferenceLeverage
        from ..models.public_tradfi_reference_unit import PublicTradfiReferenceUnit

        d = dict(src_dict)
        ticker = d.pop("ticker")

        name = d.pop("name")

        asset_class = d.pop("assetClass")

        unit = PublicTradfiReferenceUnit.from_dict(d.pop("unit"))

        venue_quote_asset = d.pop("venueQuoteAsset")

        def _parse_issuer(data: object) -> None | str:
            if data is None:
                return data
            return cast(None | str, data)

        issuer = _parse_issuer(d.pop("issuer"))

        def _parse_leverage(data: object) -> None | PublicTradfiReferenceLeverage:
            if data is None:
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                leverage_type_0 = PublicTradfiReferenceLeverage.from_dict(data)

                return leverage_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | PublicTradfiReferenceLeverage, data)

        leverage = _parse_leverage(d.pop("leverage"))

        def _parse_home_listing(data: object) -> None | PublicTradfiReferenceHomeListing:
            if data is None:
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                home_listing_type_0 = PublicTradfiReferenceHomeListing.from_dict(data)

                return home_listing_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | PublicTradfiReferenceHomeListing, data)

        home_listing = _parse_home_listing(d.pop("homeListing"))

        public_tradfi_reference_instrument = cls(
            ticker=ticker,
            name=name,
            asset_class=asset_class,
            unit=unit,
            venue_quote_asset=venue_quote_asset,
            issuer=issuer,
            leverage=leverage,
            home_listing=home_listing,
        )

        public_tradfi_reference_instrument.additional_properties = d
        return public_tradfi_reference_instrument

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
