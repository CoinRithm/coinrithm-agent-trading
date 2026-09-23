from enum import Enum


class GetPublicPredictionMarketWhaleWalletsSource(str, Enum):
    LIMITLESS = "limitless"
    MYRIAD = "myriad"
    POLYMARKET = "polymarket"

    def __str__(self) -> str:
        return str(self.value)
