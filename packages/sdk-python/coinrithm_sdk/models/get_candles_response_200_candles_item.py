from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..types import UNSET, Unset






T = TypeVar("T", bound="GetCandlesResponse200CandlesItem")



@_attrs_define
class GetCandlesResponse200CandlesItem:
    """ 
        Attributes:
            t (int | Unset): Candle timestamp, unix SECONDS (UTC).
            o (float | Unset):
            h (float | Unset):
            l (float | Unset):
            c (float | Unset):
            v (float | Unset): Volume in USD regardless of fiat.
     """

    t: int | Unset = UNSET
    o: float | Unset = UNSET
    h: float | Unset = UNSET
    l: float | Unset = UNSET
    c: float | Unset = UNSET
    v: float | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)





    def to_dict(self) -> dict[str, Any]:
        t = self.t

        o = self.o

        h = self.h

        l = self.l

        c = self.c

        v = self.v


        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({
        })
        if t is not UNSET:
            field_dict["t"] = t
        if o is not UNSET:
            field_dict["o"] = o
        if h is not UNSET:
            field_dict["h"] = h
        if l is not UNSET:
            field_dict["l"] = l
        if c is not UNSET:
            field_dict["c"] = c
        if v is not UNSET:
            field_dict["v"] = v

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        t = d.pop("t", UNSET)

        o = d.pop("o", UNSET)

        h = d.pop("h", UNSET)

        l = d.pop("l", UNSET)

        c = d.pop("c", UNSET)

        v = d.pop("v", UNSET)

        get_candles_response_200_candles_item = cls(
            t=t,
            o=o,
            h=h,
            l=l,
            c=c,
            v=v,
        )


        get_candles_response_200_candles_item.additional_properties = d
        return get_candles_response_200_candles_item

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
