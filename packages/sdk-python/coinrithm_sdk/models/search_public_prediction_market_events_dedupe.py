from enum import Enum


class SearchPublicPredictionMarketEventsDedupe(str, Enum):
    MATCHED = "matched"

    def __str__(self) -> str:
        return str(self.value)
