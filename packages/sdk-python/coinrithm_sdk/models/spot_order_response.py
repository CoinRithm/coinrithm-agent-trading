from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.spot_order_response_summary import SpotOrderResponseSummary


T = TypeVar("T", bound="SpotOrderResponse")


@_attrs_define
class SpotOrderResponse:
    """For a market order, `summary` carries execution details; for limit/stop,
    it carries the resting-order terms.

        Attributes:
            message (str | Unset):
            order_id (int | Unset): Market fills (and their idempotent replays) only: the immutable
                ClosedOrder id of this fill, the same id `/api/agent/trades` lists
                for the spot row. It correlates the response with the ledger; it
                does not prove the fill used a particular quote. Limit/stop
                placement responses carry no order id; list resting orders with
                `/api/agent/orders/open`.
            summary (SpotOrderResponseSummary | Unset):
            idempotent_replay (bool | Unset): present (true) when this is a replay of a prior intent
    """

    message: str | Unset = UNSET
    order_id: int | Unset = UNSET
    summary: SpotOrderResponseSummary | Unset = UNSET
    idempotent_replay: bool | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        message = self.message

        order_id = self.order_id

        summary: dict[str, Any] | Unset = UNSET
        if not isinstance(self.summary, Unset):
            summary = self.summary.to_dict()

        idempotent_replay = self.idempotent_replay

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if message is not UNSET:
            field_dict["message"] = message
        if order_id is not UNSET:
            field_dict["orderId"] = order_id
        if summary is not UNSET:
            field_dict["summary"] = summary
        if idempotent_replay is not UNSET:
            field_dict["idempotentReplay"] = idempotent_replay

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.spot_order_response_summary import SpotOrderResponseSummary

        d = dict(src_dict)
        message = d.pop("message", UNSET)

        order_id = d.pop("orderId", UNSET)

        _summary = d.pop("summary", UNSET)
        summary: SpotOrderResponseSummary | Unset
        if isinstance(_summary, Unset):
            summary = UNSET
        else:
            summary = SpotOrderResponseSummary.from_dict(_summary)

        idempotent_replay = d.pop("idempotentReplay", UNSET)

        spot_order_response = cls(
            message=message,
            order_id=order_id,
            summary=summary,
            idempotent_replay=idempotent_replay,
        )

        spot_order_response.additional_properties = d
        return spot_order_response

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
