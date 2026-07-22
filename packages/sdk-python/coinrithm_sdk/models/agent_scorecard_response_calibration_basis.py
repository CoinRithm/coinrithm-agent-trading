from enum import Enum

class AgentScorecardResponseCalibrationBasis(str, Enum):
    MARKET_ENTRY = "market_entry"

    def __str__(self) -> str:
        return str(self.value)
