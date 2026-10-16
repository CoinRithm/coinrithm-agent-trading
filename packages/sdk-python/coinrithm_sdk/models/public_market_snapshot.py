from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

T = TypeVar("T", bound="PublicMarketSnapshot")


@_attrs_define
class PublicMarketSnapshot:
    """Latest global market snapshot. Keys are lower-case, as served. Totals are in `fiatcurrency`; changes are percent.

    Attributes:
        date (datetime.datetime): Snapshot minute (UTC).
        fiatcurrency (str): The requested currency, upper-cased.
        fiatratetousd (float): Fiat-per-USD rate applied; 1 for USD and for an untracked code.
        id (int | Unset):
        createdat (datetime.datetime | Unset): Write time of the snapshot.
        totalmarketcap (float | None | Unset):
        totalmarketcapchange (float | None | Unset):
        totalvolume24h (float | None | Unset):
        totalvolume24hchange (float | None | Unset):
        btcdominance (float | None | Unset): Percent of total market cap.
        btcdominancechange (float | None | Unset):
        ethdominance (float | None | Unset): Percent of total market cap.
        ethdominancechange (float | None | Unset):
        stablecoinvolume (float | None | Unset): 0 in every 2026-10-16 probe; do not read it as zero volume.
        stablecoinvolumechange (float | None | Unset):
        defivolume (float | None | Unset): 0 in every 2026-10-16 probe; do not read it as zero volume.
        defivolumechange (float | None | Unset):
        ethgasslow (float | None | Unset): ETH gas price tier (about 0.06 on 2026-10-16, consistent with gwei).
        ethgasstandard (float | None | Unset):
        ethgasfast (float | None | Unset):
        coincount (int | None | Unset): Coins in the totals.
        exchangecount (int | None | Unset): Exchanges in the totals.
        feargreedindex (int | None | Unset):
    """

    date: datetime.datetime
    fiatcurrency: str
    fiatratetousd: float
    id: int | Unset = UNSET
    createdat: datetime.datetime | Unset = UNSET
    totalmarketcap: float | None | Unset = UNSET
    totalmarketcapchange: float | None | Unset = UNSET
    totalvolume24h: float | None | Unset = UNSET
    totalvolume24hchange: float | None | Unset = UNSET
    btcdominance: float | None | Unset = UNSET
    btcdominancechange: float | None | Unset = UNSET
    ethdominance: float | None | Unset = UNSET
    ethdominancechange: float | None | Unset = UNSET
    stablecoinvolume: float | None | Unset = UNSET
    stablecoinvolumechange: float | None | Unset = UNSET
    defivolume: float | None | Unset = UNSET
    defivolumechange: float | None | Unset = UNSET
    ethgasslow: float | None | Unset = UNSET
    ethgasstandard: float | None | Unset = UNSET
    ethgasfast: float | None | Unset = UNSET
    coincount: int | None | Unset = UNSET
    exchangecount: int | None | Unset = UNSET
    feargreedindex: int | None | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        date = self.date.isoformat()

        fiatcurrency = self.fiatcurrency

        fiatratetousd = self.fiatratetousd

        id = self.id

        createdat: str | Unset = UNSET
        if not isinstance(self.createdat, Unset):
            createdat = self.createdat.isoformat()

        totalmarketcap: float | None | Unset
        if isinstance(self.totalmarketcap, Unset):
            totalmarketcap = UNSET
        else:
            totalmarketcap = self.totalmarketcap

        totalmarketcapchange: float | None | Unset
        if isinstance(self.totalmarketcapchange, Unset):
            totalmarketcapchange = UNSET
        else:
            totalmarketcapchange = self.totalmarketcapchange

        totalvolume24h: float | None | Unset
        if isinstance(self.totalvolume24h, Unset):
            totalvolume24h = UNSET
        else:
            totalvolume24h = self.totalvolume24h

        totalvolume24hchange: float | None | Unset
        if isinstance(self.totalvolume24hchange, Unset):
            totalvolume24hchange = UNSET
        else:
            totalvolume24hchange = self.totalvolume24hchange

        btcdominance: float | None | Unset
        if isinstance(self.btcdominance, Unset):
            btcdominance = UNSET
        else:
            btcdominance = self.btcdominance

        btcdominancechange: float | None | Unset
        if isinstance(self.btcdominancechange, Unset):
            btcdominancechange = UNSET
        else:
            btcdominancechange = self.btcdominancechange

        ethdominance: float | None | Unset
        if isinstance(self.ethdominance, Unset):
            ethdominance = UNSET
        else:
            ethdominance = self.ethdominance

        ethdominancechange: float | None | Unset
        if isinstance(self.ethdominancechange, Unset):
            ethdominancechange = UNSET
        else:
            ethdominancechange = self.ethdominancechange

        stablecoinvolume: float | None | Unset
        if isinstance(self.stablecoinvolume, Unset):
            stablecoinvolume = UNSET
        else:
            stablecoinvolume = self.stablecoinvolume

        stablecoinvolumechange: float | None | Unset
        if isinstance(self.stablecoinvolumechange, Unset):
            stablecoinvolumechange = UNSET
        else:
            stablecoinvolumechange = self.stablecoinvolumechange

        defivolume: float | None | Unset
        if isinstance(self.defivolume, Unset):
            defivolume = UNSET
        else:
            defivolume = self.defivolume

        defivolumechange: float | None | Unset
        if isinstance(self.defivolumechange, Unset):
            defivolumechange = UNSET
        else:
            defivolumechange = self.defivolumechange

        ethgasslow: float | None | Unset
        if isinstance(self.ethgasslow, Unset):
            ethgasslow = UNSET
        else:
            ethgasslow = self.ethgasslow

        ethgasstandard: float | None | Unset
        if isinstance(self.ethgasstandard, Unset):
            ethgasstandard = UNSET
        else:
            ethgasstandard = self.ethgasstandard

        ethgasfast: float | None | Unset
        if isinstance(self.ethgasfast, Unset):
            ethgasfast = UNSET
        else:
            ethgasfast = self.ethgasfast

        coincount: int | None | Unset
        if isinstance(self.coincount, Unset):
            coincount = UNSET
        else:
            coincount = self.coincount

        exchangecount: int | None | Unset
        if isinstance(self.exchangecount, Unset):
            exchangecount = UNSET
        else:
            exchangecount = self.exchangecount

        feargreedindex: int | None | Unset
        if isinstance(self.feargreedindex, Unset):
            feargreedindex = UNSET
        else:
            feargreedindex = self.feargreedindex

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "date": date,
                "fiatcurrency": fiatcurrency,
                "fiatratetousd": fiatratetousd,
            }
        )
        if id is not UNSET:
            field_dict["id"] = id
        if createdat is not UNSET:
            field_dict["createdat"] = createdat
        if totalmarketcap is not UNSET:
            field_dict["totalmarketcap"] = totalmarketcap
        if totalmarketcapchange is not UNSET:
            field_dict["totalmarketcapchange"] = totalmarketcapchange
        if totalvolume24h is not UNSET:
            field_dict["totalvolume24h"] = totalvolume24h
        if totalvolume24hchange is not UNSET:
            field_dict["totalvolume24hchange"] = totalvolume24hchange
        if btcdominance is not UNSET:
            field_dict["btcdominance"] = btcdominance
        if btcdominancechange is not UNSET:
            field_dict["btcdominancechange"] = btcdominancechange
        if ethdominance is not UNSET:
            field_dict["ethdominance"] = ethdominance
        if ethdominancechange is not UNSET:
            field_dict["ethdominancechange"] = ethdominancechange
        if stablecoinvolume is not UNSET:
            field_dict["stablecoinvolume"] = stablecoinvolume
        if stablecoinvolumechange is not UNSET:
            field_dict["stablecoinvolumechange"] = stablecoinvolumechange
        if defivolume is not UNSET:
            field_dict["defivolume"] = defivolume
        if defivolumechange is not UNSET:
            field_dict["defivolumechange"] = defivolumechange
        if ethgasslow is not UNSET:
            field_dict["ethgasslow"] = ethgasslow
        if ethgasstandard is not UNSET:
            field_dict["ethgasstandard"] = ethgasstandard
        if ethgasfast is not UNSET:
            field_dict["ethgasfast"] = ethgasfast
        if coincount is not UNSET:
            field_dict["coincount"] = coincount
        if exchangecount is not UNSET:
            field_dict["exchangecount"] = exchangecount
        if feargreedindex is not UNSET:
            field_dict["feargreedindex"] = feargreedindex

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        date = datetime.datetime.fromisoformat(d.pop("date").replace("Z", "+00:00"))

        fiatcurrency = d.pop("fiatcurrency")

        fiatratetousd = d.pop("fiatratetousd")

        id = d.pop("id", UNSET)

        _createdat = d.pop("createdat", UNSET)
        createdat: datetime.datetime | Unset
        if isinstance(_createdat, Unset):
            createdat = UNSET
        else:
            createdat = datetime.datetime.fromisoformat(_createdat.replace("Z", "+00:00"))

        def _parse_totalmarketcap(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        totalmarketcap = _parse_totalmarketcap(d.pop("totalmarketcap", UNSET))

        def _parse_totalmarketcapchange(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        totalmarketcapchange = _parse_totalmarketcapchange(d.pop("totalmarketcapchange", UNSET))

        def _parse_totalvolume24h(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        totalvolume24h = _parse_totalvolume24h(d.pop("totalvolume24h", UNSET))

        def _parse_totalvolume24hchange(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        totalvolume24hchange = _parse_totalvolume24hchange(d.pop("totalvolume24hchange", UNSET))

        def _parse_btcdominance(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        btcdominance = _parse_btcdominance(d.pop("btcdominance", UNSET))

        def _parse_btcdominancechange(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        btcdominancechange = _parse_btcdominancechange(d.pop("btcdominancechange", UNSET))

        def _parse_ethdominance(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        ethdominance = _parse_ethdominance(d.pop("ethdominance", UNSET))

        def _parse_ethdominancechange(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        ethdominancechange = _parse_ethdominancechange(d.pop("ethdominancechange", UNSET))

        def _parse_stablecoinvolume(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        stablecoinvolume = _parse_stablecoinvolume(d.pop("stablecoinvolume", UNSET))

        def _parse_stablecoinvolumechange(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        stablecoinvolumechange = _parse_stablecoinvolumechange(d.pop("stablecoinvolumechange", UNSET))

        def _parse_defivolume(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        defivolume = _parse_defivolume(d.pop("defivolume", UNSET))

        def _parse_defivolumechange(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        defivolumechange = _parse_defivolumechange(d.pop("defivolumechange", UNSET))

        def _parse_ethgasslow(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        ethgasslow = _parse_ethgasslow(d.pop("ethgasslow", UNSET))

        def _parse_ethgasstandard(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        ethgasstandard = _parse_ethgasstandard(d.pop("ethgasstandard", UNSET))

        def _parse_ethgasfast(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        ethgasfast = _parse_ethgasfast(d.pop("ethgasfast", UNSET))

        def _parse_coincount(data: object) -> int | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(int | None | Unset, data)

        coincount = _parse_coincount(d.pop("coincount", UNSET))

        def _parse_exchangecount(data: object) -> int | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(int | None | Unset, data)

        exchangecount = _parse_exchangecount(d.pop("exchangecount", UNSET))

        def _parse_feargreedindex(data: object) -> int | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(int | None | Unset, data)

        feargreedindex = _parse_feargreedindex(d.pop("feargreedindex", UNSET))

        public_market_snapshot = cls(
            date=date,
            fiatcurrency=fiatcurrency,
            fiatratetousd=fiatratetousd,
            id=id,
            createdat=createdat,
            totalmarketcap=totalmarketcap,
            totalmarketcapchange=totalmarketcapchange,
            totalvolume24h=totalvolume24h,
            totalvolume24hchange=totalvolume24hchange,
            btcdominance=btcdominance,
            btcdominancechange=btcdominancechange,
            ethdominance=ethdominance,
            ethdominancechange=ethdominancechange,
            stablecoinvolume=stablecoinvolume,
            stablecoinvolumechange=stablecoinvolumechange,
            defivolume=defivolume,
            defivolumechange=defivolumechange,
            ethgasslow=ethgasslow,
            ethgasstandard=ethgasstandard,
            ethgasfast=ethgasfast,
            coincount=coincount,
            exchangecount=exchangecount,
            feargreedindex=feargreedindex,
        )

        public_market_snapshot.additional_properties = d
        return public_market_snapshot

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
