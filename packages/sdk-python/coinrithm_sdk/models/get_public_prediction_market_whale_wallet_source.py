from enum import Enum


class GetPublicPredictionMarketWhaleWalletSource(str, Enum):
    LIMITLESS = "limitless"
    MYRIAD = "myriad"
    POLYMARKET = "polymarket"

    def __str__(self) -> str:
        return str(self.value)
