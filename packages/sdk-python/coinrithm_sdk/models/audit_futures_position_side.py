from enum import Enum


class AuditFuturesPositionSide(str, Enum):
    LONG = "long"
    SHORT = "short"

    def __str__(self) -> str:
        return str(self.value)
