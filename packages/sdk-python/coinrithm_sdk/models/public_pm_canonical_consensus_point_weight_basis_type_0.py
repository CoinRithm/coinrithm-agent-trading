from enum import Enum


class PublicPmCanonicalConsensusPointWeightBasisType0(str, Enum):
    LIQUIDITY = "liquidity"
    OPEN_INTEREST = "open_interest"

    def __str__(self) -> str:
        return str(self.value)
