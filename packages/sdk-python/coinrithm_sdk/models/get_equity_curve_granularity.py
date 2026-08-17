from enum import Enum


class GetEquityCurveGranularity(str, Enum):
    DAILY = "daily"
    REALIZED = "realized"

    def __str__(self) -> str:
        return str(self.value)
