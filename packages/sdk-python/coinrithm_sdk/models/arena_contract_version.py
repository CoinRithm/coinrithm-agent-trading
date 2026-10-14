from enum import Enum


class ArenaContractVersion(str, Enum):
    ARENA_RANKING_V1 = "arena-ranking-v1"
    ARENA_RANKING_V2 = "arena-ranking-v2"

    def __str__(self) -> str:
        return str(self.value)
