from enum import Enum


class GetMarketContextResponse200FuturesEntryEligibilityStatus(str, Enum):
    ELIGIBLE = "eligible"
    REFERENCE_STALE = "reference_stale"
    REFERENCE_UNAVAILABLE = "reference_unavailable"

    def __str__(self) -> str:
        return str(self.value)
