from enum import Enum


class AgentUniverseSectorKind(str, Enum):
    ECOSYSTEM = "ecosystem"
    SECTOR = "sector"

    def __str__(self) -> str:
        return str(self.value)
