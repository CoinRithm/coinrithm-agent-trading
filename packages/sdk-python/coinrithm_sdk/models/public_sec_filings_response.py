from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.public_sec_filings_response_coverage import PublicSecFilingsResponseCoverage

if TYPE_CHECKING:
    from ..models.public_sec_filings_source import PublicSecFilingsSource
    from ..models.public_sec_insider_transaction import PublicSecInsiderTransaction


T = TypeVar("T", bound="PublicSecFilingsResponse")


@_attrs_define
class PublicSecFilingsResponse:
    """
    Attributes:
        version (int):
        generated_at (datetime.datetime):
        ticker (str):
        name (str):
        coverage (PublicSecFilingsResponseCoverage):
        insider_transactions (list[PublicSecInsiderTransaction]): Up to 50 latest non-derivative transactions of every
            code.
        open_market_transactions (list[PublicSecInsiderTransaction]): Up to 20 latest open-market purchases and sales.
        source (PublicSecFilingsSource):
    """

    version: int
    generated_at: datetime.datetime
    ticker: str
    name: str
    coverage: PublicSecFilingsResponseCoverage
    insider_transactions: list[PublicSecInsiderTransaction]
    open_market_transactions: list[PublicSecInsiderTransaction]
    source: PublicSecFilingsSource
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        version = self.version

        generated_at = self.generated_at.isoformat()

        ticker = self.ticker

        name = self.name

        coverage = self.coverage.value

        insider_transactions = []
        for insider_transactions_item_data in self.insider_transactions:
            insider_transactions_item = insider_transactions_item_data.to_dict()
            insider_transactions.append(insider_transactions_item)

        open_market_transactions = []
        for open_market_transactions_item_data in self.open_market_transactions:
            open_market_transactions_item = open_market_transactions_item_data.to_dict()
            open_market_transactions.append(open_market_transactions_item)

        source = self.source.to_dict()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "version": version,
                "generatedAt": generated_at,
                "ticker": ticker,
                "name": name,
                "coverage": coverage,
                "insiderTransactions": insider_transactions,
                "openMarketTransactions": open_market_transactions,
                "source": source,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.public_sec_filings_source import PublicSecFilingsSource
        from ..models.public_sec_insider_transaction import PublicSecInsiderTransaction

        d = dict(src_dict)
        version = d.pop("version")

        generated_at = datetime.datetime.fromisoformat(d.pop("generatedAt").replace("Z", "+00:00"))

        ticker = d.pop("ticker")

        name = d.pop("name")

        coverage = PublicSecFilingsResponseCoverage(d.pop("coverage"))

        insider_transactions = []
        _insider_transactions = d.pop("insiderTransactions")
        for insider_transactions_item_data in _insider_transactions:
            insider_transactions_item = PublicSecInsiderTransaction.from_dict(insider_transactions_item_data)

            insider_transactions.append(insider_transactions_item)

        open_market_transactions = []
        _open_market_transactions = d.pop("openMarketTransactions")
        for open_market_transactions_item_data in _open_market_transactions:
            open_market_transactions_item = PublicSecInsiderTransaction.from_dict(open_market_transactions_item_data)

            open_market_transactions.append(open_market_transactions_item)

        source = PublicSecFilingsSource.from_dict(d.pop("source"))

        public_sec_filings_response = cls(
            version=version,
            generated_at=generated_at,
            ticker=ticker,
            name=name,
            coverage=coverage,
            insider_transactions=insider_transactions,
            open_market_transactions=open_market_transactions,
            source=source,
        )

        public_sec_filings_response.additional_properties = d
        return public_sec_filings_response

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
