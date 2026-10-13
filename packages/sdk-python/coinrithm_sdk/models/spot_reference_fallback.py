from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, Literal, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.spot_reference_fallback_status import SpotReferenceFallbackStatus

if TYPE_CHECKING:
    from ..models.spot_price_timing import SpotPriceTiming


T = TypeVar("T", bound="SpotReferenceFallback")


@_attrs_define
class SpotReferenceFallback:
    """
    Attributes:
        basis (Literal['stored_rest_consensus']):
        currency (Literal['USD']):
        status (SpotReferenceFallbackStatus): fresh = stored row written at most 120 s before evaluatedAt; unavailable =
            no positive stored price.
        price_usd (float | None):
        price_timing (SpotPriceTiming): Source-vs-row timing of the spot price (optional: absent on older API
            versions). Informational only: `freshness`, `eligible` and the write
            path's mark guard still measure the row WRITE time and are unchanged.
            `sourceObservedAt` is a venue snapshot/ticker time, NOT a last-trade
            time and NOT a per-fill receipt.
        expires_at (datetime.datetime | None): Row write time + 120 s; null when there is no row.
    """

    basis: Literal["stored_rest_consensus"]
    currency: Literal["USD"]
    status: SpotReferenceFallbackStatus
    price_usd: float | None
    price_timing: SpotPriceTiming
    expires_at: datetime.datetime | None
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        basis = self.basis

        currency = self.currency

        status = self.status.value

        price_usd: float | None
        price_usd = self.price_usd

        price_timing = self.price_timing.to_dict()

        expires_at: None | str
        if isinstance(self.expires_at, datetime.datetime):
            expires_at = self.expires_at.isoformat()
        else:
            expires_at = self.expires_at

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "basis": basis,
                "currency": currency,
                "status": status,
                "priceUsd": price_usd,
                "priceTiming": price_timing,
                "expiresAt": expires_at,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.spot_price_timing import SpotPriceTiming

        d = dict(src_dict)
        basis = cast(Literal["stored_rest_consensus"], d.pop("basis"))
        if basis != "stored_rest_consensus":
            raise ValueError(f"basis must match const 'stored_rest_consensus', got '{basis}'")

        currency = cast(Literal["USD"], d.pop("currency"))
        if currency != "USD":
            raise ValueError(f"currency must match const 'USD', got '{currency}'")

        status = SpotReferenceFallbackStatus(d.pop("status"))

        def _parse_price_usd(data: object) -> float | None:
            if data is None:
                return data
            return cast(float | None, data)

        price_usd = _parse_price_usd(d.pop("priceUsd"))

        price_timing = SpotPriceTiming.from_dict(d.pop("priceTiming"))

        def _parse_expires_at(data: object) -> datetime.datetime | None:
            if data is None:
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                expires_at_type_0 = datetime.datetime.fromisoformat(data.replace("Z", "+00:00"))

                return expires_at_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None, data)

        expires_at = _parse_expires_at(d.pop("expiresAt"))

        spot_reference_fallback = cls(
            basis=basis,
            currency=currency,
            status=status,
            price_usd=price_usd,
            price_timing=price_timing,
            expires_at=expires_at,
        )

        spot_reference_fallback.additional_properties = d
        return spot_reference_fallback

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
