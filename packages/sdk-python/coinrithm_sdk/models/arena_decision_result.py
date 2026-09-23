from enum import Enum


class ArenaDecisionResult(str, Enum):
    LOST = "lost"
    PENDING = "pending"
    WON = "won"

    def __str__(self) -> str:
        return str(self.value)
