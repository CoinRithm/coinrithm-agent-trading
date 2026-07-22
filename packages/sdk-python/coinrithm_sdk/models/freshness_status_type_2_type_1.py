from enum import Enum

class FreshnessStatusType2Type1(str, Enum):
    FRESH = "fresh"
    LAGGING = "lagging"
    STALE = "stale"
    UNKNOWN = "unknown"

    def __str__(self) -> str:
        return str(self.value)
