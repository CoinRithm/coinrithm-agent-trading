from enum import Enum


class PmPaperV2DiscoveryOutcomeNativeEndBasis(str, Enum):
    GAMMA_MARKET_ENDDATE = "gamma_market_endDate"
    KALSHI_MARKET_CLOSE_TIME = "kalshi_market_close_time"

    def __str__(self) -> str:
        return str(self.value)
