from enum import Enum


class GetPublicLiquidationsVenue(str, Enum):
    BINANCE = "binance"
    OKX = "okx"

    def __str__(self) -> str:
        return str(self.value)
