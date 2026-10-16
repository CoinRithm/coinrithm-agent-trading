from enum import Enum


class PublicInstrumentMarketsHorizon(str, Enum):
    ALL = "all"
    DAY = "day"
    HOUR = "hour"
    MONTH = "month"
    WEEK = "week"
    YEAR = "year"

    def __str__(self) -> str:
        return str(self.value)
