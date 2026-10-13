from enum import Enum


class PmPaperV2PositionAccountingStatus(str, Enum):
    OPEN = "open"
    PENDING = "pending"
    SETTLED = "settled"

    def __str__(self) -> str:
        return str(self.value)
