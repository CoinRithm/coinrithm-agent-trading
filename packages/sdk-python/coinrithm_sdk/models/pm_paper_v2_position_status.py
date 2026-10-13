from enum import Enum


class PmPaperV2PositionStatus(str, Enum):
    CLOSED_SOLD = "closed_sold"
    OPEN = "open"
    SETTLED_LOSS = "settled_loss"
    SETTLED_WIN = "settled_win"

    def __str__(self) -> str:
        return str(self.value)
