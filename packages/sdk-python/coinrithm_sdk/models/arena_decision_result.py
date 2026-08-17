from enum import Enum


class ArenaDecisionResult(str, Enum):
    LOST = "lost"
    WON = "won"

    def __str__(self) -> str:
        return str(self.value)
