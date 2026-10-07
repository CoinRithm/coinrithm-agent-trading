from enum import Enum


class MarketFundingVenueRateFreshnessBasis(str, Enum):
    COLLECTION_TIME = "collection_time"

    def __str__(self) -> str:
        return str(self.value)
