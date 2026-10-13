from enum import Enum


class PublicPmEventAvailabilityStatus(str, Enum):
    PAUSED = "paused"

    def __str__(self) -> str:
        return str(self.value)
