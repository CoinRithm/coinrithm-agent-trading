from enum import Enum


class FuturesQuoteResponseFillType0VolumeCoverage(str, Enum):
    COMPLETE = "complete"
    PARTIAL = "partial"
    UNKNOWN = "unknown"

    def __str__(self) -> str:
        return str(self.value)
