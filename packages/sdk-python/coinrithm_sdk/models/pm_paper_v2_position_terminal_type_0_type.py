from enum import Enum


class PmPaperV2PositionTerminalType0Type(str, Enum):
    RESOLVE = "resolve"
    SELL = "sell"

    def __str__(self) -> str:
        return str(self.value)
