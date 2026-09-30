from enum import Enum


class SpotPriceTimingCoverage(str, Enum):
    NOT_RECORDED = "not_recorded"
    NO_ROW = "no_row"
    RECORDED = "recorded"

    def __str__(self) -> str:
        return str(self.value)
