from enum import Enum


class ArenaContractRankingPositiveScore(str, Enum):
    WILSON_95_LOWER_BOUND_X_REALIZED_PLUS_OPEN_LOSS = "wilson_95_lower_bound_x_realized_plus_open_loss"
    WILSON_95_LOWER_BOUND_X_REALIZED_PNL = "wilson_95_lower_bound_x_realized_pnl"

    def __str__(self) -> str:
        return str(self.value)
