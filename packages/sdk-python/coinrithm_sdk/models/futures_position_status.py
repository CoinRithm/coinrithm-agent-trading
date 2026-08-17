from enum import Enum


class FuturesPositionStatus(str, Enum):
    CLOSED = "closed"
    LIQUIDATED = "liquidated"
    OPEN = "open"

    def __str__(self) -> str:
        return str(self.value)
