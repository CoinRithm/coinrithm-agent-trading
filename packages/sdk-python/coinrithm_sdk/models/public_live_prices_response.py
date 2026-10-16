from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.public_live_price_row import PublicLivePriceRow


T = TypeVar("T", bound="PublicLivePricesResponse")


@_attrs_define
class PublicLivePricesResponse:
    """
    Attributes:
        data (list[PublicLivePriceRow]):
        total_rows (int): Coins on the board across all pages.
        fiat (None | str | Unset): The requested currency code, as sent.
    """

    data: list[PublicLivePriceRow]
    total_rows: int
    fiat: None | str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        data = []
        for data_item_data in self.data:
            data_item = data_item_data.to_dict()
            data.append(data_item)

        total_rows = self.total_rows

        fiat: None | str | Unset
        if isinstance(self.fiat, Unset):
            fiat = UNSET
        else:
            fiat = self.fiat

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "data": data,
                "totalRows": total_rows,
            }
        )
        if fiat is not UNSET:
            field_dict["fiat"] = fiat

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.public_live_price_row import PublicLivePriceRow

        d = dict(src_dict)
        data = []
        _data = d.pop("data")
        for data_item_data in _data:
            data_item = PublicLivePriceRow.from_dict(data_item_data)

            data.append(data_item)

        total_rows = d.pop("totalRows")

        def _parse_fiat(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        fiat = _parse_fiat(d.pop("fiat", UNSET))

        public_live_prices_response = cls(
            data=data,
            total_rows=total_rows,
            fiat=fiat,
        )

        public_live_prices_response.additional_properties = d
        return public_live_prices_response

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
