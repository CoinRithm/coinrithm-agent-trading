from enum import Enum


class GetPublicLargeTradesVenue(str, Enum):
    BINANCE = "binance"
    HYPERLIQUID = "hyperliquid"

    def __str__(self) -> str:
        return str(self.value)
