from enum import Enum


class GetPublicLargeTradesAssetClass(str, Enum):
    COMMODITY = "commodity"
    CRYPTO = "crypto"
    EQUITY = "equity"
    FX = "fx"
    INDEX = "index"

    def __str__(self) -> str:
        return str(self.value)
