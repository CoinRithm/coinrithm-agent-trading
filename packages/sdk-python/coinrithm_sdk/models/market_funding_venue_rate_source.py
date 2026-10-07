from enum import Enum


class MarketFundingVenueRateSource(str, Enum):
    HYPERLIQUID_PREDICTED_FUNDINGS = "hyperliquid_predicted_fundings"
    PAPER_FUTURES_REFERENCE = "paper_futures_reference"

    def __str__(self) -> str:
        return str(self.value)
