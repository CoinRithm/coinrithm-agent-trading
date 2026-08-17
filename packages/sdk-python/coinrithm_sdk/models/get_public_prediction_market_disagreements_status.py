from enum import Enum


class GetPublicPredictionMarketDisagreementsStatus(str, Enum):
    OPEN = "open"

    def __str__(self) -> str:
        return str(self.value)
