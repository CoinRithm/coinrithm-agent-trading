from __future__ import annotations

from collections.abc import Mapping
from typing import Any, Literal, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

T = TypeVar("T", bound="ArenaContractCapital")


@_attrs_define
class ArenaContractCapital:
    """
    Attributes:
        normalized_baseline_musd (Literal[50000]):
        execution_wallet_scope (Literal['user_account']):
        performance_attribution_scope (Literal['api_key']):
        independent_wallet_per_agent (bool):
    """

    normalized_baseline_musd: Literal[50000]
    execution_wallet_scope: Literal["user_account"]
    performance_attribution_scope: Literal["api_key"]
    independent_wallet_per_agent: bool
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        normalized_baseline_musd = self.normalized_baseline_musd

        execution_wallet_scope = self.execution_wallet_scope

        performance_attribution_scope = self.performance_attribution_scope

        independent_wallet_per_agent = self.independent_wallet_per_agent

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "normalizedBaselineMusd": normalized_baseline_musd,
                "executionWalletScope": execution_wallet_scope,
                "performanceAttributionScope": performance_attribution_scope,
                "independentWalletPerAgent": independent_wallet_per_agent,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        normalized_baseline_musd = cast(Literal[50000], d.pop("normalizedBaselineMusd"))
        if normalized_baseline_musd != 50000:
            raise ValueError(f"normalizedBaselineMusd must match const 50000, got '{normalized_baseline_musd}'")

        execution_wallet_scope = cast(Literal["user_account"], d.pop("executionWalletScope"))
        if execution_wallet_scope != "user_account":
            raise ValueError(f"executionWalletScope must match const 'user_account', got '{execution_wallet_scope}'")

        performance_attribution_scope = cast(Literal["api_key"], d.pop("performanceAttributionScope"))
        if performance_attribution_scope != "api_key":
            raise ValueError(
                f"performanceAttributionScope must match const 'api_key', got '{performance_attribution_scope}'"
            )

        independent_wallet_per_agent = d.pop("independentWalletPerAgent")

        arena_contract_capital = cls(
            normalized_baseline_musd=normalized_baseline_musd,
            execution_wallet_scope=execution_wallet_scope,
            performance_attribution_scope=performance_attribution_scope,
            independent_wallet_per_agent=independent_wallet_per_agent,
        )

        arena_contract_capital.additional_properties = d
        return arena_contract_capital

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
