from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

T = TypeVar("T", bound="WhoamiResponse200Usage")


@_attrs_define
class WhoamiResponse200Usage:
    """Current-month request count for this key. Measurement only; no quota is enforced from it.

    Attributes:
        period (str): UTC month, `YYYY-MM`.
        requests (int | None): Requests counted this period; null when metering is unavailable (unknown, not zero).
    """

    period: str
    requests: int | None
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        period = self.period

        requests: int | None
        requests = self.requests

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "period": period,
                "requests": requests,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        period = d.pop("period")

        def _parse_requests(data: object) -> int | None:
            if data is None:
                return data
            return cast(int | None, data)

        requests = _parse_requests(d.pop("requests"))

        whoami_response_200_usage = cls(
            period=period,
            requests=requests,
        )

        whoami_response_200_usage.additional_properties = d
        return whoami_response_200_usage

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
