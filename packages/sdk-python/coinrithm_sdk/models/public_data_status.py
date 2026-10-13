from enum import Enum


class PublicDataStatus(str, Enum):
    FRESH = "fresh"
    STALE = "stale"
    UNAVAILABLE = "unavailable"

    def __str__(self) -> str:
        return str(self.value)
