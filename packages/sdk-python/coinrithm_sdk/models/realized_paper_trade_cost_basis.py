from enum import Enum


class RealizedPaperTradeCostBasis(str, Enum):
    RECORDED_PAPER_PNL = "recorded_paper_pnl"

    def __str__(self) -> str:
        return str(self.value)
