from enum import Enum

class PmDiscoveryResponseMetaSource(str, Enum):
    ALL = "all"
    KALSHI = "kalshi"
    POLYMARKET = "polymarket"

    def __str__(self) -> str:
        return str(self.value)
