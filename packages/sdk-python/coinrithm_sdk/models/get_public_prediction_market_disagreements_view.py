from enum import Enum


class GetPublicPredictionMarketDisagreementsView(str, Enum):
    COMPACT = "compact"

    def __str__(self) -> str:
        return str(self.value)
