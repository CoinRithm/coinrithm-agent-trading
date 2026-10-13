from enum import Enum


class PmPaperV2NativeMarketVenue(str, Enum):
    KALSHI = "kalshi"
    POLYMARKET = "polymarket"

    def __str__(self) -> str:
        return str(self.value)
