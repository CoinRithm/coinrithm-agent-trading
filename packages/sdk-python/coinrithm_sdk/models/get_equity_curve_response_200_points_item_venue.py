from enum import Enum


class GetEquityCurveResponse200PointsItemVenue(str, Enum):
    FUTURES = "futures"
    PM = "pm"
    SPOT = "spot"

    def __str__(self) -> str:
        return str(self.value)
