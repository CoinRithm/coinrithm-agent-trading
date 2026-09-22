from enum import Enum


class PublicPmOutcomeLifecycleType0Basis(str, Enum):
    PROVIDER = "provider"
    STORED_WINNER = "stored_winner"
    UNKNOWN = "unknown"

    def __str__(self) -> str:
        return str(self.value)
