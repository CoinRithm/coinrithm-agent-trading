from enum import Enum


class PublicPmPricesHistoryResponseFreshnessStatus(str, Enum):
    LAGGING = "lagging"

    def __str__(self) -> str:
        return str(self.value)
