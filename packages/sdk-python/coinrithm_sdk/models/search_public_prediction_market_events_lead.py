from enum import Enum


class SearchPublicPredictionMarketEventsLead(str, Enum):
    REPRESENTATIVE = "representative"

    def __str__(self) -> str:
        return str(self.value)
