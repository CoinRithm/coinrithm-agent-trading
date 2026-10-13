from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, Literal, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.spot_reference_response_preferred_source_type_1 import SpotReferenceResponsePreferredSourceType1
from ..models.spot_reference_response_preferred_source_type_2_type_1 import (
    SpotReferenceResponsePreferredSourceType2Type1,
)
from ..models.spot_reference_response_preferred_source_type_3_type_1 import (
    SpotReferenceResponsePreferredSourceType3Type1,
)

if TYPE_CHECKING:
    from ..models.spot_reference_fallback import SpotReferenceFallback
    from ..models.spot_reference_response_coin import SpotReferenceResponseCoin
    from ..models.spot_reference_response_verification import SpotReferenceResponseVerification
    from ..models.spot_reference_stream import SpotReferenceStream


T = TypeVar("T", bound="SpotReferenceResponse")


@_attrs_define
class SpotReferenceResponse:
    """
    Attributes:
        version (Literal[1]):
        policy_version (str):
        coin (SpotReferenceResponseCoin):
        evaluated_at (datetime.datetime): Server time at which ages and expiries were checked (after all I/O).
        reference_only (bool):
        preferred_source (None | SpotReferenceResponsePreferredSourceType1 |
            SpotReferenceResponsePreferredSourceType2Type1 | SpotReferenceResponsePreferredSourceType3Type1):
            `binance_stream` when `stream.observation` is present, else
            `rest_consensus` when a stored price exists, else null. A
            preference between two values in different units, not a
            conversion or an executable price.
        stream (SpotReferenceStream):
        fallback (SpotReferenceFallback):
        verification (SpotReferenceResponseVerification):
    """

    version: Literal[1]
    policy_version: str
    coin: SpotReferenceResponseCoin
    evaluated_at: datetime.datetime
    reference_only: bool
    preferred_source: (
        None
        | SpotReferenceResponsePreferredSourceType1
        | SpotReferenceResponsePreferredSourceType2Type1
        | SpotReferenceResponsePreferredSourceType3Type1
    )
    stream: SpotReferenceStream
    fallback: SpotReferenceFallback
    verification: SpotReferenceResponseVerification
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        version = self.version

        policy_version = self.policy_version

        coin = self.coin.to_dict()

        evaluated_at = self.evaluated_at.isoformat()

        reference_only = self.reference_only

        preferred_source: None | str
        if isinstance(self.preferred_source, SpotReferenceResponsePreferredSourceType1):
            preferred_source = self.preferred_source.value
        elif isinstance(self.preferred_source, SpotReferenceResponsePreferredSourceType2Type1):
            preferred_source = self.preferred_source.value
        elif isinstance(self.preferred_source, SpotReferenceResponsePreferredSourceType3Type1):
            preferred_source = self.preferred_source.value
        else:
            preferred_source = self.preferred_source

        stream = self.stream.to_dict()

        fallback = self.fallback.to_dict()

        verification = self.verification.to_dict()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "version": version,
                "policyVersion": policy_version,
                "coin": coin,
                "evaluatedAt": evaluated_at,
                "referenceOnly": reference_only,
                "preferredSource": preferred_source,
                "stream": stream,
                "fallback": fallback,
                "verification": verification,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.spot_reference_fallback import SpotReferenceFallback
        from ..models.spot_reference_response_coin import SpotReferenceResponseCoin
        from ..models.spot_reference_response_verification import SpotReferenceResponseVerification
        from ..models.spot_reference_stream import SpotReferenceStream

        d = dict(src_dict)
        version = cast(Literal[1], d.pop("version"))
        if version != 1:
            raise ValueError(f"version must match const 1, got '{version}'")

        policy_version = d.pop("policyVersion")

        coin = SpotReferenceResponseCoin.from_dict(d.pop("coin"))

        evaluated_at = datetime.datetime.fromisoformat(d.pop("evaluatedAt").replace("Z", "+00:00"))

        reference_only = d.pop("referenceOnly")

        def _parse_preferred_source(
            data: object,
        ) -> (
            None
            | SpotReferenceResponsePreferredSourceType1
            | SpotReferenceResponsePreferredSourceType2Type1
            | SpotReferenceResponsePreferredSourceType3Type1
        ):
            if data is None:
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                preferred_source_type_1 = SpotReferenceResponsePreferredSourceType1(data)

                return preferred_source_type_1
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            try:
                if not isinstance(data, str):
                    raise TypeError()
                preferred_source_type_2_type_1 = SpotReferenceResponsePreferredSourceType2Type1(data)

                return preferred_source_type_2_type_1
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            try:
                if not isinstance(data, str):
                    raise TypeError()
                preferred_source_type_3_type_1 = SpotReferenceResponsePreferredSourceType3Type1(data)

                return preferred_source_type_3_type_1
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(
                None
                | SpotReferenceResponsePreferredSourceType1
                | SpotReferenceResponsePreferredSourceType2Type1
                | SpotReferenceResponsePreferredSourceType3Type1,
                data,
            )

        preferred_source = _parse_preferred_source(d.pop("preferredSource"))

        stream = SpotReferenceStream.from_dict(d.pop("stream"))

        fallback = SpotReferenceFallback.from_dict(d.pop("fallback"))

        verification = SpotReferenceResponseVerification.from_dict(d.pop("verification"))

        spot_reference_response = cls(
            version=version,
            policy_version=policy_version,
            coin=coin,
            evaluated_at=evaluated_at,
            reference_only=reference_only,
            preferred_source=preferred_source,
            stream=stream,
            fallback=fallback,
            verification=verification,
        )

        spot_reference_response.additional_properties = d
        return spot_reference_response

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
