from enum import Enum


class PublicPmPricesHistoryResponseFreshnessReason(str, Enum):
    UPSTREAM_UNAVAILABLE = "upstream_unavailable"

    def __str__(self) -> str:
        return str(self.value)
