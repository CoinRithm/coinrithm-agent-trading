from enum import Enum


class ArenaContractRankingNonPositiveScore(str, Enum):
    REALIZED_PLUS_OPEN_LOSS = "realized_plus_open_loss"
    REALIZED_PNL = "realized_pnl"

    def __str__(self) -> str:
        return str(self.value)
