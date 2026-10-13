from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.public_data_status import PublicDataStatus

if TYPE_CHECKING:
    from ..models.public_coin_gecko_attribution import PublicCoinGeckoAttribution
    from ..models.public_crypto_treasury_company import PublicCryptoTreasuryCompany
    from ..models.public_fresh_until_meta import PublicFreshUntilMeta


T = TypeVar("T", bound="PublicCryptoTreasuryResponse")


@_attrs_define
class PublicCryptoTreasuryResponse:
    """
    Attributes:
        coin (str): Canonical coin id (`bitcoin`, `ethereum`, `solana`, `binancecoin`).
        status (PublicDataStatus): Freshness of an upstream dataset CoinRithm re-reads on a schedule.
            `stale` data is still served inside its documented maximum age;
            `unavailable` means no usable copy, never zero or empty truth.
        total_holdings (float | None):
        total_value_usd (float | None):
        companies (list[PublicCryptoTreasuryCompany]): Largest holding first; former holders with zero balance are
            excluded.
        as_of (datetime.datetime | None): When CoinRithm read the upstream list.
        source (PublicCoinGeckoAttribution): Keep this attribution next to any display of the data.
        meta (PublicFreshUntilMeta):
    """

    coin: str
    status: PublicDataStatus
    total_holdings: float | None
    total_value_usd: float | None
    companies: list[PublicCryptoTreasuryCompany]
    as_of: datetime.datetime | None
    source: PublicCoinGeckoAttribution
    meta: PublicFreshUntilMeta
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        coin = self.coin

        status = self.status.value

        total_holdings: float | None
        total_holdings = self.total_holdings

        total_value_usd: float | None
        total_value_usd = self.total_value_usd

        companies = []
        for companies_item_data in self.companies:
            companies_item = companies_item_data.to_dict()
            companies.append(companies_item)

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
                "coin": coin,
                "status": status,
                "totalHoldings": total_holdings,
                "totalValueUsd": total_value_usd,
                "companies": companies,
                "asOf": as_of,
                "source": source,
                "meta": meta,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.public_coin_gecko_attribution import PublicCoinGeckoAttribution
        from ..models.public_crypto_treasury_company import PublicCryptoTreasuryCompany
        from ..models.public_fresh_until_meta import PublicFreshUntilMeta

        d = dict(src_dict)
        coin = d.pop("coin")

        status = PublicDataStatus(d.pop("status"))

        def _parse_total_holdings(data: object) -> float | None:
            if data is None:
                return data
            return cast(float | None, data)

        total_holdings = _parse_total_holdings(d.pop("totalHoldings"))

        def _parse_total_value_usd(data: object) -> float | None:
            if data is None:
                return data
            return cast(float | None, data)

        total_value_usd = _parse_total_value_usd(d.pop("totalValueUsd"))

        companies = []
        _companies = d.pop("companies")
        for companies_item_data in _companies:
            companies_item = PublicCryptoTreasuryCompany.from_dict(companies_item_data)

            companies.append(companies_item)

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

        public_crypto_treasury_response = cls(
            coin=coin,
            status=status,
            total_holdings=total_holdings,
            total_value_usd=total_value_usd,
            companies=companies,
            as_of=as_of,
            source=source,
            meta=meta,
        )

        public_crypto_treasury_response.additional_properties = d
        return public_crypto_treasury_response

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
