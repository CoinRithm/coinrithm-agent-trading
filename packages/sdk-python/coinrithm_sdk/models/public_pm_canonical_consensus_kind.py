from enum import Enum


class PublicPmCanonicalConsensusKind(str, Enum):
    BINARY = "binary"
    LEADER = "leader"

    def __str__(self) -> str:
        return str(self.value)
