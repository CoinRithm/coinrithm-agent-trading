from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset
from dateutil.parser import isoparse
from typing import cast
import datetime

if TYPE_CHECKING:
  from ..models.get_my_trades_response_200_trades_item import GetMyTradesResponse200TradesItem





T = TypeVar("T", bound="GetMyTradesResponse200")



@_attrs_define
class GetMyTradesResponse200:
    """ 
        Attributes:
            wallet_id (int | None | Unset):
            venue (str | Unset):
            count (int | Unset):
            updated_since (datetime.datetime | None | Unset):
            as_of (datetime.datetime | Unset): Use as the next updatedSince cursor.
            trades (list[GetMyTradesResponse200TradesItem] | Unset):
     """

    wallet_id: int | None | Unset = UNSET
    venue: str | Unset = UNSET
    count: int | Unset = UNSET
    updated_since: datetime.datetime | None | Unset = UNSET
    as_of: datetime.datetime | Unset = UNSET
    trades: list[GetMyTradesResponse200TradesItem] | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)





    def to_dict(self) -> dict[str, Any]:
        from ..models.get_my_trades_response_200_trades_item import GetMyTradesResponse200TradesItem
        wallet_id: int | None | Unset
        if isinstance(self.wallet_id, Unset):
            wallet_id = UNSET
        else:
            wallet_id = self.wallet_id

        venue = self.venue

        count = self.count

        updated_since: None | str | Unset
        if isinstance(self.updated_since, Unset):
            updated_since = UNSET
        elif isinstance(self.updated_since, datetime.datetime):
            updated_since = self.updated_since.isoformat()
        else:
            updated_since = self.updated_since

        as_of: str | Unset = UNSET
        if not isinstance(self.as_of, Unset):
            as_of = self.as_of.isoformat()

        trades: list[dict[str, Any]] | Unset = UNSET
        if not isinstance(self.trades, Unset):
            trades = []
            for trades_item_data in self.trades:
                trades_item = trades_item_data.to_dict()
                trades.append(trades_item)




        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({
        })
        if wallet_id is not UNSET:
            field_dict["walletId"] = wallet_id
        if venue is not UNSET:
            field_dict["venue"] = venue
        if count is not UNSET:
            field_dict["count"] = count
        if updated_since is not UNSET:
            field_dict["updatedSince"] = updated_since
        if as_of is not UNSET:
            field_dict["asOf"] = as_of
        if trades is not UNSET:
            field_dict["trades"] = trades

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.get_my_trades_response_200_trades_item import GetMyTradesResponse200TradesItem
        d = dict(src_dict)
        def _parse_wallet_id(data: object) -> int | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(int | None | Unset, data)

        wallet_id = _parse_wallet_id(d.pop("walletId", UNSET))


        venue = d.pop("venue", UNSET)

        count = d.pop("count", UNSET)

        def _parse_updated_since(data: object) -> datetime.datetime | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                updated_since_type_0 = isoparse(data)



                return updated_since_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None | Unset, data)

        updated_since = _parse_updated_since(d.pop("updatedSince", UNSET))


        _as_of = d.pop("asOf", UNSET)
        as_of: datetime.datetime | Unset
        if isinstance(_as_of,  Unset):
            as_of = UNSET
        else:
            as_of = isoparse(_as_of)




        _trades = d.pop("trades", UNSET)
        trades: list[GetMyTradesResponse200TradesItem] | Unset = UNSET
        if _trades is not UNSET:
            trades = []
            for trades_item_data in _trades:
                trades_item = GetMyTradesResponse200TradesItem.from_dict(trades_item_data)



                trades.append(trades_item)


        get_my_trades_response_200 = cls(
            wallet_id=wallet_id,
            venue=venue,
            count=count,
            updated_since=updated_since,
            as_of=as_of,
            trades=trades,
        )


        get_my_trades_response_200.additional_properties = d
        return get_my_trades_response_200

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
