from enum import Enum


class PublicTradfiReferenceFundamentalsMarketCapBasis(str, Enum):
    SHARES_X_REFERENCE_PRICE = "shares x reference price"

    def __str__(self) -> str:
        return str(self.value)
