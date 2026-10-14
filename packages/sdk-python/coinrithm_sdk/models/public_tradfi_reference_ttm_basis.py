from enum import Enum


class PublicTradfiReferenceTtmBasis(str, Enum):
    ANNUAL = "annual"
    QUARTERS = "quarters"

    def __str__(self) -> str:
        return str(self.value)
