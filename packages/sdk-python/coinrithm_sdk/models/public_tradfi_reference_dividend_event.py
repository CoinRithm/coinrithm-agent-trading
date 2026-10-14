from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

T = TypeVar("T", bound="PublicTradfiReferenceDividendEvent")


@_attrs_define
class PublicTradfiReferenceDividendEvent:
    """
    Attributes:
        declared_date (datetime.date | None): Announcement date stated in the filing, else the SEC filing date.
        dividend_per_share (float): USD per common share.
        record_date (datetime.date | None):
        ex_date (datetime.date | None):
        ex_date_derived (bool): true when `exDate` is the record date under T+1 settlement (not stated by the company).
        payable_date (datetime.date | None):
        url (str): The SEC document the dates were read from.
    """

    declared_date: datetime.date | None
    dividend_per_share: float
    record_date: datetime.date | None
    ex_date: datetime.date | None
    ex_date_derived: bool
    payable_date: datetime.date | None
    url: str
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        declared_date: None | str
        if isinstance(self.declared_date, datetime.date):
            declared_date = self.declared_date.isoformat()
        else:
            declared_date = self.declared_date

        dividend_per_share = self.dividend_per_share

        record_date: None | str
        if isinstance(self.record_date, datetime.date):
            record_date = self.record_date.isoformat()
        else:
            record_date = self.record_date

        ex_date: None | str
        if isinstance(self.ex_date, datetime.date):
            ex_date = self.ex_date.isoformat()
        else:
            ex_date = self.ex_date

        ex_date_derived = self.ex_date_derived

        payable_date: None | str
        if isinstance(self.payable_date, datetime.date):
            payable_date = self.payable_date.isoformat()
        else:
            payable_date = self.payable_date

        url = self.url

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "declaredDate": declared_date,
                "dividendPerShare": dividend_per_share,
                "recordDate": record_date,
                "exDate": ex_date,
                "exDateDerived": ex_date_derived,
                "payableDate": payable_date,
                "url": url,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)

        def _parse_declared_date(data: object) -> datetime.date | None:
            if data is None:
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                declared_date_type_0 = datetime.date.fromisoformat(data)

                return declared_date_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.date | None, data)

        declared_date = _parse_declared_date(d.pop("declaredDate"))

        dividend_per_share = d.pop("dividendPerShare")

        def _parse_record_date(data: object) -> datetime.date | None:
            if data is None:
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                record_date_type_0 = datetime.date.fromisoformat(data)

                return record_date_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.date | None, data)

        record_date = _parse_record_date(d.pop("recordDate"))

        def _parse_ex_date(data: object) -> datetime.date | None:
            if data is None:
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                ex_date_type_0 = datetime.date.fromisoformat(data)

                return ex_date_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.date | None, data)

        ex_date = _parse_ex_date(d.pop("exDate"))

        ex_date_derived = d.pop("exDateDerived")

        def _parse_payable_date(data: object) -> datetime.date | None:
            if data is None:
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                payable_date_type_0 = datetime.date.fromisoformat(data)

                return payable_date_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.date | None, data)

        payable_date = _parse_payable_date(d.pop("payableDate"))

        url = d.pop("url")

        public_tradfi_reference_dividend_event = cls(
            declared_date=declared_date,
            dividend_per_share=dividend_per_share,
            record_date=record_date,
            ex_date=ex_date,
            ex_date_derived=ex_date_derived,
            payable_date=payable_date,
            url=url,
        )

        public_tradfi_reference_dividend_event.additional_properties = d
        return public_tradfi_reference_dividend_event

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
