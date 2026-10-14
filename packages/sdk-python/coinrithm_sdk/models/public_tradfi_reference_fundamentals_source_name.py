from enum import Enum


class PublicTradfiReferenceFundamentalsSourceName(str, Enum):
    SEC_EDGAR = "SEC EDGAR"

    def __str__(self) -> str:
        return str(self.value)
