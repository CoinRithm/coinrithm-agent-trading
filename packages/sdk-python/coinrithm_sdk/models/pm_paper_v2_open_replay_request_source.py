from enum import Enum


class PmPaperV2OpenReplayRequestSource(str, Enum):
    KALSHI = "kalshi"
    POLYMARKET = "polymarket"

    def __str__(self) -> str:
        return str(self.value)
