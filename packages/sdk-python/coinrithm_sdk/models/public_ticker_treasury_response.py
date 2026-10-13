from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.public_data_status import PublicDataStatus

if TYPE_CHECKING:
    from ..models.public_coin_gecko_attribution import PublicCoinGeckoAttribution
    from ..models.public_fresh_until_meta import PublicFreshUntilMeta
    from ..models.public_ticker_treasury import PublicTickerTreasury


T = TypeVar("T", bound="PublicTickerTreasuryResponse")


@_attrs_define
class PublicTickerTreasuryResponse:
    """
    Attributes:
        ticker (str):
        status (PublicDataStatus): Freshness of an upstream dataset CoinRithm re-reads on a schedule.
            `stale` data is still served inside its documented maximum age;
            `unavailable` means no usable copy, never zero or empty truth.
        treasury (None | PublicTickerTreasury):
        as_of (datetime.datetime | None): Oldest upstream read among the coin datasets used.
        source (PublicCoinGeckoAttribution): Keep this attribution next to any display of the data.
        meta (PublicFreshUntilMeta):
    """

    ticker: str
    status: PublicDataStatus
    treasury: None | PublicTickerTreasury
    as_of: datetime.datetime | None
    source: PublicCoinGeckoAttribution
    meta: PublicFreshUntilMeta
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        from ..models.public_ticker_treasury import PublicTickerTreasury

        ticker = self.ticker

        status = self.status.value

        treasury: dict[str, Any] | None
        if isinstance(self.treasury, PublicTickerTreasury):
            treasury = self.treasury.to_dict()
        else:
            treasury = self.treasury

        as_of: None | str
        if isinstance(self.as_of, datetime.datetime):
            as_of = self.as_of.isoformat()
        else:
            as_of = self.as_of

        source = self.source.to_dict()

        meta = self.meta.to_dict()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "ticker": ticker,
                "status": status,
                "treasury": treasury,
                "asOf": as_of,
                "source": source,
                "meta": meta,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.public_coin_gecko_attribution import PublicCoinGeckoAttribution
        from ..models.public_fresh_until_meta import PublicFreshUntilMeta
        from ..models.public_ticker_treasury import PublicTickerTreasury

        d = dict(src_dict)
        ticker = d.pop("ticker")

        status = PublicDataStatus(d.pop("status"))

        def _parse_treasury(data: object) -> None | PublicTickerTreasury:
            if data is None:
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                treasury_type_0 = PublicTickerTreasury.from_dict(data)

                return treasury_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | PublicTickerTreasury, data)

        treasury = _parse_treasury(d.pop("treasury"))

        def _parse_as_of(data: object) -> datetime.datetime | None:
            if data is None:
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                as_of_type_0 = datetime.datetime.fromisoformat(data.replace("Z", "+00:00"))

                return as_of_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None, data)

        as_of = _parse_as_of(d.pop("asOf"))

        source = PublicCoinGeckoAttribution.from_dict(d.pop("source"))

        meta = PublicFreshUntilMeta.from_dict(d.pop("meta"))

        public_ticker_treasury_response = cls(
            ticker=ticker,
            status=status,
            treasury=treasury,
            as_of=as_of,
            source=source,
            meta=meta,
        )

        public_ticker_treasury_response.additional_properties = d
        return public_ticker_treasury_response

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
