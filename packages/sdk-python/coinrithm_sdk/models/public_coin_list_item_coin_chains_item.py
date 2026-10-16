from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field

from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.public_coin_list_item_coin_chains_item_chain import PublicCoinListItemCoinChainsItemChain


T = TypeVar("T", bound="PublicCoinListItemCoinChainsItem")


@_attrs_define
class PublicCoinListItemCoinChainsItem:
    """
    Attributes:
        coin_uc_id (str | Unset):
        chain_id (int | Unset):
        contract_address (str | Unset): Token contract on that chain; empty for a native coin.
        chain (PublicCoinListItemCoinChainsItemChain | Unset):
    """

    coin_uc_id: str | Unset = UNSET
    chain_id: int | Unset = UNSET
    contract_address: str | Unset = UNSET
    chain: PublicCoinListItemCoinChainsItemChain | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        coin_uc_id = self.coin_uc_id

        chain_id = self.chain_id

        contract_address = self.contract_address

        chain: dict[str, Any] | Unset = UNSET
        if not isinstance(self.chain, Unset):
            chain = self.chain.to_dict()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if coin_uc_id is not UNSET:
            field_dict["coinUcId"] = coin_uc_id
        if chain_id is not UNSET:
            field_dict["chainId"] = chain_id
        if contract_address is not UNSET:
            field_dict["contractAddress"] = contract_address
        if chain is not UNSET:
            field_dict["chain"] = chain

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.public_coin_list_item_coin_chains_item_chain import PublicCoinListItemCoinChainsItemChain

        d = dict(src_dict)
        coin_uc_id = d.pop("coinUcId", UNSET)

        chain_id = d.pop("chainId", UNSET)

        contract_address = d.pop("contractAddress", UNSET)

        _chain = d.pop("chain", UNSET)
        chain: PublicCoinListItemCoinChainsItemChain | Unset
        if isinstance(_chain, Unset):
            chain = UNSET
        else:
            chain = PublicCoinListItemCoinChainsItemChain.from_dict(_chain)

        public_coin_list_item_coin_chains_item = cls(
            coin_uc_id=coin_uc_id,
            chain_id=chain_id,
            contract_address=contract_address,
            chain=chain,
        )

        public_coin_list_item_coin_chains_item.additional_properties = d
        return public_coin_list_item_coin_chains_item

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
