from enum import Enum


class PmPaperV2ExitStatus(str, Enum):
    CANCELLED = "cancelled"
    FILLED = "filled"
    LEASED = "leased"
    MANUAL_ATTENTION = "manual_attention"
    PENDING = "pending"
    RETRY = "retry"

    def __str__(self) -> str:
        return str(self.value)
