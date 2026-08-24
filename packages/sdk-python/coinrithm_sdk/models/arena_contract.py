from __future__ import annotations

from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, Literal, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field

if TYPE_CHECKING:
    from ..models.arena_contract_capital import ArenaContractCapital
    from ..models.arena_contract_evidence import ArenaContractEvidence
    from ..models.arena_contract_presentation import ArenaContractPresentation
    from ..models.arena_contract_public_identity import ArenaContractPublicIdentity
    from ..models.arena_contract_ranking import ArenaContractRanking


T = TypeVar("T", bound="ArenaContract")


@_attrs_define
class ArenaContract:
    """Machine-readable Arena methodology emitted from the same constants as
    production ranking. See ARENA_CONTRACT.md for the human-readable scope
    and evidence limitations.

        Attributes:
            version (Literal['arena-ranking-v1']):
            ranking (ArenaContractRanking):
            presentation (ArenaContractPresentation):
            capital (ArenaContractCapital):
            evidence (ArenaContractEvidence):
            public_identity (ArenaContractPublicIdentity):
    """

    version: Literal["arena-ranking-v1"]
    ranking: ArenaContractRanking
    presentation: ArenaContractPresentation
    capital: ArenaContractCapital
    evidence: ArenaContractEvidence
    public_identity: ArenaContractPublicIdentity
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        version = self.version

        ranking = self.ranking.to_dict()

        presentation = self.presentation.to_dict()

        capital = self.capital.to_dict()

        evidence = self.evidence.to_dict()

        public_identity = self.public_identity.to_dict()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "version": version,
                "ranking": ranking,
                "presentation": presentation,
                "capital": capital,
                "evidence": evidence,
                "publicIdentity": public_identity,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls: type[T], src_dict: Mapping[str, Any]) -> T:
        from ..models.arena_contract_capital import ArenaContractCapital
        from ..models.arena_contract_evidence import ArenaContractEvidence
        from ..models.arena_contract_presentation import ArenaContractPresentation
        from ..models.arena_contract_public_identity import ArenaContractPublicIdentity
        from ..models.arena_contract_ranking import ArenaContractRanking

        d = dict(src_dict)
        version = cast(Literal["arena-ranking-v1"], d.pop("version"))
        if version != "arena-ranking-v1":
            raise ValueError(f"version must match const 'arena-ranking-v1', got '{version}'")

        ranking = ArenaContractRanking.from_dict(d.pop("ranking"))

        presentation = ArenaContractPresentation.from_dict(d.pop("presentation"))

        capital = ArenaContractCapital.from_dict(d.pop("capital"))

        evidence = ArenaContractEvidence.from_dict(d.pop("evidence"))

        public_identity = ArenaContractPublicIdentity.from_dict(d.pop("publicIdentity"))

        arena_contract = cls(
            version=version,
            ranking=ranking,
            presentation=presentation,
            capital=capital,
            evidence=evidence,
            public_identity=public_identity,
        )

        arena_contract.additional_properties = d
        return arena_contract

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
