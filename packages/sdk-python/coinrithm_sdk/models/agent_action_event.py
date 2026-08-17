from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.agent_action_event_request_summary_type_0 import AgentActionEventRequestSummaryType0
    from ..models.agent_action_event_response_summary_type_0 import AgentActionEventResponseSummaryType0


T = TypeVar("T", bound="AgentActionEvent")


@_attrs_define
class AgentActionEvent:
    """Private sanitized ledger row for the calling API key.

    Attributes:
        id (int | Unset):
        method (str | Unset):
        endpoint (str | Unset):
        venue (None | str | Unset):
        event_type (str | Unset):
        status_code (int | None | Unset):
        ledger_status (str | Unset):
        latency_ms (int | None | Unset):
        idempotency_key (None | str | Unset):
        related_entity_type (None | str | Unset):
        related_entity_id (None | str | Unset):
        request_summary (AgentActionEventRequestSummaryType0 | None | Unset):
        response_summary (AgentActionEventResponseSummaryType0 | bool | float | list[Any] | None | str | Unset):
        block_reasons (list[str] | Unset):
        run_id (None | str | Unset):
        decision_id (None | str | Unset):
        strategy_label (None | str | Unset):
        confidence (float | None | Unset):
        rationale_summary (None | str | Unset): Private caller-supplied summary; never exposed publicly.
        started_at (datetime.datetime | Unset):
        completed_at (datetime.datetime | None | Unset):
    """

    id: int | Unset = UNSET
    method: str | Unset = UNSET
    endpoint: str | Unset = UNSET
    venue: None | str | Unset = UNSET
    event_type: str | Unset = UNSET
    status_code: int | None | Unset = UNSET
    ledger_status: str | Unset = UNSET
    latency_ms: int | None | Unset = UNSET
    idempotency_key: None | str | Unset = UNSET
    related_entity_type: None | str | Unset = UNSET
    related_entity_id: None | str | Unset = UNSET
    request_summary: AgentActionEventRequestSummaryType0 | None | Unset = UNSET
    response_summary: AgentActionEventResponseSummaryType0 | bool | float | list[Any] | None | str | Unset = UNSET
    block_reasons: list[str] | Unset = UNSET
    run_id: None | str | Unset = UNSET
    decision_id: None | str | Unset = UNSET
    strategy_label: None | str | Unset = UNSET
    confidence: float | None | Unset = UNSET
    rationale_summary: None | str | Unset = UNSET
    started_at: datetime.datetime | Unset = UNSET
    completed_at: datetime.datetime | None | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        from ..models.agent_action_event_request_summary_type_0 import AgentActionEventRequestSummaryType0
        from ..models.agent_action_event_response_summary_type_0 import AgentActionEventResponseSummaryType0

        id = self.id

        method = self.method

        endpoint = self.endpoint

        venue: None | str | Unset
        if isinstance(self.venue, Unset):
            venue = UNSET
        else:
            venue = self.venue

        event_type = self.event_type

        status_code: int | None | Unset
        if isinstance(self.status_code, Unset):
            status_code = UNSET
        else:
            status_code = self.status_code

        ledger_status = self.ledger_status

        latency_ms: int | None | Unset
        if isinstance(self.latency_ms, Unset):
            latency_ms = UNSET
        else:
            latency_ms = self.latency_ms

        idempotency_key: None | str | Unset
        if isinstance(self.idempotency_key, Unset):
            idempotency_key = UNSET
        else:
            idempotency_key = self.idempotency_key

        related_entity_type: None | str | Unset
        if isinstance(self.related_entity_type, Unset):
            related_entity_type = UNSET
        else:
            related_entity_type = self.related_entity_type

        related_entity_id: None | str | Unset
        if isinstance(self.related_entity_id, Unset):
            related_entity_id = UNSET
        else:
            related_entity_id = self.related_entity_id

        request_summary: dict[str, Any] | None | Unset
        if isinstance(self.request_summary, Unset):
            request_summary = UNSET
        elif isinstance(self.request_summary, AgentActionEventRequestSummaryType0):
            request_summary = self.request_summary.to_dict()
        else:
            request_summary = self.request_summary

        response_summary: bool | dict[str, Any] | float | list[Any] | None | str | Unset
        if isinstance(self.response_summary, Unset):
            response_summary = UNSET
        elif isinstance(self.response_summary, AgentActionEventResponseSummaryType0):
            response_summary = self.response_summary.to_dict()
        elif isinstance(self.response_summary, list):
            response_summary = self.response_summary

        else:
            response_summary = self.response_summary

        block_reasons: list[str] | Unset = UNSET
        if not isinstance(self.block_reasons, Unset):
            block_reasons = self.block_reasons

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

        started_at: str | Unset = UNSET
        if not isinstance(self.started_at, Unset):
            started_at = self.started_at.isoformat()

        completed_at: None | str | Unset
        if isinstance(self.completed_at, Unset):
            completed_at = UNSET
        elif isinstance(self.completed_at, datetime.datetime):
            completed_at = self.completed_at.isoformat()
        else:
            completed_at = self.completed_at

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if id is not UNSET:
            field_dict["id"] = id
        if method is not UNSET:
            field_dict["method"] = method
        if endpoint is not UNSET:
            field_dict["endpoint"] = endpoint
        if venue is not UNSET:
            field_dict["venue"] = venue
        if event_type is not UNSET:
            field_dict["eventType"] = event_type
        if status_code is not UNSET:
            field_dict["statusCode"] = status_code
        if ledger_status is not UNSET:
            field_dict["ledgerStatus"] = ledger_status
        if latency_ms is not UNSET:
            field_dict["latencyMs"] = latency_ms
        if idempotency_key is not UNSET:
            field_dict["idempotencyKey"] = idempotency_key
        if related_entity_type is not UNSET:
            field_dict["relatedEntityType"] = related_entity_type
        if related_entity_id is not UNSET:
            field_dict["relatedEntityId"] = related_entity_id
        if request_summary is not UNSET:
            field_dict["requestSummary"] = request_summary
        if response_summary is not UNSET:
            field_dict["responseSummary"] = response_summary
        if block_reasons is not UNSET:
            field_dict["blockReasons"] = block_reasons
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
        if started_at is not UNSET:
            field_dict["startedAt"] = started_at
        if completed_at is not UNSET:
            field_dict["completedAt"] = completed_at

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.agent_action_event_request_summary_type_0 import AgentActionEventRequestSummaryType0
        from ..models.agent_action_event_response_summary_type_0 import AgentActionEventResponseSummaryType0

        d = dict(src_dict)
        id = d.pop("id", UNSET)

        method = d.pop("method", UNSET)

        endpoint = d.pop("endpoint", UNSET)

        def _parse_venue(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        venue = _parse_venue(d.pop("venue", UNSET))

        event_type = d.pop("eventType", UNSET)

        def _parse_status_code(data: object) -> int | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(int | None | Unset, data)

        status_code = _parse_status_code(d.pop("statusCode", UNSET))

        ledger_status = d.pop("ledgerStatus", UNSET)

        def _parse_latency_ms(data: object) -> int | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(int | None | Unset, data)

        latency_ms = _parse_latency_ms(d.pop("latencyMs", UNSET))

        def _parse_idempotency_key(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        idempotency_key = _parse_idempotency_key(d.pop("idempotencyKey", UNSET))

        def _parse_related_entity_type(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        related_entity_type = _parse_related_entity_type(d.pop("relatedEntityType", UNSET))

        def _parse_related_entity_id(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        related_entity_id = _parse_related_entity_id(d.pop("relatedEntityId", UNSET))

        def _parse_request_summary(data: object) -> AgentActionEventRequestSummaryType0 | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                request_summary_type_0 = AgentActionEventRequestSummaryType0.from_dict(data)

                return request_summary_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(AgentActionEventRequestSummaryType0 | None | Unset, data)

        request_summary = _parse_request_summary(d.pop("requestSummary", UNSET))

        def _parse_response_summary(
            data: object,
        ) -> AgentActionEventResponseSummaryType0 | bool | float | list[Any] | None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                response_summary_type_0 = AgentActionEventResponseSummaryType0.from_dict(data)

                return response_summary_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            try:
                if not isinstance(data, list):
                    raise TypeError()
                response_summary_type_1 = cast(list[Any], data)

                return response_summary_type_1
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(AgentActionEventResponseSummaryType0 | bool | float | list[Any] | None | str | Unset, data)

        response_summary = _parse_response_summary(d.pop("responseSummary", UNSET))

        block_reasons = cast(list[str], d.pop("blockReasons", UNSET))

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

        _started_at = d.pop("startedAt", UNSET)
        started_at: datetime.datetime | Unset
        if isinstance(_started_at, Unset):
            started_at = UNSET
        else:
            started_at = datetime.datetime.fromisoformat(_started_at)

        def _parse_completed_at(data: object) -> datetime.datetime | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                completed_at_type_0 = datetime.datetime.fromisoformat(data)

                return completed_at_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None | Unset, data)

        completed_at = _parse_completed_at(d.pop("completedAt", UNSET))

        agent_action_event = cls(
            id=id,
            method=method,
            endpoint=endpoint,
            venue=venue,
            event_type=event_type,
            status_code=status_code,
            ledger_status=ledger_status,
            latency_ms=latency_ms,
            idempotency_key=idempotency_key,
            related_entity_type=related_entity_type,
            related_entity_id=related_entity_id,
            request_summary=request_summary,
            response_summary=response_summary,
            block_reasons=block_reasons,
            run_id=run_id,
            decision_id=decision_id,
            strategy_label=strategy_label,
            confidence=confidence,
            rationale_summary=rationale_summary,
            started_at=started_at,
            completed_at=completed_at,
        )

        agent_action_event.additional_properties = d
        return agent_action_event

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
