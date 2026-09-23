from enum import Enum


class GetPublicPredictionMarketWhaleWalletsResponse200Window(str, Enum):
    VALUE_0 = "7d"
    VALUE_1 = "30d"

    def __str__(self) -> str:
        return str(self.value)
