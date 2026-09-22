from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..models.public_pm_outcome_lifecycle_type_0_basis import PublicPmOutcomeLifecycleType0Basis
from ..models.public_pm_outcome_lifecycle_type_0_result_type_1 import PublicPmOutcomeLifecycleType0ResultType1
from ..models.public_pm_outcome_lifecycle_type_0_result_type_2_type_1 import (
    PublicPmOutcomeLifecycleType0ResultType2Type1,
)
from ..models.public_pm_outcome_lifecycle_type_0_result_type_3_type_1 import (
    PublicPmOutcomeLifecycleType0ResultType3Type1,
)
from ..models.public_pm_outcome_lifecycle_type_0_state import PublicPmOutcomeLifecycleType0State
from ..types import UNSET, Unset

T = TypeVar("T", bound="PublicPmOutcomeLifecycleType0")


@_attrs_define
class PublicPmOutcomeLifecycleType0:
    """Per-outcome provider lifecycle evidence. Terminal states are results, not live quotes; an open state with
    providerAcceptingOrders=false is a paused quote.

        Attributes:
            state (PublicPmOutcomeLifecycleType0State | Unset):
            provider_accepting_orders (bool | None | Unset):
            entry_blocked_by_lifecycle (bool | Unset):
            is_result (bool | Unset):
            result (None | PublicPmOutcomeLifecycleType0ResultType1 | PublicPmOutcomeLifecycleType0ResultType2Type1 |
                PublicPmOutcomeLifecycleType0ResultType3Type1 | Unset):
            basis (PublicPmOutcomeLifecycleType0Basis | Unset):
            closed_at (datetime.datetime | None | Unset):
            resolved_at (datetime.datetime | None | Unset):
            observed_at (datetime.datetime | None | Unset):
    """

    state: PublicPmOutcomeLifecycleType0State | Unset = UNSET
    provider_accepting_orders: bool | None | Unset = UNSET
    entry_blocked_by_lifecycle: bool | Unset = UNSET
    is_result: bool | Unset = UNSET
    result: (
        None
        | PublicPmOutcomeLifecycleType0ResultType1
        | PublicPmOutcomeLifecycleType0ResultType2Type1
        | PublicPmOutcomeLifecycleType0ResultType3Type1
        | Unset
    ) = UNSET
    basis: PublicPmOutcomeLifecycleType0Basis | Unset = UNSET
    closed_at: datetime.datetime | None | Unset = UNSET
    resolved_at: datetime.datetime | None | Unset = UNSET
    observed_at: datetime.datetime | None | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        state: str | Unset = UNSET
        if not isinstance(self.state, Unset):
            state = self.state.value

        provider_accepting_orders: bool | None | Unset
        if isinstance(self.provider_accepting_orders, Unset):
            provider_accepting_orders = UNSET
        else:
            provider_accepting_orders = self.provider_accepting_orders

        entry_blocked_by_lifecycle = self.entry_blocked_by_lifecycle

        is_result = self.is_result

        result: None | str | Unset
        if isinstance(self.result, Unset):
            result = UNSET
        elif isinstance(self.result, PublicPmOutcomeLifecycleType0ResultType1):
            result = self.result.value
        elif isinstance(self.result, PublicPmOutcomeLifecycleType0ResultType2Type1):
            result = self.result.value
        elif isinstance(self.result, PublicPmOutcomeLifecycleType0ResultType3Type1):
            result = self.result.value
        else:
            result = self.result

        basis: str | Unset = UNSET
        if not isinstance(self.basis, Unset):
            basis = self.basis.value

        closed_at: None | str | Unset
        if isinstance(self.closed_at, Unset):
            closed_at = UNSET
        elif isinstance(self.closed_at, datetime.datetime):
            closed_at = self.closed_at.isoformat()
        else:
            closed_at = self.closed_at

        resolved_at: None | str | Unset
        if isinstance(self.resolved_at, Unset):
            resolved_at = UNSET
        elif isinstance(self.resolved_at, datetime.datetime):
            resolved_at = self.resolved_at.isoformat()
        else:
            resolved_at = self.resolved_at

        observed_at: None | str | Unset
        if isinstance(self.observed_at, Unset):
            observed_at = UNSET
        elif isinstance(self.observed_at, datetime.datetime):
            observed_at = self.observed_at.isoformat()
        else:
            observed_at = self.observed_at

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if state is not UNSET:
            field_dict["state"] = state
        if provider_accepting_orders is not UNSET:
            field_dict["providerAcceptingOrders"] = provider_accepting_orders
        if entry_blocked_by_lifecycle is not UNSET:
            field_dict["entryBlockedByLifecycle"] = entry_blocked_by_lifecycle
        if is_result is not UNSET:
            field_dict["isResult"] = is_result
        if result is not UNSET:
            field_dict["result"] = result
        if basis is not UNSET:
            field_dict["basis"] = basis
        if closed_at is not UNSET:
            field_dict["closedAt"] = closed_at
        if resolved_at is not UNSET:
            field_dict["resolvedAt"] = resolved_at
        if observed_at is not UNSET:
            field_dict["observedAt"] = observed_at

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        _state = d.pop("state", UNSET)
        state: PublicPmOutcomeLifecycleType0State | Unset
        if isinstance(_state, Unset):
            state = UNSET
        else:
            state = PublicPmOutcomeLifecycleType0State(_state)

        def _parse_provider_accepting_orders(data: object) -> bool | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(bool | None | Unset, data)

        provider_accepting_orders = _parse_provider_accepting_orders(d.pop("providerAcceptingOrders", UNSET))

        entry_blocked_by_lifecycle = d.pop("entryBlockedByLifecycle", UNSET)

        is_result = d.pop("isResult", UNSET)

        def _parse_result(
            data: object,
        ) -> (
            None
            | PublicPmOutcomeLifecycleType0ResultType1
            | PublicPmOutcomeLifecycleType0ResultType2Type1
            | PublicPmOutcomeLifecycleType0ResultType3Type1
            | Unset
        ):
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                result_type_1 = PublicPmOutcomeLifecycleType0ResultType1(data)

                return result_type_1
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            try:
                if not isinstance(data, str):
                    raise TypeError()
                result_type_2_type_1 = PublicPmOutcomeLifecycleType0ResultType2Type1(data)

                return result_type_2_type_1
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            try:
                if not isinstance(data, str):
                    raise TypeError()
                result_type_3_type_1 = PublicPmOutcomeLifecycleType0ResultType3Type1(data)

                return result_type_3_type_1
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(
                None
                | PublicPmOutcomeLifecycleType0ResultType1
                | PublicPmOutcomeLifecycleType0ResultType2Type1
                | PublicPmOutcomeLifecycleType0ResultType3Type1
                | Unset,
                data,
            )

        result = _parse_result(d.pop("result", UNSET))

        _basis = d.pop("basis", UNSET)
        basis: PublicPmOutcomeLifecycleType0Basis | Unset
        if isinstance(_basis, Unset):
            basis = UNSET
        else:
            basis = PublicPmOutcomeLifecycleType0Basis(_basis)

        def _parse_closed_at(data: object) -> datetime.datetime | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                closed_at_type_0 = datetime.datetime.fromisoformat(data)

                return closed_at_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None | Unset, data)

        closed_at = _parse_closed_at(d.pop("closedAt", UNSET))

        def _parse_resolved_at(data: object) -> datetime.datetime | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                resolved_at_type_0 = datetime.datetime.fromisoformat(data)

                return resolved_at_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None | Unset, data)

        resolved_at = _parse_resolved_at(d.pop("resolvedAt", UNSET))

        def _parse_observed_at(data: object) -> datetime.datetime | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                observed_at_type_0 = datetime.datetime.fromisoformat(data)

                return observed_at_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None | Unset, data)

        observed_at = _parse_observed_at(d.pop("observedAt", UNSET))

        public_pm_outcome_lifecycle_type_0 = cls(
            state=state,
            provider_accepting_orders=provider_accepting_orders,
            entry_blocked_by_lifecycle=entry_blocked_by_lifecycle,
            is_result=is_result,
            result=result,
            basis=basis,
            closed_at=closed_at,
            resolved_at=resolved_at,
            observed_at=observed_at,
        )

        public_pm_outcome_lifecycle_type_0.additional_properties = d
        return public_pm_outcome_lifecycle_type_0

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
