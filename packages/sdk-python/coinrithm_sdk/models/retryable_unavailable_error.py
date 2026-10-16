from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

T = TypeVar("T", bound="RetryableUnavailableError")


@_attrs_define
class RetryableUnavailableError:
    """Retryable 503 body. `error` is `temporarily_busy` (the route's
    in-flight cap, Retry-After 5) or, on
    `/api/prediction-markets/prices-history`,
    `price_history_unavailable` (the venue failed and nothing is stored,
    Retry-After 10). `retryAfterSeconds` matches the `Retry-After`
    header.

        Attributes:
            error (str):
            message (str):
            retry_after_seconds (int):
    """

    error: str
    message: str
    retry_after_seconds: int
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        error = self.error

        message = self.message

        retry_after_seconds = self.retry_after_seconds

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "error": error,
                "message": message,
                "retryAfterSeconds": retry_after_seconds,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        error = d.pop("error")

        message = d.pop("message")

        retry_after_seconds = d.pop("retryAfterSeconds")

        retryable_unavailable_error = cls(
            error=error,
            message=message,
            retry_after_seconds=retry_after_seconds,
        )

        retryable_unavailable_error.additional_properties = d
        return retryable_unavailable_error

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
