from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

if TYPE_CHECKING:
    from ..models.pm_paper_v2_native_identity_type_0 import PmPaperV2NativeIdentityType0
    from ..models.pm_paper_v2_native_identity_type_1 import PmPaperV2NativeIdentityType1


T = TypeVar("T", bound="PmPaperV2PositionEntry")


@_attrs_define
class PmPaperV2PositionEntry:
    """
    Attributes:
        native_identity (PmPaperV2NativeIdentityType0 | PmPaperV2NativeIdentityType1):
        quantity (str): Shares bought (decimal string).
        notional (str): Pre-fee cost, mUSD (decimal string).
        net_fee (str): Fee, mUSD (decimal string).
        cash_debit (str): Total cash debited, mUSD (decimal string).
        book_received_at (datetime.datetime | None): When the entry book was received.
        book_provider_at (datetime.datetime | None): Venue timestamp of the entry book, when published.
        fee_basis (None | str): Fee policy or fee document revision used.
    """

    native_identity: PmPaperV2NativeIdentityType0 | PmPaperV2NativeIdentityType1
    quantity: str
    notional: str
    net_fee: str
    cash_debit: str
    book_received_at: datetime.datetime | None
    book_provider_at: datetime.datetime | None
    fee_basis: None | str
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        from ..models.pm_paper_v2_native_identity_type_0 import PmPaperV2NativeIdentityType0

        native_identity: dict[str, Any]
        if isinstance(self.native_identity, PmPaperV2NativeIdentityType0):
            native_identity = self.native_identity.to_dict()
        else:
            native_identity = self.native_identity.to_dict()

        quantity = self.quantity

        notional = self.notional

        net_fee = self.net_fee

        cash_debit = self.cash_debit

        book_received_at: None | str
        if isinstance(self.book_received_at, datetime.datetime):
            book_received_at = self.book_received_at.isoformat()
        else:
            book_received_at = self.book_received_at

        book_provider_at: None | str
        if isinstance(self.book_provider_at, datetime.datetime):
            book_provider_at = self.book_provider_at.isoformat()
        else:
            book_provider_at = self.book_provider_at

        fee_basis: None | str
        fee_basis = self.fee_basis

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "nativeIdentity": native_identity,
                "quantity": quantity,
                "notional": notional,
                "netFee": net_fee,
                "cashDebit": cash_debit,
                "bookReceivedAt": book_received_at,
                "bookProviderAt": book_provider_at,
                "feeBasis": fee_basis,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.pm_paper_v2_native_identity_type_0 import PmPaperV2NativeIdentityType0
        from ..models.pm_paper_v2_native_identity_type_1 import PmPaperV2NativeIdentityType1

        d = dict(src_dict)

        def _parse_native_identity(data: object) -> PmPaperV2NativeIdentityType0 | PmPaperV2NativeIdentityType1:
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                componentsschemas_pm_paper_v2_native_identity_type_0 = PmPaperV2NativeIdentityType0.from_dict(data)

                return componentsschemas_pm_paper_v2_native_identity_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            if not isinstance(data, dict):
                raise TypeError()
            componentsschemas_pm_paper_v2_native_identity_type_1 = PmPaperV2NativeIdentityType1.from_dict(data)

            return componentsschemas_pm_paper_v2_native_identity_type_1

        native_identity = _parse_native_identity(d.pop("nativeIdentity"))

        quantity = d.pop("quantity")

        notional = d.pop("notional")

        net_fee = d.pop("netFee")

        cash_debit = d.pop("cashDebit")

        def _parse_book_received_at(data: object) -> datetime.datetime | None:
            if data is None:
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                book_received_at_type_0 = datetime.datetime.fromisoformat(data.replace("Z", "+00:00"))

                return book_received_at_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None, data)

        book_received_at = _parse_book_received_at(d.pop("bookReceivedAt"))

        def _parse_book_provider_at(data: object) -> datetime.datetime | None:
            if data is None:
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                book_provider_at_type_0 = datetime.datetime.fromisoformat(data.replace("Z", "+00:00"))

                return book_provider_at_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None, data)

        book_provider_at = _parse_book_provider_at(d.pop("bookProviderAt"))

        def _parse_fee_basis(data: object) -> None | str:
            if data is None:
                return data
            return cast(None | str, data)

        fee_basis = _parse_fee_basis(d.pop("feeBasis"))

        pm_paper_v2_position_entry = cls(
            native_identity=native_identity,
            quantity=quantity,
            notional=notional,
            net_fee=net_fee,
            cash_debit=cash_debit,
            book_received_at=book_received_at,
            book_provider_at=book_provider_at,
            fee_basis=fee_basis,
        )

        pm_paper_v2_position_entry.additional_properties = d
        return pm_paper_v2_position_entry

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
