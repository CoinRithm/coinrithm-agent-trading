from enum import Enum


class EdgeSizingBasis(str, Enum):
    FRACTIONAL_KELLY_CAPPED = "fractional_kelly_capped"

    def __str__(self) -> str:
        return str(self.value)
