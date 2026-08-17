from enum import Enum


class GetPublicPredictionMarketDisagreementsSort(str, Enum):
    CONFIDENCE_DESC = "confidence_desc"
    DIVERGENCE_DESC = "divergence_desc"
    MAX_OUTCOME_DELTA_DESC = "max_outcome_delta_desc"

    def __str__(self) -> str:
        return str(self.value)
