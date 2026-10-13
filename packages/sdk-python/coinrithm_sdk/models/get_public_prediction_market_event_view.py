from enum import Enum


class GetPublicPredictionMarketEventView(str, Enum):
    CORE = "core"

    def __str__(self) -> str:
        return str(self.value)
