from enum import Enum


class PublicPmCanonicalConsensusWeightBasisType0(str, Enum):
    LIQUIDITY = "liquidity"
    OPEN_INTEREST = "open_interest"

    def __str__(self) -> str:
        return str(self.value)
