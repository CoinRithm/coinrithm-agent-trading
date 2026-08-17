from enum import Enum


class FreshnessBasis(str, Enum):
    EVENT_UPDATE = "event_update"
    LATEST_SNAPSHOT = "latest_snapshot"
    PROCESSED = "processed"
    SOURCE_UPDATE = "source_update"
    UNKNOWN = "unknown"

    def __str__(self) -> str:
        return str(self.value)
