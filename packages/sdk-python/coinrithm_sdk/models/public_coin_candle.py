from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

T = TypeVar("T", bound="PublicCoinCandle")


@_attrs_define
class PublicCoinCandle:
    """
    Attributes:
        t (int): Bar timestamp, unix SECONDS (UTC).
        o (float):
        h (float):
        l (float):
        c (float):
        v (float): Mean rolling 24-hour quote volume observed at this bar, in USD regardless of `fiat`; not the volume
            traded during the bar, so never sum it across bars.
        vm (int | None | Unset): Expected venues missing from `v` because their fetch failed; 0 none known, null
            unknown.
    """

    t: int
    o: float
    h: float
    l: float
    c: float
    v: float
    vm: int | None | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        t = self.t

        o = self.o

        h = self.h

        l = self.l

        c = self.c

        v = self.v

        vm: int | None | Unset
        if isinstance(self.vm, Unset):
            vm = UNSET
        else:
            vm = self.vm

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "t": t,
                "o": o,
                "h": h,
                "l": l,
                "c": c,
                "v": v,
            }
        )
        if vm is not UNSET:
            field_dict["vm"] = vm

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        t = d.pop("t")

        o = d.pop("o")

        h = d.pop("h")

        l = d.pop("l")

        c = d.pop("c")

        v = d.pop("v")

        def _parse_vm(data: object) -> int | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(int | None | Unset, data)

        vm = _parse_vm(d.pop("vm", UNSET))

        public_coin_candle = cls(
            t=t,
            o=o,
            h=h,
            l=l,
            c=c,
            v=v,
            vm=vm,
        )

        public_coin_candle.additional_properties = d
        return public_coin_candle

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
