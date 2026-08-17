from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

T = TypeVar("T", bound="AgentTraceMetadata")


@_attrs_define
class AgentTraceMetadata:
    """Optional private trace metadata supplied by a user-run agent. CoinRithm
    stores only this structured summary; do not send chain-of-thought,
    secrets, emails, or private account identity.

        Attributes:
            run_id (None | str | Unset):
            decision_id (None | str | Unset):
            strategy_label (None | str | Unset):
            confidence (float | None | Unset):
            rationale_summary (None | str | Unset):
    """

    run_id: None | str | Unset = UNSET
    decision_id: None | str | Unset = UNSET
    strategy_label: None | str | Unset = UNSET
    confidence: float | None | Unset = UNSET
    rationale_summary: None | str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        run_id: None | str | Unset
        if isinstance(self.run_id, Unset):
            run_id = UNSET
        else:
            run_id = self.run_id

        decision_id: None | str | Unset
        if isinstance(self.decision_id, Unset):
            decision_id = UNSET
        else:
            decision_id = self.decision_id

        strategy_label: None | str | Unset
        if isinstance(self.strategy_label, Unset):
            strategy_label = UNSET
        else:
            strategy_label = self.strategy_label

        confidence: float | None | Unset
        if isinstance(self.confidence, Unset):
            confidence = UNSET
        else:
            confidence = self.confidence

        rationale_summary: None | str | Unset
        if isinstance(self.rationale_summary, Unset):
            rationale_summary = UNSET
        else:
            rationale_summary = self.rationale_summary

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if run_id is not UNSET:
            field_dict["runId"] = run_id
        if decision_id is not UNSET:
            field_dict["decisionId"] = decision_id
        if strategy_label is not UNSET:
            field_dict["strategyLabel"] = strategy_label
        if confidence is not UNSET:
            field_dict["confidence"] = confidence
        if rationale_summary is not UNSET:
            field_dict["rationaleSummary"] = rationale_summary

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)

        def _parse_run_id(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        run_id = _parse_run_id(d.pop("runId", UNSET))

        def _parse_decision_id(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        decision_id = _parse_decision_id(d.pop("decisionId", UNSET))

        def _parse_strategy_label(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        strategy_label = _parse_strategy_label(d.pop("strategyLabel", UNSET))

        def _parse_confidence(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        confidence = _parse_confidence(d.pop("confidence", UNSET))

        def _parse_rationale_summary(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        rationale_summary = _parse_rationale_summary(d.pop("rationaleSummary", UNSET))

        agent_trace_metadata = cls(
            run_id=run_id,
            decision_id=decision_id,
            strategy_label=strategy_label,
            confidence=confidence,
            rationale_summary=rationale_summary,
        )

        agent_trace_metadata.additional_properties = d
        return agent_trace_metadata

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
