from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.pm_paper_v2_position_terminal_type_0_evidence_basis import PmPaperV2PositionTerminalType0EvidenceBasis
from ..models.pm_paper_v2_position_terminal_type_0_type import PmPaperV2PositionTerminalType0Type

T = TypeVar("T", bound="PmPaperV2PositionTerminalType0")


@_attrs_define
class PmPaperV2PositionTerminalType0:
    """
    Attributes:
        type_ (PmPaperV2PositionTerminalType0Type):
        evidence_basis (PmPaperV2PositionTerminalType0EvidenceBasis):
        payout_quanta_6 (str):
        pnl_quanta_6 (str):
        fee (None | str): Sell fee in mUSD; "0" for a resolution.
        acquired_at (datetime.datetime | None):
    """

    type_: PmPaperV2PositionTerminalType0Type
    evidence_basis: PmPaperV2PositionTerminalType0EvidenceBasis
    payout_quanta_6: str
    pnl_quanta_6: str
    fee: None | str
    acquired_at: datetime.datetime | None
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        type_ = self.type_.value

        evidence_basis = self.evidence_basis.value

        payout_quanta_6 = self.payout_quanta_6

        pnl_quanta_6 = self.pnl_quanta_6

        fee: None | str
        fee = self.fee

        acquired_at: None | str
        if isinstance(self.acquired_at, datetime.datetime):
            acquired_at = self.acquired_at.isoformat()
        else:
            acquired_at = self.acquired_at

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "type": type_,
                "evidenceBasis": evidence_basis,
                "payoutQuanta6": payout_quanta_6,
                "pnlQuanta6": pnl_quanta_6,
                "fee": fee,
                "acquiredAt": acquired_at,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        type_ = PmPaperV2PositionTerminalType0Type(d.pop("type"))

        evidence_basis = PmPaperV2PositionTerminalType0EvidenceBasis(d.pop("evidenceBasis"))

        payout_quanta_6 = d.pop("payoutQuanta6")

        pnl_quanta_6 = d.pop("pnlQuanta6")

        def _parse_fee(data: object) -> None | str:
            if data is None:
                return data
            return cast(None | str, data)

        fee = _parse_fee(d.pop("fee"))

        def _parse_acquired_at(data: object) -> datetime.datetime | None:
            if data is None:
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                acquired_at_type_0 = datetime.datetime.fromisoformat(data.replace("Z", "+00:00"))

                return acquired_at_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None, data)

        acquired_at = _parse_acquired_at(d.pop("acquiredAt"))

        pm_paper_v2_position_terminal_type_0 = cls(
            type_=type_,
            evidence_basis=evidence_basis,
            payout_quanta_6=payout_quanta_6,
            pnl_quanta_6=pnl_quanta_6,
            fee=fee,
            acquired_at=acquired_at,
        )

        pm_paper_v2_position_terminal_type_0.additional_properties = d
        return pm_paper_v2_position_terminal_type_0

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
