from enum import Enum


class FuturesQuoteResponseFillType0ImpactBasis(str, Enum):
    CAP_FALLBACK = "cap_fallback"
    VOLUME = "volume"

    def __str__(self) -> str:
        return str(self.value)
