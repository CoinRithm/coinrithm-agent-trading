from enum import Enum


class PublicTradfiReferenceFundamentalsSharesSourceType0(str, Enum):
    BALANCE_SHEET = "balance_sheet"
    DEI_COVER = "dei_cover"

    def __str__(self) -> str:
        return str(self.value)
