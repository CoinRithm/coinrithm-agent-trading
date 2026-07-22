from enum import Enum

class PmDiscoveryQuoteHintSource(str, Enum):
    KALSHI = "kalshi"
    POLYMARKET = "polymarket"

    def __str__(self) -> str:
        return str(self.value)
