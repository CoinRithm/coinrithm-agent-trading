from enum import Enum

class ArenaOpportunityOpportunityKind(str, Enum):
    ABSTAINED = "abstained"
    EXECUTION_REJECTED = "execution_rejected"
    FORECAST_ONLY = "forecast_only"
    QUOTE_EXPIRED = "quote_expired"
    RISK_REJECTED = "risk_rejected"
    VALIDATION_FAILED = "validation_failed"

    def __str__(self) -> str:
        return str(self.value)
