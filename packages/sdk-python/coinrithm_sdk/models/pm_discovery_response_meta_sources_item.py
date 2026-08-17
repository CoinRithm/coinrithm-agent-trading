from enum import Enum


class PmDiscoveryResponseMetaSourcesItem(str, Enum):
    KALSHI = "kalshi"
    POLYMARKET = "polymarket"

    def __str__(self) -> str:
        return str(self.value)
