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
  from ..models.get_agent_news_response_200_items_item import GetAgentNewsResponse200ItemsItem





T = TypeVar("T", bound="GetAgentNewsResponse200")



@_attrs_define
class GetAgentNewsResponse200:
    """ 
        Attributes:
            coins (list[str] | Unset): The resolved coin slugs the news is keyed to.
            as_of (datetime.datetime | Unset):
            items (list[GetAgentNewsResponse200ItemsItem] | Unset):
     """

    coins: list[str] | Unset = UNSET
    as_of: datetime.datetime | Unset = UNSET
    items: list[GetAgentNewsResponse200ItemsItem] | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)





    def to_dict(self) -> dict[str, Any]:
        from ..models.get_agent_news_response_200_items_item import GetAgentNewsResponse200ItemsItem
        coins: list[str] | Unset = UNSET
        if not isinstance(self.coins, Unset):
            coins = self.coins



        as_of: str | Unset = UNSET
        if not isinstance(self.as_of, Unset):
            as_of = self.as_of.isoformat()

        items: list[dict[str, Any]] | Unset = UNSET
        if not isinstance(self.items, Unset):
            items = []
            for items_item_data in self.items:
                items_item = items_item_data.to_dict()
                items.append(items_item)




        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({
        })
        if coins is not UNSET:
            field_dict["coins"] = coins
        if as_of is not UNSET:
            field_dict["asOf"] = as_of
        if items is not UNSET:
            field_dict["items"] = items

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.get_agent_news_response_200_items_item import GetAgentNewsResponse200ItemsItem
        d = dict(src_dict)
        coins = cast(list[str], d.pop("coins", UNSET))


        _as_of = d.pop("asOf", UNSET)
        as_of: datetime.datetime | Unset
        if isinstance(_as_of,  Unset):
            as_of = UNSET
        else:
            as_of = isoparse(_as_of)




        _items = d.pop("items", UNSET)
        items: list[GetAgentNewsResponse200ItemsItem] | Unset = UNSET
        if _items is not UNSET:
            items = []
            for items_item_data in _items:
                items_item = GetAgentNewsResponse200ItemsItem.from_dict(items_item_data)



                items.append(items_item)


        get_agent_news_response_200 = cls(
            coins=coins,
            as_of=as_of,
            items=items,
        )


        get_agent_news_response_200.additional_properties = d
        return get_agent_news_response_200

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
