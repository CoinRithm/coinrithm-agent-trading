from enum import Enum


class FuturesPositionSide(str, Enum):
    LONG = "long"
    SHORT = "short"

    def __str__(self) -> str:
        return str(self.value)
