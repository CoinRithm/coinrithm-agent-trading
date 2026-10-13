from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

if TYPE_CHECKING:
    from ..models.public_sec_insider_reporter import PublicSecInsiderReporter


T = TypeVar("T", bound="PublicSecInsiderTransaction")


@_attrs_define
class PublicSecInsiderTransaction:
    """
    Attributes:
        accession_number (str):
        filing_url (str): SEC rendering of the original Form 4.
        filing_index_url (str): EDGAR filing index.
        filed_at (str): EDGAR filing date, `YYYY-MM-DD`.
        transaction_date (str): Trade date, `YYYY-MM-DD`.
        reporter (PublicSecInsiderReporter):
        security_title (str):
        code (str): Form 4 transaction code, e.g. `P`, `S`, `A`, `M`.
        code_label (str):
        is_open_market (bool): Code `P` or `S`.
        acquired_disposed (None | str): `A` (acquired) or `D` (disposed), or null.
        shares (float | None):
        price_per_share (float | None):
        value_usd (float | None):
        shares_owned_after (float | None):
        ownership (None | str): `direct` or `indirect`, or null.
        is_10_b_5_one (bool | None): Reported under a Rule 10b5-1 plan; null when the form predates that checkbox.
    """

    accession_number: str
    filing_url: str
    filing_index_url: str
    filed_at: str
    transaction_date: str
    reporter: PublicSecInsiderReporter
    security_title: str
    code: str
    code_label: str
    is_open_market: bool
    acquired_disposed: None | str
    shares: float | None
    price_per_share: float | None
    value_usd: float | None
    shares_owned_after: float | None
    ownership: None | str
    is_10_b_5_one: bool | None
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        accession_number = self.accession_number

        filing_url = self.filing_url

        filing_index_url = self.filing_index_url

        filed_at = self.filed_at

        transaction_date = self.transaction_date

        reporter = self.reporter.to_dict()

        security_title = self.security_title

        code = self.code

        code_label = self.code_label

        is_open_market = self.is_open_market

        acquired_disposed: None | str
        acquired_disposed = self.acquired_disposed

        shares: float | None
        shares = self.shares

        price_per_share: float | None
        price_per_share = self.price_per_share

        value_usd: float | None
        value_usd = self.value_usd

        shares_owned_after: float | None
        shares_owned_after = self.shares_owned_after

        ownership: None | str
        ownership = self.ownership

        is_10_b_5_one: bool | None
        is_10_b_5_one = self.is_10_b_5_one

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "accessionNumber": accession_number,
                "filingUrl": filing_url,
                "filingIndexUrl": filing_index_url,
                "filedAt": filed_at,
                "transactionDate": transaction_date,
                "reporter": reporter,
                "securityTitle": security_title,
                "code": code,
                "codeLabel": code_label,
                "isOpenMarket": is_open_market,
                "acquiredDisposed": acquired_disposed,
                "shares": shares,
                "pricePerShare": price_per_share,
                "valueUsd": value_usd,
                "sharesOwnedAfter": shares_owned_after,
                "ownership": ownership,
                "is10b5One": is_10_b_5_one,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.public_sec_insider_reporter import PublicSecInsiderReporter

        d = dict(src_dict)
        accession_number = d.pop("accessionNumber")

        filing_url = d.pop("filingUrl")

        filing_index_url = d.pop("filingIndexUrl")

        filed_at = d.pop("filedAt")

        transaction_date = d.pop("transactionDate")

        reporter = PublicSecInsiderReporter.from_dict(d.pop("reporter"))

        security_title = d.pop("securityTitle")

        code = d.pop("code")

        code_label = d.pop("codeLabel")

        is_open_market = d.pop("isOpenMarket")

        def _parse_acquired_disposed(data: object) -> None | str:
            if data is None:
                return data
            return cast(None | str, data)

        acquired_disposed = _parse_acquired_disposed(d.pop("acquiredDisposed"))

        def _parse_shares(data: object) -> float | None:
            if data is None:
                return data
            return cast(float | None, data)

        shares = _parse_shares(d.pop("shares"))

        def _parse_price_per_share(data: object) -> float | None:
            if data is None:
                return data
            return cast(float | None, data)

        price_per_share = _parse_price_per_share(d.pop("pricePerShare"))

        def _parse_value_usd(data: object) -> float | None:
            if data is None:
                return data
            return cast(float | None, data)

        value_usd = _parse_value_usd(d.pop("valueUsd"))

        def _parse_shares_owned_after(data: object) -> float | None:
            if data is None:
                return data
            return cast(float | None, data)

        shares_owned_after = _parse_shares_owned_after(d.pop("sharesOwnedAfter"))

        def _parse_ownership(data: object) -> None | str:
            if data is None:
                return data
            return cast(None | str, data)

        ownership = _parse_ownership(d.pop("ownership"))

        def _parse_is_10_b_5_one(data: object) -> bool | None:
            if data is None:
                return data
            return cast(bool | None, data)

        is_10_b_5_one = _parse_is_10_b_5_one(d.pop("is10b5One"))

        public_sec_insider_transaction = cls(
            accession_number=accession_number,
            filing_url=filing_url,
            filing_index_url=filing_index_url,
            filed_at=filed_at,
            transaction_date=transaction_date,
            reporter=reporter,
            security_title=security_title,
            code=code,
            code_label=code_label,
            is_open_market=is_open_market,
            acquired_disposed=acquired_disposed,
            shares=shares,
            price_per_share=price_per_share,
            value_usd=value_usd,
            shares_owned_after=shares_owned_after,
            ownership=ownership,
            is_10_b_5_one=is_10_b_5_one,
        )

        public_sec_insider_transaction.additional_properties = d
        return public_sec_insider_transaction

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
