from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define

T = TypeVar("T", bound="PublicPmOrderBookAskEvidence")


@_attrs_define
class PublicPmOrderBookAskEvidence:
    """Present only for Polymarket books; Kalshi books omit it.

    Attributes:
        validated (bool): Whether the supplied ask snapshot parsed as a valid non-empty book.
        received_at (datetime.datetime): This server's acquisition time, not an upstream trade time.
    """

    validated: bool
    received_at: datetime.datetime

    def to_dict(self) -> dict[str, Any]:
        validated = self.validated

        received_at = self.received_at.isoformat()

        field_dict: dict[str, Any] = {}

        field_dict.update(
            {
                "validated": validated,
                "receivedAt": received_at,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        validated = d.pop("validated")

        received_at = datetime.datetime.fromisoformat(d.pop("receivedAt").replace("Z", "+00:00"))

        public_pm_order_book_ask_evidence = cls(
            validated=validated,
            received_at=received_at,
        )

        return public_pm_order_book_ask_evidence
