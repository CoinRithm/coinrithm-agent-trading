from enum import Enum


class SpotReferenceFallbackStatus(str, Enum):
    FRESH = "fresh"
    STALE = "stale"
    UNAVAILABLE = "unavailable"

    def __str__(self) -> str:
        return str(self.value)
