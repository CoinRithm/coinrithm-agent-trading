from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.scorecard_returns_basis import ScorecardReturnsBasis
from ..models.scorecard_schema import ScorecardSchema
from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.scorecard_metrics import ScorecardMetrics


T = TypeVar("T", bound="Scorecard")


@_attrs_define
class Scorecard:
    """Deterministic `coinrithm.agent.scorecard.v1` over an agent's realized
    track record. The same inputs always yield the same metrics AND the same
    `contentHash` (sha256 of the canonicalized metrics) — a scorecard whose
    hash does not reproduce is not trusted. Every metric is `null` when there
    is too little data (a thin record reports n/a, never a fabricated number).

        Attributes:
            schema (ScorecardSchema | Unset):
            sample_size (int | Unset): Number of realized trades feeding the trade-level metrics.
            returns_basis (ScorecardReturnsBasis | Unset): Whether ratio metrics used per-trade % returns or realized PnL.
            metrics (ScorecardMetrics | Unset): Named metric map; any value is `null` when undefined for this record.
                `brier_score` and `calibration_error` measure MARKET-ENTRY calibration
                (see the response `calibrationBasis`), NOT agent forecast skill.
            content_hash (str | Unset): SHA-256 (hex) of the canonicalized metrics — reproducible fingerprint.
    """

    schema: ScorecardSchema | Unset = UNSET
    sample_size: int | Unset = UNSET
    returns_basis: ScorecardReturnsBasis | Unset = UNSET
    metrics: ScorecardMetrics | Unset = UNSET
    content_hash: str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        schema: str | Unset = UNSET
        if not isinstance(self.schema, Unset):
            schema = self.schema.value

        sample_size = self.sample_size

        returns_basis: str | Unset = UNSET
        if not isinstance(self.returns_basis, Unset):
            returns_basis = self.returns_basis.value

        metrics: dict[str, Any] | Unset = UNSET
        if not isinstance(self.metrics, Unset):
            metrics = self.metrics.to_dict()

        content_hash = self.content_hash

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if schema is not UNSET:
            field_dict["schema"] = schema
        if sample_size is not UNSET:
            field_dict["sampleSize"] = sample_size
        if returns_basis is not UNSET:
            field_dict["returnsBasis"] = returns_basis
        if metrics is not UNSET:
            field_dict["metrics"] = metrics
        if content_hash is not UNSET:
            field_dict["contentHash"] = content_hash

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.scorecard_metrics import ScorecardMetrics

        d = dict(src_dict)
        _schema = d.pop("schema", UNSET)
        schema: ScorecardSchema | Unset
        if isinstance(_schema, Unset):
            schema = UNSET
        else:
            schema = ScorecardSchema(_schema)

        sample_size = d.pop("sampleSize", UNSET)

        _returns_basis = d.pop("returnsBasis", UNSET)
        returns_basis: ScorecardReturnsBasis | Unset
        if isinstance(_returns_basis, Unset):
            returns_basis = UNSET
        else:
            returns_basis = ScorecardReturnsBasis(_returns_basis)

        _metrics = d.pop("metrics", UNSET)
        metrics: ScorecardMetrics | Unset
        if isinstance(_metrics, Unset):
            metrics = UNSET
        else:
            metrics = ScorecardMetrics.from_dict(_metrics)

        content_hash = d.pop("contentHash", UNSET)

        scorecard = cls(
            schema=schema,
            sample_size=sample_size,
            returns_basis=returns_basis,
            metrics=metrics,
            content_hash=content_hash,
        )

        scorecard.additional_properties = d
        return scorecard

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
