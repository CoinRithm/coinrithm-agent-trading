from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, BinaryIO, TextIO, TYPE_CHECKING, Generator

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

from ..models.whoami_response_200_scopes_item import WhoamiResponse200ScopesItem
from ..types import UNSET, Unset
from typing import cast






T = TypeVar("T", bound="WhoamiResponse200")



@_attrs_define
class WhoamiResponse200:
    """ 
        Attributes:
            user_id (str | Unset):
            key_id (int | Unset):
            agent_name (None | str | Unset): The key's optional label (lets an agent confirm which key it is acting as).
                Null if unset.
            agent_model (None | str | Unset): Self-reported model/runtime label set by the key owner in
                Profile -> API Keys (e.g. "Claude", "GPT-4o"). Shown on
                the public Agent Arena when the key opts in. Null if
                unset.
            scopes (list[WhoamiResponse200ScopesItem] | Unset):
     """

    user_id: str | Unset = UNSET
    key_id: int | Unset = UNSET
    agent_name: None | str | Unset = UNSET
    agent_model: None | str | Unset = UNSET
    scopes: list[WhoamiResponse200ScopesItem] | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)





    def to_dict(self) -> dict[str, Any]:
        user_id = self.user_id

        key_id = self.key_id

        agent_name: None | str | Unset
        if isinstance(self.agent_name, Unset):
            agent_name = UNSET
        else:
            agent_name = self.agent_name

        agent_model: None | str | Unset
        if isinstance(self.agent_model, Unset):
            agent_model = UNSET
        else:
            agent_model = self.agent_model

        scopes: list[str] | Unset = UNSET
        if not isinstance(self.scopes, Unset):
            scopes = []
            for scopes_item_data in self.scopes:
                scopes_item = scopes_item_data.value
                scopes.append(scopes_item)




        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({
        })
        if user_id is not UNSET:
            field_dict["userId"] = user_id
        if key_id is not UNSET:
            field_dict["keyId"] = key_id
        if agent_name is not UNSET:
            field_dict["agentName"] = agent_name
        if agent_model is not UNSET:
            field_dict["agentModel"] = agent_model
        if scopes is not UNSET:
            field_dict["scopes"] = scopes

        return field_dict



    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        user_id = d.pop("userId", UNSET)

        key_id = d.pop("keyId", UNSET)

        def _parse_agent_name(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        agent_name = _parse_agent_name(d.pop("agentName", UNSET))


        def _parse_agent_model(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        agent_model = _parse_agent_model(d.pop("agentModel", UNSET))


        _scopes = d.pop("scopes", UNSET)
        scopes: list[WhoamiResponse200ScopesItem] | Unset = UNSET
        if _scopes is not UNSET:
            scopes = []
            for scopes_item_data in _scopes:
                scopes_item = WhoamiResponse200ScopesItem(scopes_item_data)



                scopes.append(scopes_item)


        whoami_response_200 = cls(
            user_id=user_id,
            key_id=key_id,
            agent_name=agent_name,
            agent_model=agent_model,
            scopes=scopes,
        )


        whoami_response_200.additional_properties = d
        return whoami_response_200

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
