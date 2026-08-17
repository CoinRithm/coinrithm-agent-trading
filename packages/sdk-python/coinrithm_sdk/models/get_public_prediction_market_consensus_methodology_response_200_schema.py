from enum import Enum


class GetPublicPredictionMarketConsensusMethodologyResponse200Schema(str, Enum):
    COINRITHM_CONSENSUSMETHODOLOGY_V1 = "coinrithm.consensusMethodology.v1"

    def __str__(self) -> str:
        return str(self.value)
