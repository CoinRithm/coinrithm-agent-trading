from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.agent_execution_assumptions_cost_model import AgentExecutionAssumptionsCostModel
    from ..models.agent_execution_assumptions_execution_timing import AgentExecutionAssumptionsExecutionTiming


T = TypeVar("T", bound="AgentExecutionAssumptions")


@_attrs_define
class AgentExecutionAssumptions:
    """Versioned paper-execution assumptions attached to private run exports.
    This is methodology metadata, not a fee/slippage charge schedule.

        Attributes:
            schema (str | Unset):
            account_model (str | Unset):
            data_freshness (str | Unset):
            cost_model (AgentExecutionAssumptionsCostModel | Unset):
            execution_timing (AgentExecutionAssumptionsExecutionTiming | Unset):
            reproducibility_caveat (str | Unset):
    """

    schema: str | Unset = UNSET
    account_model: str | Unset = UNSET
    data_freshness: str | Unset = UNSET
    cost_model: AgentExecutionAssumptionsCostModel | Unset = UNSET
    execution_timing: AgentExecutionAssumptionsExecutionTiming | Unset = UNSET
    reproducibility_caveat: str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        schema = self.schema

        account_model = self.account_model

        data_freshness = self.data_freshness

        cost_model: dict[str, Any] | Unset = UNSET
        if not isinstance(self.cost_model, Unset):
            cost_model = self.cost_model.to_dict()

        execution_timing: dict[str, Any] | Unset = UNSET
        if not isinstance(self.execution_timing, Unset):
            execution_timing = self.execution_timing.to_dict()

        reproducibility_caveat = self.reproducibility_caveat

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if schema is not UNSET:
            field_dict["schema"] = schema
        if account_model is not UNSET:
            field_dict["accountModel"] = account_model
        if data_freshness is not UNSET:
            field_dict["dataFreshness"] = data_freshness
        if cost_model is not UNSET:
            field_dict["costModel"] = cost_model
        if execution_timing is not UNSET:
            field_dict["executionTiming"] = execution_timing
        if reproducibility_caveat is not UNSET:
            field_dict["reproducibilityCaveat"] = reproducibility_caveat

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.agent_execution_assumptions_cost_model import AgentExecutionAssumptionsCostModel
        from ..models.agent_execution_assumptions_execution_timing import AgentExecutionAssumptionsExecutionTiming

        d = dict(src_dict)
        schema = d.pop("schema", UNSET)

        account_model = d.pop("accountModel", UNSET)

        data_freshness = d.pop("dataFreshness", UNSET)

        _cost_model = d.pop("costModel", UNSET)
        cost_model: AgentExecutionAssumptionsCostModel | Unset
        if isinstance(_cost_model, Unset):
            cost_model = UNSET
        else:
            cost_model = AgentExecutionAssumptionsCostModel.from_dict(_cost_model)

        _execution_timing = d.pop("executionTiming", UNSET)
        execution_timing: AgentExecutionAssumptionsExecutionTiming | Unset
        if isinstance(_execution_timing, Unset):
            execution_timing = UNSET
        else:
            execution_timing = AgentExecutionAssumptionsExecutionTiming.from_dict(_execution_timing)

        reproducibility_caveat = d.pop("reproducibilityCaveat", UNSET)

        agent_execution_assumptions = cls(
            schema=schema,
            account_model=account_model,
            data_freshness=data_freshness,
            cost_model=cost_model,
            execution_timing=execution_timing,
            reproducibility_caveat=reproducibility_caveat,
        )

        agent_execution_assumptions.additional_properties = d
        return agent_execution_assumptions

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
