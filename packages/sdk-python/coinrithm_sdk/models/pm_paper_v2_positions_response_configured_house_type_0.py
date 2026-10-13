from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

T = TypeVar("T", bound="PmPaperV2PositionsResponseConfiguredHouseType0")


@_attrs_define
class PmPaperV2PositionsResponseConfiguredHouseType0:
    """
    Attributes:
        user_id (int):
        api_key_id (int):
        wallet_id (int):
        house_agent_id (int):
        max_end_days (int | Unset):
    """

    user_id: int
    api_key_id: int
    wallet_id: int
    house_agent_id: int
    max_end_days: int | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        user_id = self.user_id

        api_key_id = self.api_key_id

        wallet_id = self.wallet_id

        house_agent_id = self.house_agent_id

        max_end_days = self.max_end_days

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "userId": user_id,
                "apiKeyId": api_key_id,
                "walletId": wallet_id,
                "houseAgentId": house_agent_id,
            }
        )
        if max_end_days is not UNSET:
            field_dict["maxEndDays"] = max_end_days

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        user_id = d.pop("userId")

        api_key_id = d.pop("apiKeyId")

        wallet_id = d.pop("walletId")

        house_agent_id = d.pop("houseAgentId")

        max_end_days = d.pop("maxEndDays", UNSET)

        pm_paper_v2_positions_response_configured_house_type_0 = cls(
            user_id=user_id,
            api_key_id=api_key_id,
            wallet_id=wallet_id,
            house_agent_id=house_agent_id,
            max_end_days=max_end_days,
        )

        pm_paper_v2_positions_response_configured_house_type_0.additional_properties = d
        return pm_paper_v2_positions_response_configured_house_type_0

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
