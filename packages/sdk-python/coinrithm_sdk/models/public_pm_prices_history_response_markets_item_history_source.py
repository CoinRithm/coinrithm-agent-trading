from enum import Enum


class PublicPmPricesHistoryResponseMarketsItemHistorySource(str, Enum):
    STORED_SNAPSHOTS = "stored_snapshots"

    def __str__(self) -> str:
        return str(self.value)
