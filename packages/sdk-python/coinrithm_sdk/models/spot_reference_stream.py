from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.spot_reference_stream_status import SpotReferenceStreamStatus

if TYPE_CHECKING:
    from ..models.spot_reference_observation import SpotReferenceObservation


T = TypeVar("T", bound="SpotReferenceStream")


@_attrs_define
class SpotReferenceStream:
    """
    Attributes:
        status (SpotReferenceStreamStatus):
        reason (None | str): null when available. Otherwise one code: `inactive_coin`,
            `mapping_unavailable`, `mapping_ambiguous`, `mapping_suppressed`,
            `policy_denied`, `clock_regression`, `disabled`,
            `redis_unavailable`, `missing`, `invalid_snapshot`,
            `disconnected`, `expired_snapshot`, `expired_metadata`,
            `symbol_not_captured`, `identity_mismatch`, `expired_observation`.
            Treat unknown codes as unavailable.
        observation (None | SpotReferenceObservation):
    """

    status: SpotReferenceStreamStatus
    reason: None | str
    observation: None | SpotReferenceObservation
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        from ..models.spot_reference_observation import SpotReferenceObservation

        status = self.status.value

        reason: None | str
        reason = self.reason

        observation: dict[str, Any] | None
        if isinstance(self.observation, SpotReferenceObservation):
            observation = self.observation.to_dict()
        else:
            observation = self.observation

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "status": status,
                "reason": reason,
                "observation": observation,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.spot_reference_observation import SpotReferenceObservation

        d = dict(src_dict)
        status = SpotReferenceStreamStatus(d.pop("status"))

        def _parse_reason(data: object) -> None | str:
            if data is None:
                return data
            return cast(None | str, data)

        reason = _parse_reason(d.pop("reason"))

        def _parse_observation(data: object) -> None | SpotReferenceObservation:
            if data is None:
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                observation_type_0 = SpotReferenceObservation.from_dict(data)

                return observation_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | SpotReferenceObservation, data)

        observation = _parse_observation(d.pop("observation"))

        spot_reference_stream = cls(
            status=status,
            reason=reason,
            observation=observation,
        )

        spot_reference_stream.additional_properties = d
        return spot_reference_stream

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
