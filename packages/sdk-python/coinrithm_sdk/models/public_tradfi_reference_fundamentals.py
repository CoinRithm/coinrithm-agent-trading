from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.public_tradfi_reference_fundamentals_market_cap_basis import (
    PublicTradfiReferenceFundamentalsMarketCapBasis,
)
from ..models.public_tradfi_reference_fundamentals_shares_source_type_0 import (
    PublicTradfiReferenceFundamentalsSharesSourceType0,
)
from ..models.public_tradfi_reference_ttm_basis import PublicTradfiReferenceTtmBasis

if TYPE_CHECKING:
    from ..models.public_tradfi_reference_fundamentals_latest_filing_type_0 import (
        PublicTradfiReferenceFundamentalsLatestFilingType0,
    )
    from ..models.public_tradfi_reference_fundamentals_source import PublicTradfiReferenceFundamentalsSource


T = TypeVar("T", bound="PublicTradfiReferenceFundamentals")


@_attrs_define
class PublicTradfiReferenceFundamentals:
    """Company-reported SEC XBRL data. Each value is null when SEC data
    cannot give it without guessing. Market cap, dividend yield and P/E
    use the CoinRithm reference price (USDT perp index median, treated as
    USD), not an exchange quote.

        Attributes:
            market_cap_usd (float | None): sharesOutstanding x referencePrice.
            market_cap_basis (PublicTradfiReferenceFundamentalsMarketCapBasis):
            reference_price (float | None): The live consensus when present, else the latest stored consensus.
            shares_outstanding (float | None):
            shares_as_of (datetime.date | None):
            shares_source (None | PublicTradfiReferenceFundamentalsSharesSourceType0): `dei_cover`: filing cover page;
                `balance_sheet`: all classes at quarter end.
            dividend_per_share_ttm (float | None): Dividends declared per share over the trailing twelve months, USD.
            dividend_ttm_basis (None | PublicTradfiReferenceTtmBasis):
            dividend_ttm_period_end (datetime.date | None):
            dividend_yield_pct (float | None): dividendPerShareTtm / referencePrice x 100.
            last_dividend_per_share (float | None): Declared in the latest reported quarter.
            last_dividend_period_end (datetime.date | None):
            revenue_ttm_usd (float | None):
            net_income_ttm_usd (float | None):
            eps_diluted_ttm (float | None):
            pe_ratio (float | None): referencePrice / epsDilutedTtm; null when EPS <= 0.
            ttm_basis (None | PublicTradfiReferenceTtmBasis): `quarters`: last four reported quarters; `annual`: latest
                fiscal year.
            ttm_period_end (datetime.date | None): End of the twelve months behind revenue, net income and EPS.
            sector (None | str): SEC SIC industry description, e.g. Electronic Computers.
            fiscal_year_end (None | str): MM-DD, e.g. 09-26.
            latest_filing (None | PublicTradfiReferenceFundamentalsLatestFilingType0):
            fetched_at (datetime.datetime): When the aggregator last read SEC.
            source (PublicTradfiReferenceFundamentalsSource):
    """

    market_cap_usd: float | None
    market_cap_basis: PublicTradfiReferenceFundamentalsMarketCapBasis
    reference_price: float | None
    shares_outstanding: float | None
    shares_as_of: datetime.date | None
    shares_source: None | PublicTradfiReferenceFundamentalsSharesSourceType0
    dividend_per_share_ttm: float | None
    dividend_ttm_basis: None | PublicTradfiReferenceTtmBasis
    dividend_ttm_period_end: datetime.date | None
    dividend_yield_pct: float | None
    last_dividend_per_share: float | None
    last_dividend_period_end: datetime.date | None
    revenue_ttm_usd: float | None
    net_income_ttm_usd: float | None
    eps_diluted_ttm: float | None
    pe_ratio: float | None
    ttm_basis: None | PublicTradfiReferenceTtmBasis
    ttm_period_end: datetime.date | None
    sector: None | str
    fiscal_year_end: None | str
    latest_filing: None | PublicTradfiReferenceFundamentalsLatestFilingType0
    fetched_at: datetime.datetime
    source: PublicTradfiReferenceFundamentalsSource
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        from ..models.public_tradfi_reference_fundamentals_latest_filing_type_0 import (
            PublicTradfiReferenceFundamentalsLatestFilingType0,
        )

        market_cap_usd: float | None
        market_cap_usd = self.market_cap_usd

        market_cap_basis = self.market_cap_basis.value

        reference_price: float | None
        reference_price = self.reference_price

        shares_outstanding: float | None
        shares_outstanding = self.shares_outstanding

        shares_as_of: None | str
        if isinstance(self.shares_as_of, datetime.date):
            shares_as_of = self.shares_as_of.isoformat()
        else:
            shares_as_of = self.shares_as_of

        shares_source: None | str
        if isinstance(self.shares_source, PublicTradfiReferenceFundamentalsSharesSourceType0):
            shares_source = self.shares_source.value
        else:
            shares_source = self.shares_source

        dividend_per_share_ttm: float | None
        dividend_per_share_ttm = self.dividend_per_share_ttm

        dividend_ttm_basis: None | str
        if isinstance(self.dividend_ttm_basis, PublicTradfiReferenceTtmBasis):
            dividend_ttm_basis = self.dividend_ttm_basis.value
        else:
            dividend_ttm_basis = self.dividend_ttm_basis

        dividend_ttm_period_end: None | str
        if isinstance(self.dividend_ttm_period_end, datetime.date):
            dividend_ttm_period_end = self.dividend_ttm_period_end.isoformat()
        else:
            dividend_ttm_period_end = self.dividend_ttm_period_end

        dividend_yield_pct: float | None
        dividend_yield_pct = self.dividend_yield_pct

        last_dividend_per_share: float | None
        last_dividend_per_share = self.last_dividend_per_share

        last_dividend_period_end: None | str
        if isinstance(self.last_dividend_period_end, datetime.date):
            last_dividend_period_end = self.last_dividend_period_end.isoformat()
        else:
            last_dividend_period_end = self.last_dividend_period_end

        revenue_ttm_usd: float | None
        revenue_ttm_usd = self.revenue_ttm_usd

        net_income_ttm_usd: float | None
        net_income_ttm_usd = self.net_income_ttm_usd

        eps_diluted_ttm: float | None
        eps_diluted_ttm = self.eps_diluted_ttm

        pe_ratio: float | None
        pe_ratio = self.pe_ratio

        ttm_basis: None | str
        if isinstance(self.ttm_basis, PublicTradfiReferenceTtmBasis):
            ttm_basis = self.ttm_basis.value
        else:
            ttm_basis = self.ttm_basis

        ttm_period_end: None | str
        if isinstance(self.ttm_period_end, datetime.date):
            ttm_period_end = self.ttm_period_end.isoformat()
        else:
            ttm_period_end = self.ttm_period_end

        sector: None | str
        sector = self.sector

        fiscal_year_end: None | str
        fiscal_year_end = self.fiscal_year_end

        latest_filing: dict[str, Any] | None
        if isinstance(self.latest_filing, PublicTradfiReferenceFundamentalsLatestFilingType0):
            latest_filing = self.latest_filing.to_dict()
        else:
            latest_filing = self.latest_filing

        fetched_at = self.fetched_at.isoformat()

        source = self.source.to_dict()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "marketCapUsd": market_cap_usd,
                "marketCapBasis": market_cap_basis,
                "referencePrice": reference_price,
                "sharesOutstanding": shares_outstanding,
                "sharesAsOf": shares_as_of,
                "sharesSource": shares_source,
                "dividendPerShareTtm": dividend_per_share_ttm,
                "dividendTtmBasis": dividend_ttm_basis,
                "dividendTtmPeriodEnd": dividend_ttm_period_end,
                "dividendYieldPct": dividend_yield_pct,
                "lastDividendPerShare": last_dividend_per_share,
                "lastDividendPeriodEnd": last_dividend_period_end,
                "revenueTtmUsd": revenue_ttm_usd,
                "netIncomeTtmUsd": net_income_ttm_usd,
                "epsDilutedTtm": eps_diluted_ttm,
                "peRatio": pe_ratio,
                "ttmBasis": ttm_basis,
                "ttmPeriodEnd": ttm_period_end,
                "sector": sector,
                "fiscalYearEnd": fiscal_year_end,
                "latestFiling": latest_filing,
                "fetchedAt": fetched_at,
                "source": source,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.public_tradfi_reference_fundamentals_latest_filing_type_0 import (
            PublicTradfiReferenceFundamentalsLatestFilingType0,
        )
        from ..models.public_tradfi_reference_fundamentals_source import PublicTradfiReferenceFundamentalsSource

        d = dict(src_dict)

        def _parse_market_cap_usd(data: object) -> float | None:
            if data is None:
                return data
            return cast(float | None, data)

        market_cap_usd = _parse_market_cap_usd(d.pop("marketCapUsd"))

        market_cap_basis = PublicTradfiReferenceFundamentalsMarketCapBasis(d.pop("marketCapBasis"))

        def _parse_reference_price(data: object) -> float | None:
            if data is None:
                return data
            return cast(float | None, data)

        reference_price = _parse_reference_price(d.pop("referencePrice"))

        def _parse_shares_outstanding(data: object) -> float | None:
            if data is None:
                return data
            return cast(float | None, data)

        shares_outstanding = _parse_shares_outstanding(d.pop("sharesOutstanding"))

        def _parse_shares_as_of(data: object) -> datetime.date | None:
            if data is None:
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                shares_as_of_type_0 = datetime.date.fromisoformat(data)

                return shares_as_of_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.date | None, data)

        shares_as_of = _parse_shares_as_of(d.pop("sharesAsOf"))

        def _parse_shares_source(data: object) -> None | PublicTradfiReferenceFundamentalsSharesSourceType0:
            if data is None:
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                shares_source_type_0 = PublicTradfiReferenceFundamentalsSharesSourceType0(data)

                return shares_source_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | PublicTradfiReferenceFundamentalsSharesSourceType0, data)

        shares_source = _parse_shares_source(d.pop("sharesSource"))

        def _parse_dividend_per_share_ttm(data: object) -> float | None:
            if data is None:
                return data
            return cast(float | None, data)

        dividend_per_share_ttm = _parse_dividend_per_share_ttm(d.pop("dividendPerShareTtm"))

        def _parse_dividend_ttm_basis(data: object) -> None | PublicTradfiReferenceTtmBasis:
            if data is None:
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                dividend_ttm_basis_type_0 = PublicTradfiReferenceTtmBasis(data)

                return dividend_ttm_basis_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | PublicTradfiReferenceTtmBasis, data)

        dividend_ttm_basis = _parse_dividend_ttm_basis(d.pop("dividendTtmBasis"))

        def _parse_dividend_ttm_period_end(data: object) -> datetime.date | None:
            if data is None:
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                dividend_ttm_period_end_type_0 = datetime.date.fromisoformat(data)

                return dividend_ttm_period_end_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.date | None, data)

        dividend_ttm_period_end = _parse_dividend_ttm_period_end(d.pop("dividendTtmPeriodEnd"))

        def _parse_dividend_yield_pct(data: object) -> float | None:
            if data is None:
                return data
            return cast(float | None, data)

        dividend_yield_pct = _parse_dividend_yield_pct(d.pop("dividendYieldPct"))

        def _parse_last_dividend_per_share(data: object) -> float | None:
            if data is None:
                return data
            return cast(float | None, data)

        last_dividend_per_share = _parse_last_dividend_per_share(d.pop("lastDividendPerShare"))

        def _parse_last_dividend_period_end(data: object) -> datetime.date | None:
            if data is None:
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                last_dividend_period_end_type_0 = datetime.date.fromisoformat(data)

                return last_dividend_period_end_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.date | None, data)

        last_dividend_period_end = _parse_last_dividend_period_end(d.pop("lastDividendPeriodEnd"))

        def _parse_revenue_ttm_usd(data: object) -> float | None:
            if data is None:
                return data
            return cast(float | None, data)

        revenue_ttm_usd = _parse_revenue_ttm_usd(d.pop("revenueTtmUsd"))

        def _parse_net_income_ttm_usd(data: object) -> float | None:
            if data is None:
                return data
            return cast(float | None, data)

        net_income_ttm_usd = _parse_net_income_ttm_usd(d.pop("netIncomeTtmUsd"))

        def _parse_eps_diluted_ttm(data: object) -> float | None:
            if data is None:
                return data
            return cast(float | None, data)

        eps_diluted_ttm = _parse_eps_diluted_ttm(d.pop("epsDilutedTtm"))

        def _parse_pe_ratio(data: object) -> float | None:
            if data is None:
                return data
            return cast(float | None, data)

        pe_ratio = _parse_pe_ratio(d.pop("peRatio"))

        def _parse_ttm_basis(data: object) -> None | PublicTradfiReferenceTtmBasis:
            if data is None:
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                ttm_basis_type_0 = PublicTradfiReferenceTtmBasis(data)

                return ttm_basis_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | PublicTradfiReferenceTtmBasis, data)

        ttm_basis = _parse_ttm_basis(d.pop("ttmBasis"))

        def _parse_ttm_period_end(data: object) -> datetime.date | None:
            if data is None:
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                ttm_period_end_type_0 = datetime.date.fromisoformat(data)

                return ttm_period_end_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.date | None, data)

        ttm_period_end = _parse_ttm_period_end(d.pop("ttmPeriodEnd"))

        def _parse_sector(data: object) -> None | str:
            if data is None:
                return data
            return cast(None | str, data)

        sector = _parse_sector(d.pop("sector"))

        def _parse_fiscal_year_end(data: object) -> None | str:
            if data is None:
                return data
            return cast(None | str, data)

        fiscal_year_end = _parse_fiscal_year_end(d.pop("fiscalYearEnd"))

        def _parse_latest_filing(data: object) -> None | PublicTradfiReferenceFundamentalsLatestFilingType0:
            if data is None:
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                latest_filing_type_0 = PublicTradfiReferenceFundamentalsLatestFilingType0.from_dict(data)

                return latest_filing_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | PublicTradfiReferenceFundamentalsLatestFilingType0, data)

        latest_filing = _parse_latest_filing(d.pop("latestFiling"))

        fetched_at = datetime.datetime.fromisoformat(d.pop("fetchedAt").replace("Z", "+00:00"))

        source = PublicTradfiReferenceFundamentalsSource.from_dict(d.pop("source"))

        public_tradfi_reference_fundamentals = cls(
            market_cap_usd=market_cap_usd,
            market_cap_basis=market_cap_basis,
            reference_price=reference_price,
            shares_outstanding=shares_outstanding,
            shares_as_of=shares_as_of,
            shares_source=shares_source,
            dividend_per_share_ttm=dividend_per_share_ttm,
            dividend_ttm_basis=dividend_ttm_basis,
            dividend_ttm_period_end=dividend_ttm_period_end,
            dividend_yield_pct=dividend_yield_pct,
            last_dividend_per_share=last_dividend_per_share,
            last_dividend_period_end=last_dividend_period_end,
            revenue_ttm_usd=revenue_ttm_usd,
            net_income_ttm_usd=net_income_ttm_usd,
            eps_diluted_ttm=eps_diluted_ttm,
            pe_ratio=pe_ratio,
            ttm_basis=ttm_basis,
            ttm_period_end=ttm_period_end,
            sector=sector,
            fiscal_year_end=fiscal_year_end,
            latest_filing=latest_filing,
            fetched_at=fetched_at,
            source=source,
        )

        public_tradfi_reference_fundamentals.additional_properties = d
        return public_tradfi_reference_fundamentals

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
