from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define

from ..types import UNSET, Unset

T = TypeVar("T", bound="PmPaperV2CloseRequest")


@_attrs_define
class PmPaperV2CloseRequest:
    """
    Attributes:
        position_id (int): A pm_paper_v2 position id owned by the calling key (JSON integer, not a string).
        idempotency_key (str): Globally unique per close intent.
        detail (None | str | Unset): Optional free-text note stored with the request; no control characters.
    """

    position_id: int
    idempotency_key: str
    detail: None | str | Unset = UNSET

    def to_dict(self) -> dict[str, Any]:
        position_id = self.position_id

        idempotency_key = self.idempotency_key

        detail: None | str | Unset
        if isinstance(self.detail, Unset):
            detail = UNSET
        else:
            detail = self.detail

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "positionId": position_id,
                "idempotencyKey": idempotency_key,
            }
        )
        if detail is not UNSET:
            field_dict["detail"] = detail

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        position_id = d.pop("positionId")

        idempotency_key = d.pop("idempotencyKey")

        def _parse_detail(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        detail = _parse_detail(d.pop("detail", UNSET))

        pm_paper_v2_close_request = cls(
            position_id=position_id,
            idempotency_key=idempotency_key,
            detail=detail,
        )

        return pm_paper_v2_close_request
