from enum import Enum


class DecisionSupportSpreadTier(str, Enum):
    MODERATE = "moderate"
    TIGHT = "tight"
    UNKNOWN = "unknown"
    WIDE = "wide"

    def __str__(self) -> str:
        return str(self.value)
