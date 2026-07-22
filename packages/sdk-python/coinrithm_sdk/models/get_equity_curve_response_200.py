from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..models.get_equity_curve_response_200_granularity import GetEquityCurveResponse200Granularity
from ..types import UNSET, Unset
from typing import cast

if TYPE_CHECKING:
  from ..models.get_equity_curve_response_200_points_item import GetEquityCurveResponse200PointsItem
  from ..models.get_equity_curve_response_200_window import GetEquityCurveResponse200Window





T = TypeVar("T", bound="GetEquityCurveResponse200")



@_attrs_define
class GetEquityCurveResponse200:
    """ 
        Attributes:
            wallet_id (int | None | Unset):
            window (GetEquityCurveResponse200Window | Unset):
            granularity (GetEquityCurveResponse200Granularity | Unset):
            points (list[GetEquityCurveResponse200PointsItem] | Unset): daily -> {date, usdValue}. realized -> {t, venue,
                realizedPnlMusd, cumulativeRealizedPnlMusd}.
     """

    wallet_id: int | None | Unset = UNSET
    window: GetEquityCurveResponse200Window | Unset = UNSET
    granularity: GetEquityCurveResponse200Granularity | Unset = UNSET
    points: list[GetEquityCurveResponse200PointsItem] | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)





    def to_dict(self) -> dict[str, Any]:
        from ..models.get_equity_curve_response_200_points_item import GetEquityCurveResponse200PointsItem
        from ..models.get_equity_curve_response_200_window import GetEquityCurveResponse200Window
        wallet_id: int | None | Unset
        if isinstance(self.wallet_id, Unset):
            wallet_id = UNSET
        else:
            wallet_id = self.wallet_id

        window: dict[str, Any] | Unset = UNSET
        if not isinstance(self.window, Unset):
            window = self.window.to_dict()

        granularity: str | Unset = UNSET
        if not isinstance(self.granularity, Unset):
            granularity = self.granularity.value


        points: list[dict[str, Any]] | Unset = UNSET
        if not isinstance(self.points, Unset):
            points = []
            for points_item_data in self.points:
                points_item = points_item_data.to_dict()
                points.append(points_item)




        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({
        })
        if wallet_id is not UNSET:
            field_dict["walletId"] = wallet_id
        if window is not UNSET:
            field_dict["window"] = window
        if granularity is not UNSET:
            field_dict["granularity"] = granularity
        if points is not UNSET:
            field_dict["points"] = points

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.get_equity_curve_response_200_points_item import GetEquityCurveResponse200PointsItem
        from ..models.get_equity_curve_response_200_window import GetEquityCurveResponse200Window
        d = dict(src_dict)
        def _parse_wallet_id(data: object) -> int | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(int | None | Unset, data)

        wallet_id = _parse_wallet_id(d.pop("walletId", UNSET))


        _window = d.pop("window", UNSET)
        window: GetEquityCurveResponse200Window | Unset
        if isinstance(_window,  Unset):
            window = UNSET
        else:
            window = GetEquityCurveResponse200Window.from_dict(_window)




        _granularity = d.pop("granularity", UNSET)
        granularity: GetEquityCurveResponse200Granularity | Unset
        if isinstance(_granularity,  Unset):
            granularity = UNSET
        else:
            granularity = GetEquityCurveResponse200Granularity(_granularity)




        _points = d.pop("points", UNSET)
        points: list[GetEquityCurveResponse200PointsItem] | Unset = UNSET
        if _points is not UNSET:
            points = []
            for points_item_data in _points:
                points_item = GetEquityCurveResponse200PointsItem.from_dict(points_item_data)



                points.append(points_item)


        get_equity_curve_response_200 = cls(
            wallet_id=wallet_id,
            window=window,
            granularity=granularity,
            points=points,
        )


        get_equity_curve_response_200.additional_properties = d
        return get_equity_curve_response_200

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
