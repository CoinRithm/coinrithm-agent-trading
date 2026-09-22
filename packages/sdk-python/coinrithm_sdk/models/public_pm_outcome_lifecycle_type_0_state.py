from enum import Enum


class PublicPmOutcomeLifecycleType0State(str, Enum):
    CLOSED = "closed"
    OPEN = "open"
    RESOLVED = "resolved"
    UNKNOWN = "unknown"
    VOIDED = "voided"

    def __str__(self) -> str:
        return str(self.value)
