from enum import Enum


class GetPublicPredictionMarketEventFull(str, Enum):
    TRUE = "true"
    VALUE_0 = "1"
    YES = "yes"

    def __str__(self) -> str:
        return str(self.value)
