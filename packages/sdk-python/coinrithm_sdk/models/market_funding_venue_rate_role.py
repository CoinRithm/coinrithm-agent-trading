from enum import Enum


class MarketFundingVenueRateRole(str, Enum):
    CONTEXT_ONLY = "context_only"
    SETTLEMENT_REFERENCE = "settlement_reference"

    def __str__(self) -> str:
        return str(self.value)
