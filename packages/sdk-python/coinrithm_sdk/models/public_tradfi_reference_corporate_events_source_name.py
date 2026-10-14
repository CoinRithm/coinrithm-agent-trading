from enum import Enum


class PublicTradfiReferenceCorporateEventsSourceName(str, Enum):
    SEC_EDGAR = "SEC EDGAR"

    def __str__(self) -> str:
        return str(self.value)
