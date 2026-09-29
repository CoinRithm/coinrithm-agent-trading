from enum import Enum


class GetPublicPredictionMarketPriceHistoryInterval(str, Enum):
    MAX = "max"
    VALUE_0 = "1h"
    VALUE_1 = "6h"
    VALUE_2 = "1d"
    VALUE_3 = "1w"
    VALUE_4 = "1m"

    def __str__(self) -> str:
        return str(self.value)
