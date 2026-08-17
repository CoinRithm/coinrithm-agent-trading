from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.get_equity_curve_response_200_points_item_venue import GetEquityCurveResponse200PointsItemVenue
from ..types import UNSET, Unset

T = TypeVar("T", bound="GetEquityCurveResponse200PointsItem")


@_attrs_define
class GetEquityCurveResponse200PointsItem:
    """
    Attributes:
        date (str | Unset):  Example: 2026-05-01.
        usd_value (float | Unset):
        t (datetime.datetime | Unset):
        venue (GetEquityCurveResponse200PointsItemVenue | Unset):
        realized_pnl_musd (float | Unset):
        cumulative_realized_pnl_musd (float | Unset):
    """

    date: str | Unset = UNSET
    usd_value: float | Unset = UNSET
    t: datetime.datetime | Unset = UNSET
    venue: GetEquityCurveResponse200PointsItemVenue | Unset = UNSET
    realized_pnl_musd: float | Unset = UNSET
    cumulative_realized_pnl_musd: float | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        date = self.date

        usd_value = self.usd_value

        t: str | Unset = UNSET
        if not isinstance(self.t, Unset):
            t = self.t.isoformat()

        venue: str | Unset = UNSET
        if not isinstance(self.venue, Unset):
            venue = self.venue.value

        realized_pnl_musd = self.realized_pnl_musd

        cumulative_realized_pnl_musd = self.cumulative_realized_pnl_musd

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if date is not UNSET:
            field_dict["date"] = date
        if usd_value is not UNSET:
            field_dict["usdValue"] = usd_value
        if t is not UNSET:
            field_dict["t"] = t
        if venue is not UNSET:
            field_dict["venue"] = venue
        if realized_pnl_musd is not UNSET:
            field_dict["realizedPnlMusd"] = realized_pnl_musd
        if cumulative_realized_pnl_musd is not UNSET:
            field_dict["cumulativeRealizedPnlMusd"] = cumulative_realized_pnl_musd

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        date = d.pop("date", UNSET)

        usd_value = d.pop("usdValue", UNSET)

        _t = d.pop("t", UNSET)
        t: datetime.datetime | Unset
        if isinstance(_t, Unset):
            t = UNSET
        else:
            t = datetime.datetime.fromisoformat(_t)

        _venue = d.pop("venue", UNSET)
        venue: GetEquityCurveResponse200PointsItemVenue | Unset
        if isinstance(_venue, Unset):
            venue = UNSET
        else:
            venue = GetEquityCurveResponse200PointsItemVenue(_venue)

        realized_pnl_musd = d.pop("realizedPnlMusd", UNSET)

        cumulative_realized_pnl_musd = d.pop("cumulativeRealizedPnlMusd", UNSET)

        get_equity_curve_response_200_points_item = cls(
            date=date,
            usd_value=usd_value,
            t=t,
            venue=venue,
            realized_pnl_musd=realized_pnl_musd,
            cumulative_realized_pnl_musd=cumulative_realized_pnl_musd,
        )

        get_equity_curve_response_200_points_item.additional_properties = d
        return get_equity_curve_response_200_points_item

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
