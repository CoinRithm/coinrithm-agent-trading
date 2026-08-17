from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

T = TypeVar("T", bound="AgentAuditStats")


@_attrs_define
class AgentAuditStats:
    """
    Attributes:
        ledger_event_count (int | Unset):
        quote_count (int | Unset):
        write_count (int | Unset):
        rejection_count (int | Unset):
        idempotent_replay_count (int | Unset):
        run_id_event_count (int | Unset): Ledger rows with agentTrace.runId / equivalent header.
        decision_id_event_count (int | Unset): Ledger rows with agentTrace.decisionId / equivalent header.
        missing_run_id_count (int | Unset): Ledger rows missing runId trace metadata.
        missing_decision_id_count (int | Unset): Ledger rows missing decisionId trace metadata.
        run_trace_coverage (float | None | Unset): runIdEventCount / ledgerEventCount as a 0..1 fraction.
        decision_trace_coverage (float | None | Unset): decisionIdEventCount / ledgerEventCount as a 0..1 fraction.
        quote_before_trade_rate (float | None | Unset): Approximate aggregate quote/write coverage from the ledger.
    """

    ledger_event_count: int | Unset = UNSET
    quote_count: int | Unset = UNSET
    write_count: int | Unset = UNSET
    rejection_count: int | Unset = UNSET
    idempotent_replay_count: int | Unset = UNSET
    run_id_event_count: int | Unset = UNSET
    decision_id_event_count: int | Unset = UNSET
    missing_run_id_count: int | Unset = UNSET
    missing_decision_id_count: int | Unset = UNSET
    run_trace_coverage: float | None | Unset = UNSET
    decision_trace_coverage: float | None | Unset = UNSET
    quote_before_trade_rate: float | None | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        ledger_event_count = self.ledger_event_count

        quote_count = self.quote_count

        write_count = self.write_count

        rejection_count = self.rejection_count

        idempotent_replay_count = self.idempotent_replay_count

        run_id_event_count = self.run_id_event_count

        decision_id_event_count = self.decision_id_event_count

        missing_run_id_count = self.missing_run_id_count

        missing_decision_id_count = self.missing_decision_id_count

        run_trace_coverage: float | None | Unset
        if isinstance(self.run_trace_coverage, Unset):
            run_trace_coverage = UNSET
        else:
            run_trace_coverage = self.run_trace_coverage

        decision_trace_coverage: float | None | Unset
        if isinstance(self.decision_trace_coverage, Unset):
            decision_trace_coverage = UNSET
        else:
            decision_trace_coverage = self.decision_trace_coverage

        quote_before_trade_rate: float | None | Unset
        if isinstance(self.quote_before_trade_rate, Unset):
            quote_before_trade_rate = UNSET
        else:
            quote_before_trade_rate = self.quote_before_trade_rate

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if ledger_event_count is not UNSET:
            field_dict["ledgerEventCount"] = ledger_event_count
        if quote_count is not UNSET:
            field_dict["quoteCount"] = quote_count
        if write_count is not UNSET:
            field_dict["writeCount"] = write_count
        if rejection_count is not UNSET:
            field_dict["rejectionCount"] = rejection_count
        if idempotent_replay_count is not UNSET:
            field_dict["idempotentReplayCount"] = idempotent_replay_count
        if run_id_event_count is not UNSET:
            field_dict["runIdEventCount"] = run_id_event_count
        if decision_id_event_count is not UNSET:
            field_dict["decisionIdEventCount"] = decision_id_event_count
        if missing_run_id_count is not UNSET:
            field_dict["missingRunIdCount"] = missing_run_id_count
        if missing_decision_id_count is not UNSET:
            field_dict["missingDecisionIdCount"] = missing_decision_id_count
        if run_trace_coverage is not UNSET:
            field_dict["runTraceCoverage"] = run_trace_coverage
        if decision_trace_coverage is not UNSET:
            field_dict["decisionTraceCoverage"] = decision_trace_coverage
        if quote_before_trade_rate is not UNSET:
            field_dict["quoteBeforeTradeRate"] = quote_before_trade_rate

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        ledger_event_count = d.pop("ledgerEventCount", UNSET)

        quote_count = d.pop("quoteCount", UNSET)

        write_count = d.pop("writeCount", UNSET)

        rejection_count = d.pop("rejectionCount", UNSET)

        idempotent_replay_count = d.pop("idempotentReplayCount", UNSET)

        run_id_event_count = d.pop("runIdEventCount", UNSET)

        decision_id_event_count = d.pop("decisionIdEventCount", UNSET)

        missing_run_id_count = d.pop("missingRunIdCount", UNSET)

        missing_decision_id_count = d.pop("missingDecisionIdCount", UNSET)

        def _parse_run_trace_coverage(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        run_trace_coverage = _parse_run_trace_coverage(d.pop("runTraceCoverage", UNSET))

        def _parse_decision_trace_coverage(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        decision_trace_coverage = _parse_decision_trace_coverage(d.pop("decisionTraceCoverage", UNSET))

        def _parse_quote_before_trade_rate(data: object) -> float | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(float | None | Unset, data)

        quote_before_trade_rate = _parse_quote_before_trade_rate(d.pop("quoteBeforeTradeRate", UNSET))

        agent_audit_stats = cls(
            ledger_event_count=ledger_event_count,
            quote_count=quote_count,
            write_count=write_count,
            rejection_count=rejection_count,
            idempotent_replay_count=idempotent_replay_count,
            run_id_event_count=run_id_event_count,
            decision_id_event_count=decision_id_event_count,
            missing_run_id_count=missing_run_id_count,
            missing_decision_id_count=missing_decision_id_count,
            run_trace_coverage=run_trace_coverage,
            decision_trace_coverage=decision_trace_coverage,
            quote_before_trade_rate=quote_before_trade_rate,
        )

        agent_audit_stats.additional_properties = d
        return agent_audit_stats

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
