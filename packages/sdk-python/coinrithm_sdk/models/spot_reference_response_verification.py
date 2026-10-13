from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

T = TypeVar("T", bound="SpotReferenceResponseVerification")


@_attrs_define
class SpotReferenceResponseVerification:
    """
    Attributes:
        identity_checked_at (datetime.datetime): Database statement time of the coin/mapping/policy read.
        mapping_updated_at (datetime.datetime | None):
        policy_updated_at (datetime.datetime | None):
        policy_mode (None | str): Enabled per-coin source policy mode (`allow` / `deny`), null when none.
    """

    identity_checked_at: datetime.datetime
    mapping_updated_at: datetime.datetime | None
    policy_updated_at: datetime.datetime | None
    policy_mode: None | str
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        identity_checked_at = self.identity_checked_at.isoformat()

        mapping_updated_at: None | str
        if isinstance(self.mapping_updated_at, datetime.datetime):
            mapping_updated_at = self.mapping_updated_at.isoformat()
        else:
            mapping_updated_at = self.mapping_updated_at

        policy_updated_at: None | str
        if isinstance(self.policy_updated_at, datetime.datetime):
            policy_updated_at = self.policy_updated_at.isoformat()
        else:
            policy_updated_at = self.policy_updated_at

        policy_mode: None | str
        policy_mode = self.policy_mode

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "identityCheckedAt": identity_checked_at,
                "mappingUpdatedAt": mapping_updated_at,
                "policyUpdatedAt": policy_updated_at,
                "policyMode": policy_mode,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        identity_checked_at = datetime.datetime.fromisoformat(d.pop("identityCheckedAt").replace("Z", "+00:00"))

        def _parse_mapping_updated_at(data: object) -> datetime.datetime | None:
            if data is None:
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                mapping_updated_at_type_0 = datetime.datetime.fromisoformat(data.replace("Z", "+00:00"))

                return mapping_updated_at_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None, data)

        mapping_updated_at = _parse_mapping_updated_at(d.pop("mappingUpdatedAt"))

        def _parse_policy_updated_at(data: object) -> datetime.datetime | None:
            if data is None:
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                policy_updated_at_type_0 = datetime.datetime.fromisoformat(data.replace("Z", "+00:00"))

                return policy_updated_at_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None, data)

        policy_updated_at = _parse_policy_updated_at(d.pop("policyUpdatedAt"))

        def _parse_policy_mode(data: object) -> None | str:
            if data is None:
                return data
            return cast(None | str, data)

        policy_mode = _parse_policy_mode(d.pop("policyMode"))

        spot_reference_response_verification = cls(
            identity_checked_at=identity_checked_at,
            mapping_updated_at=mapping_updated_at,
            policy_updated_at=policy_updated_at,
            policy_mode=policy_mode,
        )

        spot_reference_response_verification.additional_properties = d
        return spot_reference_response_verification

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
