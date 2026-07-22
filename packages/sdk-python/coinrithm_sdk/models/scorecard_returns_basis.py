from enum import Enum

class ScorecardReturnsBasis(str, Enum):
    REALIZED_PNL = "realized_pnl"
    RETURNS = "returns"

    def __str__(self) -> str:
        return str(self.value)
