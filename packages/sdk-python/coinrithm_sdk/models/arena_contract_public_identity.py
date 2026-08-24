from __future__ import annotations

from collections.abc import Mapping
from typing import Any, Literal, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

T = TypeVar("T", bound="ArenaContractPublicIdentity")


@_attrs_define
class ArenaContractPublicIdentity:
    """
    Attributes:
        participation (Literal['opt_in_reversible']):
        key_revocation_or_unpublish_removes_from_board (bool):
        reconnect_preserves_key_identity (bool):
    """

    participation: Literal["opt_in_reversible"]
    key_revocation_or_unpublish_removes_from_board: bool
    reconnect_preserves_key_identity: bool
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        participation = self.participation

        key_revocation_or_unpublish_removes_from_board = self.key_revocation_or_unpublish_removes_from_board

        reconnect_preserves_key_identity = self.reconnect_preserves_key_identity

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "participation": participation,
                "keyRevocationOrUnpublishRemovesFromBoard": key_revocation_or_unpublish_removes_from_board,
                "reconnectPreservesKeyIdentity": reconnect_preserves_key_identity,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        d = dict(src_dict)
        participation = cast(Literal["opt_in_reversible"], d.pop("participation"))
        if participation != "opt_in_reversible":
            raise ValueError(f"participation must match const 'opt_in_reversible', got '{participation}'")

        key_revocation_or_unpublish_removes_from_board = d.pop("keyRevocationOrUnpublishRemovesFromBoard")

        reconnect_preserves_key_identity = d.pop("reconnectPreservesKeyIdentity")

        arena_contract_public_identity = cls(
            participation=participation,
            key_revocation_or_unpublish_removes_from_board=key_revocation_or_unpublish_removes_from_board,
            reconnect_preserves_key_identity=reconnect_preserves_key_identity,
        )

        arena_contract_public_identity.additional_properties = d
        return arena_contract_public_identity

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
