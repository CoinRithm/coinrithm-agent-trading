from enum import Enum


class PmOpportunityResponseOpportunityKind(str, Enum):
    ABSTAINED = "abstained"
    FORECAST_ONLY = "forecast_only"
    QUOTE_EXPIRED = "quote_expired"

    def __str__(self) -> str:
        return str(self.value)
