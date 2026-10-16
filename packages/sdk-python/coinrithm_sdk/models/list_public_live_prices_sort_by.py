from enum import Enum


class ListPublicLivePricesSortBy(str, Enum):
    CHANGE1H = "change1h"
    CHANGE24H = "change24h"
    CHANGE7D = "change7d"
    MARKETCAPUSD = "marketCapUsd"
    NAME = "name"
    PRICEUSD = "priceUsd"
    RANK = "rank"
    SUPPLY = "supply"
    VOLUME = "volume"

    def __str__(self) -> str:
        return str(self.value)
