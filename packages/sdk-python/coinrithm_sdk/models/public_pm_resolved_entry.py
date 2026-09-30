from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.public_pm_event import PublicPmEvent
    from ..models.public_pm_resolution_outcome import PublicPmResolutionOutcome


T = TypeVar("T", bound="PublicPmResolvedEntry")


@_attrs_define
class PublicPmResolvedEntry:
    """
    Attributes:
        event (PublicPmEvent):
        resolved_at_verified (bool):
        resolution_outcome (PublicPmResolutionOutcome): The winning outcome as recorded at resolution.
        resolved_at (datetime.datetime | None | Unset): Provider-verified resolution time. Null when not provider-
            verified; see resolvedAtVerified.
        closed_at (datetime.datetime | None | Unset): A real observed close time (never a fabricated future date), used
            when resolvedAt is not provider-verified.
    """

    event: PublicPmEvent
    resolved_at_verified: bool
    resolution_outcome: PublicPmResolutionOutcome
    resolved_at: datetime.datetime | None | Unset = UNSET
    closed_at: datetime.datetime | None | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        event = self.event.to_dict()

        resolved_at_verified = self.resolved_at_verified

        resolution_outcome = self.resolution_outcome.to_dict()

        resolved_at: None | str | Unset
        if isinstance(self.resolved_at, Unset):
            resolved_at = UNSET
        elif isinstance(self.resolved_at, datetime.datetime):
            resolved_at = self.resolved_at.isoformat()
        else:
            resolved_at = self.resolved_at

        closed_at: None | str | Unset
        if isinstance(self.closed_at, Unset):
            closed_at = UNSET
        elif isinstance(self.closed_at, datetime.datetime):
            closed_at = self.closed_at.isoformat()
        else:
            closed_at = self.closed_at

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "event": event,
                "resolvedAtVerified": resolved_at_verified,
                "resolutionOutcome": resolution_outcome,
            }
        )
        if resolved_at is not UNSET:
            field_dict["resolvedAt"] = resolved_at
        if closed_at is not UNSET:
            field_dict["closedAt"] = closed_at

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.public_pm_event import PublicPmEvent
        from ..models.public_pm_resolution_outcome import PublicPmResolutionOutcome

        d = dict(src_dict)
        event = PublicPmEvent.from_dict(d.pop("event"))

        resolved_at_verified = d.pop("resolvedAtVerified")

        resolution_outcome = PublicPmResolutionOutcome.from_dict(d.pop("resolutionOutcome"))

        def _parse_resolved_at(data: object) -> datetime.datetime | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                resolved_at_type_0 = datetime.datetime.fromisoformat(data.replace("Z", "+00:00"))

                return resolved_at_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None | Unset, data)

        resolved_at = _parse_resolved_at(d.pop("resolvedAt", UNSET))

        def _parse_closed_at(data: object) -> datetime.datetime | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                closed_at_type_0 = datetime.datetime.fromisoformat(data.replace("Z", "+00:00"))

                return closed_at_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None | Unset, data)

        closed_at = _parse_closed_at(d.pop("closedAt", UNSET))

        public_pm_resolved_entry = cls(
            event=event,
            resolved_at_verified=resolved_at_verified,
            resolution_outcome=resolution_outcome,
            resolved_at=resolved_at,
            closed_at=closed_at,
        )

        public_pm_resolved_entry.additional_properties = d
        return public_pm_resolved_entry

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
