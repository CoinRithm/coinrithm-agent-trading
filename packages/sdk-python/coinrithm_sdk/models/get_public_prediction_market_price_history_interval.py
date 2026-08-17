from enum import Enum


class GetPublicPredictionMarketPriceHistoryInterval(str, Enum):
    MAX = "max"
    VALUE_0 = "1h"
    VALUE_1 = "1d"
    VALUE_2 = "1w"

    def __str__(self) -> str:
        return str(self.value)
