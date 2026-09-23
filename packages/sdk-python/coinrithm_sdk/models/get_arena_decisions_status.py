from enum import Enum


class GetArenaDecisionsStatus(str, Enum):
    OPEN = "open"
    SETTLED = "settled"

    def __str__(self) -> str:
        return str(self.value)
