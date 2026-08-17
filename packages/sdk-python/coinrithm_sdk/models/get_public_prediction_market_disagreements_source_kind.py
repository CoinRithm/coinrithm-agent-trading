from enum import Enum


class GetPublicPredictionMarketDisagreementsSourceKind(str, Enum):
    MARKET = "market"

    def __str__(self) -> str:
        return str(self.value)
