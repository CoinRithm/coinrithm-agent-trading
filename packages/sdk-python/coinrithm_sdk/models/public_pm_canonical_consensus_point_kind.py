from enum import Enum


class PublicPmCanonicalConsensusPointKind(str, Enum):
    BINARY = "binary"
    LEADER = "leader"

    def __str__(self) -> str:
        return str(self.value)
