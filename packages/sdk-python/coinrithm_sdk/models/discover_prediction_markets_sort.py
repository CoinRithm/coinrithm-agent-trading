from enum import Enum


class DiscoverPredictionMarketsSort(str, Enum):
    BEST = "best"
    ENDDATE_DESC = "endDate_desc"
    PRICECHANGE24H_ASC = "priceChange24h_asc"
    PRICECHANGE24H_DESC = "priceChange24h_desc"
    TRENDING = "trending"
    VOLUME24H_DESC = "volume24h_desc"

    def __str__(self) -> str:
        return str(self.value)
