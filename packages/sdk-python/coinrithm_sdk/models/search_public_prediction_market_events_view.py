from enum import Enum


class SearchPublicPredictionMarketEventsView(str, Enum):
    COMPACT = "compact"

    def __str__(self) -> str:
        return str(self.value)
