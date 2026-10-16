from enum import Enum


class GetPublicPredictionMarketTokenPriceHistoryInterval(str, Enum):
    ALL = "all"
    MAX = "max"
    VALUE_0 = "1h"
    VALUE_1 = "6h"
    VALUE_2 = "1d"
    VALUE_3 = "1w"
    VALUE_4 = "1m"
    VALUE_6 = "24h"
    VALUE_7 = "7d"
    VALUE_8 = "30d"

    def __str__(self) -> str:
        return str(self.value)
