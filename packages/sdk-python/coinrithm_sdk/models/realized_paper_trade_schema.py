from enum import Enum


class RealizedPaperTradeSchema(str, Enum):
    COINRITHM_PAPERTRADERESULT_V1 = "coinrithm.paperTradeResult.v1"

    def __str__(self) -> str:
        return str(self.value)
