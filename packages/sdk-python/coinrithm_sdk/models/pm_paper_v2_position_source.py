from enum import Enum


class PmPaperV2PositionSource(str, Enum):
    KALSHI = "kalshi"
    POLYMARKET = "polymarket"

    def __str__(self) -> str:
        return str(self.value)
